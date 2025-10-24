---
publishDate: '2025-09-29T10:00:00Z'
title: 'From Fixed Slots to Intelligent Ranking: A Technical Deep-Dive on Multi-Objective Optimization with Solr and LambdaMART'
excerpt: "The classic e-commerce dilemma is balancing user relevance with business monetization. This technical deep-dive is a complete, step-by-step case study on how we replaced a rigid, fixed-slot ad system with a dynamic, multi-objective Learning to Rank model to maximize both marketplace liquidity and revenue."
category: 'Data Science & Engineering'
tags:
  - Search
  - Ranking
  - Machine Learning
  - LTR
  - LambdaMART
  - Solr
  - E-commerce
  - AWS
image: '~/assets/images/articles/ranking_architecture.png'
imageAlt: 'A diagram showing the balance between user relevance (a heart icon) and business monetization (a dollar sign icon) in a modern search ranking system.'
author: 'Anika Rosenzuaig'
tableOfContents: true
draft: false
layout: '~/layouts/PostLayout.astro'
---

## Project Goals & Success Criteria

To secure stakeholder buy-in and ensure alignment, we defined a clear set of measurable goals across three domains:

| Domain      | Goal                                                                                             | Key Metric(s)                                   | Target      |
| :---------- | :----------------------------------------------------------------------------------------------- | :---------------------------------------------- | :---------- |
| **Business**  | Integrate monetization without harming the user experience.                                      | - Buyer-to-Seller Contact Rate<br>- Revenue per Search | +5%         |
|             |                                                                                                  |                                                 | +15%        |
| **Model**     | Train a model that accurately predicts the blended value of an ad.                               | - Offline NDCG@10                               | > 0.88      |
| **Operational** | Serve ranked results at scale with no perceived increase in latency for the user.                 | - p99 Search API Latency<br>- API Error Rate     | < 200ms     |
|             |                                                                                                  |         

---

## Chapter 1: The Problem Space - Why Simple Ranking Fails at Scale'

## Introduction: The Core Dilemma of a Marketplace

In any large-scale digital marketplace, a fundamental tension defines the search experience: the conflict between **user-centric relevance** and **business-centric monetization**. For our platform, the ultimate measure of success is **liquidity**—the efficiency and frequency with which we connect buyers to sellers. This is best measured by the **rate of buyer-to-seller contacts**. On the other hand, a sustainable business model requires a monetization layer, which for us involves sellers purchasing Value-Added Services (VAS) to boost their ads.

Our starting point was a classic reflection of this dilemma. Our search engine, built on a robust SolrCloud cluster serving over **500 million queries per day** across **30+ countries**, was effective at text matching, but our monetization strategy was a blunt instrument: the **top four search results were fixed slots reserved for sponsored ads**.

A key challenge was that user behavior and price sensitivity vary dramatically between markets like Brazil, Poland, and India. A one-size-fits-all model was not an option. Our architecture needed to support **market-specific models** from day one. Furthermore, the extreme heterogeneity of our catalog—from high-value items like cars to low-value items like used books—meant that features like `price` had to be normalized logarithmically and considered within their category context to be effective.

This simple approach, while generating predictable revenue, was creating significant friction in our ecosystem:
* **Degraded User Experience:** For high-intent searches, users were forced to scroll past potentially irrelevant ads to find the perfect organic item, hindering a quick and successful connection.
* **Cannibalization of Liquidity:** The best organic result was often pushed below the fold, decreasing its visibility and depressing the overall contact rate, our North Star metric.
* **Inefficiency for Sellers:** Advertisers paid for a premium position, but if their ad was not contextually relevant, they received few contacts, leading to a low return on investment and seller churn.

We knew our platform's long-term health depended on resolving this conflict. Our vision was to dismantle this rigid system and build a **unified, intelligent ranking ecosystem**—one capable of making nuanced, data-driven decisions to maximize both marketplace liquidity and revenue simultaneously.

This article is the detailed technical story of how we achieved this. It's a step-by-step journey from the initial problem definition to the implementation of a **multi-objective Learning to Rank (LTR) solution** with Solr and LambdaMART, covering the data, the model, the architecture, and the critical monitoring framework that ensures its success.

---

## Chapter 1: The Problem Space - Why Simple Ranking Fails at Scale

Before architecting a solution, we needed to deeply understand and quantify the problem.

### The Initial Architecture: Simple but Flawed

Our v1 system was a straightforward but rigid multi-step process that handled different ad types in isolated silos:

1.  **Organic Retrieval**: A user’s query would hit our backend search service, which would send the query to a **SolrCloud cluster**. Solr would return a list of organic results ranked by its default text-relevance algorithm, **BM25**.
2.  **Sponsored Retrieval**: Concurrently, the backend would call a separate Ads Service to retrieve up to four **sponsored items**—ads for which sellers paid a premium for top placement.
3.  **Bumped Retrieval**: Another call was made to retrieve "bumped" or "upped" ads—listings that sellers paid a smaller fee to move higher in the organic-only ranking.
4.  **Crude Stitching**: Finally, the backend would perform a crude, rules-based stitching operation:
    *   Place the four sponsored ads at the absolute top (positions 1-4).
    *   Insert the bumped ads at predefined positions within the organic results (e.g., positions 5, 10, 15).
    *   Fill the remaining slots with the organic results.

This system was predictable but completely blind to the actual relevance of the promoted ads for a given query. It was this rigidity that we aimed to replace.

### Quantifying the Pain: The Data-Driven Case for Change

Intuition told us this was a poor experience, but to justify a major engineering investment, we needed data. A series of analyses and A/B tests painted a clear picture:
* Queries with the full four-ad banner had a **12% lower overall contact rate** compared to purely organic search results.
* The **session abandonment rate**—where a user performs a single search and then leaves the site—was **8% higher**, indicating user frustration.
* The system was fundamentally misaligned. We were optimizing for ad impressions, not for our North Star metric: **successful connections**.

### The Business Case: Establishing a New North Star

With this data, we formulated a clear business case. The goal was not to eliminate monetization but to integrate it intelligently. Our strategic objective was defined as:

> **Increase revenue per search by 15% while simultaneously increasing our North Star metric, the buyer-to-seller contact rate, by 5% or more.**

This gave us a clear, measurable goal that aligned the interests of our buyers, our sellers, and our business.

---

## Chapter 2: The Foundation of Learning - Building the Training Dataset

The heart of any machine learning system is the data it learns from. Our first and most critical task was to construct a massive, high-quality dataset that would teach our model what a "good" ranking looks like from our new, unified perspective.

### Step 2.1: The Data - Indexing Features in Solr and the Feature Store

Our data pipelines, built using Apache Spark on AWS EMR, were the factory floor for our features. They processed and joined information from multiple sources: raw search logs from Kafka, user interaction data (clicks, contacts) from our event tracking system, and monetization logs from the billing database. The raw data landed in our S3-based data lake, which served as the single source of truth.

The output of these Spark jobs was a rich set of features for every ad. These features were then pushed to two destinations:
1.  **Offline Storage (S3/Parquet)**: The full, historical feature set was stored in an aggregated, query-log format, ready for model training.
2.  **Online Feature Store (Redis/ElastiCache)**: A subset of the most critical, low-latency features was pushed to a Redis cluster. This store was optimized for rapid retrieval (p99 < 10ms) during the real-time re-ranking process.

This dual-storage approach is a common pattern: use a scalable, cost-effective data lake for batch processing and model training, and a high-performance key-value store for serving features in production.

Below is a simplified visualization of how this feature data might look in our online Feature Store at serving time.

**Visualization: Feature Data for Indexed Ads**

<div class="table-container">
  <p><strong>Visualization: Feature Data for Indexed Ads</strong></p>
  <table class="data-table">
    <thead>
      <tr>
        <th>doc_id</th>
        <th>seller_id</th>
        <th>bm_score</th>
        <th>price</th>
        <th>seller_rating</th>
        <th>img_score</th>
        <th>fav_rate</th>
        <th>ctr_7d</th>
        <th class="highlight-user">contact_rate</th>
        <th>is_sponsored</th>
        <th class="highlight-biz">vas_value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>AD-101</td>
        <td>S-A</td>
        <td>25.4</td>
        <td>1900</td>
        <td>4.9</td>
        <td>0.95</td>
        <td>0.082</td>
        <td>0.451</td>
        <td class="highlight-user"><strong>0.153</strong></td>
        <td>0</td>
        <td class="highlight-biz">0.0</td>
      </tr>
      <tr>
        <td>AD-102</td>
        <td>S-B</td>
        <td>22.1</td>
        <td>1950</td>
        <td>4.7</td>
        <td>0.88</td>
        <td>0.051</td>
        <td>0.310</td>
        <td class="highlight-user"><strong>0.080</strong></td>
        <td>1</td>
        <td class="highlight-biz">15.0</td>
      </tr>
      </tbody>
  </table>
  <p class="table-caption">
    <em>This is the table caption...</em>
  </p>
</div>

*This table represents the rich feature set available for each ad. I've **bolded** our North Star metric (`contact_rate`) and our key monetization feature (`vas_value`) as these are the two signals our model must learn to balance. After training, a feature importance analysis (e.g., using SHAP values) revealed that `seller_rating`, the 7-day `ctr_7d`, and the historical `contact_rate` were the most powerful predictors of user relevance, while `vas_value` was, as expected, the primary driver for monetization. Abbreviations used: `img_score` (image_quality_score), `fav_rate` (favorite_rate).*

*This table represents the rich feature set available for each ad. Note that metrics like CTR and contact rate are frequencies (e.g., `contact_rate = contacts / impressions`), not absolute numbers. This data provides the signals for both relevance and business value.*

### Step 2.2: The Objective - Defining the Prediction Target

This was the most critical conceptual step. If we simply trained the model to predict the historical `contact_rate`, it would learn to ignore sponsored ads. To teach it to blend, we had to create a new, unified target variable—the `objective_label`—that represented our combined business strategy.

**The Role of `query_id`**: You are correct to ask about `query_id`. It is not a *feature* of a document, so it doesn't belong in the feature store table. Instead, `query_id` is the **grouping key** used to construct the training data itself. For the LambdaMART algorithm to work, it needs to see all the candidate documents that were shown for a specific query, along with their feature vectors and the final outcome (our `objective_label`). The `query_id` ties them all together, forming the "query-document groups" that are the fundamental input for any LTR model.

Our logic was to create a new target that rewarded both successful user connections and successful monetization events. For this, we analyzed historical data where we knew the outcome of a search.

The visualization below shows the data we prepared for the **re-ranking model**. This is the "textbook" from which our LambdaMART model will learn.

**Visualization: Training Data for the Re-ranking Model**
<div class="table-container">
  <table class="data-table">
    <thead>
      <tr>
        <th><code>query_id</code></th>
        <th><code>doc_id</code></th>
        <th><code>relevance_label</code><br><small>(based on historical <code>contact_rate</code>)</small></th>
        <th><code>vas_value</code></th>
        <th>Logic for Blending</th>
        <th><code>objective_label</code><br><small>(THE GOAL)</small></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>q_101</td>
        <td>AD-101</td>
        <td style="text-align: center;"><strong>3 (High)</strong></td>
        <td style="text-align: right;">0.0</td>
        <td>Organic: Value is its relevance.</td>
        <td style="text-align: center;"><strong>3.0</strong></td>
      </tr>
      <tr>
        <td>q_101</td>
        <td>AD-102</td>
        <td style="text-align: center;"><strong>2 (Mid)</strong></td>
        <td class="highlight-biz" style="text-align: right;">15.0</td>
        <td>Sponsored & Successful: Value = Relevance + Bonus.</td>
        <td style="text-align: center;"><strong>3.5</strong> (2.0 + 1.5)</td>
      </tr>
      <tr>
        <td>q_101</td>
        <td>AD-104</td>
        <td style="text-align: center;"><strong>0 (Low)</strong></td>
        <td class="highlight-biz" style="text-align: right;">5.0</td>
        <td>Sponsored & Unsuccessful: Value = Relevance.</td>
        <td style="text-align: center;"><strong>0.0</strong></td>
      </tr>
    </tbody>
  </table>
</div>

*This table illustrates the core of our multi-objective strategy. We created a new `objective_label` that explicitly teaches the model that a **relevant, successful sponsored ad (AD-102) can be more valuable to the entire ecosystem than even a highly relevant organic ad (AD-101).** This is how the model learns to blend.*

#### Step 2.3: The Art and Science of Choosing the Blend

A critical question is: how did we land on the `+1.5` bonus for a successful sponsored ad? These weights are not arbitrary; they are **business strategy encoded as a model hyperparameter**. The process of choosing them was iterative and data-driven, involving both offline simulation and online testing.

1.  **Hypothesis Formulation**: We started by translating the business goal into a quantifiable hypothesis. The product team hypothesized that "a successful monetized transaction should be considered roughly 50-75% as valuable as a top-tier organic connection." This gave us a starting range for the bonus value.

2.  **Offline Simulation & Grid Search**: We generated multiple training datasets, each with a different bonus weight for the `objective_label` (e.g., `+1.0`, `+1.25`, `+1.5`, `+1.75`). We then trained a separate LambdaMART model for each dataset. Using a holdout dataset of historical search data, we ran simulations for each model to predict what the key business metrics would have been.

| Bonus Weight | Simulated Contact Rate | Simulated Revenue per Search | Notes |
| :--- | :--- | :--- | :--- |
| +1.0 | +8% | +15% | Conservative. Improves relevance but leaves money on the table. |
| **+1.5** | **+7%** | **+22%** | **The sweet spot. A minor dip in relevance for a significant revenue gain.** |
| +2.0 | +2% | +28% | Too aggressive. The model starts prioritizing monetization too heavily, harming the user experience. |

3.  **Online A/B Testing**: The offline simulation pointed to `+1.5` as the optimal trade-off. We then deployed this model to a small percentage of live traffic in an A/B test against the old system. The real-world results closely matched the simulation (+7% contact rate, +22% revenue), giving us the confidence to roll it out globally. This iterative process of offline simulation and online validation is key to tuning multi-objective systems.

### Step 2.4: The Learning Algorithm - Why LambdaMART (via LGBMRanker)?

With our feature-rich dataset and strategically designed objective label, it was time to train the ranking model. We chose the **LambdaMART** algorithm, specifically using the **LGBMRanker** implementation from the popular LightGBM library. This choice was not arbitrary; it was a strategic decision based on several critical advantages that set it apart from more generic machine learning algorithms like Random Forest or standard Gradient Boosted Trees (GBT).

The core reasons for this choice fall into two categories: its listwise approach and its direct optimization of ranking metrics.

*   **Pointwise vs. Listwise: A Paradigm Shift**
    *   Many traditional ML models are *pointwise*. They look at a single document and try to predict a score (like "what is the probability this document will be clicked?"). They don't know about the other documents in the search results. This is like judging a runner based only on their personal best time, without seeing the race.
    *   **LambdaMART**, by contrast, is a *listwise* algorithm. It looks at the entire list of candidate documents for a given query at once. Its goal is not to predict the exact score of any single document, but to find the optimal *ordering* of the entire list.

*   **Directly Optimizing for Ranking: The "Lambda" Secret**
    *   This is the most important reason. The "Lambda" in LambdaMART refers to "Lambda Gradients." Instead of using standard gradients like Mean Squared Error (which measures prediction accuracy), LambdaMART uses a special gradient that is mathematically tied to a ranking metric, typically **NDCG (Normalized Discounted Cumulative Gain)**.
    *   This means LambdaMART is purpose-built for ranking. It doesn't waste effort trying to get the absolute scores perfect; it focuses all its power on getting the relative order right, which is exactly what a search engine needs.

In short, we chose LambdaMART because it is a specialized tool that directly solves the ranking problem by optimizing a true ranking metric, making it far more effective than general-purpose models for this specific task. The `LGBMRanker` provides a famously scalable and memory-efficient implementation, capable of training on the massive query-grouped datasets our system produced (tens of terabytes of raw logs, hundreds of gigabytes of training data) in a reasonable timeframe.

### Step 2.5: The Cadence - Data Freshness and Model Retraining

A critical aspect of maintaining model performance is ensuring that the model is regularly updated with fresh data. We established a **weekly cadence** for retraining the model. This involves:

1.  **Data Ingestion**: Every week, new search log data is ingested and processed through our feature engineering pipeline.
2.  **Model Training**: A new LambdaMART model is trained on this fresh data, using the same procedures and hyperparameters that proved successful previously.
3.  **Validation**: The new model is validated against our holdout set to ensure it meets our performance benchmarks.
4.  **Deployment**: If the model passes validation, it is deployed to production, replacing the old model.

This regular refresh cycle ensures that our model adapts to any changes in user behavior or market conditions, maintaining its relevance and effectiveness.

---

## Chapter 3: Production Architecture - Serving Rankings at Scale on AWS

A trained model is useless without a robust, low-latency architecture to serve it. We designed a microservices-based system on AWS to handle real-time inference.

### Deployment Strategy: A Country-by-Country Rollout

Launching a system this critical across 30+ countries simultaneously would have been incredibly risky. We adopted a phased, country-by-country rollout strategy that allowed us to learn and de-risk the process.

1.  **Canary Market (Portugal)**: We first launched in a medium-sized, representative market: Portugal. This allowed us to validate the entire pipeline, from feature generation to model serving and monitoring, in a controlled environment.
2.  **Fast-Follow Markets (Poland, Romania)**: After a successful two-week run in Portugal where we confirmed the +7% contact rate and +22% revenue uplift, we moved to our larger, more critical EU markets. Each country received its own dedicated LambdaMART model, trained specifically on its own data to capture local user behavior and price sensitivity.
3.  **Wider Rollout (Ukraine, Uzbekistan, Kazakhstan, etc.)**: With the system proven and the deployment process refined, we accelerated the rollout across the remaining countries over the next quarter.

This phased approach was critical for building stakeholder confidence and ensuring operational stability.

**The Real-Time Inference Flow (sub-200ms):**

1.  **Request:** A user's search request hits our **API Gateway** and is routed to a load balancer in our **Kubernetes (EKS) cluster**.
2.  **Search Service:** The request is picked up by a pod running our Search Service.
3.  **Phase 1 - Candidate Retrieval:** The service makes a call to our **SolrCloud cluster**. Solr uses BM25 to find the top 200 candidates and returns their IDs along with their text-relevance features.
4.  **Phase 2 - Feature Enrichment:** This is a performance-critical step. The service orchestrates a series of parallel, non-blocking calls to enrich the 200 candidates with the full set of features from our **Feature Store (ElastiCache for Redis and DynamoDB)**.
5.  **Phase 3 - Re-ranking:** The 200 complete feature vectors are sent to our trained LambdaMART model, served via an **AWS SageMaker endpoint**.
6.  **Phase 4 - Sorting & Response:** SageMaker returns 200 numerical scores. The Search Service performs a simple sort on these scores and returns the final, intelligently ranked list to the user.

The mathematical function applied by the model to each feature vector `x_d` is the sum of the predictions from all `T` trees in the ensemble:

$$S_d = \sum_{t=1}^{T} \alpha \cdot h_t(x_d)$$

Where $S_d$ is the final score for the document $d$, $\alpha$ is the learning rate, and $h_t(x_d)$ is the prediction of the individual tree $t$ for the feature vector $x_d$.

---

## Chapter 4: A Deep Dive into Production ML Observability

Deploying a machine learning model into a critical, high-throughput system like search is not the end of the project; it is the beginning of a continuous operational cycle. A model is not a static piece of code; it is a dynamic system whose performance is intrinsically linked to the ever-changing data it consumes. At OLX, handling over **500 million queries per day** across the EU region, a commitment to deep, multi-faceted monitoring was non-negotiable.

Our philosophy is that you cannot trust what you cannot see. We built our observability strategy on three pillars, powered by a stack of **Prometheus** for metrics collection and **Grafana** for visualization.

**Monitoring Architecture:**
![Monitoring Architecture Diagram](~/assets/images/articles/ranking_architecture.png)
*A diagram showing how our Java Backend, SageMaker Endpoint, and data pipelines export metrics to Prometheus, which then serves them to Grafana dashboards and Alertmanager for notifications.*

### A Taxonomy of Production ML Failures

Before diving into our dashboards, it's crucial to understand what can go wrong. Production ML failures are often silent and insidious, degrading user experience and business outcomes long before causing a traditional `500` error.

1.  **Data Drift**: This is the most common and dangerous failure mode.
    *   **Covariate Drift (Feature Drift)**: The statistical distribution of incoming, live data changes compared to the data the model was trained on. For example, a new version of the mobile app starts sending image quality scores on a scale of 0-1 instead of 0-100. The model, never having seen these values, will produce nonsensical scores.
    *   **Concept Drift**: The relationship between the features and the target variable changes. For example, a sudden economic shift might make users far more price-sensitive, meaning the `price` feature should have a much higher negative impact on `contact_rate` than the model originally learned.

2.  **Upstream Data Failures**: The model itself is fine, but the data feeding it is broken.
    *   **Stale Features**: The daily Spark jobs that refresh our Redis feature store fail. The model is now making predictions on 2-day-old data, missing recent trends.
    *   **Broken Feature Logic**: A code change in an upstream microservice introduces a bug, and suddenly the `seller_rating` for all new sellers is `null`.

3.  **Model or Infrastructure Failures**: More traditional software bugs.
    *   **Model Bug**: A new model is deployed that has a bug (e.g., a `NaN` prediction for a certain combination of features) that wasn't caught in offline testing.
    *   **Infrastructure Issues**: The SageMaker endpoint experiences high latency, or the Redis cluster has a network partition.

Our three pillars of monitoring are designed to detect all of these failure modes.

### Pillar 1: Business & Product Metrics (The "Why")

This dashboard is for product managers and business leaders. It answers the question: "Is the model achieving its business objectives?"

| Metric Name | Current Value | Target / Threshold | Trend (1h) | Description & Failure Mode Detected |
|:---|:---:|:---|:---:|:---|
| **[North Star] Contact Rate per Search** | 0.185 | > 0.180 | 📈 (Up) | The ultimate measure of marketplace liquidity. A slow decline could indicate **concept drift**. |
| **[Business] Revenue per Search (€)** | 0.042 | > 0.040 | 📈 (Up) | Confirms the monetization objective is being met. |
| **[Guardrail] Seller Churn Rate** | 1.2% | < 1.5% | ✅ (Stable) | Are we angering non-paying sellers? A sudden spike could mean the model is unfairly burying their items. |
| **[Guardrail] Result Diversity (Gini)** | 0.45 | < 0.6 | ✅ (Stable) | Measures how concentrated the top results are. A rising Gini coefficient indicates a **feedback loop**, where the model is over-promoting a few popular items. |

### Pillar 2: Model Performance Metrics (The "What")

This dashboard is for data scientists. It answers the question: "Is the model behaving as we expect it to?"

| Metric Name | Current Value | Target / Threshold | Trend (1h) | Description & Failure Mode Detected |
|:---|:---:|:---|:---:|:---|
| **Online vs. Offline NDCG** | 0.89 (Online) vs 0.91 (Offline) | Delta < 5% | ✅ (Stable) | We sample 1% of live traffic, log the features and outcomes, and calculate NDCG. If this "Online NDCG" diverges significantly from the NDCG calculated on the test set ("Offline NDCG"), it's a strong signal of **data drift**. |
| **Feature Drift (Max PSI)** | 0.08 (`seller_rating`) | Alert if > 0.2 | ✅ (Stable) | We calculate the **Population Stability Index (PSI)** for each key feature by comparing the distribution of live feature values against the training set distribution. A PSI > 0.2 on any feature triggers an alert, pointing directly to **covariate drift**. |
| **Prediction Score Distribution** | p50: 4.5, p90: 8.2 | Alert on >10% shift | ✅ (Stable) | We track the distribution of the final scores from the SageMaker endpoint. A sudden shift in this distribution (e.g., the average score drops from 5.0 to 2.0) means the model's output has fundamentally changed, likely due to **data drift** or a **model bug**. |
| **Missing Feature Rate** | 0.1% | < 0.5% | ✅ (Stable) | Tracks the percentage of times our Java service has to substitute default values because a feature was missing in Redis. A spike indicates an **upstream data failure**. |

### Pillar 3: Operational & System Health (The "How")

This dashboard is for the engineers. It answers the question: "Is the system running reliably and performantly?"

| Metric Name | Current Value | Target / Threshold | Trend (1h) | Description & Failure Mode Detected |
|:---|:---:|:---|:---:|:---|
| **End-to-End p99 Latency** | 185ms | < 200ms | ✅ (Stable) | The total time from user request to response. This is our user-facing SLO. |
| **Feature Hydration p99 Latency** | 15ms | < 25ms | ✅ (Stable) | Latency of the parallel Redis calls. A spike points to a problem with Redis or the network. |
| **SageMaker p95 Latency** | 45ms | < 50ms | ✅ (Stable) | Latency of the model inference step. Helps isolate bottlenecks to the model itself. |
| **API Error Rate (%)** | 0.05% | < 0.1% | ✅ (Stable) | Tracks HTTP `5xx` errors. A spike indicates a hard **infrastructure or model bug**. |
| **Circuit Breaker State** | `CLOSED` | - | ✅ (Stable) | We export the state of our circuit breakers. If one `OPENS`, it means a downstream service (Redis/SageMaker) is failing, and we are gracefully degrading. This is a critical alert. |

By combining these three pillars, we create a defense-in-depth monitoring strategy. A drop in the North Star metric (Pillar 1) might be explained by a rising PSI on a key feature (Pillar 2), which is ultimately traced back to a failing upstream data pipeline (Pillar 3). This holistic view is essential for rapidly diagnosing and fixing the silent failures that are common in large-scale ML systems.

---

## Chapter 5: The Road Ahead - Horizons for Future Work

While this project has achieved its initial goals, the beauty of machine learning and search is that there is always room for improvement. We see several exciting horizons for future work:

*   **Horizon 1 (Incremental Improvements):** Continuously monitor, retrain, and refine the model. Small, consistent improvements can have a big impact over time.
*   **Horizon 2 (Feature Expansion):** Explore new features and data sources. For example, incorporating **user behavior data** (e.g., time on site, pages per session) could further improve relevance.
*   **Horizon 3 (Dynamic Optimization):** Explore Reinforcement Learning to dynamically adjust the strategy between liquidity and monetization.

### Conclusion

In this article, we have taken you on a detailed journey through the complex but rewarding process of transforming a rigid, outdated ad ranking system into a dynamic, intelligent, multi-objective optimization powerhouse using Solr and LambdaMART. We've covered the challenges, the solutions, the architecture, and the monitoring systems that make it all work.

The results speak for themselves:
*   A significant uplift in our North Star metric, the buyer-to-seller contact rate.
*   A healthy increase in revenue per search, benefiting our business and our sellers.
*   A robust, scalable architecture on AWS that can serve real-time rankings with sub-200ms latency.
*   A comprehensive observability stack that ensures the system operates smoothly and any issues are quickly detected and resolved.

This project is a testament to the power of modern data science and engineering practices. By leveraging advanced machine learning techniques and building a flexible, scalable architecture, we have created a system that not only meets the current needs of our marketplace but is also poised for future growth and enhancement.

---

## Chapter 6: Tying it All Together - A Sample Repository Structure

Bringing a complex system like this to life requires more than just disparate scripts; it requires a well-organized codebase. While there are many ways to structure such a project, a monorepo approach is often effective as it keeps all related components in one place, simplifying dependency management and cross-team collaboration.

Here is a conceptual layout of what the repository for our ranking system might look like:

```plaintext
ranking-platform/
├── 📄 .gitlab-ci.yml         # CI/CD pipeline definitions for building, testing, and deploying all components
├── 📄 README.md
│
├── 📁 docs/
│   ├── 📄 architecture.md     # High-level diagrams and decision records
│   └── 📄 on-boarding.md      # Guide for new engineers
│
├── 📁 feature-factory/        # Spark jobs for batch feature creation
│   ├── 📁 src/main/scala/com/olx/ranking/
│   │   ├── 📄 AdFeatures.scala      # Job to calculate features related to the ad itself (age, image quality)
│   │   ├── 📄 SellerFeatures.scala  # Job to calculate seller-level features (rating, tenure)
│   │   └── 📄 InteractionFeatures.scala # Job to calculate historical user interactions (CTR, contact rate)
│   └── 📄 pom.xml               # Maven build file for the Spark jobs
│
├── 📁 infra/                  # Infrastructure as Code (Terraform)
│   ├── 📁 modules/              # Reusable Terraform modules
│   ├── 📁 envs/
│   │   ├── 📁 prod/
│   │   │   └── 📄 main.tf       # Production environment infrastructure (EKS, SageMaker, Redis)
│   │   └── 📁 staging/
│   │       └── 📄 main.tf       # Staging environment for testing
│
├── 📁 model-training/         # Python code for training the LambdaMART model
│   ├── 📁 notebooks/            # Jupyter notebooks for exploratory data analysis
│   ├── 📁 src/
│   │   ├── 📄 train.py          # Main script to run model training, validation, and serialization
│   │   ├── 📄 features.py       # Defines the feature set used by the model
│   │   └── 📄 tune.py           # Hyperparameter tuning script
│   ├── 📄 Dockerfile            # To containerize the training environment
│   └── 📄 requirements.txt    # Python dependencies (lightgbm, scikit-learn, boto3)
│
├── 📁 monitoring/             # Observability configurations
│   ├── 📁 dashboards/
│   │   ├── 📄 business_kpis.json      # Grafana dashboard definition for business metrics
│   │   ├── 📄 model_performance.json  # Grafana dashboard for model metrics (NDCG, PSI)
│   │   └── 📄 system_health.json      # Grafana dashboard for operational metrics (latency, errors)
│   └── 📁 alerts/
│       └── 📄 ranking_rules.yml     # Prometheus alerting rules (e.g., high latency, circuit breaker open)
│
├── 📁 ranking-service/        # The real-time Java re-ranking microservice
│   ├── 📁 src/main/java/com/olx/ranking/
│   │   ├── 📄 RankingController.java  # The main API endpoint
│   │   ├── 📄 SolrClient.java         # Logic for Phase 1 candidate retrieval
│   │   ├── 📄 FeatureHydrator.java    # Logic for Phase 2 feature enrichment from Redis
│   │   └── 📄 SageMakerInvoker.java   # Logic for Phase 3 re-ranking via SageMaker
│   ├── 📄 pom.xml               # Maven build file with dependencies (SolrJ, Lettuce, Resilience4j)
│   └── 📄 Dockerfile            # To containerize the Java service for deployment on EKS
│
└── 📁 solr-config/            # Configuration for the SolrCloud cluster
    └── 📁 conf/
        ├── 📄 schema.xml          # Defines the fields, types, and indexing rules for ads
        └── 📄 solrconfig.xml      # Core Solr configuration, including request handlers
```

This structure separates each major component into its own directory while keeping them in a single repository. The CI/CD pipeline in `.gitlab-ci.yml` would be responsible for orchestrating the build, test, and deployment of each piece, ensuring that a change in the feature factory, for example, could trigger a new model training run, which in turn could trigger a deployment of the new model to SageMaker.