# Shared kitchen update — validation

The game has no runtime packages, build step, external services or downloaded assets. Development tests use Node.js 24.22.1, Python 3.12.14, the environment's Playwright and Chromium 156. These are automated tests, not a manual two-person playtest.

## Executed checks

- `node tests/game.test.cjs`: 21 groups: both cooking systems, payment validation, accessible routes, ingredients, cancellation, waiter, bananas, removed attack/dash API and bindings, rats, VIP, simultaneous movement, collisions and victory.
- `node tests/jam.test.cjs`: 12 groups: countdown freeze, seating, signs, atomic cook/player reservations, stock, waiter tasks, cancellation throughout the food lifecycle, flour, cleaning, VIP, recovery/bankruptcy and departing guests.
- `node tests/tutorial.test.cjs`: complete 22-lesson tutorial using collision-aware movement, cooking, staff, gadgets, cleaning, rat recovery and personal VIP service. Includes burned-food and lesson recovery and collection routing to an alternate occupied oven bay.
- `node tests/playtest.test.cjs`: 16 groups: both kitchens' geometry and approaches, central oven collisions, doorway/market access, moving staff, manual oven collection, cancellation/burning, automatic/manual/VIP priority, staff delivery victories for both sides, stain stability, tutorial routing, UI suppression, recovery and reset.
- `node tests/economy.test.cjs`: four seeded production/economy policies using real purchases, movement and deliveries, with natural rats. Includes expected bankruptcy for reckless spending. These are passive-rival script benchmarks, not competitive balance claims.
- `node tests/shared-kitchen.test.cjs`: six groups, three per side. Four distinct cook claims and work positions; fifth hire rejected without charge; actual stock consumption; parallel baking; multiple queued dishes; selected-order collection; cancellation; once-only payment; full-oven waiting without repeated spending; independent bake/burn timers; manual collection without a retained NPC copy; departure cleanup; ten actual waiter deliveries to victory, frozen winner state, and empty resources on reset. Physical dish holders and cook claims are checked for duplicates while stepping. Cook routes are checked against production collisions.
- `GAME_URL=http://127.0.0.1:8000/ node tests/browser.test.cjs`: two complete tutorials in Chromium, actual mouse drag/cancel and keyboard assembly, both players' cooking, lesson recovery, saved/session-only unlock, audio settings, countdown, gadgets, cleaning, VIP, bankruptcy, pause, restart, rematch and resize. No page or console errors.
- `GAME_URL=http://127.0.0.1:8000/ node tests/visual.test.cjs`: production flour/stain pixel tests, help scrolling at several sizes, tutorial routes and button highlights, staff victories, pause and cleanup. Repeats the 16 playtest transition groups inside Chromium. No page errors.
- `GAME_URL=http://127.0.0.1:8000/ node tests/layout.test.cjs`: 1366×768, 1024×600, 800×600 and 960×540. Real sauce drag, keyboard cheese addition, reachable Confirm assembly, collapsed/expanded instructor, yellow tutorial outline, hidden world route while a window action is required, and no instructor/window overlap. Four-cook production simulations reach ten actual deliveries for Blue (188.7 simulated seconds) and Red (190.25 seconds); no duplicate reservations or physical dishes. Real F, Slash and Shift key events leave removed abilities absent; I still opens Orders. Pixel comparison verifies fully invisible and visible frames during immunity. No page errors.

## Visual inspection and correction

Inspected screenshots of short-screen assembly (960×540), the two shared kitchens and four separate cook positions, tutorial purchase highlighting, and the larger preparation counter. The first short-screen drag check caught ingredient controls clipped by the fixed footer. The compact assembly grid now puts dough beside ingredients; the repeated drag and keyboard checks pass. Selected oven bays have a team-colored outline and numbered contextual hint. Static kitchen station nameplates are removed; hire/gadget labels and prices remain.

## Reproduction

From the existing checkout, start `python3 -m http.server 8000 --bind 127.0.0.1`, then run the commands above. Browser screenshots default to `/tmp/pizza-jam`, `/tmp/pizza-playtest` and `/tmp/pizza-layout`; `ARTIFACT_DIR` can override their location. `CHROMIUM_PATH` can override `/usr/bin/chromium`. Tests use the explicit `?test=1` hook; normal play does not expose it.

Fixtures may seed customers/stock, position players at stations, accelerate simulation time or enable the tutorial-completed preference to isolate UI checks. Payments and victory still come from production delivery code. The complete tutorial movement suite follows collision-safe routes instead of teleporting through lessons.

## Remaining limits

Human two-player balance, keyboard rollover, audible sound quality and browsers other than Chromium remain unverified. Four cooks still share one waiter; a large queue can outpace service, and normal customer patience continues. Tests with abundant stock and long patience verify task correctness, not economic balance.

Direct `file://` navigation was attempted and rejected by this managed Chromium with `ERR_BLOCKED_BY_ADMINISTRATOR`; functional browser checks used local HTTP. All game resources remain local classic JavaScript/CSS, without fetch, modules or external dependencies. Confirm double-click launch separately in an unrestricted desktop browser.
