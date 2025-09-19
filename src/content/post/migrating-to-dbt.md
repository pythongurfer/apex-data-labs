---
publishDate: '2025-09-19T10:00:00Z'
title: 'From Monolith to Modular: A Case Study in Migrating to a Modern Data Stack with dbt Cloud'
excerpt: "Our most critical dashboard was failing, powered by a monolithic tangle of Airflow DAGs and raw SQL scripts. This is the in-depth story of how we broke down that monolith and migrated our legacy infrastructure to dbt Cloud, applying Kimball's dimensional modeling to build a platform that restored trust and accelerated the entire business."
category: 'Data & Analytics'
tags:
  - dbt
  - data modeling
  - analytical engineering
  - data strategy
  - airflow
  - monolith
  - kimball
image: '/images/articles/dbt.png'
imageAlt: 'A diagram showing chaotic, tangled data pipelines being transformed into a clean, layered, and organized data architecture.'
draft: false
layout: '~/layouts/PostLayout.astro'
---

Every established company has one: a single, monstrous, mission-critical dashboard that was once the pride of the organization but has since decayed into a source of universal frustration. At a previous company, ours was the "Product Health Dashboard." It was meant to be the central nervous system of our entire platform—a single pane of glass for tracking everything from user sign-ups and engagement to transaction volumes and revenue.

In reality, it was a liability. The dashboard was a labyrinth of decade-old SQL queries. Our "pipelines" were a **monolithic repository of hundreds of interdependent `.sql` files, manually managed `.ddl` scripts for table creation, and complex `.yml` configurations, all stitched together by a fragile Airflow DAG that no single person understood end-to-end.** Metrics were defined inconsistently; the "active user" count in the finance section never matched the one in the product section, derailing weekly meetings into painful debates about whose query was correct. The data was often hours, if not days, old. The Airflow DAG would fail silently, leaving stale data on display for executives. Trust in the data wasn't just low; it was non-existent. Our data team spent 80% of its time firefighting and validating basic numbers, leaving no time for the deep, insightful work they were hired to do.

This is the story of how we moved from that state of chaos to one of clarity and trust. It’s a detailed case study of a multi-quarter migration from a legacy monolith to a modern data stack powered by **dbt Cloud**. We'll cover the introduction of a new discipline—**Analytical Engineering**—and the application of timeless data modeling principles, including a **three-layer architecture** and **Kimball's star schema**. Most importantly, we'll share the collaborative playbook we used to deconstruct the monolith and split the work among multiple stakeholders, transforming a technical project into a business-wide strategic win.

---

## The Paradigm Shift: The Rise of Analytical Engineering

The core problem wasn't just our technology; it was our philosophy. Our old approach was to treat data transformation as a series of one-off, imperative scripts. The modern approach, which we adopted, is to treat the data transformation layer as a declarative, version-controlled software product. This is the essence of **Analytical Engineering**.

Analytical Engineering is the discipline that applies software engineering best practices—modularity, version control, testing, and CI/CD—to the analytics workflow. It’s a recognition that the SQL transformation code that powers a business is as critical as the application code that powers the user-facing product.

### ### Defining the Roles: The Analytical Engineer as a Bridge

This new discipline created a new role that sat crucially between the traditional Data Analyst and Data Engineer. Understanding this distinction was key to our cultural transformation.
* **The Data Engineer:** Owns the infrastructure. Their job is to build robust, scalable pipelines to get data from source systems into the data warehouse. They are experts in systems like Fivetran, Airflow, and the performance tuning of Snowflake or BigQuery. Their "customer" is the data team.
* **The Data Analyst:** Owns the insights. Their job is to understand the business deeply, interpret data, build dashboards, and answer strategic questions. They are experts in the "what" and "why" of the business. Their "customer" is the business stakeholder.
* **The Analytical Engineer:** Owns the transformation logic. They are the bridge between the two. They take the raw data provided by the Data Engineer and use software engineering principles to model it into clean, reliable, and well-documented datasets. They are SQL and dbt experts who build the data marts that the Data Analyst uses. Their work empowers the Data Analyst to be self-sufficient and trust the data they are working with.

**dbt (data build tool)** is the de facto tool for the analytical engineer. It doesn't extract or load data; it focuses solely on the "T"—the transformation layer that lives within the data warehouse. **dbt Cloud** adds a collaborative, web-based UI, integrated Git workflows, scheduling, and alerting on top of the open-source dbt Core. Adopting dbt Cloud was more than a tooling change; it was a commitment to this new paradigm, giving our analysts the power to become true analytical engineers.

---

## The Blueprint: A Principled Architecture for Trust

Before we could write a single line of new code, we had to define the architecture that would replace the "spaghetti SQL" of the old system. We settled on two foundational concepts: a layered approach to data modeling and Kimball's dimensional methodology.

### The Three-Layer Architecture

A layered architecture separates data models based on their purpose and level of transformation. This creates a clean, logical data flow that is easy to understand, maintain, and debug.



1.  **Staging Layer (`stg_`)**: The clean, 1-to-1 representation of source data. Its only job is basic cleaning like renaming columns and casting types.
2.  **Intermediate Layer (`int_`)**: The workhorse layer where complex business logic, joins, and aggregations live. These models are designed to be reused by many downstream marts.
3.  **Marts Layer (`fct_`, `dim_`)**: The final layer, optimized for business intelligence. These are the "data products" that power dashboards, designed as clean, wide tables. This is where we implemented Kimball's dimensional modeling.

### Kimball's Dimensional Modeling: The Star Schema

Proposed by Ralph Kimball, dimensional modeling is a design methodology for data warehouses that is optimized for fast, intuitive querying. Its core structure is the **star schema**.

* **Facts (`fct_`)**: Fact tables store the events and measurements of the business (e.g., a purchase, a session).
* **Dimensions (`dim_`)**: Dimension tables store the context—the who, what, where, when—related to those events (e.g., users, products, dates).



This structure is incredibly efficient for analytical queries. While it can be tempting to create a single, massive "One Big Table" (OBT) for simplicity, the star schema provides far greater maintainability. Business logic (like the definition of a "premium user") is defined once in `dim_users` and can be updated in a single place, whereas in an OBT, that logic might be repeated and fall out of sync across dozens of columns. The star schema enforces consistency.

---

## The Migration Strategy: A Collaborative Playbook

Migrating a system as critical and broken as the Product Health Dashboard was like trying to repair a plane while it was in flight. A "big bang" approach was a non-starter. We needed a phased, iterative approach that delivered value quickly, built momentum, and involved stakeholders at every step.

### Phase 1: Audit the Chaos and Prioritize by Value

Before we could build, we had to understand. We spent the first month conducting a full audit of the old dashboard and the underlying monolith. We created a "metric inventory" by interviewing stakeholders to understand the most critical business questions. This gave us a prioritized list of what to migrate first.

#### **Deconstructing the Airflow Monolith**

The next step was to map this business-centric list to the technical artifacts in our old system. The monolith was a classic example of entropy:
* **`.sql` Archives:** Hundreds of scripts, often thousands of lines long, with no version control, no documentation, and deeply nested CTEs. This was where the "black box" business logic was hidden.
* **`.ddl` Files:** A separate collection of `CREATE TABLE` and `ALTER TABLE` statements. These were managed manually and frequently fell out of sync with the `.sql` files that populated them.
* **`.yml` / DAG Files:** The Airflow DAGs were a web of complex Python code and YAML configurations that defined the execution order, creating a brittle, invisible web of dependencies.

Our strategy was not to "lift and shift" this complexity. It was to **deconstruct and refactor**. For each prioritized metric, we traced it back to its source `.sql` script. We read the old code not to copy it, but to understand its *intent*. This was crucial. A single 1000-line script for "daily active users" was painstakingly broken down into a series of modular, chained dbt models: `stg_app_events`, `stg_users`, `int_sessions_stitched`, and finally `fct_user_daily_activity`.

This approach replaced the different, disconnected file types with a unified dbt project:
* **Manual `.ddl` files became obsolete.** In dbt, you only write a `SELECT` statement. dbt handles the `CREATE TABLE AS` or `MERGE` statements automatically through its materialization configs.
* **Complex Airflow dependencies became obsolete.** In dbt, you simply use the `{{ ref('model_name') }}` function. dbt reads these references and builds the entire dependency graph (DAG) for you automatically.

### Phase 2: Build the Foundational Scaffolding & Leverage the dbt Cloud Toolkit

With our priorities clear, we started with the most foundational and reusable components: `dim_users` and `dim_dates`. While building these, we established our core workflow in dbt Cloud, leveraging its toolkit to enforce best practices from day one.
* **Integrated Git Workflow:** Every change, no matter how small, was made in a new Git branch and submitted as a pull request (PR). dbt Cloud's GitHub integration was key. On every PR, it would automatically trigger a CI job that would run `dbt build` on a temporary schema, ensuring the new code didn't break anything before it was merged.
* **Automated Testing & Documentation:** We adopted a "no docs, no merge" policy. Using dbt's `.yml` files, every model had to have descriptions for every column. We added basic tests (`not_null`, `unique`) to all primary keys. This documentation wasn't an afterthought; it was part of the development process, and `dbt docs generate` gave us a living, searchable data catalog for the entire company.
* **Macros for Efficiency:** We identified repetitive SQL patterns and abstracted them into dbt **macros**. For example, we wrote a simple macro to convert currency fields from cents to dollars, ensuring this logic was applied consistently everywhere with a single line of code: `{{ cents_to_dollars('price') }}`.

### Phase 3: Vertical Slices and Cross-Functional Squads

This was the core of our collaborative strategy. We tackled the migration **vertically**, one business domain at a time, carving out a piece of the monolith with each sprint.

For each vertical slice (e.g., "User Engagement"), we formed a temporary, cross-functional "squad" consisting of the business stakeholder, an analyst, and a data engineer. In a kickoff meeting for the "User Engagement" slice, the Product Manager would state their goal: "I need to understand user retention by acquisition channel, and I need to trust the numbers." The Analyst would then translate this into dbt models (`fct_user_retention`), replacing the old, untrusted SQL scripts. The Data Engineer would ensure the raw event stream data feeding the `stg_` models was sound. This tight feedback loop, managed through Git and dbt Cloud's UI, was a game-changer.

We worked through the old dashboard, slice by slice, replacing pieces of the Airflow monolith with robust, tested, and documented dbt models.

---

## The Impact: Measuring the Transformation

The migration project was officially concluded after three quarters. The old dashboard and its underlying Airflow DAG were decommissioned. The impact was felt across the entire organization.

* **Analytics Velocity:** The most immediate change was the speed of the data team. The time to answer a new, ad-hoc business question dropped from an average of two weeks to less than two days. Because our data was now modeled into clean, reusable components, analysts could often answer questions with a simple query on a data mart, rather than writing a complex, 500-line query from scratch.
* **Product Velocity:** The impact on the product team was profound. One Product Manager told me she used to spend 5-10 hours every week manually validating data. With the new, trusted dashboards, that time dropped to less than an hour. She now uses that recovered time for what she was hired to do: talking to customers and planning new features.
* **Business Impact and Trust:** The ultimate win was the restoration of trust in data. Six months after the project, we had a high-stakes meeting to decide on a major pricing change. In the past, this meeting would have been derailed by arguments over the data's validity. This time, everyone came to the meeting with the same dashboard, powered by the same `finance_mart`. The debate was not about the data's accuracy; it was about its strategic implications. We made a faster, more confident decision that ultimately increased revenue by 5%.

#### **A Marketing Success Story: From Wasted Spend to Optimized ROAS**

Before the migration, the marketing team operated on a spreadsheet. They would manually export ad spend data from Google and Facebook and try to join it with conversion data from our production database. The process was slow, error-prone, and always a week out of date. After the migration, we built a dedicated `marketing_mart`. This new mart joined data from our Fivetran-powered ad platform sources with our internal `fct_conversions` model. For the first time, the team could build a self-serve dashboard in Tableau showing daily Return on Ad Spend (ROAS) by channel and campaign. Within the first month, they discovered they were overspending on a low-performing Facebook campaign. They reallocated $20,000 of that budget to a high-performing Google Ads campaign, resulting in a 15% increase in marketing-attributable revenue the following quarter. This was a direct, measurable financial win that was impossible with our old infrastructure.

## Conclusion: More Than a Technical Upgrade

Migrating our failing dashboard to dbt Cloud was not just a technical upgrade; it was a cultural transformation. We successfully **deconstructed an opaque, monolithic system into a collection of modular, testable, and well-documented data products**, managed with the reliability of a modern software engineering workflow. We moved from a reactive, chaotic environment to a proactive, professional data culture governed by the principles of Analytical Engineering. The final output of the project wasn't a new dashboard; it was a scalable, reliable, and trustworthy data platform that the entire business could build upon.