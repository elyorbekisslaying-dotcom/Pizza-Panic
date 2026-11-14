# Pizza Panic — Kitchen Rivals

A two-player local HTML5 cooking rivalry for desktop keyboards. Open `index.html`; all scripts, images, styles and generated sounds are local. No installation, build, external API, account, database, paid assets or game server is required. The distribution ZIP contains `index.html` at its root.

## Menu and practical tutorial

The four main entries are **How to Play**, **Tutorial**, **Competitive Mode**, and **Settings**. Competitive Mode unlocks after completing the practical tutorial. Completion is saved as `pizza-tutorial-v1` in localStorage; if storage is unavailable it remains unlocked for the current page session. Repeating or abandoning an already-completed tutorial does not revoke access.

Chef Rosa guides 22 short, action-driven lessons in a single training restaurant: movement, entrance sign, greeting, order selection, stock inspection and purchase, all cooking stages, service, waiter, automatic order assignment, full-cycle cook, bananas/dropped food, flour, dirty-table cleanup, rat theft/recovery, and personal VIP service. A turquoise dashed route follows collision-safe paths to accessible interaction points; matching arrows indicate offscreen targets. Open windows highlight the required button and suppress the world route. Lessons advance from actual production-state transitions. They do not grant completion from an acknowledgement button.

Training has generous funds, no random arrivals/events, frozen guest patience and a harmless training chef for gadget practice. **Restart lesson** restores the relevant cooking/staff/gadget lesson after lost dough, burned food, discarded gadgets or another mistake. The rat exercise can repeat its wave if all rats escape or are scared before stealing. Menu remains available. Dropped food/gadgets become route targets; discarded cooking work returns to preparation, and a VIP recipe missing stock after rat theft points to the necessary Supplies purchase. No second person is required to graduate.

Competitive matches, Restart and Rematch begin with **3 → 2 → 1 → GO!**. The world remains frozen for the entire 3.6-second presentation, including the brief GO display: no movement, purchases, patience loss, NPC work or events.

## Controls

| Action                                                    | Blue       | Red         |
| --------------------------------------------------------- | ---------- | ----------- |
| Move                                                      | WASD       | Arrows      |
| Interact / greet / collect / serve / flip sign            | E          | Enter       |
| Hold to clean a dirty own table                           | Hold E     | Hold Enter  |
| Short rolling-pin swing                                   | F          | Slash `/`   |
| Use held gadget                                           | Q          | Period `.`  |
| Dash                                                      | Left Shift | Right Shift |
| Open nearby Orders / Supplies / Toppings, or close window | I          | O           |
| Select in own window                                      | WASD       | Arrows      |
| Activate selected item/button                             | E          | Enter       |
| Close own window                                          | I or Q     | O or Period |

Escape pauses both restaurants. M toggles sound. Losing browser focus pauses play. Settings provides sound, volume and the control reference. Sound starts after a user gesture. Returning to Main menu discards the current match; restart clears orders, reservations, projectiles, visual effects, items and timers.

Each player has an independent camera, HUD and keyboard window focus. A window stops only its owner's movement. Mouse clicks work in both panels; ingredient drag-and-drop uses pointer coordinates relative to the displayed dough. Cancelled drags spend nothing. Icons show stock, empty ingredients, coins, carried food/gadgets and ability cooldown shading. The held-gadget label shows its use key.

## Restaurants, guests and orders

Both restaurants share the same 2000 × 1200 world, with mirrored kitchens, kitchen/dining partitions and a central VIP courtyard. Equipment sits along kitchen edges; explicit free approach points serve players, staff and the tutorial. Blue’s four gadget stalls are above the VIP table and Red’s are below it. The central aisle and VIP chair approaches stay open. Only the owning player can buy from a market. Staff hiring stays beside each kitchen. Visible framed entrance doors and thresholds match the customer routes; the physical opening remains passable even when the adjacent sign says Closed. Each has tables for **2, 4 and 6 guests**, with **12 individual seats** and separate approach points. Every guest has their own ID, order and timer. Six appearance variants include smaller children, different adult builds, hair/accessories and coordinated family-like clothing palettes; there is no shared family bill or group AI.

Guests arrive gradually, about one every 18 seconds. They walk in, sit at a free clean seat and wait **30 seconds** to be greeted. The last ten seconds trigger an owner warning. Acceptance starts a separate **115-second** cooking timer; repeat interaction cannot refresh it. A waiter or owner can accept, but only once.

A guest leaving unhappy costs **5 reputation**, clamped at zero, with a sound and compact table/seat warning. They walk back to the entrance. Their order, linked food, windows and NPC reservations are cancelled without returning already-spent ingredients. Successful service also clears linked competing copies and pays only once.

**Orders** lists accepted orders, customer name, exact table/seat, recipe icons, time and state: accepted, player preparing, dough/assembly, cook preparation/movement/waiting, baking, baked ready, pickup and waiter delivery. Baked ready rows are green; raw food is never marked as ready to serve. Rows initially sort by urgency, keep stable IDs while the window is open, and append new orders without reordering the current selection. Completed/cancelled records remain briefly visible.

## Cooking

1. Greet a waiting guest, select an accepted order at Orders, or let Dough auto-assign the most urgent accepted, unclaimed regular order when no valid selection exists. Manual selections and personally accepted VIPs retain priority. Reserved orders show their cook and status.
2. At **Dough**, interact with empty hands. One dough is consumed; preparation takes 1.2 seconds.
3. At **Toppings**, add the exact recipe with mouse or keyboard and choose **Confirm assembly**.
4. Carry the resulting **raw** pizza to **Oven**. Baking takes 3 seconds.
5. Collect the baked pizza within 12 seconds or it burns.
6. Personally serve its exact guest, or explicitly hand a baked ordinary pizza to **Waiter pickup**.

Ingredient addition spends one unit immediately. Wrong/duplicate/zero-stock additions are rejected. Closing assembly preserves additions in that dough. Interrupted or dropped food preserves its state. **Bin** discards a carried item; oven interaction removes burned food. Discarding/cancellation never refunds consumed stock.

## Economy and victory

Start with **60 coins** and four of each cooking ingredient. Supplies opens for free and sells explicit packs of four.

| Recipe     | Ingredients                      | Base payment | Ingredient cost per pizza |
| ---------- | -------------------------------- | -----------: | ------------------------: |
| Margherita | Dough, sauce, cheese             |           16 |                       6.5 |
| Pepperoni  | Dough, sauce, cheese, pepperoni  |           20 |                       9.5 |
| Veggie     | Dough, sauce, cheese, vegetables |           22 |                       9.5 |

The speed bonus is at most **3 coins**. Pack prices are dough 8, sauce 8, cheese 10, pepperoni 12, vegetables 12. Ingredient unit costs above divide the four-unit packs; actual purchases require whole packs.

Ordinary delivery gives **10 reputation**. Start at one star; additional stars arrive at 25, 50, 75 and 100 reputation with a brief animation and sound. First to 100 wins. There is no overall match timer. Sabotage itself grants no reputation.

| Purchase                      | Coins |
| ----------------------------- | ----: |
| Banana                        |    12 |
| Flour pouch                   |    18 |
| Striped sabotage sauce bottle |    15 |
| Rival rat wave                |    45 |
| One waiter                    |   100 |
| One cook                      |   180 |

There are **no loans or free emergency supplies**. Zero money alone is not bankruptcy. At the end of each complete simulation update, the game checks whether the kitchen can make any recipe from stock/recoverable ingredients, afford the missing whole packs, or finish an actual paying dish in hands, preparation, oven, pickup, waiter, assistant or owner-only drop. Ingredients carried by returning rats are considered recoverable until the rat escapes. Existing additions to dough count as already paid. Closed signs and temporary absence of guests do not cause defeat.

If neither stock nor a real unfinished/ready dish offers a path to income, the opponent wins with a reason. Both kitchens becoming insolvent in the same update produce a draw. **Restock before expensive hires**: spending the last coins with no usable ingredients can correctly cause bankruptcy.

## Staff

**Waiter — 100:** walks at 115 px/s versus the player's 235 px/s, with a 0.9-second service stop. Accepts only own ordinary orders and carries only baked food placed at pickup by the player or cook. Committed jobs finish before task changes; invalid jobs clear immediately. At idle, urgent guest/pickup patience chooses the next task, with pickup preference after an acceptance so ready food cannot starve. The waiter never takes food from hands, cooks, handles VIPs or pays before reaching the recipient. Manual acceptance and service remain available.

**Cook — 180:** one moving cook per kitchen. Reserves an accepted, unclaimed ordinary order and atomically spends the recipe ingredients. After nine seconds of preparation at the bench, walks at 110 px/s to the shared oven, loads raw food, waits for baking, collects, then carries the finished pizza to Pickup. The waiter can deliver it, or the player can collect it with empty hands. The cook does not accept orders, buy stock, serve customers or handle VIPs.

An occupied oven sends the cook to an open staging point; food is never overwritten. An occupied pickup leaves the baked pizza in the cook’s hands and blocks further production. A short collection pause permits the player to take the cook’s baked pizza directly from the oven; its reservation then releases without producing a copy. Cancellation or burned food clears the associated task. Status labels distinguish preparation, walking, baking, carrying and equipment waits. Rewards still require delivery to the exact guest.

## Signs and sabotage

**Open / Closed:** personally interact with either restaurant's entrance sign. Closed stops new ordinary arrivals only; existing guests, orders, NPCs and patience continue. Reopening resumes gradual arrivals after eight seconds, without a backlog burst. A flip has a 0.3-second interaction animation; rival flips have an eight-second cooldown, while the owner can restore the sign promptly. Holding the key does not repeatedly flip it.

**Banana:** appears in free hands after purchase. Use Q / Period on clear floor, with a 1.2-second arming warning. Only the rival slips, dropping carried food and receiving brief stun/knockback and 2.5 seconds of immunity. Maximum three installed traps per owner; each expires after 40 seconds or triggers once. Owner-only food/gadget recovery starts after 0.6 seconds; drops expire after 45 seconds or cancellation of their order.

**Flour:** a distinct carried pouch. Q / Period throws forward at 400 px/s, with a 0.9-second maximum flight and collision against walls/equipment. Only the opponent can be hit. Dense flour covers about 81% of the affected gameplay viewport initially, including its center, holds strongly for about 0.85 seconds, then falls/fades within 2.6 seconds; movement, carried items and pause stay usable. A six-second repeat-hit guard prevents stacking. There is no flour stun, knockback or item loss.

**Sabotage sauce:** the striped bottle is a separate gadget, not cooking stock. Carry it to a completely unoccupied rival ordinary table, face it and use Q / Period. Incoming assigned guests also protect their table. One bottle dirties one table; no VIP targeting, repeat staining or invalid-use consumption. At most one dirty table per restaurant. Dirty tables exclude exactly their capacity from new seating. The owner holds interact nearby for 2.5 seconds to clean; release/interruption resets progress. Random clustered stains are generated once per contamination, shared by both cameras, and clipped to the tabletop. Visibility decreases during cleaning and visual data clears on completion. A clean table has ten seconds of protection. Tutorial uses an own practice table instead of a rival's.

**Rolling pin:** a short directional swing, locked direction, visible windup and active hit phase, at most one result per swing. Moderate knockback drops carried food. Moderate opacity changes mark immunity, never making the chef completely invisible. Customers/staff are not targets. Rats are scared by proximity, not killed.

**Rats:** four staggered rats per wave, following collision-safe paths from burrow to Storage, stealing at most one existing ingredient each and returning with its visible item. A nearby chef scares them home; a carrier drops the stolen ingredient once. Only its owner can recover it with interact; an empty rat creates nothing. Natural waves begin at 60 seconds and repeat about every 70 seconds. Purchased rival waves have a 60-second cooldown, four-rat cap and no queue; unavailable purchases charge nothing. Rats never steal money. Dropped stock expires after 60 seconds.

## Four-seat VIP courtyard

One event brings 1–4 independent VIP guests: probabilities **40% / 35% / 17% / 8%**. Each has a unique seat, ID, order, timer and payment. A neutral blue banner in both views announces the count; sound and direction guidance accompany it without pausing.

Each player must personally accept each guest's order. First acceptance starts a shared 115-second allowance; another player's acceptance does not monopolize or reset it. First correct personal baked delivery pays **40 + up to 3 coins and 12 reputation** exactly once, clearing only competing food for that guest. Other VIPs continue independently. Staff never handle VIPs. Initial waiting allowance is 50 seconds. The first event is at 45 seconds; later groups wait until the previous group has cleared.

## Verification and limits

Use the existing checkout. No build is required. Optional browser development server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Dependency-free simulation tests (Node):

```sh
node tests/game.test.cjs
node tests/jam.test.cjs
node tests/tutorial.test.cjs
node tests/playtest.test.cjs
node tests/economy.test.cjs
```

Browser tests use the cloud environment's existing Playwright and Chromium, not runtime game dependencies:

```sh
GAME_URL=http://127.0.0.1:8000/ node tests/browser.test.cjs
GAME_URL=http://127.0.0.1:8000/ node tests/visual.test.cjs
```

`CHROMIUM_PATH` and `ARTIFACT_DIR` optionally override the browser and screenshot output. The browser harness uses `--no-sandbox` for this managed container, not as a game startup requirement. `?test=1` explicitly exposes the development hook; ordinary players omit it.

See [VALIDATION.md](VALIDATION.md) for executed scenarios, measured economic outcomes and limitations. Browser fixtures sometimes position chefs at stations or accelerate waits; actual UI actions and state transitions remain in use. A separate tutorial regression walks real paths with collision through the complete training sequence.

No fires, oil, cheese traps, bouncing dough, multiple staff per role, debts or unrelated mechanics were added. The game remains intended for two people on a desktop keyboard, not mobile touch controls.
