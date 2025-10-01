---
publishDate: '2025-10-26T10:00:00Z'
title: 'Guía Técnica: Un Agente de IA para Optimizar Anuncios con RAG'
excerpt: "Tutorial avanzado para construir 'El Asistente'. Detallamos cómo usar RAG para analizar datos de mercado en tiempo real, generar sugerencias de título, precio y descripción con un LLM, y cómo estructurar el sistema para ofrecer una experiencia de usuario dinámica y sin fricción."
category: 'ML Engineering & Architecture'
tags:
  - RAG
  - LLM
  - Growth Hacking
  - Python
  - E-commerce
  - UX
image: '~/assets/images/articles/feature-engineering.png'
imageAlt: 'Un gráfico de crecimiento con una flecha ascendente, con engranajes de IA impulsándolo.'
author: 'Anika Rosenzuaig'
draft: false
layout: '~/layouts/PostLayout.astro'
---

## 1. Introducción: De la Fricción a la Fluidez

En la primera guía técnica, construimos un agente de IA defensivo ("El Guardián"). Ahora, construiremos uno ofensivo: **"El Asistente"**. Su objetivo no es bloquear, sino potenciar. Transforma la experiencia de crear un anuncio de un formulario estático a una conversación inteligente que guía al vendedor hacia el éxito.

Este artículo se sumerge en la arquitectura y el código necesarios para construir un sistema que ofrece sugerencias de optimización en tiempo real, basadas en datos históricos de mercado.

**Stack Tecnológico:**
*   **Lenguaje:** Python
*   **Orquestación:** LangChain
*   **Base de Datos Vectorial:** ChromaDB
*   **Modelos (LLM y Embeddings):** Modelos de código abierto vía Ollama.

---

## 2. La Base de Conocimiento: El Pulso del Mercado

A diferencia de "El Guardián", la base de conocimiento de "El Asistente" no contiene reglas, sino el "conocimiento colectivo" de miles de transacciones exitosas.

### Dataset Simulado: `successful_listings.csv`

Este dataset es la clave. Contiene datos agregados y anonimizados de anuncios que se vendieron rápidamente y a buen precio.

| listing_id | category | title | price_eur | days_to_sell | condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| L-001 | Smartphones | iPhone 14 Pro 256GB Morado - Impecable | 950 | 3 | Usado - Como Nuevo |
| L-002 | Muebles | Sofá Chaise Longue 3 Plazas Gris | 400 | 7 | Usado - Buen Estado |
| L-003 | Smartphones | Samsung Galaxy S23 Ultra 512GB | 1050 | 5 | Nuevo |
| L-004 | Muebles | Mesa de centro de roble macizo | 150 | 2 | Usado - Buen Estado |

**Código Python para la Ingesta en ChromaDB:**
```python
import chromadb
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
import pandas as pd

# 1. Cargar y preparar los datos
df = pd.read_csv('successful_listings.csv')
# Creamos un texto descriptivo para cada anuncio exitoso
documents = df.apply(
    lambda row: f"Título: {row['title']}. Categoría: {row['category']}. Se vendió por {row['price_eur']} euros en {row['days_to_sell']} días.",
    axis=1
).tolist()
metadatas = df.to_dict('records')

# 2. Inicializar y poblar la base de datos vectorial
embeddings = OllamaEmbeddings(model="bge-small-en-v1.5")
vectorstore_market = Chroma(
    collection_name="market_data",
    embedding_function=embeddings
)
vectorstore_market.add_texts(texts=documents, metadatas=metadatas)

print("✅ Base de datos de mercado creada.")
```

---

## 3. El Pipeline de RAG: Sugerencias Basadas en Datos

El núcleo de "El Asistente" es un pipeline que, a partir de un borrador de anuncio, genera un conjunto de sugerencias accionables.

### 3.1. El Agente Multi-Prompt

En lugar de un único prompt monolítico, usaremos un enfoque más modular con un prompt para cada sugerencia (título, precio, descripción). Esto nos da más control y facilita la depuración.

**Función de Recuperación de Contexto:**
```python
def get_market_context(draft_title: str, vectorstore_market):
    """
    Recupera los 3 anuncios exitosos más similares de la base de datos.
    """
    results = vectorstore_market.similarity_search(draft_title, k=3)
    
    context = "--- DATOS DE MERCADO RELEVANTES ---\n"
    context += "Aquí hay ejemplos de anuncios similares que se vendieron con éxito:\n"
    for doc in results:
        context += f"- {doc.page_content}\n"
        
    return context
```

### 3.2. Prompt para Sugerencia de Título

```python
from langchain.prompts import ChatPromptTemplate
from langchain_community.chat_models import ChatOllama

title_template = """
Eres un experto en marketing para e-commerce. Tu tarea es mejorar el título de un anuncio para maximizar su atractivo.

**Datos de Mercado (Anuncios Exitosos):**
{context}

**Borrador del Vendedor:**
- Título: {draft_title}

**Tu Tarea:**
1.  Analiza los títulos de los anuncios exitosos. Identifica patrones (ej. marca, modelo, capacidad, estado).
2.  Re-escribe el "Borrador del Vendedor" para que sea más descriptivo y atractivo, siguiendo el formato de los anuncios exitosos.
3.  Responde únicamente con el nuevo título sugerido, sin explicaciones.

**Nuevo Título Sugerido:**
"""
title_prompt = ChatPromptTemplate.from_template(title_template)
llm = ChatOllama(model="llama3")

# Cadena para el título
title_chain = title_prompt | llm
```

### 3.3. Prompt para Sugerencia de Precio

```python
price_template = """
Eres un analista de precios. Tu tarea es sugerir un precio competitivo para un anuncio.

**Datos de Mercado (Anuncios Exitosos):**
{context}

**Borrador del Vendedor:**
- Título: {draft_title}
- Descripción: {draft_description}

**Tu Tarea:**
1.  Observa los precios de los anuncios similares en los datos de mercado.
2.  Considera la descripción del vendedor para ajustar el precio (ej. si menciona "nuevo en caja" o "con marcas de uso").
3.  Sugiere un rango de precios competitivo y un precio recomendado para una venta rápida.
4.  Responde en formato JSON con las claves `recommended_price` y `price_range`.

**Ejemplo de Respuesta:**
{
  "recommended_price": 920,
  "price_range": "880-950"
}
"""
price_prompt = ChatPromptTemplate.from_template(price_template)
json_llm = ChatOllama(model="llama3", format="json")

# Cadena para el precio
price_chain = price_prompt | json_llm
```

### 3.4. Orquestación del Agente Asistente

Ahora, combinamos todo en una única función que devuelve un diccionario de sugerencias.

```python
from langchain.schema.runnable import RunnableParallel

def run_assistant_agent(draft_title: str, draft_description: str, vectorstore_market):
    
    # 1. Recuperar contexto una sola vez
    context = get_market_context(draft_title, vectorstore_market)
    
    # 2. Definir las cadenas para cada tarea en paralelo
    suggestion_map = RunnableParallel(
        title=title_chain,
        price=price_chain
        # Se podría añadir una cadena para 'description', 'category', etc.
    )
    
    # 3. Invocar el mapa de sugerencias
    suggestions = suggestion_map.invoke({
        "draft_title": draft_title,
        "draft_description": draft_description,
        "context": context
    })
    
    return suggestions

# --- Ejecución ---
draft_ad = {
    "title": "vendo iphone",
    "description": "funciona bien, es el morado"
}

final_suggestions = run_assistant_agent(
    draft_ad["title"],
    draft_ad["description"],
    vectorstore_market
)

print(final_suggestions)
```

**Salida Esperada:**
```json
{
  "title": {
    "content": "iPhone 14 Pro 256GB Morado - Impecable en Caja"
  },
  "price": {
    "content": "{\"recommended_price\": 920, \"price_range\": \"880-950\"}"
  }
}
```
*Nota: La salida del LLM puede venir como un objeto `AIMessage` o similar, aquí se muestra el contenido extraído.*

---

## 4. Integración con la Interfaz de Usuario (UI)

El verdadero poder de "El Asistente" se materializa en la UI. El frontend haría una llamada a un endpoint de API que ejecuta `run_assistant_agent` cada vez que el usuario deja de escribir por unos segundos (debounce).

Las sugerencias devueltas por la API se usarían para actualizar dinámicamente la UI:

*   **Título:** Un pequeño botón "Mejorar Título ✨" aparece al lado del campo de texto. Al hacer clic, reemplaza el texto del usuario con la sugerencia.
*   **Precio:** Debajo del campo de precio, aparece un texto: "Te recomendamos **920€** (rango de mercado: 880€-950€)". El usuario puede hacer clic en el precio recomendado para auto-rellenarlo.
*   **Descripción:** Se podrían generar "etiquetas de características" que el usuario puede añadir con un clic: `[+ Salud de Batería 98%]`, `[+ Incluye Cargador Original]`, `[+ Sin Arañazos]`.

Este enfoque reduce la carga cognitiva a cero. El usuario no tiene que pensar, solo tiene que confirmar las sugerencias inteligentes del sistema.

## 5. Desafíos y Consideraciones Avanzadas

*   **Latencia:** Ejecutar múltiples llamadas a un LLM puede ser lento. Para producción, se requerirían modelos optimizados (ej. con TensorRT-LLM) y una infraestructura de inferencia escalable.
*   **Personalización:** Una versión más avanzada podría personalizar las sugerencias basándose en el historial de ventas del propio vendedor. ¿Sus artículos suelen venderse más rápido a un precio ligeramente inferior al promedio?
*   **Multimodalidad:** El siguiente paso sería permitir al usuario subir una foto del producto y que un modelo de visión (como LLaVA) identifique el producto, su estado y rellene el borrador del anuncio automáticamente.

## 6. Conclusión

"El Asistente" es un ejemplo perfecto de cómo la IA generativa puede ser usada para crear valor y crecimiento, no solo para reducir costos. Al cambiar el paradigma de "rellenar un formulario" a "tener una conversación con un experto", eliminamos la fricción, empoderamos a los vendedores y creamos un marketplace más eficiente y exitoso para todos. La clave del éxito no reside solo en la inteligencia del LLM, sino en la calidad de los datos de mercado que lo alimentan y en la fluidez de la experiencia de usuario que lo presenta.
