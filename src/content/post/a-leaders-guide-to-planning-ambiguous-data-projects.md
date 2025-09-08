---
publishDate: '2025-09-08T12:00:00Z'
title: "Case Study: A Leader's Guide to Planning Ambiguous Data Projects"
excerpt: "When you’re handed a vague, multi-quarter data project, where do you even begin? This story unpacks how listening, de-risking, and iterative delivery transformed a failing dashboard into a trusted, indispensable tool—and offers a blueprint for any ambiguous initiative."
category: 'Data & Analytics'
tags:
  - leadership
  - data strategy
  - product management
  - ambiguity
  - dashboards
image: '/images/articles/article_chaos_to_clarity.jpg'
imageAlt: 'A visual metaphor showing a tangled, chaotic line being transformed into a clear, straight arrow, representing the process of bringing clarity to a project.'
draft: false
layout: '~/layouts/PostLayout.astro'
---

In the world of data, one of the most common and challenging requests a leader can receive is a simple, yet profoundly ambiguous one. For me, at OLX, that request came in the form of a broad and challenging task from my manager: "Fix the Product Health Dashboard."

This dashboard was supposed to be our company’s mission control, the single source of truth for the health of our entire marketplace. **In reality, it was a tool few people trusted and even fewer used.** The data was often hours old, the metrics were unreliable, and Product Managers would find out about a critical bug from angry user feedback long before the dashboard ever showed a problem.

This is the story of how we transformed that failing tool into an indispensable asset. More importantly, it’s a blueprint for how to approach any multi-quarter data project shrouded in ambiguity, and a guide to proactively uncovering what your business stakeholders really need, even when they don’t know how to ask for it.

---

## The Framework for Taming Ambiguity

Before diving into the story, it’s important to have a framework. When faced with a vague, long-term project, I don't create a rigid 12-month plan. Instead, I use a phased approach designed to systematically turn ambiguity into clarity and value.

**Phase 1:** Discovery & De-risking (The First Month): This phase is not about building; it's about listening and diagnosing. The goal is to deeply understand the human problem behind the technical request and to secure the sponsorship needed to act.

**Phase 2:** Building the Foundation & Delivering an MVP (Quarter 1): The goal here is to tackle the biggest pain point and deliver a tangible win to build momentum and stakeholder trust.

**Phase 3:** Scaling & Iterating (Quarter 2 and Beyond): With a solid foundation and user feedback, this phase is about expanding the solution's impact and delivering continuous value.

This framework was our guide as we embarked on the dashboard project.

---

### Phase 1 in Action: From Discovery to a Deck

The initial request was to "improve the dashboard," but **my first step was to completely ignore the dashboard itself.** I knew the low adoption wasn't a technical problem at its core; it was a human one. To understand it, I spent two weeks on a "listening tour," applying the principles of the **[Jobs to be Done (JTBD) framework](https://hbr.org/2016/09/know-your-customers-jobs-to-be-done)**.

I didn’t ask, "What new charts do you want?" I asked diagnostic questions:

- "Walk me through what happened the last time a key metric dropped."
- "Tell me about a time you felt you were flying blind when making a decision."

The stories they told were revealing. The Head of Product told me, *"My PMs are paid to innovate, but they're spending their days as data detectives. **Every hour they spend chasing down a data discrepancy is an hour they aren't talking to customers."***

The Head of Operations used a powerful analogy: *"Our operational playbook is 'wait for the fire alarm, then run.' This dashboard is supposed to be the smoke detector, but **the building is already on fire by the time it goes off."***

Finally, a Country Manager explained, *"I go into our quarterly business review and have to put an asterisk next to every number from the dashboard. It undermines my credibility and makes it impossible to have a strategic conversation."*

Armed with this evidence, I created a simple 5-slide deck. I knew I couldn't fix this alone; I needed a cross-functional coalition, and for that, I needed an executive sponsor. I framed the entire initiative around solving the organization's most significant pain points and pitched it to the Head of Product.

My business case was not about technology; it was about the P&L:
* **The Cost (Our Ask):** "I'm asking to formalize this effort by allocating ~10% of each core analyst's time to a dedicated working group."
* **The Benefit (The ROI):**
    * **Efficiency Gain:** "We'll free up over 80 hours of high-value PM time per month by eliminating data detective work."
    * **Risk Reduction:** "A reliable dashboard with real-time alerting is an insurance policy against preventable revenue losses, like the $50k payment gateway failure last quarter that took three hours to detect."

She asked the perfect question: "Why can't we just have analysts volunteer to fix issues as they come up?"

My answer was direct: "The volunteer approach is what we've been doing, and it's why the dashboard is still broken. It treats symptoms, not the root cause. A formal program gives us ownership and a strategic roadmap to fix the foundation properly."

She immediately saw the value and agreed to be our executive sponsor. This was the key—it gave us the authority and political capital to succeed.

---

### Phase 2 in Action: Building Trust with a Minimum Viable Product

With sponsorship secured, our plan for the first quarter was focused on tackling the single biggest barrier: trust. No one would use the dashboard if they didn't believe the numbers.

I organized a small working group with one analyst from each key squad, who dedicated about 10% of their time as planned. We used a simple Jira board and worked in two-week sprints.

Our MVP, inspired by **[The Lean Startup](https://leanstartup.co/resources/articles/what-is-an-mvp)**, was centered on reliability. Our first priority was a quick win. We focused all our initial effort on fixing the data pipelines. **Within three weeks, we took the dashboard's data latency from over 4 hours down to under 20 minutes.** Suddenly, the data was near real-time.

That single change started to shift perceptions overnight. For the first time in a year, stakeholders started using it again. We had earned the momentum needed to continue.

---

### Phase 3 in Action: Scaling Iteratively Based on Feedback

With trust established, our planning for subsequent quarters shifted. It was no longer based on my initial assumptions but on a continuous feedback loop with our now-engaged users. We delivered value sprint after sprint:

* **For Q2:** We built the proactive alerting system for the Trust & Safety and Operations teams.
* **For Q3:** We worked with the Monetization team to integrate new data sources that helped them track revenue-critical funnels.

The results were transformative. **Quantitatively, we reduced the average time to detect critical incidents from over 3 hours to under 15 minutes.** The weekly active usage of the dashboard by Product Managers **increased by over 70% in two quarters** because they finally trusted it.

---

## Conclusion: Leadership is About Solving Human Problems

The dashboard went from being a joke to being 'mission control'. The biggest win was the cultural shift and the trust we built for analytics across the organization.

For me, it was the project where I learned how to lead a complex initiative without direct authority. I did it by deeply understanding user pain, building a strong partnership with a key stakeholder, and delivering tangible value every step of the way. Ultimately, the most successful data projects aren't just about sophisticated technology; they are born from a deep, empathetic understanding of the human problems we are trying to solve.

---

### Beyond the Project: Sustaining the Solution

Once the dashboard was stable, reliable, and adopted, the "program" was officially concluded. The responsibility was absorbed into the Analytics team's ongoing operational duties and captured in our yearly goals.

* Our team now has an annual goal to "Maintain >99% uptime and data accuracy for all mission-critical dashboards."
* The analysts from the working group are now the designated owners for their respective data areas, with maintenance formally included in their roles.

This two-stage approach ensured we had the momentum to fix the core problem and the structure to sustain the solution long-term.