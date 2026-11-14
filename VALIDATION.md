# Jam build validation

## Executed checks

- Existing simulation suite: **21 groups**, updated for prices, timers and VIP awards.
- Jam regression suite: **12 groups**, including 2/4/6 seating and all approach routes, frozen countdown, sign ownership/cooldown, assistant/player reservation races, assistant resource/output limits, waiter commitment/service stops, cancellation at eleven preparation/transport stages, flour collision/immunity, dirty-table assignment/cleaning/protection, independent VIP groups of each size 1–4, recovery-aware bankruptcy and simultaneous insolvency.
- Practical tutorial: **all 23 lessons**, driven through actual movement/collision and production methods. Includes helper cooking, walking waiter delivery, trap impact, projectile hit, held cleaning, rat theft/fear/recovery and personal VIP cooking. Separate recovery checks cover burned food and a cleanup lesson restart.
- Chromium: clean menu with Competitive Mode locked, full tutorial, a deliberately burned pizza and Restart lesson, completion persistence after reload, repeat/exit without losing unlock, then a second full tutorial with localStorage unavailable. Actual keyboard and pointer actions exercise window focus, purchases, ingredient drag cancellation/drop, both players' cooking, sign flips, staff, gadgets, cleaning and VIP training. Countdown rejects input and freezes state; pause/restart/rematch and bankruptcy finish the user flow. Audio gain/mute are inspected, not assumed from labels. Viewports tested at **1366 × 768** and **1920 × 1080**, including flour limited to the hit player's view, resizing, and a four-VIP banner. Screenshots were inspected.
- JavaScript syntax and `git diff --check`.
- Distribution archive integrity and local script/style references, with `index.html` at the ZIP root.

Browser fixtures can relocate chefs near an interaction or advance simulation time; they never set tutorial completion, reputation or a successful delivery. The separate movement tutorial test traverses real collision paths. Inventory inspection is asserted through the actual HUD in Chromium. Simulation tests may seed inventory/order fixtures to isolate risky cancellation or insolvency states.

A navigation check also caught an entrance destination rounding into the bottom wall's clearance. Entrance positions now align with a traversable grid point. Departing guests are verified to move along their exit path and incur their dissatisfaction penalty once, rather than disappearing on an empty path.

## Reproducible economy trials

Command: `node tests/economy.test.cjs`. Four deterministic seeds (110–113), using actual movement/collision, purchases, cooking, deliveries and natural rat events. The active restaurant uses a scripted chef; the rival remains closed and passive, and VIP events are disabled to isolate ordinary income. This is an economic benchmark, **not a two-human competitive balance claim**. The waiter policy deliberately waits for each delivery instead of optimizing parallel work.

| Policy                            | Result     | Simulated duration | Served / unhappy | First hire | Payments | Ingredient packs | Ending cash |
| --------------------------------- | ---------- | -----------------: | ---------------: | ---------: | -------: | ---------------: | ----------: |
| Manual service                    | Five stars |            188.4 s |           10 / 0 |          — |      217 |               76 |         201 |
| Hire waiter when affordable       | Five stars |            264.3 s |           10 / 0 |     42.9 s |      209 |               80 |          89 |
| Hire assistant immediately at 180 | Bankruptcy |            140.3 s |            7 / 0 |    140.3 s |      150 |               26 |           4 |
| Restock before assistant hire     | Five stars |            206.8 s |           10 / 0 |    182.8 s |      221 |               76 |          25 |

Starting cash is 60. Cash changes after ingredient purchases and staff costs were **+141, +29, −56, −35** respectively. Initial ingredient stock is part of the starting resources, not purchased in these cash-flow figures. Per-pizza ingredient margins before bonuses are 9.5 / 10.5 / 12.5 coins for Margherita / Pepperoni / Veggie; real purchases require whole packs.

Measured waiter busy time was **120.2 s** in the waiter trial. The late, safely funded assistant performed **9 s** of preparation in its trial. Zero customer losses in these deterministic routes demonstrates a feasible service pace, not tolerance to human mistakes or active sabotage. Manual and waiter trials could afford all four sabotage purchases at the end; the safe assistant trial could afford banana, flour or sauce but not a rat wave. The reckless assistant trial ended before any assistant work: four coins, no ingredients and no recoverable paying dish correctly caused insolvency.

The requested economic prices were retained. The assistant remains a costly, often late investment in an efficient ten-delivery match; reserve ingredients before hiring. No hidden subsidy or free aid was added to make the benchmark pass. Human matches with missed orders, VIP competition and sabotage may last longer and change staff value substantially.

## Small design decisions

- Customer timers: 30 seconds to greet, 115 seconds after acceptance. Player 235 px/s, waiter 130 px/s; waiter service stops 0.65 seconds; assistant preparation nine seconds.
- Table capacities are exactly 2/4/6, preserving the current world size and mirrored restaurants. Appearance diversity uses six variants and coordinated clothing palettes; family group spawning/shared billing was not introduced.
- Tutorial uses one visible viewport, 1,000 training coins, protected patience and chapter recovery. The second chef is a harmless practice target only. Sabotage sauce can stain an own practice table in Tutorial; competitive rules require a rival table.
- VIP group probabilities: 40% / 35% / 17% / 8% for 1/2/3/4 guests.
- Sign interaction 0.3 seconds, rival flip cooldown eight seconds, reopening arrival delay eight seconds.
- One dirty table per restaurant, 2.5-second held cleanup and ten-second post-clean protection. Invalid uses preserve the bottle.
- Flour flight at most 360 pixels, effect 2.6 seconds, repeat-hit immunity six seconds. No flour knockback, stun or food drop.
- Simultaneous bankruptcy is a draw. Insolvency is checked after the complete state update; no debt/free-ingredient system remains.

## Remaining limits

No unresolved failure is intentionally hidden as a passing check. Full two-person subjective playtesting, real keyboard rollover, audible sound quality, adversarial long-match balance and cross-browser testing outside Chromium remain outstanding. The benchmark opponents are passive. The ordinary browser play path is tested over local HTTP; direct `file://` navigation is blocked by this managed Chromium's `ERR_BLOCKED_BY_ADMINISTRATOR` policy. All runtime resources remain local classic scripts/styles, with no modules, fetches or service dependencies, but direct-file execution should still be confirmed in an unrestricted browser before publishing to a jam.

Fire, oil, extra trap systems, multiple staff of the same role and mobile touch controls remain outside this agreed iteration.
