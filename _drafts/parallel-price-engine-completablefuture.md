---
title: "Building a parallel price engine with CompletableFuture"
description: "How fanning out base price, campaigns, promo codes and shipping in parallel keeps checkout fast, and the pitfalls to avoid."
tags: [java, spring-boot, concurrency]
---

<!-- DRAFT: review and edit before publishing. Move this file to _posts/ with a
     date prefix, e.g. _posts/2026-10-20-parallel-price-engine-completablefuture.md -->

A checkout price is rarely one number. It is a base price, minus whatever
campaigns apply, minus a promo code, plus shipping. In a microservice setup each
of those usually lives behind a different service, and calling them one after
another means the customer waits for the sum of every round trip.

## Fan out, then combine

The pieces are independent until the final sum, so they can be fetched at the
same time:

```java
var base      = supplyAsync(() -> catalog.basePrice(item), pool);
var campaigns = supplyAsync(() -> campaignClient.active(item), pool);
var promo     = supplyAsync(() -> promos.lookup(code), pool);
var shipping  = supplyAsync(() -> shippingClient.quote(cart), pool);

Price price = CompletableFuture.allOf(base, campaigns, promo, shipping)
    .thenApply(v -> calculator.compute(
        base.join(), campaigns.join(), promo.join(), shipping.join()))
    .orTimeout(800, TimeUnit.MILLISECONDS)
    .join();
```

Latency now tracks the slowest call instead of the total.

## Things that bite

- **Use your own executor.** The default common pool is shared with everything
  else in the JVM. Blocking HTTP calls on it starves unrelated work.
- **Decide what a failure means.** A missing promo can fall back to "no promo"
  with `exceptionally`; a missing base price should fail the request.
- **Always set a timeout.** `orTimeout` keeps one slow dependency from holding
  the whole checkout hostage.
- **Keep the calculation pure.** Fetching is async; computing is a plain
  function of its inputs, which makes it trivial to unit test.

## Wrapping up

Separating *gathering* inputs from *calculating* the price made the engine both
faster and easier to extend: a new kind of discount is one more future and one
more rule in the calculator.
