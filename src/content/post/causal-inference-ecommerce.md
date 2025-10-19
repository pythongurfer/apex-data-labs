---
publishDate: '2025-10-19T18:00:00Z'
title: 'Measuring the Un-testable: A Guide to Causal Inference for E-commerce'
excerpt: "What happens when you can't run an A/B test? This guide dives deep into quasi-experimental methods like DiD, RDD, and CausalImpact, with practical use cases for large e-commerce and advertising platforms."
category: 'Data & Analytics'
tags:
  - causal inference
  - econometrics
  - data science
  - product analytics
  - time series
  - quasi-experiment
author: 'Anika Rosenzuaig'
image: '~/assets/images/articles/chicken-egg.png'
imageAlt: 'A diagram showing two diverging paths from a single point, representing an intervention and a counterfactual reality.'
draft: false
layout: '~/layouts/PostLayout.astro'
---

## Introduction: The World Beyond A/B Testing

In the data-driven world of a large e-commerce marketplace, the A/B test is king. It's the gold standard for determining the impact of a change. But what happens when you can't run an A/B test?

Consider these scenarios:
*   Your company launches a multi-million dollar national TV advertising campaign. You can't show it to only half the country.
*   You change the seller commission structure for an entire market. You can't have two different fee systems running simultaneously.
*   A major competitor suddenly goes out of business. How did this external event impact your sales?

These are high-stakes questions that A/B tests cannot answer. To tackle them, we must turn to the world of **causal inference** and **quasi-experimental methods**. This is the science of measuring cause and effect in the wild, using observational data. It's about building a "what if" machine—a **counterfactual**—to estimate what would have happened if the intervention had never occurred.

This guide provides a practical overview of key quasi-experimental methods, with use cases tailored to a large e-commerce or classifieds platform that also operates a significant ads business (like eBay Ads or OLX).

### The Core Idea: The Counterfactual

The goal of all causal inference is to estimate the difference between two potential outcomes:
1.  What actually happened (the factual).
2.  What *would have* happened without the intervention (the counterfactual).

**Causal Effect = Factual Outcome - Counterfactual Outcome**

Since we can never observe the counterfactual directly, the entire field of causal inference is about finding clever ways to estimate it from the data we do have.

## The Quasi-Experimental Toolkit

Here are four powerful methods for estimating causal effects without an A/B test.

### 1. Difference-in-Differences (DiD)

This is one of the most intuitive and widely used methods. It's perfect for when an intervention is applied to one group (the treatment group) but not another (the control group).

*   **How it Works:** DiD calculates the *difference in the average outcome* for the treatment group before and after the intervention, and then subtracts the *difference in the average outcome* for the control group over the same period. This "double difference" controls for trends or seasonality that would have affected both groups.

*   **Use Case:** A classifieds platform wants to stimulate its automotive market in France. It decides to offer a "free professional photoshoot" for every car listed in France for a three-month period. This offer is not made in Spain, a neighboring market with similar characteristics.
    *   **Treatment Group:** All sellers in France.
    *   **Control Group:** All sellers in Spain.
    *   **Outcome Metric:** Average number of new car listings per week.
    *   **Analysis:** You compare the change in weekly listings in France (before vs. during the promo) to the change in weekly listings in Spain over the same period. The difference between these two changes is your estimated causal impact of the promotion.

*   **Pros:**
    *   Simple to understand and implement.
    *   Controls for time-invariant differences between the groups (e.g., if France always has more listings than Spain) and common time trends (e.g., seasonality in car sales).

*   **Risks & Limitations:**
    *   **The Parallel Trends Assumption:** This is the critical weakness. The method assumes that, in the absence of the treatment, the two groups' outcomes would have followed the same trend. If Spain's car market was already on a different growth trajectory than France's, the assumption is violated.

*   **How to Mitigate:**
    *   **Visual Inspection:** Plot the outcome metric for both groups for a long period *before* the intervention. The lines should move in parallel. If they are diverging or converging, your assumption is weak.
    *   **Statistical Tests:** You can run a regression to test for the significance of the interaction term between group and time in the pre-intervention period.

### 2. Interrupted Time Series (ITS)

This method is used when an intervention affects an entire population at a single point in time, and you don't have a clean control group.

*   **How it Works:** You analyze a single time series for the outcome of interest. The model establishes the baseline trend and level of the series *before* the intervention. The "interruption" is the intervention itself. The model then looks for a statistically significant change in the level or trend of the series immediately after the interruption.

*   **Use Case:** An e-commerce platform launches a large-scale third-party display advertising campaign (e.g., on the Google Display Network) to drive awareness for its "Home & Garden" category. The campaign runs for the entire month of April.
    *   **Treatment:** The advertising campaign.
    *   **Outcome Metric:** Daily organic traffic to the "Home & Garden" category pages.
    *   **Analysis:** You model the daily organic traffic data. The model accounts for existing trends (is traffic growing?) and seasonality (are weekends different from weekdays?). The intervention is a dummy variable that is 0 before April and 1 during April. The model estimates the coefficient of this dummy variable, telling you the average daily lift in organic traffic, controlling for the pre-existing patterns.

*   **Pros:**
    *   Doesn't require a control group.
    *   Can detect both immediate (level change) and long-term (slope change) effects.

*   **Risks & Limitations:**
    *   **Confounding Events:** The biggest risk is that another event happened at the same time as your intervention. If a major home improvement TV show also started in April, it could be the true cause of the traffic lift.

*   **How to Mitigate:**
    *   **Control Variables:** If you know about other events, you can include them as additional variables in your model (this is often called an ARIMAX model).
    *   **Qualitative Research:** Be a good detective. Check news articles, competitor announcements, and internal calendars to see what else was happening at the time of the intervention.

### 3. CausalImpact (Bayesian Structural Time Series)

Developed by Google, this is a more sophisticated version of Interrupted Time Series. It's one of the most powerful tools for time-series-based causal inference.

*   **How it Works:** Instead of just looking at the pre-trend of a single series, CausalImpact uses a set of **control time series** (covariates) to build a much more robust prediction of the counterfactual. These control series should be correlated with your outcome metric but *unaffected* by the intervention.

*   **Use Case:** A marketplace decides to increase the final value fee (commission) for sellers in the "Consumer Electronics" category from 8% to 10%, effective on July 1st. The goal is to measure the impact on daily Gross Merchandise Value (GMV) in that category.
    *   **Outcome Metric:** Daily GMV for "Consumer Electronics."
    *   **Control Metrics (Covariates):** Daily GMV from other, unaffected categories like "Fashion," "Books," and "Sporting Goods." You could also include site-wide traffic or even external economic indicators.
    *   **Analysis:** The CausalImpact model learns the relationship between the control categories' GMV and the electronics GMV in the period *before* July 1st. It then uses the post-July 1st data from the control categories to predict what the electronics GMV *would have been* if the fee change had never happened. The difference between this prediction and the actual observed GMV is the estimated causal effect.

*   **Pros:**
    *   Provides a probabilistic estimate of the impact with a 95% confidence interval.
    *   The output is a clear, easy-to-interpret graph showing the factual, the counterfactual, and the difference.
    *   By using multiple covariates, it's more robust to confounding events than a simple ITS.

*   **Risks & Limitations:**
    *   **Finding Good Covariates:** The quality of the result depends entirely on the quality of the control variables. They must not be affected by the intervention.
    *   **Model Assumptions:** The model assumes the relationships between the covariates and the target variable are stable over time.

*   **How to Mitigate:**
    *   **Careful Covariate Selection:** Choose covariates based on business logic. Test for "Granger causality" to ensure they have predictive power.
    *   **Sensitivity Analysis:** Run the model multiple times, leaving out one covariate at a time. If the results change dramatically, your model may be too reliant on a single, potentially problematic covariate.

### 4. Regression Discontinuity Design (RDD)

RDD is a powerful method that can be used when a treatment is assigned based on whether a unit is above or below a specific, arbitrary cutoff point.

*   **How it Works:** RDD compares the outcomes of units that are *just barely* on either side of the threshold. The logic is that these units are, on average, almost identical in every way *except* for the treatment they received.

*   **Use Case:** An ads platform wants to encourage spending by offering a "Premium Seller" status to any seller who spends more than €500 on ads in a month. This status gives them access to a dedicated account manager.
    *   **Threshold:** €500 ad spend.
    *   **Treatment:** Access to an account manager.
    *   **Outcome Metric:** Seller churn rate in the following quarter.
    *   **Analysis:** You compare the churn rate of sellers who spent between €500 and €525 (just above the cutoff) to the churn rate of sellers who spent between €475 and €500 (just below the cutoff). Any statistically significant difference in churn between these two very similar groups can be attributed to the effect of having an account manager.

*   **Pros:**
    *   When the assumptions hold, RDD provides a very reliable, unbiased estimate of the local average treatment effect. It's often considered as good as a randomized experiment.

*   **Risks & Limitations:**
    *   **Manipulation of the Threshold:** The method fails if users can precisely manipulate their position around the threshold. If sellers know about the €500 rule, many might intentionally spend just enough to get over it, breaking the assumption of randomness around the cutoff.
    *   **Generalizability:** The result is only valid for the population near the cutoff. The effect of an account manager on a seller who spends €5,000 might be very different.

*   **How to Mitigate:**
    *   **Check for Sorting:** Create a histogram of the assignment variable (ad spend). If you see a suspicious "bunching" of sellers right above the €500 mark, it's a sign of manipulation.
    *   **Be Cautious with Extrapolation:** Clearly state that the findings are a *local* effect and may not apply to users far from the threshold.

### 5. Propensity Score Matching (PSM)

This method is a powerful way to deal with **selection bias**, which occurs when users themselves choose whether or not to receive a treatment. It aims to create a "statistical twin" for each treated user from a pool of untreated users, allowing for a more apples-to-apples comparison.

*   **How it Works:** PSM is a two-step process:
    1.  **Calculate Propensity Scores:** First, you build a predictive model (usually logistic regression) on pre-treatment data. The model's goal is to predict the probability, or "propensity," of a user choosing to enter the treatment group. The predictors are user characteristics like age, past activity, location, etc.
    2.  **Matching:** For each user in the treatment group, you find one or more users in the control group who have a very similar propensity score. This creates a new, smaller control group of "twins" that is balanced on all the observable characteristics you used in your model. You then compare the outcomes between the treated users and their matched twins.

*   **Use Case (The "Self-Selection" Problem):** A large marketplace introduces a new, optional, paid "Pro Seller Subscription." For €20/month, sellers get premium features like lower final value fees and better visibility for their listings. The platform wants to measure the true causal impact of this subscription on a seller's monthly sales (GMV).
    *   **The Problem:** You can't A/B test this because sellers *choose* to subscribe. A simple comparison between subscribers and non-subscribers would be highly misleading. Subscribers are likely more motivated, experienced, and already selling more. You'd be confusing correlation with causation.
    *   **The PSM Solution:**
        *   **Treatment Group:** All sellers who subscribed to the "Pro Seller" plan.
        *   **Control Pool:** All sellers who did not subscribe.
        *   **Step 1 (Propensity Model):** Build a logistic regression model on data from *before* the subscription was launched. The model predicts the likelihood a seller would subscribe based on covariates like: `account_age`, `past_6_months_gmv`, `number_of_active_listings`, `average_seller_rating`, `categories_sold_in`, and `ad_spend`.
        *   **Step 2 (Matching):** For each "Pro Seller," find a non-subscriber in the control pool who has a nearly identical propensity score (e.g., within a 0.001 difference). This creates a synthetic control group of sellers who *looked* just like the subscribers before the treatment.
        *   **Analysis:** Now, compare the average monthly GMV of the "Pro Seller" group to the average monthly GMV of their matched "twin" group in the period *after* the subscription began. This difference is a much more reliable estimate of the subscription's true causal effect on sales.

*   **Pros:**
    *   Directly addresses selection bias, a very common problem in observational studies.
    *   Creates a balanced comparison group, making the results more intuitive and credible.

*   **Risks & Limitations:**
    *   **Unobserved Confounders (The Achilles' Heel):** PSM can only balance on the variables you observe and include in your model. If there's a hidden variable you don't have data for (e.g., a seller's intrinsic "motivation" or "business acumen"), your matching will be incomplete, and the results can still be biased.
    *   **Common Support:** You can only match users who have overlapping propensity scores. If your "Pro Sellers" are all super-users with propensity scores above 0.9, and you have no non-subscribers in that range, you can't find twins for them, and your analysis will be limited to the less extreme users.

*   **How to Mitigate:**
    *   **Rich Covariate Set:** The most important step is to include as many relevant, pre-treatment variables in your propensity model as possible. The more you know about the users, the better you can control for confounding.
    *   **Check Balance:** After matching, you must verify that the covariates are actually balanced between your new treatment and control groups. Run t-tests on the means of each variable; there should be no statistically significant differences left.
    *   **Combine with DiD:** A very robust approach is to perform a Difference-in-Differences analysis *on the matched sample*. This combines the strengths of both methods, controlling for both observed, time-invariant confounders (via PSM) and unobserved, time-varying confounders (via DiD).

## Conclusion: Building a Culture of Causal Thinking

Quasi-experimental methods are not a perfect substitute for A/B testing, but they are an indispensable part of a mature data organization's toolkit. They allow you to learn from every policy change, every marketing campaign, and every external shock.

By understanding the core logic of each method and, crucially, its underlying assumptions and risks, you can move from simply reporting on "what happened" to providing a credible, data-backed estimate of "why it happened." This ability to measure the un-testable is what separates a good data team from a great one.
