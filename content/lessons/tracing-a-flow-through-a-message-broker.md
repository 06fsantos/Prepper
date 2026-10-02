---
id: 01M3YN0JBCN53B9DXVS74NZZ04
title: Tracing a flow through a message broker
topic:
  - event-driven-architecture
  - distributed-tracing
prerequisites:
  - trace-context-across-retries
---

An order is placed, and four minutes later the customer still has no confirmation email. Ten
services sit between those two facts, and none of them called another. Each one read an event
off a broker, did its part and published another. Nothing on that path held a connection open
long enough to say who caused what. So the question an interviewer means by "how do you debug
one flow across ten event-driven services?" is really this: **what do you put on the message so
that the flow can be put back together afterwards?**

The answer is two things, and they do different jobs. A **trace context** travels on each
message, and consumers **link** to it rather than hanging off it as children. A **business
correlation id** travels beside it, because a trace is the thing most likely to be missing when
you go looking for it.

## Why a broker breaks the HTTP picture

Over HTTP, [[distributed-tracing|tracing]] comes almost for free. The caller waits for the
answer, so the callee's span is a child of the caller's, and the whole request comes out as one
tree under one trace id. The [[trace-context-across-retries|`traceparent` header]] carries the
caller's span id as the parent, and that single field is enough.

A broker takes away each assumption that tree rests on:

- **Nobody waits.** The producer's span ends when the publish is acknowledged, often long before
  anyone consumes the message. A child that starts an hour after its parent has finished is a
  strange thing to draw, and a misleading thing to add up.
- **Consumers batch.** A consumer that pulls fifty messages and handles them in one loop is
  doing one piece of work on behalf of fifty producers, and fifty different traces. A span has
  exactly one parent, so "make it the child of the producer" has no answer.
- **One message, many readers.** A published event can be read by every subscriber, and replayed
  by any of them later. The message has no single downstream.

So the context has to travel **with the message** rather than with a connection, and the
consumer side needs a relationship weaker than parenthood.

## Context rides in the message headers

The [OpenTelemetry messaging conventions](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
say it directly: "A producer SHOULD attach a message creation context to each message." The
creation context is the span context of the message's **Create** span, or of the **Send** span
when there is no separate Create. It is written into the message's own metadata, which on Kafka
means a record header, so it survives however long the message sits in the log and whoever
reads it.

Two caveats belong in any answer that cites this, because a sharp interviewer will check them:

- **W3C Trace Context has no Kafka binding.** The Recommendation is "defined for HTTP," and it
  leaves other protocols to extension specifications that "may be at a different maturity
  level" ([W3C Trace Context](https://www.w3.org/TR/trace-context/)). A Kafka binding was
  proposed in [w3c/trace-context#504](https://github.com/w3c/trace-context/issues/504), which is
  still open and labelled `revisit-later`. A `traceparent` in a Kafka header is **OpenTelemetry
  instrumentation practice**, not a W3C standard. The bytes are the same four fields, but the
  standard does not promise them.
- **The messaging conventions are Development status.** The OTel page carries that badge. What
  follows is the current guidance, and it can still change.

## Link, don't parent

Here is the part most candidates get wrong. On the consumer side, the conventions say: "For each
message it accounts for, the 'Process' or 'Receive' span SHOULD link to the message's creation
context." A **span link** is a reference from one span to another span's context. It can point
into a different trace, and a span can carry many of them. It records that this work relates to
that message, without claiming that the message's producer is waiting on it.

Parent/child is the exception, and the conventions fence it in. "Exclusively for single messages
scenarios, the 'Process' span MAY use the message's creation context as its parent." Even then,
doing so by default is "NOT RECOMMENDED" when processing already happens inside another span. The
reason is the batch case above, in the spec's own words: links are "the only option to correlate
producer and consumer(s) in batch scenarios as a span can only have a single parent."

```quiz 01M3YN0JBDCSX8S9G9NS07EJW2
A consumer pulls a batch of forty messages, each published under a different trace, and handles
them in one Process span. How should that span relate to the forty producers?

- [x] One span, with a link to each message's creation context
  > A span can carry many links but only one parent, so links are the one shape that relates
  > the batch to all forty producers. This is what the OTel messaging conventions prescribe.
- [ ] One span, as a child of the first message's producer span
  > That attributes the whole batch to one producer and loses the other thirty-nine. A single
  > parent is permitted only for single-message processing.
- [ ] Forty spans, each a child of its own message's producer span
  > It could be drawn, but it is not what was executed: the work was one loop, and splitting it
  > into forty children invents spans to fit a tree.
- [ ] One span, in the same trace as the producers through the broker
  > There is no "same trace" for forty producers in forty traces. The broker carries their
  > contexts in the message headers and does not merge them.
```

The cost of linking is real, and worth naming. A flow across ten services is now **several
traces joined by links**, not one tree under one trace id. Whether your backend follows links
when it shows you a trace is a fact about the backend, so check it before an incident rather than
during one. That is the same kind of gap [[tracing-hedged-attempts]] finds in the hedging handler.

## A trace is not the event timeline

Even with perfect propagation, a trace is the wrong thing to lean on alone. It exists only if the
flow was **sampled** (the flags bit in the context decides that), and only until the tracing
backend's retention drops it. The question that starts a real investigation ("what happened to
order 8812?") is usually asked by someone else, about one entity, days or weeks later.

So carry a **business correlation id** beside the trace context. EIP calls it a
[Correlation Identifier](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CorrelationIdentifier.html),
and OpenTelemetry's attribute registry has a slot for it:
[`messaging.message.conversation_id`](https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/),
"Sometimes called 'Correlation ID'." Keep it separate from the other two identifiers on a
message, because each answers a different question:

| Identifier | Answers | Unique? |
| --- | --- | --- |
| message id (`messaging.message.id`) | "is this the same message again?" — the dedup key | per message |
| Kafka key | "which partition, so which order?" | **no**, by the registry's own wording |
| correlation id | "which business flow is this part of?" | per flow |

Kleppmann's [Online Event Processing](https://martin.kleppmann.com/papers/olep-acm-queue.pdf)
paper shows the business-side version. When a payment request produces its downstream events,
"the original event ID is included in all of these generated events so that their origin can be
traced." Carrying the causing event's id like that (a **causation id**) is what lets you rebuild
the order of events, not just the set. The message id is also what a
[[loss-duplicates-and-replay-safe-consumers|replay-safe consumer]] dedups on, and the key is what
[[out-of-order-events-and-business-invariants|per-entity ordering]] rests on. Overloading one
field to do two of these jobs is how you end up unable to do either.

```quiz 01M3YN0JBDYGJ283E6FZ7EN9JR cloze
On the producer side, OpenTelemetry attaches a message {{creation context}} to each message, in
its headers. A consumer's Process span should {{link}} to it rather than use it as its parent,
because a span can have only one {{parent}}. Beside the trace, a business correlation id is
carried because traces are {{sampled}} and expire.
```

## Debugging the missing email

Put together, the investigation runs from the business end inward:

1. **Start from the entity, not the trace.** Query the logs or the event store for the order's
   correlation id. You get the **event timeline**: every event the flow produced, the service
   that emitted each one, and when. Read it in causation order. The last event present and the
   first one missing tell you which service the flow died in, or is stuck in.
2. **Then open the traces at that hop.** The messages around the gap carry creation contexts.
   Follow the links from the stalled consumer's spans back to the producer that published them.
   Now you can see the time spent waiting in the broker apart from the time spent processing,
   which is the difference between "consumer lag" and "a slow handler."
3. **Then read the logs on that span.** The trace says where; the log line says why. That is the
   metric→trace→log drill from [[metrics-logs-and-the-golden-signals]], run on a flow that has
   no request at its root.

If step 2 finds no trace, because it was not sampled or has already expired, step 1 has still
narrowed the problem to one service and one message, which is most of the work.

```quiz 01M3YN0JBD2K8CF404FS37ESSQ recall
How do you debug one business flow across ten event-driven services? Say what goes on each
message, how the consumer's spans relate to the producer's, and why a trace alone is not enough.

> Propagate a **creation context** on every message, in its headers. OpenTelemetry's messaging
> conventions say a producer SHOULD attach one, and in Kafka that is OTel practice rather than a
> W3C standard, since Trace Context defines only HTTP and the Kafka binding (issue #504) is still
> open. Consumers **link** their Process spans to each message's creation context rather than
> parenting off it. A span can have only one parent, so links are the only shape that works for
> batches, and parent/child is allowed only for single-message processing. The conventions are
> still Development status.
>
> Beside the trace, carry a **business correlation id** (and ideally a causation id) that is
> separate from the message id and the partition key. Traces are sampled and expire, while the
> question "what happened to order 8812?" arrives weeks later about one entity. So you start
> from the event timeline for that id, find the gap, and only then open the linked traces and
> the logs at that hop.
>
> The oversimplification to avoid is "just propagate the trace id." That is right as far as it
> goes, but it misses links-versus-parent, and it leaves you with nothing once the trace is gone.
```

## What to take away

A broker turns one request tree into separate pieces of work joined by messages. So the context
goes **on the message**, consumers **link** to it instead of claiming it as a parent, and a
**correlation id** carries the flow when the trace has been sampled away. Name the two caveats as
you say it: the OTel conventions are Development status, and `traceparent` in a Kafka header is
convention, not a W3C standard. Saying that out loud shows you know where the ground is solid.

Worth reading in full: the OpenTelemetry
[messaging spans conventions](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/).
They are short, the creation-context and links sections are the whole argument above in normative
language, and they are the document your instrumentation library is implementing whether or not
its docs say so.
