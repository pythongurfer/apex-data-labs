---
publishDate: '2025-09-25T12:00:00Z'
title: "Case Study: A Leader's Guide to Planning Ambiguous Data Projects"
excerpt: "When you’re handed a vague, multi-quarter data project, where do you even begin? This story unpacks how listening, de-risking, and iterative delivery transformed a failing dashboard into a trusted, indispensable tool—and offers a blueprint for any ambiguous initiative."
category: 'Data & Analytics'
tags:
  - leadership
  - data strategy
  - product management
  - ambiguity
  - dashboards
image: '~/assets/images/articles/article_chaos_to_clarity.jpg'
imageAlt: 'A visual metaphor showing a tangled, chaotic line being transformed into a clear, straight arrow, representing the process of bringing clarity to a project.'
draft: true
layout: '~/layouts/PostLayout.astro'
---

In the world of data, one of the most common and challenging requests a leader can receive is a simple, yet profoundly ambiguous one. It rarely arrives as a well-defined technical specification. Instead, it manifests as a quiet erosion of confidence, a palpable sense of frustration that bubbles up in meetings. For me, at OLX, that request came in the form of a broad and challenging task from my manager: "Fix the Product Health Dashboard."

This was not a minor request. This dashboard was supposed to be our company’s mission control, the single source of truth for the health of our entire marketplace. It was the screen that should have been on every leader's monitor, providing a real-time pulse on everything from new listings and user engagement to transaction volumes. A tool of that importance should be a source of clarity and alignment.

**In reality, it was a source of chaos.** It was a tool few people trusted and even fewer used. The data was often hours old, the metric definitions were inconsistent, and the user interface was painfully slow. Product Managers would find out about a critical bug from a storm of angry user feedback long before the dashboard ever showed a problem. In our weekly business reviews, it became a running joke; two different leaders would present numbers from the same dashboard that directly contradicted each other, derailing strategic conversations into tedious data validation exercises. The trust wasn't just broken; it was non-existent.

This is the story of how we transformed that failing tool into an indispensable asset. It’s a case study in turning a vague, politically-charged problem into a clear, value-driven program. More importantly, it’s a blueprint for how to approach any multi-quarter data project shrouded in ambiguity, and a guide to proactively uncovering what your business stakeholders really need, even when they don’t know how to ask for it.

---

## The Framework for Taming Ambiguity

Before diving into the story, it’s important to have a mental model for navigating chaos. When faced with a vague, long-term project, creating a rigid 12-month Gantt chart is an exercise in futility. The plan would be obsolete within weeks. Instead, I use a phased approach designed to systematically de-risk the project and turn ambiguity into clarity and, ultimately, value. This framework is less about a timeline and more about a sequence of goals.

**Phase 1: Discovery & De-risking (The First Month)**
This initial phase is counterintuitive because it involves very little "building." Its sole purpose is to listen, diagnose, and map the human landscape of the problem. The primary goal is to move from the vague technical request ("fix the dashboard") to a deep understanding of the human problems behind it. Success in this phase is not measured in lines of code, but in the quality of the insights gathered. A critical output of this phase is securing formal sponsorship, which de-risks the project politically and ensures you have the resources and authority to act on your findings.

**Phase 2: Building the Foundation & Delivering an MVP (Quarter 1)**
With a clear problem definition and stakeholder backing, the second phase focuses on tackling the single biggest pain point to deliver a tangible, high-impact win. This Minimum Viable Product (MVP) is not just a piece of software; it's a trust-building vehicle. Its purpose is to demonstrate credibility, prove that change is possible, and generate momentum. In data projects, where skepticism is often high, a quick win is the political capital you need to fund the rest of your roadmap. The goal is to solve the most painful problem first, not the easiest one.

**Phase 3: Scaling & Iterating (Quarter 2 and Beyond)**
Once a foundation of trust is established, the project can transition into a sustainable program. This phase is about building on the success of the MVP and establishing a continuous feedback loop with your now-engaged users. The roadmap is no longer based on your initial assumptions but is co-created with stakeholders. Success is measured by the adoption of your solution and the continuous stream of value it delivers. This is the stage where a project evolves into a living, breathing product that adapts to the organization's needs.

This three-phase framework was our compass as we embarked on the journey to fix the Product Health Dashboard.

---

### Phase 1 in Action: From Discovery to a Deck

The initial request was to "improve the dashboard," but **my first step was to completely ignore the dashboard itself.** I knew the slow queries and inconsistent metrics were merely symptoms. The root disease was a misalignment between what the business needed and what the tool provided. To understand this gap, I spent two weeks on a "listening tour," applying the principles of the **[Jobs to be Done (JTBD) framework](https://hbr.org/2016/09/know-your-customers-jobs-to-be-done)**.

My goal was to uncover the "job" my stakeholders were trying to do when they (reluctantly) opened the dashboard. I didn’t ask solution-oriented questions like, "What new charts do you want?" That would have only led to a longer list of features for a tool nobody trusted. Instead, I asked open-ended, diagnostic questions designed to elicit stories about their pain points:

* "Walk me through the last time a key metric dropped. What was the first thing you did?"
* "Tell me about a time you felt you were flying blind when making a critical decision."
* "Describe a recent meeting where a data disagreement wasted a significant amount of time."

The stories they told were far more valuable than any feature request. They painted a vivid picture of organizational friction. The Head of Product for Core Experience explained, *"My PMs are some of the highest-paid people in the company, hired to innovate and talk to customers. Instead, they're spending their days as data detectives. **Every hour they spend chasing down a data discrepancy in a spreadsheet is an hour they aren't improving the product."*** This wasn't a request for a new chart; it was a plea to eliminate low-value work that was killing his team's productivity.

The Head of Operations used a powerful analogy that stuck with me: *"Our operational playbook is 'wait for the fire alarm, then run.' This dashboard is supposed to be the smoke detector, but **the building is already on fire by the time it goes off."*** This insight revealed a completely different "job to be done": the need for proactive, real-time alerting to prevent crises, not just historical reporting to analyze them afterward.

Finally, a Country Manager laid bare the trust issue: *"I go into our quarterly business review and have to put an asterisk next to every number from the dashboard because I know someone else in the room has a different number. It undermines my credibility and makes it impossible to have a strategic conversation. We end up debating whose data is right instead of what the data means."*

These interviews allowed me to define the three core "jobs" the organization needed the dashboard to perform:
1.  **For Product Managers:** "When a metric changes, help me diagnose the *why* in minutes, not hours."
2.  **For Operations:** "When a critical process breaks, alert me *before* it becomes a catastrophe."
3.  **For Leadership:** "When we review performance, give us a single, trusted version of the truth."

Armed with this powerful qualitative evidence, I created a simple 5-slide deck. I knew I couldn't fix this alone; it required a cross-functional coalition of analysts and engineers. For that, I needed an executive sponsor with the authority to greenlight a formal program. I framed the entire initiative around solving the organization's most significant pain points and pitched it to the Head of Product, the stakeholder whose team was feeling the most pain.

My business case was not about technology; it was about the P&L:
* **The Cost (Our Ask):** "I'm asking to formalize this effort by allocating ~10% of each core analyst's time to a dedicated working group. This is a predictable, strategic investment."
* **The Benefit (The ROI):**
    * **Efficiency Gain:** "We'll free up over 80 hours of high-value PM time per month by eliminating data detective work. That's the equivalent of hiring a new part-time PM for free."
    * **Risk Reduction:** "A reliable dashboard with real-time alerting is an insurance policy against preventable revenue losses, like the $50k payment gateway failure last quarter that took three hours to detect."

She asked the perfect, challenging question: "This is clearly important, but why can't we just have analysts volunteer to fix issues as they come up?"

My answer was direct: "The volunteer approach is what we've been doing for the last year, and it's why the dashboard is still broken. A volunteer effort is reactive and inconsistent. It treats the symptoms—a broken chart here, a slow query there—but it never addresses the root cause. The foundation of our data pipelines is cracked, and we need a dedicated team to rebuild it properly. A formal program gives us ownership, a strategic roadmap, and the ability to fix the systemic issues that are holding us back."

She immediately saw the value and agreed to be our executive sponsor. This was the key—it gave us the authority and political capital to succeed.

---

### Phase 2 in Action: Building Trust with a Minimum Viable Product

With sponsorship secured, our plan for the first quarter was laser-focused on tackling the single biggest barrier: **trust**. No one would use the dashboard, no matter how many features it had, if they didn't believe the numbers.

I organized a small, virtual working group with one talented analyst from each key product squad. I had individual conversations with their managers, armed with the endorsement from our executive sponsor, to secure the 10% time allocation. We set up a simple Jira board to track our work and committed to two-week sprints with a demo at the end of each cycle to maintain transparency and momentum.

Our MVP, inspired by the principles of **[The Lean Startup](https://leanstartup.co/resources/articles/what-is-an-mvp)**, was centered entirely on reliability. Our first priority was a quick, high-impact win. We focused all our initial effort on the most visible and painful problem: data latency. The team audited the existing data pipelines and found them to be a mess of brittle, overnight batch jobs. We re-architected the most critical data models to be more modular and efficient.

**Within three weeks, we took the dashboard's data latency from over 4 hours down to under 20 minutes.** Suddenly, the data was near real-time.

The launch of this MVP was as much about communication as it was about technology. We held a demo session for all stakeholders, explaining not just *what* we changed, but *why* they could now trust it. I sent out a company-wide update with the headline, "The Product Health Dashboard is Now in Near Real-Time." I personally sat down with the key leaders who had been most skeptical, walked them through the new, faster dashboard, and listened to their feedback.

That single change started to shift perceptions overnight. For the first time in a year, stakeholders started opening the dashboard in the morning to see what was happening, not just to export data for a post-mortem report. We had earned the momentum needed to continue.

---

### Phase 3 in Action: Scaling Iteratively Based on Feedback

With a foundation of trust established, our planning for the subsequent quarters shifted from being assumption-driven to being feedback-driven. We created a dedicated Slack channel, `#dashboard-feedback`, which became a vibrant hub for users to report issues, ask questions, and suggest improvements. Our roadmap was now a direct reflection of the validated needs of the organization. We delivered impactful features sprint after sprint:

* **For Q2:** We built the proactive alerting system the Operations team so desperately needed. We integrated the dashboard with PagerDuty, so that when a critical metric like "payment success rate" dropped below a certain threshold, an automated alert was sent to the on-call engineer. This transformed the Ops team from reactive firefighters to proactive problem-solvers.
* **For Q3:** We worked with the Monetization team to integrate new data sources from our payment providers. This allowed us to build a detailed, real-time funnel visualization that tracked users from "add to cart" to "purchase successful." Within a month of its release, the team used this funnel to identify a significant drop-off on a specific mobile app version, leading to a bug fix that increased conversion by 2%.

The results were transformative, both quantitatively and qualitatively. **Quantitatively, we reduced the average time to detect critical incidents from over 3 hours to under 15 minutes.** The weekly active usage of the dashboard by Product Managers **increased by over 70% in two quarters** because they finally trusted it. In our post-launch surveys, we found we were saving each PM closer to 4 hours a week, far exceeding our initial ROI estimate.

---

## Conclusion: Leadership in Data is About Solving Human Problems

The dashboard went from being a joke to being 'mission control'. When a new feature launched, it was the first place the team looked to see the impact. The biggest win was the cultural shift and the trust we built for analytics across the organization. Data was no longer a point of contention; it was the foundation for collaborative, evidence-based decisions.

For me, it was the project where I learned how to lead a complex initiative without direct authority. I did it by deeply understanding user pain, building a strong partnership with a key stakeholder, and delivering tangible value every step of the way. This project solidified my belief that the most successful data projects aren't just about sophisticated technology or complex queries. They are born from a deep, empathetic understanding of the human problems we are trying to solve. Leadership in an ambiguous data project is not about having all the answers; it's about creating a process to find them.

---

### Beyond the Project: Sustaining the Solution

Once the dashboard was stable, reliable, and widely adopted, the "program" was officially concluded. A common failure mode for projects like this is that they lose momentum and slowly decay back to their broken state. To prevent this, we designed a formal transition from a temporary project to a sustained data product.

* **Formal Ownership:** The responsibility was absorbed into the Analytics team's ongoing operational duties. The analysts who were part of the working group became the permanent designated owners for their respective data areas, with maintenance and improvement duties formally included in their roles and performance goals.
* **Yearly Goals:** Our team now has a formal annual goal to "Maintain >99% uptime and data accuracy for all mission-critical dashboards," ensuring it remains a priority.
* **Product Lifecycle:** The dashboard is now treated like any other internal product. It has a backlog of feature requests, a designated owner, and a regular maintenance schedule.

This two-stage approach—an intense, focused program to fix the core problem, followed by a structured, long-term maintenance plan—ensured we had both the momentum to drive change and the structure to sustain the solution long-term.