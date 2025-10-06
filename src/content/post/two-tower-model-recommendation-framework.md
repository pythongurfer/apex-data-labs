---
publishDate: '2025-10-20T10:00:00Z'
title: 'Anatomía de un Recomendador Moderno: El Framework del Two-Tower Model'
excerpt: "Un resumen técnico del Two-Tower Model, la arquitectura estrella para sistemas de recomendación a gran escala. Desglosamos su entrenamiento, el proceso de conversión de sesiones a embeddings y los cruciales trade-offs del tamaño del embedding en la latencia y el costo."
category: 'Deep Learning & PyTorch'
tags:
  - Recommendation Systems
  - Two-Tower Model
  - Deep Learning
  - MLOps
  - Embeddings
image: '~/assets/images/articles/mlops.png'
imageAlt: 'Un diagrama de flujo de MLOps mostrando el ciclo de vida de un modelo, desde los datos hasta el despliegue.'
author: 'Anika Rosenzuaig'
draft: false
---

## 1. Introducción: La Elegancia de la Separación de Intereses

En el corazón de muchos sistemas de recomendación modernos de Google, YouTube y otras grandes tecnológicas, se encuentra una arquitectura elegante y eficiente: el **Two-Tower Model (Modelo de Dos Torres)**. Su popularidad no es casual. Resuelve uno de los mayores desafíos en los sistemas de recomendación a gran escala: cómo equilibrar la complejidad de un modelo de Deep Learning con la necesidad de una inferencia en tiempo real de bajísima latencia.

La idea central es simple pero poderosa: en lugar de tener un único modelo monolítico que procesa toda la información del usuario y del ítem a la vez, separamos el problema en dos. Se construyen dos redes neuronales (torres) independientes: una para el usuario y otra para el ítem.

Este artículo es un resumen técnico de este framework. Desglosaremos cómo se entrena, cómo transforma el comportamiento del usuario en un vector de "intención", y los importantes trade-offs de ingeniería que deben considerarse, especialmente en lo que respecta al tamaño del embedding.

---

## 2. La Arquitectura del Two-Tower Model

Imagina que tienes que encontrar la pareja perfecta para una persona en una sala llena de gente. Un enfoque lento sería entrevistarlos a ambos juntos cada vez. Un enfoque mucho más rápido sería crear una "ficha" resumida para cada persona por separado y luego simplemente comparar las fichas. El Two-Tower Model hace exactamente esto.

*   **La Torre de Usuario (User Tower o Query Tower):**
    *   **Entrada:** Todas las características disponibles sobre el usuario y su contexto actual. Esto puede incluir su ID, su historial de clics, su ubicación, la hora del día, etc.
    *   **Salida:** Un único vector numérico de dimensionalidad fija (ej. 128 dimensiones), conocido como el **embedding del usuario**. Este vector es la "ficha" que resume los intereses y la intención del usuario en este preciso momento.

*   **La Torre de Ítem (Item Tower o Candidate Tower):**
    *   **Entrada:** Todas las características disponibles sobre un producto del catálogo. Esto incluye su ID, el texto de su título, su categoría, su precio, etc.
    *   **Salida:** Un único vector numérico de la **misma dimensionalidad** que el embedding del usuario (128 dimensiones), conocido como el **embedding del ítem**. Esta es la "ficha" del producto.

**La Magia de la Inferencia:**
La clave de esta arquitectura es que las dos torres se pueden ejecutar en momentos diferentes:

1.  **Offline:** La Torre de Ítem se ejecuta sobre **todo el catálogo de productos una sola vez** (o periódicamente). Los millones de embeddings de ítems resultantes se guardan en una base de datos vectorial (como FAISS).
2.  **Online (En Tiempo Real):** Cuando un usuario solicita recomendaciones, solo se ejecuta la **Torre de Usuario** para generar su embedding. Luego, este embedding se usa para hacer una búsqueda de similitud ultrarrápida en la base de datos vectorial pre-calculada.

Este desacoplamiento es lo que permite servir recomendaciones complejas en milisegundos.

---

## 3. El Proceso de Entrenamiento: Enseñando a las Torres a "Hablar el Mismo Idioma"

El objetivo del entrenamiento es enseñar a las dos torres a proyectar usuarios e ítems en un espacio vectorial compartido, de tal manera que un usuario y un ítem que le gusta estén cerca en ese espacio.

#### **Dataset de Entrenamiento**

El dataset consiste en millones de ejemplos de interacciones positivas, es decir, pares `(usuario, ítem)` donde sabemos que el usuario mostró interés en el ítem (ej. hizo clic, lo compró, lo guardó en favoritos).

| `user_features` | `item_features` | `label` |
| :--- | :--- | :--- |
| {historial: ['prod-A', 'prod-B'], loc: 'Berlin'} | {title: "Producto C", category: "Elektronik"} | 1 (Positivo) |
| {historial: ['prod-A', 'prod-B'], loc: 'Berlin'} | {title: "Producto Z", category: "Garten"} | 0 (Negativo) |

#### **El Bucle de Entrenamiento y la Función de Pérdida**

1.  **Paso de Lote (Batch Forward Pass):** En cada paso, se toma un lote de datos que contiene tanto ejemplos positivos como negativos.
    *   Las características de los usuarios del lote se pasan por la Torre de Usuario para obtener sus embeddings.
    *   Las características de los ítems del lote se pasan por la Torre de Ítem para obtener sus embeddings.

2.  **Cálculo de la Similitud:** Para cada par `(usuario, ítem)` en el lote, se calcula la similitud entre sus embeddings. La métrica de similitud más común es el **producto punto (dot product)**. Un producto punto alto significa que los vectores están alineados y son similares.

3.  **Función de Pérdida (Loss Function):** El modelo necesita una forma de saber qué tan "equivocado" está. Se utiliza una función de pérdida que compara la similitud predicha con la etiqueta real.
    *   **Pérdida Logística (Binary Cross-Entropy):** Se puede tratar como un problema de clasificación binaria. Se aplica una función sigmoide a la puntuación de similitud para obtener una probabilidad (de 0 a 1) y se compara con la etiqueta (0 o 1).
    *   **Pérdida de Contraste (Contrastive Loss / Triplet Loss):** Un enfoque más directo que busca maximizar la similitud de los pares positivos mientras minimiza la de los pares negativos.

4.  **Retropropagación (Backpropagation):** La pérdida se retropropaga a través de **ambas torres simultáneamente**, ajustando sus pesos para que la próxima vez, la similitud de los pares positivos sea mayor y la de los negativos sea menor.

**El Papel Crucial del Muestreo de Negativos (Negative Sampling):**
Simplemente tomar ítems al azar como negativos no es muy eficiente. Una técnica clave es el **muestreo de negativos en el lote (in-batch negative sampling)**. Para un par positivo `(usuario_A, item_A)` en un lote, todos los demás ítems en ese mismo lote `(item_B, item_C, ...)` se consideran como negativos para `usuario_A`. Esto es computacionalmente muy eficiente y proporciona "negativos duros" (hard negatives) que son más informativos para el modelo.

---

## 4. De la Sesión al Embedding: La Torre de Usuario en Acción

La Torre de Usuario es donde ocurre la "magia" de la personalización en tiempo real. Su trabajo es tomar la actividad desordenada de un usuario y destilarla en un vector de intención.

#### **Paso a Paso de la Conversión:**

1.  **Recopilación de Características:** Se recopilan las características del contexto actual. La más importante es el **historial de interacciones recientes** (ej. los últimos 10 `item_ids` con los que el usuario ha hecho clic o ha visto). También se pueden incluir características como la categoría que está viendo, la hora del día, etc.

2.  **Embedding de las Características de Entrada:** Cada característica categórica (como los `item_ids` del historial) se convierte primero en su propio embedding. La torre tiene una capa de embedding (una tabla de búsqueda) para los ítems, similar a la de la Torre de Ítem.

3.  **Agregación (Pooling):** Ahora tenemos una secuencia de embeddings (ej. 10 vectores de 128 dimensiones cada uno, correspondientes a los 10 ítems del historial). Necesitamos combinar esta secuencia en un único vector que represente la sesión completa.
    *   **Promedio (Average Pooling):** El enfoque más simple. Se promedian los vectores de la secuencia. Es rápido y robusto, pero pierde la información del orden.
    *   **Redes Neuronales Recurrentes (LSTM/GRU):** Procesan la secuencia en orden, permitiendo que el modelo aprenda patrones secuenciales. El estado oculto final de la RNN se usa como el embedding de la sesión.
    *   **Mecanismos de Atención (Attention/Transformers):** El enfoque más avanzado. El modelo aprende a dar más "atención" o peso a los ítems más importantes de la secuencia para construir el embedding final. Por ejemplo, si un usuario busca `funda -> cargador -> TV`, un mecanismo de atención podría aprender a ignorar la "TV" si el contexto principal es "accesorios de móvil".

4.  **Capas Finales y Normalización:** El vector agregado pasa a través de unas pocas capas lineales (MLP) para una transformación final. Por último, el embedding de salida se normaliza (L2 normalization) para que tenga una longitud de 1. Esto estabiliza el entrenamiento y hace que el producto punto sea equivalente a la similitud del coseno.

El resultado de este proceso es un único vector que captura la "intención" del usuario en ese preciso momento.

---

## 5. El Tamaño del Embedding: Un Crucial Trade-Off de Ingeniería

La elección de la dimensionalidad del embedding (ej. 64, 128, 256) no es una decisión trivial. Es un compromiso fundamental entre la calidad del modelo y las restricciones del mundo real.

#### **Embedding Pequeño (ej. 32 o 64 dimensiones)**

*   **Ventajas:**
    *   **Menor Latencia:** Los cálculos (producto punto, búsqueda en FAISS) son más rápidos.
    *   **Menor Costo de Memoria:** El índice FAISS que almacena los embeddings de todo el catálogo ocupa mucho menos espacio en RAM. Esto es un factor de costo enorme.
    *   **Inferencia más Rápida:** Los modelos son más pequeños y rápidos.
*   **Desventajas:**
    *   **Menor Capacidad Expresiva:** Un vector más pequeño tiene menos "espacio" para capturar los matices y la complejidad de los ítems y usuarios. Puede agrupar ítems que no son tan similares.
    *   **Menor Precisión:** Generalmente, conduce a una menor precisión en las métricas offline y online.

#### **Embedding Grande (ej. 256 o 512 dimensiones)**

*   **Ventajas:**
    *   **Mayor Capacidad Expresiva:** Puede capturar relaciones más sutiles y complejas, resultando en embeddings de mayor calidad.
    *   **Mayor Precisión:** A menudo se correlaciona con mejores métricas de recomendación.
*   **Desventajas:**
    *   **Mayor Latencia:** La búsqueda de similitud en un espacio de mayor dimensionalidad es computacionalmente más costosa.
    *   **Mayor Costo de Memoria (¡Crítico!):** El tamaño del índice FAISS puede explotar. Pasar de 128 a 256 dimensiones duplica el uso de memoria. Para un catálogo de 100 millones de ítems, esto puede significar terabytes de RAM adicionales.
    *   **Riesgo de Sobreajuste (Overfitting):** Un modelo con más parámetros (un embedding más grande) es más propenso a memorizar los datos de entrenamiento en lugar de generalizar.

#### **El Rol de MLOps y la Cuantización**

*   **MLOps:** El equipo de MLOps es responsable de medir y optimizar este trade-off. Realizan experimentos para encontrar el "punto dulce" donde la ganancia de precisión de un embedding más grande ya no justifica el aumento en el costo y la latencia.
*   **Cuantización de Productos (Product Quantization - PQ):** Técnicas como PQ, implementadas en FAISS, permiten comprimir los vectores de embedding (ej. de 32-bit floats a 8-bit integers), reduciendo drásticamente el uso de memoria a costa de una pequeña pérdida de precisión. La elección del tamaño del embedding está íntimamente ligada a la estrategia de cuantización.

---

## 6. Riesgos y Mitigación

*   **Riesgo: Torres Desbalanceadas.** Si una torre es mucho más compleja que la otra (ej. una Torre de Usuario muy profunda y una Torre de Ítem muy simple), el entrenamiento puede ser inestable.
    *   **Mitigación:** Empezar con arquitecturas simétricas y experimentar gradualmente.

*   **Riesgo: Fuga de Datos (Data Leakage).** El error más común es usar información del futuro para predecir el pasado durante el entrenamiento. Por ejemplo, usar una interacción que ocurrió a las 10:05 para generar el embedding de un usuario a las 10:02.
    *   **Mitigación:** Ser extremadamente riguroso con los timestamps en la preparación de los datos de entrenamiento. Asegurarse de que solo se usa el historial *anterior* al momento de la interacción que se está prediciendo.

*   **Riesgo: El Mundo Real es más que un Producto Punto.** El modelo asume que la relevancia es capturada por la similitud en el espacio de embedding. Pero en el mundo real, la relevancia también depende de factores no modelados (ej. un ítem está fuera de stock, el tiempo de envío es demasiado largo).
    *   **Mitigación:** El Two-Tower Model es solo la **primera etapa de recuperación de candidatos**. Siempre debe ir seguido de una **segunda etapa de re-ranking** que toma los mejores candidatos y los reordena usando un modelo más complejo (como XGBoost o LambdaMART) que incluye todas estas características del mundo real.

En conclusión, el Two-Tower Model es un framework potente y probado en batalla que equilibra la expresividad del Deep Learning con las demandas de la producción a gran escala. Su éxito depende de un entrenamiento cuidadoso, una comprensión profunda de los trade-offs de ingeniería y su integración en un sistema de recomendación de múltiples etapas.
