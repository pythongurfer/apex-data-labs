---
publishDate: '2025-10-23T12:00:00Z'
title: "Beyond Fixed Slots: Building OLX's Multi-Objective Ranking Engine"
excerpt: "A deep-dive case study on how we dismantled a rigid, revenue-limiting monetization system and replaced it with a dynamic, machine learning-powered ecosystem. This article covers the end-to-end journey, from business problem to technical architecture, multi-objective optimization, and MLOps at massive scale, ultimately boosting marketplace liquidity by 18% and revenue by 22%."
category: 'Machine Learning Engineering'
tags:
  - machine learning
  - search and relevance
  - ranking systems
  - mloops
  - data science
  - case study
  - solr
  - lambdamart
author: 'Anika Rosenzuaig'
image: '~/assets/images/articles/data_portada.jpg'
imageAlt: 'A complex network diagram showing the flow of data from user queries through feature factories and machine learning models to a final, ranked list, symbolizing a sophisticated ranking engine.'
draft: true
layout: '~/layouts/PostLayout.astro'
---

## 1. Introduction: The Tyranny of the Fixed Slot

When I joined OLX GmbH, the company was a titan of the online classifieds world, a bustling digital marketplace connecting millions of buyers and sellers. Yet, beneath this vibrant surface, our most critical user-facing product—the search results page—was anchored by a legacy system that was actively stifling our growth. I call this system the "tyranny of the fixed slot."

### The Situation: A Marketplace at War With Itself

The core of the problem was our monetization strategy. To generate revenue, we had hard-coded the top three positions of every search result page to be exclusively for "sponsored" ads. Professional sellers could purchase these premium slots to guarantee visibility. On paper, it was a straightforward revenue stream. In reality, it was a poison pill for the user experience and a low-ceiling strategy for the business.

This rigid system created a cascade of negative second-order effects:

1.  **A Broken User Experience:** Imagine searching for a "vintage leather sofa in Berlin." Our system would first force you to see three sponsored ads for modern, fabric sofas from a large retailer before you could even see the perfect, organically-listed vintage sofa located just two blocks away. This wasn't just a minor inconvenience; it was a fundamental violation of the user's trust. We were telling them, "Our business needs come before your search intent." The result was palpable user frustration, higher bounce rates, and a gradual erosion of that precious, hard-won trust.

2.  **Systemic Cannibalization of Marketplace Liquidity:** For a two-sided marketplace like OLX, our North Star metric was, and always should be, **liquidity**—the rate at which we successfully connect buyers and sellers. By prioritizing sponsored (and often less relevant) ads, we were actively suppressing the most relevant organic results. We were sacrificing the long-term health of our ecosystem for short-term, predictable revenue. Our own data showed that users were more likely to abandon a search session if the top results felt irrelevant, regardless of whether they were sponsored or not.

3.  **A Hard Ceiling on Revenue Growth:** The fixed-slot model was inelastic and inefficient. We could only sell three slots per query, creating artificial scarcity. There was no mechanism for a seller with a high-quality, highly relevant sponsored ad to outbid a competitor for a better position. We couldn't dynamically adjust pricing based on demand or query value. We were leaving millions on the table by treating every search query and every ad as if they had the same value.

4.  **Discouraging Seller Excellence:** The system was fundamentally unfair. A seller who invested time in creating high-quality listings with great photos, detailed descriptions, and competitive prices had no organic way to compete with a lower-quality seller who had simply paid for a top slot. Meritocracy was absent. This discouraged the very behaviors we wanted to promote in our seller community.

The data painted a grim picture. A preliminary analysis revealed that search sessions starting with three low-relevance sponsored ads had a **7% higher abandonment rate** and a **12% lower contact rate** compared to sessions where the top results were organic. The system wasn't just suboptimal; it was actively harming the business.

### The Task: Architecting an Intelligent Ranking Ecosystem

My mission was to lead the charge to dismantle this archaic system. The task wasn't simply to "improve search" but to re-architect our entire ranking philosophy from the ground up. I defined a set of ambitious, multi-faceted objectives for the new system:

1.  **Unified & Dynamic Ranking:** Eradicate the distinction between "sponsored" and "organic" results at the presentation layer. The new system had to blend all items into a single, meritocratically ranked list where the final position was earned through a combination of relevance, quality, and commercial value.

2.  **Multi-Objective Optimization:** The new engine could not be a naive "relevance maximizer." It had to be a sophisticated economic actor. I was tasked with designing a system that could mathematically balance our two competing, yet equally vital, business goals: maximizing **marketplace liquidity** (user experience) and maximizing **revenue** (business health).

3.  **Extreme Scalability and Performance:** The solution had to operate at the massive scale of OLX. This meant handling hundreds of millions of queries per day with a strict end-to-end latency budget of **under 200 milliseconds** for the entire search-and-rank pipeline.

4.  **Contextual Intelligence:** The system needed to understand nuance. It had to differentiate between a broad, exploratory query (e.g., "sofa") and a high-intent, specific query (e.g., "IKEA Ektorp 3-seat sofa dark grey") and adjust its ranking strategy accordingly, for instance, by prioritizing local results for broad queries.

This was not a simple feature update. It was a fundamental rewiring of our marketplace's brain.

## 2. The Architectural Blueprint: A Two-Phase System for Speed and Precision

To solve a problem of this scale, you cannot afford to run a complex machine learning model over millions of listings for every single query. The latency would be unacceptable. The industry-standard solution, and the one we adopted, is a two-phase "funnel" architecture: **Recall** and **Precision**.

*(In a real presentation, this is where I would draw a simple diagram: [Millions of Docs] -> [Solr Recall (Fast)] -> [~1000 Candidates] -> [ML Re-ranking (Precise)] -> [Final Ranked List])*

### Phase 1: Candidate Retrieval (Recall) - Speed is King

The first phase has one job: to cast a wide net and retrieve a set of several hundred to a few thousand potentially relevant documents from our massive inventory as quickly as humanly possible. The goal here is to maximize *recall*—ensuring the "perfect" document is somewhere in this initial set—while keeping latency to an absolute minimum.

**Technology:** We used our existing search engine, **Apache Solr**.

**The Technical Deep Dive: Customizing Solr with a `SearchComponent`**

Out-of-the-box, Solr is a powerful text search engine. But to meet our performance and business logic needs, we had to go deeper. We wrote a **custom `SearchComponent` in Java**.

*   **What is a Solr `SearchComponent`?** Solr's query processing is a pipeline of modular components. A `SearchComponent` is a custom piece of Java code that you can insert into this pipeline to execute logic. It can modify the incoming query, process the results, or interact with Solr's internal caches. It's the ultimate way to extend Solr's core functionality.

*   **Our Implementation:** Our `OlxRankingComponent` was inserted early in the pipeline. It did two critical things:
    1.  **Efficiently Applied Business Logic:** Instead of passing complex filter queries (e.g., `fq=market:DE&fq=user_status:active`) in the URL, which can be slow, our component applied this logic directly in Java. This allowed us to leverage Solr's highly-optimized internal caches, particularly the `filterCache`. By pre-warming this cache with our most common filters, we could apply them with near-zero performance overhead. This single change **reduced our p99 recall latency by 40%**.
    2.  **Candidate Source Blending:** The component was responsible for fetching candidates from two sources: the main organic index and a separate, smaller index of sponsored ads. It would then merge these two sets before passing them to the next stage, ensuring that sponsored ads were always included in the candidate pool for the ML model to evaluate.

This phase would return a list of ~1,000 document IDs and their basic BM25 scores to the backend application.

### Phase 2: Machine Learning Re-ranking (Precision) - Intelligence is King

This is where the magic happens. The backend application takes the ~1,000 candidates from Solr and enriches each one with a rich set of features. This feature-rich dataset is then passed to our machine learning model, which scores each document. The final search results are then sorted based on this score.

**Technology:** A **LambdaMART (Multiple Additive Regression Trees)** model, a state-of-the-art Learning-to-Rank (LTR) algorithm. We used the highly optimized implementation in the **LightGBM** library. The model was trained in AWS SageMaker and deployed on a real-time SageMaker endpoint.

The core of this phase wasn't just the model itself, but the rich data we fed it.

## 3. The Feature Factory: Fueling the Ranking Engine

A ranking model is a hungry beast; it needs a constant supply of high-quality data. We built a "Feature Factory" using a combination of Spark for large-scale batch processing and dbt for transformations in our data warehouse (Snowflake). These pipelines ran daily to compute and update features for every active listing.

Here are the key feature categories and columns we engineered. The final training dataset had the following structure:

| Column Name | Type | Description & Engineering Detail | Category |
| :--- | :--- | :--- | :--- |
| `doc_id` | String | Unique identifier for the listing. | Identifier |
| `seller_id` | String | Unique identifier for the seller. | Identifier |
| `bm25_score` | Float | The raw text relevance score from Solr. A crucial baseline. | Search |
| `price` | Float | The absolute price of the item. | Item |
| `price_deviation` | Float | The % deviation of the item's price from the category average. `(price - avg_price) / avg_price`. | Item |
| `seller_rating` | Float | The seller's average star rating (1-5). | Seller |
| `seller_ tenure_days`| Integer | Number of days the seller has been on the platform. | Seller |
| `img_score` | Float | A quality score from 0 to 1 based on image resolution and count. | Item |
| `fav_rate` | Float | (Total Favorites / Total Views) for this item in the last 30 days (with time decay). | Popularity |
| `ctr_7d` | Float | (Total Clicks / Total Impressions) for this item in the last 7 days. | Popularity |
| `contact_rate` | Float | (Total Contacts Initiated / Total Views) for this item in the last 30 days. **Crucial signal for liquidity.** | Popularity |
| `distance_km` | Float | The geographical distance in kilometers between the buyer and the item. | Geo |
| `is_sponsored` | Boolean | 1 if the seller purchased a visibility product for this ad, 0 otherwise. | Monetization |
| `vas_value` | Float | "Value Added Service" value. A normalized score (0-1) representing the bid price or tier of the visibility product purchased. **Crucial signal for revenue.** | Monetization |

### A Deeper Look at Feature Engineering Challenges

*   **Popularity Features & The Cold Start Problem:** Features like `ctr_7d` are powerful but create a chicken-and-egg problem for new listings. A new ad has no history, so its CTR is zero, so it gets a low rank, so it never gets impressions, so its CTR stays zero.
    *   **Our Mitigation:** We implemented a "smoothing" technique using **Bayesian averaging**. For a new ad, its CTR wasn't 0, but a value pulled towards the average CTR of its category. `smoothed_ctr = (global_avg_ctr * C + item_clicks) / (C + item_impressions)`, where `C` is a tunable confidence parameter. This gave new ads a "fighting chance" to be seen and gather their own interaction data.

*   **Sourcing Geolocation Data:** This was a sensitive but critical feature.
    *   **Source:** As mentioned, we used the seller's provided location and the buyer's location (either explicitly set or implicitly derived from mobile GPS with user consent).
    *   **Privacy:** We never stored or used exact lat/long coordinates. All locations were immediately snapped to a **Geohash** of a certain precision (e.g., level 5, which is ~5km x 5km). This provided enough location signal for the model while ensuring user privacy. The `distance_km` feature was calculated between the centroids of these geohash cells.

## 4. The Heart of the System: Multi-Objective Optimization

This is where strategy, business, and mathematics converge. Our goal was to teach the model to make economic trade-offs.

### The Action: Defining and Training on a Weighted Objective

We couldn't just ask the model to predict clicks. We needed it to predict "business value." After extensive workshops with Product, Finance, and Business leaders, we defined a composite **objective label** for each impression in our historical training data.

The core idea was to assign a numerical value to each desirable outcome. Through historical analysis of user LTV (Lifetime Value), we determined the approximate relative value of different user actions.

`Label = (w1 * IsContacted) + (w2 * IsSponsoredAndClicked) + (w3 * IsFavorited)`

*   `IsContacted`: A binary flag (1 or 0). We assigned this the highest weight (`w1 = 10`). A successful connection is the lifeblood of our marketplace.
*   `IsSponsoredAndClicked`: A binary flag. The weight (`w2 = 5`) was derived from the average direct revenue of a click on a sponsored ad.
*   `IsFavorited`: A binary flag. This is a strong signal of intent but less valuable than a contact, so it received a lower weight (`w3 = 2`).

The model was then trained to predict this composite score. By doing this, we taught the model the business logic. It learned that an organic item with a high predicted probability of being contacted was more valuable to rank highly (`score ≈ 10`) than a sponsored item with a medium probability of being clicked (`score ≈ 5`). This is how we achieved **dynamic, value-weighted blending**.

### Why LambdaMART?

We chose a listwise LTR approach like LambdaMART over simpler pointwise or pairwise methods for a critical reason.

*   **Pointwise:** Predicts the value of a single document (e.g., regression to predict CTR). It doesn't know about the other documents in the list.
*   **Pairwise:** Takes two documents and predicts which one is better. It's better, but computationally expensive and still doesn't optimize the entire list.
*   **Listwise (LambdaMART):** Directly optimizes a list-based metric, like **NDCG (Normalized Discounted Cumulative Gain)**. It understands that getting the #1 item right is more important than getting the #10 item right. The "lambdas" in its name refer to the gradients it uses, which are scaled by the change in NDCG. This makes it inherently designed for ranking problems.

## 5. Navigating Complexity: Biases, Risks, and Alternative Paths

A project of this magnitude is never a straight line. Here’s a look at the challenges we faced and the alternative paths we considered.

### Mitigating Inherent Biases

*   **Position Bias:** As discussed, users click top results because they are at the top.
    *   **Our Mitigation:** We logged the position at which an item was shown and used it as a feature during training. This allows the model to learn the inherent "advantage" of being at position 1, 2, etc., and discount it, forcing it to rely on the other features to make its decision.

*   **Presentation Bias:** Our mobile app sometimes showed results in a grid, sometimes in a list.
    *   **Our Mitigation:** We logged the layout type (`grid` vs. `list`) as a feature. The model learned that CTR patterns were different for each layout and adjusted its predictions accordingly.

### Alternative Approaches We Considered

A key part of senior-level work is not just building the solution, but knowing *why* you chose it over other viable alternatives.

1.  **Alternative: A Simple Weighted Heuristic.**
    *   **What:** Instead of a ML model, we could have used a hand-tuned formula like `score = (a * bm25_score) + (b * seller_rating) - (c * distance_km)`.
    *   **Why We Didn't:** This approach is brittle. It doesn't capture non-linear relationships (e.g., price might only matter for certain categories). The weights `a, b, c` would be based on guesswork and would constantly need re-tuning. It's not scalable and doesn't learn from new data. We needed a system that learned from data, not from human intuition.

2.  **Alternative: A Two-Tower Neural Network.**
    *   **What:** A more modern deep learning approach. We would build two separate neural networks (towers). One tower would learn a representation (embedding) of the user and query context. The other would learn an embedding for the item. The model is trained to make these two embeddings "close" (using dot product or cosine similarity) for positive pairs.
    *   **Why We Didn't (Initially):**
        *   **Strong Baseline First:** For tabular, structured data like ours, gradient-boosted trees (like LambdaMART) are an incredibly strong, well-understood, and high-performing baseline. It's often a mistake to jump to deep learning without first establishing a powerful baseline.
        *   **Interpretability:** LambdaMART is more interpretable. We could easily get global feature importances, which was critical for explaining the model's behavior to Product and Business stakeholders in the early stages.
        *   **Serving Complexity:** Serving a two-tower model often requires a vector similarity search index (like FAISS), which would have added significant complexity to our infrastructure.
    *   **Our Roadmap:** This approach was not discarded, but placed on our long-term roadmap as a "Growth Investment" once the initial LambdaMART system was mature.

## 6. The Result: A Paradigm Shift in Value Creation

The rollout of the new ranking engine was a watershed moment for OLX. After a series of carefully monitored A/B tests, the results exceeded our most optimistic projections.

*   **+18% Increase in Contact Rate (Liquidity):** By ranking the most relevant items higher, regardless of sponsorship, we dramatically improved the user experience. Users found what they wanted faster, leading to a massive boost in marketplace health.
*   **+22% Increase in Search-Driven Revenue:** By creating a competitive marketplace where high-quality sponsored ads could earn top positions, we increased both the demand for and the efficiency of our monetization products.
*   **-7% Decrease in Zero-Result Searches:** Our contextual intelligence allowed us to surface relevant, albeit not perfect, local results for broad queries, reducing user frustration.
*   **Operational Efficiency:** The "Feature Factory" and MLOps pipeline (built on GitLab CI/CD and SageMaker Pipelines) reduced the time to experiment with new ranking features from over a month to just three days.

### The Legacy: Beyond the Metrics

The most profound impact was cultural. The ranking engine became the living embodiment of our business strategy. Debates about whether to prioritize user growth or revenue were no longer abstract conversations in a meeting room; they were mathematical weights in a function that we could tune and test. We moved from a company that *used* data to a company that was *driven* by it. This project proved that investing in a sophisticated, scalable ML system wasn't a cost center—it was the most powerful engine for growth we had.

## Appendix: GitLab Repository Structure

A project of this complexity requires meticulous organization. Our GitLab repository was structured to enforce separation of concerns and facilitate CI/CD automation.

```
ranking-engine/
├── .gitlab-ci.yml         # CI/CD: runs tests, builds artifacts, deploys model
├── data_pipelines/        # dbt models and Spark scripts for the Feature Factory
│   ├── dbt/
│   │   ├── models/
│   │   │   ├── staging/
│   │   │   └── marts/
│   │   │       └── fct_listing_features.sql
│   │   └── dbt_project.yml
│   └── spark/
│       └── compute_behavioral_features.py
├── model/                   # Core model training and evaluation code
│   ├── src/
│   │   ├── train.py         # Main training script using LightGBM
│   │   ├── evaluate.py      # Offline evaluation (NDCG, SHAP)
│   │   └── config.yml       # Hyperparameters, feature lists, etc.
│   ├── notebooks/           # Exploratory Data Analysis
│   │   └── eda_feature_correlations.ipynb
│   └── requirements.txt
├── serving/                 # Infrastructure for serving the model
│   ├── solr_components/     # Source for the custom Java SearchComponent
│   │   └── pom.xml
│   └── sagemaker_endpoint/  # Docker and app code for the SageMaker endpoint
│       ├── Dockerfile
│       └── app/
│           └── predictor.py
├── tests/                   # Unit and integration tests
│   ├── test_data_pipelines.py
│   └── test_model_logic.py
└── README.md                # Comprehensive project documentation
```
