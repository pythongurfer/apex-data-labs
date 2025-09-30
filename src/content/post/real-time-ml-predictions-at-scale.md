---
publishDate: '2025-10-27T10:00:00Z'
title: 'The Last Mile: A Deep Dive into Real-Time ML Predictions at Scale'
excerpt: "A 2500+ word deep-dive into the two-phase 'retrieve then re-rank' architecture, technology choices (Solr vs. Elasticsearch, Redis, SageMaker), Java code examples, and a guide to building resilient, low-latency ML systems."
category: 'ML Engineering & Architecture'
tags:
  - MLOps
  - Architecture
  - Java
  - Solr
  - Redis
  - SageMaker
  - Real-Time
image: '~/assets/images/articles/real-time-ml-pipeline.jpg'
imageAlt: 'An end-to-end architectural diagram showing a user request flowing through Solr, a Java service, Redis, and a SageMaker endpoint to return a ranked list.'
author: 'Anika Rosenzuaig'
tableOfContents: true
draft: false
layout: '~/layouts/PostLayout.astro'
---

## Introduction: The 200 Millisecond Challenge

In our previous articles, we've explored the strategic value of multi-objective ranking and the immense effort required to build a "Feature Factory" that processes terabytes of data. But all that work is purely academic if we cannot leverage it within the unforgiving time budget of a live user request. When a user searches for a product on a global marketplace, they expect relevant results in the blink of an eye. Our performance budget is **under 200 milliseconds**.

This presents the ultimate engineering challenge: how do you bridge the gap between the batch-processed, feature-rich world of Spark and the low-latency, high-throughput demands of a real-time search API? How do you take features calculated over hours and apply them in milliseconds?

This article is the definitive guide to "The Last Mile" of machine learning: the real-time prediction pipeline. We will dissect the two-phase "retrieve then re-rank" architecture that makes this possible. We'll perform a deep dive into our technology choices—why we chose Solr over Elasticsearch for this specific use case, how we leverage AWS ElastiCache for Redis as our online feature store, and the role of AWS SageMaker. Finally, we will get our hands dirty with Java code snippets and discuss the common failure points of this architecture and how to build a resilient system that can withstand the pressures of production at massive scale.

## Chapter 1: The Two-Phase Search Paradigm: Retrieve then Re-rank

It is computationally impossible to run a complex machine learning model across tens of millions of documents for every single user query. The latency would be measured in minutes, not milliseconds. To solve this, the industry has converged on a powerful, two-phase architectural pattern:

1.  **Phase 1: Candidate Retrieval (Recall-Focused)**: The first step is to cast a wide but efficient net. The goal is to quickly select a few hundred *potentially relevant* candidates from the millions of documents in the index. This phase prioritizes **recall**—ensuring that all the "good" documents are likely included in this initial set. It uses simpler, traditional information retrieval techniques like BM25.

2.  **Phase 2: Re-ranking (Precision-Focused)**: The second step is to apply intelligence. Once we have a manageable set of candidates (e.g., 200), we can afford to use a more computationally expensive, feature-rich machine learning model to score and re-rank them. This phase prioritizes **precision**—ensuring that the top items shown to the user are the absolute best fit according to our multi-objective business goals.

This separation of concerns is the fundamental principle that allows us to balance performance with intelligence.

## Chapter 2: A Deep Dive into the Technology Stack

Our architecture is a carefully chosen set of best-in-class tools, each selected for a specific job.

#### **2.1 The Search Engine: Why Solr over Elasticsearch?**

The candidate retrieval phase is handled by our search engine. While Elasticsearch is often seen as the more modern choice, we made a deliberate decision to build upon our existing, battle-hardened **Apache Solr** cluster.

| Consideration | Apache Solr | Elasticsearch | Our Rationale |
| :--- | :--- | :--- | :--- |
| **Core Strength** | Excellent text search (Lucene core). Mature and stable. | Strong in text search, but also excels at analytics and log aggregation. | Our primary use case was pure-play text search, where Solr's maturity provided a stable, predictable foundation. |
| **Ecosystem** | Has a long-standing, dedicated Learning-to-Rank (LTR) plugin. | LTR capabilities exist but are often less integrated or require more custom work. | The existence of a well-supported Solr LTR plugin was a major accelerator for our project. |
| **Performance** | Can be slightly faster for static, text-heavy search workloads. | Often faster for dynamic data and complex aggregations. | For our high-recall, low-complexity initial query, Solr's performance was exceptional and highly tunable. |
| **Community & API** | Smaller community, more "traditional" XML/Java configuration. | Larger, more active community. Modern JSON-based REST API. | This was a clear win for Elasticsearch. However, our team had deep Java and Solr expertise, mitigating this drawback. |

**Conclusion**: For a greenfield project, Elasticsearch might have been the choice. But given our existing infrastructure, deep in-house expertise, and the specific need for a robust LTR integration for text search, **Solr was the pragmatic and technically sound decision.** It provided the stability and core features we needed without requiring a complete organizational shift.

#### **2.2 The Online Feature Store: AWS ElastiCache for Redis**

The heart of our real-time pipeline is the online feature store. This is where we store the latest feature values for every document, ready to be fetched in single-digit milliseconds. We chose **Redis**, specifically the managed **AWS ElastiCache for Redis** service.

**Why Redis?**
*   **Blazing Speed**: As an in-memory data store, Redis provides the sub-millisecond latency required for real-time feature lookups.
*   **Rich Data Structures**: We don't just store simple key-value pairs. We use Redis **Hashes**, which are perfect for this use case. Each document ID becomes a key, and the value is a hash map containing all of its feature names and values.
    ```
    # Storing a feature vector for a single document
    HSET features:ad_id:doc-123 price 500.0 ad_ctr_7d 0.045 seller_rating 4.8
    ```
*   **High Concurrency**: ElastiCache for Redis can handle tens of thousands of concurrent requests, which is essential for a high-traffic search API.
*   **Managed Service**: Using AWS ElastiCache abstracts away the operational overhead of managing a Redis cluster (patching, scaling, replication), allowing our team to focus on the application logic.

#### **2.3 The Model Serving Layer: AWS SageMaker**

For serving our LambdaMART model, we use **AWS SageMaker Endpoints**. This decouples the model from our main Java application.

*   **Auto-Scaling**: SageMaker can automatically scale the number of model instances based on the number of incoming requests, ensuring consistent performance during traffic spikes.
*   **A/B Testing**: SageMaker provides built-in support for production variants, allowing us to easily deploy a new model candidate to a small percentage of traffic (e.g., 5%) and compare its performance against the current champion model before a full rollout.
*   **Decoupling**: If the model crashes, it doesn't bring down the entire search service. This isolation is critical for system resilience.

## Chapter 3: The Real-Time Prediction Journey - Code and Architecture

Let's trace a single user request for "leather sofa" through our system, complete with simplified Java code examples.

**Architectural Diagram:**
![Real-time ML Prediction Pipeline](~/assets/images/articles/real-time-ml-pipeline.jpg)

```
User Request ("leather sofa")
       |
       v
[1. Solr Cluster]
   - Keyword search (BM25)
   - Mandatory filters
   - Retrieves Top 200 Candidate docIDs
       |
       v
[2. Java Backend Service]
   - Receives 200 docIDs
   - Fetches 200 feature vectors from [Online Feature Store (Redis)] in parallel
       |
       v
[3. SageMaker Model Endpoint]
   - Receives 200 feature vectors
   - Model scores each candidate
   - Returns sorted list of docIDs
       |
       v
[2. Java Backend Service]
   - Receives sorted list
   - Takes Top 20
   - Fetches display data (e.g., from a document DB)
       |
       v
Final Ranked Results to User
```

#### **Step 1: Candidate Retrieval (Solr)**

The Java backend constructs a simple query and sends it to Solr.
```java
// Using SolrJ, the official Java client for Solr
SolrQuery query = new SolrQuery("description:leather sofa");
query.setFilterQueries("market_id:br");
query.setRows(200); // We only want the top 200 candidates
query.setFields("id"); // We only need the document ID

QueryResponse response = solrClient.query(query);
List<String> candidateIds = response.getResults().stream()
                                  .map(doc -> (String) doc.getFieldValue("id"))
                                  .collect(Collectors.toList());
```

#### **Step 2: Feature Hydration (Java & Redis)**

This is the most latency-sensitive step. We must fetch 200 feature vectors from Redis as fast as possible. A naive, sequential approach would be too slow. We must use parallelism and pipelining.

```java
// Using Lettuce, a modern Redis client for Java
// This demonstrates using Java's CompletableFuture for parallelism

// 1. Create a list of keys to fetch from Redis
List<String> redisKeys = candidateIds.stream()
                                     .map(id -> "features:ad_id:" + id)
                                     .collect(Collectors.toList());

// 2. Asynchronously fetch all feature vectors in parallel
List<CompletableFuture<Map<String, String>>> futures = redisKeys.stream()
    .map(key -> redisAsyncCommands.hgetall(key).toCompletableFuture())
    .collect(Collectors.toList());

// 3. Wait for all parallel requests to complete
CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

// 4. Collect the results
List<Map<String, String>> featureVectors = futures.stream()
                                                  .map(CompletableFuture::join)
                                                  .collect(Collectors.toList());
```
This code fetches all 200 feature vectors in just a few network round-trips, making it incredibly efficient.

#### **Step 3: Model Prediction (SageMaker)**

The backend now has the feature vectors. It formats them into the JSON payload expected by the SageMaker endpoint and makes a single HTTP POST request.

```java
// Using a standard HTTP client
String requestBody = convertFeatureVectorsToJson(featureVectors); // Helper function
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://runtime.sagemaker.us-east-1.amazonaws.com/endpoints/our-ranking-model/invocations"))
    .header("Content-Type", "application/json")
    .POST(BodyPublishers.ofString(requestBody))
    .build();

HttpResponse<String> response = httpClient.send(request, BodyHandlers.ofString());
List<Double> scores = parseScoresFromJson(response.body()); // Helper function
```

The service then pairs these scores with the original document IDs and sorts them to get the final ranked list.

## Chapter 4: Common Problems and How We Solve Them

This architecture is powerful, but it's a complex distributed system with several potential points of failure. Here’s how we’ve hardened it.

**Problem 1: The Online Feature Store is Unavailable**
*   **Scenario**: The Redis cluster goes down or experiences extreme latency.
*   **Impact**: Catastrophic. The feature hydration step fails, and we cannot call the ML model.
*   **Solution**:
    1.  **Circuit Breaker**: We wrap the Redis calls in a circuit breaker (e.g., using Resilience4j). If the failure rate exceeds a threshold, the breaker "trips," and for a configured period, we bypass the ML ranking entirely.
    2.  **Graceful Degradation**: When the circuit is open, we **fall back to the original Solr ranking**. We simply return the top 20 candidates from Step 1 directly to the user. The user still gets search results—they are just less relevant. This is infinitely better than showing an error page.
    3.  **Monitoring and Alerting**: We have aggressive alerting on Redis latency (p99) and error rates. An on-call engineer is paged the moment performance degrades.

**Problem 2: The Model Endpoint Fails**
*   **Scenario**: The SageMaker endpoint returns a `5xx` error or times out.
*   **Impact**: High. We have features but cannot get a score.
*   **Solution**: This is handled identically to the Redis failure. The call to SageMaker is also wrapped in its own circuit breaker. If it trips, we gracefully degrade and fall back to the non-ML Solr ranking. This ensures that a bug in a newly deployed model doesn't take down the entire search functionality.

**Problem 3: "Cold Start" - A New Document Has No Features**
*   **Scenario**: A new ad is created. It exists in Solr, but the hourly Spark job hasn't run yet, so there are no features for it in Redis.
*   **Impact**: The feature hydration step for this document returns an empty map.
*   **Solution**:
    1.  **Default Values**: The Java backend is responsible for handling this. If a feature vector is missing, it constructs a default vector. For example, `ad_ctr_7d` would be `0.0`, `seller_rating` might be the site-wide average, and `price` would be `0.0`.
    2.  **Model Training**: Crucially, the model must be **trained to understand these default values**. Our training dataset explicitly includes examples of new ads with these zeroed-out or averaged features, so the model learns how to handle them gracefully.

**Problem 4: Stale Features**
*   **Scenario**: The batch Spark job fails to run for several hours due to an upstream data issue. The features in Redis are now several hours out of date.
*   **Impact**: Subtle performance degradation. The model is making decisions based on stale data.
*   **Solution**:
    1.  **Data Freshness Monitoring**: We have a dedicated monitoring job that checks the timestamp of the latest data in the Offline Feature Store. If the data is older than a threshold (e.g., 2 hours for an hourly job), it triggers a high-priority alert.
    2.  **Feature-Level TTL**: While not implemented initially, a more advanced solution is to embed a timestamp within each feature vector in Redis and have the backend service decide if a feature is "too stale" to be trusted, falling back to a default value if necessary.

## Conclusion: Building for Resilience

Building a real-time machine learning system at scale is as much about distributed systems engineering as it is about data science. The "retrieve then re-rank" pattern, supported by a robust stack like Solr, Redis, and SageMaker, provides a powerful and scalable foundation.

However, the true mark of a production-ready system is not just its performance on a good day, but its resilience on a bad day. By anticipating failure points—be it a network partition, a buggy model, or a stale data pipeline—and implementing patterns like circuit breakers and graceful degradation, we built a system that not only delivers intelligent results but also earns the trust of our users and our business.
