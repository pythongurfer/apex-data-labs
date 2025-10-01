---
publishDate: '2025-10-19T10:00:00Z'
title: 'Guía Técnica: Construyendo un Agente de Moderación con RAG y LLMs'
excerpt: "Un tutorial técnico paso a paso para construir 'El Guardián'. Cubrimos la creación de una base de datos vectorial con ChromaDB, la implementación de un pipeline de RAG con LangChain, el uso de un LLM de código abierto para la toma de decisiones y la creación de un dataset de evaluación."
category: 'ML Engineering & Architecture'
tags:
  - RAG
  - Vector Databases
  - LLM
  - LangChain
  - MLOps
  - Python
image: '~/assets/images/articles/solr-java.png'
imageAlt: 'Un diagrama de flujo técnico mostrando el pipeline de RAG, desde la ingesta de datos hasta la decisión del LLM.'
author: 'Anika Rosenzuaig'
draft: false
layout: '~/layouts/PostLayout.astro'
---

## 1. Introducción: La Anatomía de un Agente de IA Moderno

La moderación de contenido ha evolucionado de simples listas de palabras clave a complejos modelos de machine learning. Sin embargo, la llegada de los Large Language Models (LLMs) y la arquitectura RAG (Retrieval-Augmented Generation) nos permite dar un salto cuántico: de la *detección* a la *comprensión*.

Este artículo es una guía técnica detallada para construir "El Guardián", un agente de moderación proactiva. No solo bloquea contenido, sino que entiende *por qué* lo hace y lo explica. Desglosaremos cada componente, desde la base de datos vectorial hasta el prompt que le da "vida" al agente.

**Stack Tecnológico:**
*   **Lenguaje:** Python
*   **Orquestación:** LangChain
*   **Base de Datos Vectorial:** ChromaDB (local, ideal para prototipado)
*   **Modelos de Embeddings y LLM:** Modelos de código abierto (ej. `BAAI/bge-small-en-v1.5` para embeddings y `Llama3-8B` para el LLM) accesibles a través de Ollama.

---

## 2. El Corazón del Sistema: La Base de Conocimiento Vectorial

El agente es tan bueno como el conocimiento que posee. Nuestra base de conocimiento tendrá dos colecciones principales en ChromaDB.

### 2.1. Colección 1: Políticas de Moderación

Primero, digitalizamos el manual de políticas.

**`policies.json` (Dataset Simulado)**
```json
[
  {
    "policy_id": "POL-001",
    "title": "Prohibición de Armas de Fuego",
    "content": "Está estrictamente prohibida la venta de cualquier tipo de arma de fuego, munición, explosivos o accesorios relacionados. Esto incluye, pero no se limita a, pistolas, rifles, escopetas y sus componentes.",
    "keywords": ["arma", "pistola", "munición", "rifle"]
  },
  {
    "policy_id": "POL-002",
    "title": "Precios Irrealistas y Estafas",
    "content": "Los anuncios deben reflejar un precio de mercado justo. Los artículos de alto valor (como smartphones, consolas) listados a precios simbólicos (ej. 1€, 5€) se consideran sospechosos de estafa y serán eliminados.",
    "keywords": ["estafa", "precio bajo", "regalo"]
  }
]
```

**Código Python para la Ingesta:**
```python
import chromadb
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
import json

# 1. Cargar los datos
with open('policies.json', 'r') as f:
    policies = json.load(f)

# 2. Preparar los documentos para LangChain
documents = [f"Política: {p['title']}. Contenido: {p['content']}" for p in policies]
metadatas = [{"policy_id": p['policy_id']} for p in policies]

# 3. Inicializar embeddings y ChromaDB
embeddings = OllamaEmbeddings(model="bge-small-en-v1.5")
vectorstore_policies = Chroma(
    collection_name="policies",
    embedding_function=embeddings
)
vectorstore_policies.add_texts(texts=documents, metadatas=metadatas)

print("✅ Base de datos de políticas creada.")
```

### 2.2. Colección 2: Histórico de Fraudes

De manera similar, creamos una colección con ejemplos de anuncios fraudulentos.

**`frauds.csv` (Dataset Simulado)**

| fraud_id | title | description | reason |
| :--- | :--- | :--- | :--- |
| F-101 | iPhone 15 Pro MAX ¡¡Regalo!! | Lo vendo a 10 euros, contactar por WhatsApp para pago. | Precio Irrealista |
| F-102 | Réplica de Lujo Reloj Rolex | Excelente calidad, idéntico al original. | Falsificación |
| F-103 | Pastillas para adelgazar | Pierde 10kg en una semana, garantizado. | Productos Milagro |

---

## 3. El Pipeline de RAG: De un Anuncio a un Contexto Enriquecido

Ahora, construimos la función que toma un nuevo anuncio y lo enriquece con conocimiento relevante.

```python
from langchain.schema.runnable import RunnablePassthrough

def get_relevant_context(user_title: str, user_description: str, vectorstore_policies, vectorstore_frauds):
    """
    Recupera políticas y fraudes similares a un nuevo anuncio.
    """
    query = f"Título: {user_title}\nDescripción: {user_description}"
    
    # Búsqueda en ambas colecciones
    policy_results = vectorstore_policies.similarity_search(query, k=2)
    fraud_results = vectorstore_frauds.similarity_search(query, k=3)
    
    # Formatear el contexto
    context = "--- CONTEXTO RELEVANTE ---\n"
    context += "Políticas Potencialmente Relevantes:\n"
    for doc in policy_results:
        context += f"- {doc.page_content}\n"
        
    context += "\nEjemplos de Fraudes Similares:\n"
    for doc in fraud_results:
        context += f"- {doc.page_content}\n"
        
    return context

# Esto se integrará en una cadena de LangChain
retriever = RunnablePassthrough.assign(
    context=lambda x: get_relevant_context(x["title"], x["description"], vectorstore_policies, vectorstore_frauds)
)
```

---

## 4. El Agente Cognitivo: El Prompt de Decisión

Este es el cerebro. Usamos un prompt cuidadosamente diseñado para instruir al LLM sobre cómo actuar.

```python
from langchain.prompts import ChatPromptTemplate
from langchain_community.chat_models import ChatOllama

# Prompt Template
template = """
Eres "El Guardián", un experto en moderación de contenido para un marketplace online.
Tu misión es analizar un nuevo anuncio y decidir si debe ser APROBADO, RECHAZADO o MARCADO PARA REVISIÓN HUMANA.
Debes basar tu decisión ÚNICAMENTE en el contexto proporcionado.

**Contexto:**
{context}

**Nuevo Anuncio a Analizar:**
- Título: {title}
- Descripción: {description}

**Tu Tarea:**
1.  **Analiza** el anuncio comparándolo con las políticas y los ejemplos de fraude del contexto.
2.  **Decide** una de las tres acciones: `APROBADO`, `RECHAZADO`, `REVISIÓN`.
    -   Usa `RECHAZADO` si hay una violación clara.
    -   Usa `APROBADO` si no hay ninguna señal de alarma.
    -   Usa `REVISIÓN` si es ambiguo o podría ser un error del usuario.
3.  **Justifica** tu decisión en una frase corta y clara.
4.  **Responde** en formato JSON.

**Ejemplo de Respuesta:**
{
  "decision": "RECHAZADO",
  "reason": "El anuncio infringe la política de Precios Irrealistas (POL-002) al listar un producto de alto valor a un precio simbólico."
}
"""

prompt = ChatPromptTemplate.from_template(template)
llm = ChatOllama(model="llama3", format="json")

# Cadena Completa de LangChain
chain = retriever | prompt | llm
```

### Ejecución del Agente

```python
# Caso de Prueba 1: Anuncio Fraudulento
new_ad_scam = {
    "title": "iPhone 15 nuevo a 1 euro",
    "description": "Oferta especial solo hoy, contactar por fuera de la app."
}
response = chain.invoke(new_ad_scam)
print(json.loads(response.content))
# Salida esperada:
# {
#   "decision": "RECHAZADO",
#   "reason": "El anuncio infringe la política de Precios Irrealistas (POL-002) y solicita contacto externo, una táctica común en estafas."
# }

# Caso de Prueba 2: Anuncio Legítimo
new_ad_legit = {
    "title": "Mesa de comedor de madera usada",
    "description": "Vendo mesa de comedor para 6 personas. Tiene algunas marcas de uso pero está en buen estado. Medidas: 160x90cm."
}
response = chain.invoke(new_ad_legit)
print(json.loads(response.content))
# Salida esperada:
# {
#   "decision": "APROBADO",
#   "reason": "El anuncio parece legítimo y no infringe ninguna política de contenido."
# }
```

---

## 5. Evaluación y Monitoreo (MLOps)

Construir el agente es solo el 50% del trabajo. Asegurar su fiabilidad es la otra mitad.

### Creación de un Dataset de Evaluación

Es crucial tener un "golden dataset" para medir la precisión.

**`evaluation_dataset.csv`**

| test_id | title | description | expected_decision | expected_reason_keyword |
| :--- | :--- | :--- | :--- | :--- |
| T-001 | Vendo PS5 por 50€ | Urgente, solo hoy. | RECHAZADO | Precio Irrealista |
| T-002 | Coche de segunda mano | Ford Focus 2018, 100.000km. | APROBADO | N/A |
| T-003 | Cuchillo de caza | Hoja de acero de Damasco. | RECHAZADO | Armas |
| T-004 | Busco trabajo de niñera | Cuido niños, tardes. | REVISIÓN | Anuncio de servicio |

Se puede crear un script que itere sobre este dataset, llame a la `chain.invoke` para cada caso y compare la `decision` obtenida con la `expected_decision`.

### Métricas a Monitorear

*   **Precisión del Agente:** (`TP + TN`) / `Total`
*   **Tasa de Falsos Positivos:** `FP` / (`FP + TN`) - ¡La más importante para no frustrar a los usuarios!
*   **Latencia p99:** El tiempo que tarda el agente en dar una respuesta. Debe ser inferior a 2 segundos.
*   **Tasa de "REVISIÓN":** El porcentaje de anuncios que se escalan a humanos. El objetivo es mantenerlo por debajo del 10%.

Herramientas como **LangSmith** o **Arize AI** son ideales para este tipo de monitoreo, ya que permiten rastrear cada paso de la cadena de RAG, ver qué contexto se recuperó y por qué el LLM tomó una decisión específica.

## 6. Conclusión

Hemos construido el esqueleto funcional de "El Guardián". Este enfoque basado en RAG es superior a los modelos de clasificación tradicionales porque es:
*   **Transparente:** Podemos ver exactamente qué políticas o ejemplos de fraude usó el agente para su decisión.
*   **Fácil de Actualizar:** Para enseñar al agente una nueva regla, simplemente añadimos un documento a la base de datos vectorial, sin necesidad de re-entrenar un modelo completo.
*   **Explicativo:** Proporciona feedback útil al usuario, educándolo sobre las normas de la comunidad.

El siguiente paso sería escalar esta solución, optimizar la base de datos para producción (ej. usando Pinecone o Weaviate) y construir una UI robusta para el equipo de revisión humana.
