---
publishDate: '2025-09-06T10:00:00Z'
title: 'Beyond the Black Box: Custom Java Components for Solr at Massive Scale'
excerpt: "Off-the-shelf Solr is powerful, but running a marketplace for 500 million daily queries requires deep customization. This is a technical guide to the essential custom Java Search Components and Query Parsers we built to handle multi-market logic, performance, and business agility at scale."
category: 'Search Engineering'
tags:
  - Search
  - Solr
  - Java
  - Architecture
  - Performance
  - E-commerce
image: '~/assets/images/articles/solr-java.png'
imageAlt: 'A detailed architectural diagram showing custom Java components plugging into the Solr request lifecycle.'
draft: false
layout: '~/layouts/PostLayout.astro'
---

## Introduction: The Limits of Off-the-Shelf Solr

In a previous case study, we detailed our journey of implementing a multi-objective Learning to Rank (LTR) model to balance user relevance and monetization. While the LTR model acts as the sophisticated "brain" for re-ranking, the initial candidate retrieval—finding the best 200 potential results from a catalog of billions of items—is the critical foundation. This phase is handled by a massive SolrCloud cluster.

However, for a platform operating at the scale of OLX (over 500 million queries daily across 30+ markets), a standard Solr implementation quickly hits its limits. You cannot simply pass every piece of business logic as a query parameter. This approach is slow, hard to maintain, and doesn't leverage the full power of Solr's distributed nature.

To achieve the required performance and flexibility, we had to go beyond configuration and write our own **custom Java extensions**. This article is a technical deep-dive into the essential `SearchComponent` and `QParserPlugin` implementations that form the backbone of our search stack.

## The Architectural Context: Where Java Fits In

Our search architecture involves a Java-based Search Service that orchestrates the request. The interaction with Solr is not a simple query. It's a multi-stage process where our custom components play a key role.

1.  **Request Hits Search Service (Java)**: The service receives the user's query and context (e.g., user location, language).
2.  **Query Sent to Solr**: The service constructs a query that invokes our custom components and parsers.
3.  **Solr Lifecycle Execution**: Inside Solr, a chain of components executes. Our custom code runs here, modifying the query, filtering results, and preparing data for the LTR model.
4.  **Response to Search Service**: Solr returns a list of 200 candidate documents, enriched with features extracted by our components.
5.  **Re-ranking**: The Search Service then sends these candidates to the LTR model for the final scoring.

This custom Java layer is what makes the entire system scalable and agile.

## Custom Search Components: Injecting Business Logic

A `SearchComponent` is a Java class that plugs into Solr's request-processing pipeline. It can inspect and modify the query, process results, and add information to the final response.

To add a component, you register it in `solrconfig.xml`:

```xml
<searchComponent name="marketFiltering" class="com.olx.search.solr.MarketFilteringComponent"/>
<searchComponent name="categoryBoosting" class="com.olx.search.solr.CategoryBoostingComponent"/>

<requestHandler name="/select" class="solr.SearchHandler">
  <arr name="first-components">
    <str>marketFiltering</str>
  </arr>
  <arr name="last-components">
    <str>categoryBoosting</str>
  </arr>
</requestHandler>
```

### Example 1: `MarketFilteringComponent`

**Problem**: We cannot show ads from Poland to a user in Brazil. This filtering must be applied to every single query, and it must be extremely fast. Adding it as a standard filter query (`fq`) from the client is inefficient.

**Solution**: A `SearchComponent` that runs first (`first-components`). It inspects the request for a market identifier and automatically appends a non-negotiable `FilterQuery`.

```java
// Simplified for clarity
public class MarketFilteringComponent extends SearchComponent {

    @Override
    public void prepare(ResponseBuilder rb) throws IOException {
        SolrParams params = rb.req.getParams();
        String market = params.get("market");

        if (market == null || market.isEmpty()) {
            throw new SolrException(ErrorCode.BAD_REQUEST, "Market parameter is mandatory.");
        }

        // This adds a filter query to the request that will be cached by Solr's
        // filterCache, making it extremely fast for subsequent requests.
        rb.addFilterQuery("{!term f=market_id}" + market);
    }

    // ... other methods ...
}
```

This component ensures that market filtering is always applied, is cacheable, and is completely abstracted away from the client application.

### Example 2: `PreLtrFeatureExtractionComponent`

**Problem**: Our LTR model needs features. Some features, like "document age" or "number of images," are stored directly in the Solr index. Having the Search Service fetch these fields for 200 documents is an unnecessary network hop.

**Solution**: A `SearchComponent` that runs last (`last-components`). It runs after the results are fetched and efficiently extracts these simple features, adding them to the response.

```java
// Simplified for clarity
public class PreLtrFeatureExtractionComponent extends SearchComponent {

    @Override
    public void process(ResponseBuilder rb) throws IOException {
        // This component runs after the main query and doc retrieval.
        SolrDocumentList docs = (SolrDocumentList) rb.rsp.getValues().get("response");

        for (SolrDocument doc : docs) {
            // Extract features directly from the Solr document
            Date creationDate = (Date) doc.getFieldValue("creation_date");
            long daysOld = Duration.between(creationDate.toInstant(), Instant.now()).toDays();
            int imageCount = (int) doc.getFieldValue("image_count");

            // Add them to a special section of the response for the Search Service
            // (This part is complex, often involves modifying the response context)
        }
    }
    // ... other methods ...
}
```

This moves simple feature extraction logic to the data layer, reducing latency and simplifying the Search Service.

## Custom Query Parsers: Understanding User Intent

A `QParserPlugin` allows you to define entirely new ways of parsing a query string. This is for when `edismax` or `Standard` query parsers are not expressive enough for your domain.

Register it in `solrconfig.xml`:
```xml
<queryParser name="geoRadius" class="com.olx.search.solr.GeoRadiusQueryParserPlugin"/>
```

### Example: `GeoRadiusQueryParser`

**Problem**: A user wants to find items "within 20 kilometers." Solr has spatial search capabilities, but the syntax (`{!geofilt sfield=location pt=48.8,2.3 d=20}`) is verbose and not user-friendly.

**Solution**: A custom query parser that provides a cleaner syntax, like `{!geoRadius d=20}`. The parser automatically gets the user's location from a request parameter.

```java
// Simplified for clarity
public class GeoRadiusQueryParserPlugin extends QParserPlugin {
    @Override
    public QParser createParser(String qstr, SolrParams localParams, SolrParams params, SolrQueryRequest req) {
        return new QParser(qstr, localParams, params, req) {
            @Override
            public Query parse() throws SyntaxError {
                String userLatLon = params.get("user_location"); // e.g., "48.8,2.3"
                double distance = localParams.getDouble("d", 10.0); // Default to 10km

                if (userLatLon == null) {
                    return new MatchNoDocsQuery(); // Or some other default behavior
                }

                // Construct a standard Solr spatial query programmatically
                SpatialArgs spatialArgs = new SpatialArgs(SpatialOperation.IsWithin,
                    new Rectangle(Double.parseDouble(userLatLon.split(",")[1]), ...));
                
                // ... create and return a LatLonPointSpatialField query
                return new LatLonPointSpatialField.newDistanceQuery(...);
            }
        };
    }
}
```

Now, the client can simply send `q={!geoRadius d=20}` and the complex spatial logic is handled cleanly on the server side.

## Conclusion: The Unseen Foundation of a Great Search Experience

While machine learning models and sophisticated ranking algorithms get much of the attention, they are only as effective as the foundation they are built upon. For a large-scale search platform like OLX, custom Java components are not a "nice-to-have"—they are the essential plumbing that enables performance, business agility, and maintainability.

By moving critical business logic, filtering, and feature extraction into custom Solr plugins, we created a more robust, scalable, and decoupled architecture. This allows our ML engineers to focus on the model and our front-end engineers to focus on the user experience, confident that the core search engine is optimized for the unique challenges of our global marketplace.
---
