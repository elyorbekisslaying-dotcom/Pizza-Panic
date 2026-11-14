# Playtest-fix validation

## Executed checks

This report supersedes the previous raw-output assistant build. Runtime dependencies remain zero; tests use Node and the environment's Playwright/Chromium.

- `node tests/game.test.cjs`: 21 legacy regression groups, updated approach coordinates and slower waiter timing. Includes actual cooking, payment, combat, theft/recovery, VIP competition, movement/collision, cancellation, bankruptcy and victory.
- `node tests/jam.test.cjs`: 12 groups. Countdown, 2/4/6 seating, signs, cook/player reservation races, ingredient limits, baked pickup, waiter service stops, cancellation at eleven food-holder stages, flour collisions/immunity, dirty seating/cleaning/protection, VIP groups, insolvency and walking exits.
- `node tests/tutorial.test.cjs`: all 22 lessons through actual collision-aware player movement, complete cooking, auto-assignment, autonomous cook/oven/pickup/waiter delivery, gadgets, cleaning, rat recovery and personal VIP service. Burned-food and cleanup chapter recovery also checked.
- `node tests/playtest.test.cjs`: 16 groups covering both restaurants' accessible approaches, purchase ownership, clear central lane, equivalent market routes, doorway crossings while Closed, full moving staff cycles, once-only payment, occupied oven and pickup, player collection from the cook's oven, cancellation at each cook phase, burned food, automatic assignment, manual/VIP priority, reservation races, ten genuine deliveries to victory for each team, stable randomized stains, route caching and moved targets, UI-only hints, drop/discard recovery, and reset cleanup.
- `tests/browser.test.cjs`: two complete practical tutorial runs using keyboard and pointer controls, including deliberate burn/restart, saved unlock/reload and unavailable-localStorage fallback. Ingredient drag cancellation/drop, both cooking controls, auto-selection, new cook lesson, gadgets, held cleanup, rat recovery, VIP restocking after theft, countdown, resize, audio gain/mute, pause, restart, bankruptcy and rematch. No page/console errors. Tested at 1366 × 768 and 1920 × 1080.
- `tests/visual.test.cjs`: Chromium pixel measurements, stable/clipped stains under two camera transforms, route/button highlighting, help scrolling with Back visible at heights 768/600/500, local flour and frozen pause timer, effect expiry/menu cleanup, simultaneous Blue/Red staff cycles and separate genuine staff victories. Repeats all 16 risky-transition groups in Chromium as well as Node. No page errors.
- JavaScript syntax, formatting and `git diff --check`. Distribution archive integrity, root `index.html`, local references and contents matched against the committed checkout.

Browser fixtures sometimes position chefs near a station, accelerate time, or seed stock/customers to isolate transitions. They never fabricate a delivery or set reputation/tutorial completion. The dedicated movement tutorial traverses the map. Repeating model transitions inside Chromium is engine regression coverage, not a claim of manual two-person playtesting.

## Visual measurements

The flour test draws the production mask on a transparent canvas and counts pixels with alpha above 230/255 at 0.1 seconds after impact. The center has alpha 252/255.

| Gameplay canvas | Dense initial coverage |
| --------------- | ---------------------: |
| 450 × 350       |                 80.55% |
| 670 × 520       |                 80.63% |
| 950 × 830       |                 80.70% |

The strong phase lasts about 0.85 seconds; the mask then fades/falls and is fully gone by 2.6 seconds. A 0.06-second onset avoids an instantaneous full-monitor flash. The untouched viewport has no mask; a small world-space dust mark on the hit chef remains visible as a shared hit cue. HUD and Pause are DOM controls outside the gameplay mask.

Stains contain 36 stored, varied droplets. Rendering does not mutate their data; two translated views produce identical pixels. The clipping test finds zero colored pixels outside the tabletop interior. Cleaning reduces visibility and completion clears the stored pattern. New contamination generates another pattern.

Screenshots inspected include the entire world, central markets, dense flour, paused flour, a tutorial route, highlighted purchase button, assembly, full-HD competition and scrolling help. Inspection caught and fixed overlap between the Red market heading and lower stall labels, and between Pickup's label and the waiter station. No user screenshot files accompanied the pasted request, so no direct before/after comparison to those screenshots was possible.

## Staff and route measurements

Player walking speed is 235 px/s, waiter 115 px/s (48.9%), cook 110 px/s. Waiter service pauses are 0.9 seconds. Cook preparation is nine seconds, baking three seconds, followed by a 0.6-second collection pause that also permits player collection.

Isolated browser trials supplied twelve units of each ingredient and admitted one ordinary customer at a time. Blue won after ten actual staff deliveries in 468.8 simulated seconds; Red in 472.5 seconds. These fixtures verify complete autonomous service and symmetry, not optimal play or economic balance.

From the two restaurant/courtyard entrances, corresponding gadget routes differ by at most 40 pixels on the 20-pixel navigation grid. Both zones have identical ownership and prices; the central aisle and VIP approaches remain open. Every station has an explicit accessible approach. Navigation caches the obstacle grid and rebuilds when obstacle geometry changes; tutorial paths refresh on meaningful movement, target changes or a bounded interval, rather than running a fresh search each frame.

## Reproducible economy trials

`node tests/economy.test.cjs` uses seeds 110–113, real movement, purchases, food preparation, deliveries and natural rats. The rival is closed/passive and VIPs are disabled. The waiter policy deliberately waits for each delivery instead of working in parallel. These are script benchmarks, not competitive balance claims.

| Policy                   | Result     | Duration | Served / unhappy | First hire | Payments | Packs spent | End cash |
| ------------------------ | ---------- | -------: | ---------------: | ---------: | -------: | ----------: | -------: |
| Manual                   | Five stars |  183.9 s |           10 / 0 |          — |      217 |          76 |      201 |
| Waiter when affordable   | Bankruptcy |  488.9 s |          10 / 11 |     43.8 s |      217 |         170 |        7 |
| Cook immediately at 180  | Bankruptcy |  138.7 s |            7 / 0 |    138.7 s |      150 |          26 |        4 |
| Restock before cook hire | Five stars |  204.3 s |           10 / 0 |    173.3 s |      216 |          76 |       20 |

The slower waiter makes the serial waiting policy lose customers and eventually run out of resources. Manual service and concurrent kitchen work remain important. The reckless cook hire still spends the last usable resources and correctly fails before production. No prices, free subsidies or hidden aid were introduced to force these scripts to win. The safely funded cook worked for 19.1 seconds in its late-hire trial; the waiter was busy for 267.6 seconds in its trial.

## Remaining limits

Two-person subjective balance, real keyboard rollover, audible sound quality and browsers other than Chromium still need human testing. Automated economic rivals are passive. Direct `file://` navigation is blocked by this managed Chromium's `ERR_BLOCKED_BY_ADMINISTRATOR` policy; browser tests use local HTTP. All runtime resources remain local classic scripts/styles, with no fetch, modules or service dependencies. Direct opening should additionally be confirmed in an unrestricted desktop browser.

No fires, extra trap types, extra tables, multiple cooks per restaurant, debt system, mobile controls or itch.io presentation work were added.
