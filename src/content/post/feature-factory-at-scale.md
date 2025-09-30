---
publishDate: '2025-09-20T10:00:00Z'
title: 'The Feature Factory: Engineering Terabytes of Data for a World-Class Ranking Model'
excerpt: "A deep-dive into the architecture, technologies (Spark, EMR, Redis), and MLOps principles that allowed us to process terabytes of data into high-quality features, unlocking millions in value and creating a sustainable competitive advantage."
category: 'Data Engineering & MLOps'
tags:
  - Data Engineering
  - Feature Store
  - Spark
  - MLOps
  - Redis
  - E-commerce
image: '~/assets/images/articles/feature-engineering.png'
imageAlt: 'An architectural diagram showing a feature factory pipeline, with data flowing from a data lake through Spark to an online/offline feature store.'
author: 'Anika Rosenzuaig'
tableOfContents: true
draft: false
layout: '~/layouts/PostLayout.astro'
---

## Introduction: The Model Is Only as Good as Its Ingredients

In the world of machine learning, the model often gets the spotlight. But behind every high-performing ranking algorithm is a less glamorous, yet far more critical, foundation: the data. In our journey to build a multi-objective ranking system, we quickly realized that our ability to generate, manage, and serve features at scale would be the single biggest determinant of our success.

Initially, our "feature engineering" was a collection of ad-hoc SQL scripts and a few static fields in our Solr index. This approach was brittle, slow, and incapable of capturing the rich, dynamic user behaviors needed to train a sophisticated model. We were trying to build a skyscraper on a foundation of sand.

This article tells the story of how we moved from that fragile state to building a centralized, automated **"Feature Factory."** It's a deep-dive into the architecture, the technologies (Spark, EMR, Redis), and the MLOps principles that allowed us to process terabytes of data into high-quality features, unlocking millions in value and creating a sustainable competitive advantage.

### Chapter 1: The Pain of a Manual Feature World

Before we could justify the investment in a Feature Factory, we had to articulate the pain points of our existing system.

*   **The "Time-to-Feature" Metric was Abysmal**:
    *   **Before**: Creating a single new feature (e.g., "seller's 30-day average contact rate") was a multi-week ordeal. It required a data scientist to write a query, a data engineer to productionize it, and a backend engineer to integrate it. Our average time-to-feature was **4-6 weeks**.
    *   **Business Impact**: We were missing opportunities. By the time we could test a new feature idea, user behavior had already changed.

*   **Inconsistent Data Between Training and Serving**:
    *   **Before**: The logic to calculate a feature for training (a batch SQL query) was often different from the logic used for real-time serving (a microservice calculation). This "training-serving skew" was a constant source of bugs and degraded model performance.
    *   **Business Impact**: Models that performed brilliantly offline would fail silently in production, costing us revenue and eroding trust in the data science team.

*   **Lack of Rich, Behavioral Features**:
    *   **Before**: We were limited to simple, static features like `price` or `item_creation_date`. We had no scalable way to compute complex, time-windowed features like "an item's popularity trend over the last 72 hours."
    *   **Business Impact**: Our model couldn't understand user intent. It treated an item that was suddenly trending the same as one that was consistently mediocre, failing to capitalize on viral loops or seasonal demand.

The business case was undeniable: to win, we needed to build a machine that could mass-produce high-quality, consistent, and timely features.

### Chapter 2: The Architecture of the Feature Factory

Our vision was a centralized system that would handle the entire feature lifecycle, from raw data to online serving. We designed it around a robust, scalable stack using Spark and a dual-database Feature Store.

**The High-Level Architecture:**

1.  **Data Lake (S3)**: All raw event data (clicks, impressions, contacts) from our Kafka streams are archived here, creating a multi-petabyte historical record.
2.  **Batch Feature Computation (Spark on AWS EMR)**: Hourly and daily, scheduled Spark jobs run on auto-scaling EMR clusters. These jobs read terabytes of raw data and perform the heavy-lifting transformations and aggregations.
3.  **Feature Store (The Dual-Database Heart)**: This is the core of the factory.
    *   **Offline Store (S3/Parquet)**: The full historical output of the Spark jobs is written back to S3 in the highly efficient Parquet format. This massive dataset is the "textbook" used for training new models.
    *   **Online Store (Redis & DynamoDB)**: The *latest value* for every feature of every item is pushed to a low-latency online store. This is what the production search service reads from in real-time.

**Why the Dual Database?**
This separation is critical for scale. The Offline store is optimized for high-throughput batch reads by Spark. The Online store is optimized for low-latency, single-key lookups (e.g., "get all features for `doc_id`: AD-123").

### Chapter 3: Building Features at Scale - A Practical Example

Let's walk through the creation of a powerful behavioral feature: `ad_ctr_7d_by_query_category` (an ad's 7-day click-through rate within a specific category of queries).

**Step 1: The Spark Job**

A Spark SQL job runs daily, processing the last 7 days of clickstream data from the S3 data lake.

```sql
-- Simplified Spark SQL for clarity
CREATE OR REPLACE TEMPORARY VIEW ad_performance_daily AS
SELECT
    ad_id,
    query_category,
    CAST(event_timestamp AS DATE) AS event_date,
    SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS total_clicks,
    SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) AS total_impressions
FROM raw_clickstream
WHERE event_timestamp >= date_sub(current_timestamp(), 7)
GROUP BY ad_id, query_category, CAST(event_timestamp AS DATE);

-- Calculate the final feature
SELECT
    ad_id,
    query_category,
    SUM(total_clicks) / SUM(total_impressions) AS ad_ctr_7d_by_query_category
FROM ad_performance_daily
GROUP BY ad_id, query_category;
```

**Step 2: Pushing to the Feature Store**

The output of this Spark job (a table with millions of rows) is written to two places:
1.  It's appended to the **Offline Store** on S3 for future model training.
2.  A separate process reads the result and updates the **Online Store**. For Redis, this might look like:
    ```
    # Key: features:ad_id:AD-123
    # Hash Field: ctr_7d_cat_electronics
    # Value: 0.045
    HSET features:ad_id:AD-123 ctr_7d_cat_electronics 0.045
    ```

Now, the feature is available for both training and serving, calculated from the exact same source logic.

### Chapter 4: The Business Value Unleashed

The Feature Factory was a game-changer, delivering value across the entire organization.

| Metric | Before | After | Business Impact |
| :--- | :--- | :--- | :--- |
| **Time-to-Feature** | 4-6 Weeks | **< 3 Days** | **Increased Agility**: We could now run dozens of feature experiments per quarter, rapidly iterating on the model. |
| **Model Performance (NDCG@10)** | 0.82 | **0.89** | **Better Relevance**: The addition of rich, behavioral features led to a significant lift in offline model quality. |
| **Training-Serving Skew Incidents** | 2-3 per month | **Zero** | **Increased Reliability**: Eliminating skew meant our offline results translated directly to online gains, building trust in the ML systems. |
| **North Star (Contact Rate)** | - | **+4% (attributable to better features)** | **Direct Revenue Growth**: Better features led to a more relevant ranking, which directly drove more successful user connections. |

### Conclusion: Features as a Product

The single most important lesson from our journey is this: **treat your features as a first-class product.** They need to be well-documented, versioned, monitored, and owned.

By building a centralized Feature Factory, we moved away from a chaotic, manual process and created a scalable, reliable engine for innovation. It empowered our data scientists to experiment freely, our engineers to build with confidence, and our business to reap the rewards of a truly intelligent ranking system. The factory doesn't just produce data; it produces value.
