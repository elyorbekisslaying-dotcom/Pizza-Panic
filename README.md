# Pizza Panic — Kitchen Rivals

A local two-player cooking rivalry, built with Canvas, vanilla JavaScript, CSS and generated Web Audio. Open `index.html` in a modern desktop browser. All resources are local: no accounts, keys, database, external API, CDN or build step. The ZIP has `index.html` at its root.

## First launch

The main menu offers **Play**, **Settings** and a quick guide. Settings controls sound, effects volume and the controls reference. Sound settings are saved locally when browser storage is available. Audio starts after a user gesture.

Each chef has a camera and HUD. The two views show one shared 2000 × 1200 world; pass through the central courtyard to visit the rival kitchen or VIP. Neither camera shrinks the entire map to fit the screen. Play on a desktop/laptop, ideally 1366 × 768 or larger, with two people sharing a keyboard.

## Controls

| Action                                                  | Blue       | Red         |
| ------------------------------------------------------- | ---------- | ----------- |
| Move                                                    | WASD       | Arrow keys  |
| Interact / greet / collect / serve                      | E          | Enter       |
| Rolling-pin swing                                       | F          | Slash `/`   |
| Place carried banana                                    | Q          | Period `.`  |
| Dash                                                    | Left Shift | Right Shift |
| Open nearby Orders, Supplies or Toppings / close window | I          | O           |
| Window selection                                        | WASD       | Arrow keys  |
| Activate selected window button                         | E          | Enter       |
| Close own window                                        | Q or I     | Period or O |

Escape pauses both restaurants. M toggles sound. Losing browser focus pauses the match. Pause has Resume, Settings, Restart and Main menu. Returning to the main menu discards the previous match. Restart and Rematch clear guests, tasks, items, windows and timers.

In an ingredient window, navigate to **Confirm assembly** after adding the recipe. Mouse users can click ingredients or drag them onto the dough. Each player's keyboard only controls their own window. Their chef stops moving while that window is open; the other player and world continue. A hit closes the victim's window and drops their held item.

Some physical keyboards limit simultaneous key combinations; real keyboard rollover requires testing on the players' hardware.

## Guests, orders and cooking

Each restaurant has **three tables and six distinct seats**. Guests enter gradually, about one every 18 seconds, walk to a free seat and wait up to 45 seconds to be greeted. A waiting guest has a question indicator and patience, not an active recipe. Approach that seat and interact to accept its order. Acceptance starts a fresh 150-second cooking allowance; repeated interactions do not refresh it.

1. Greet a seated guest. This selects their order.
2. Visit **Dough** with free hands. One dough is consumed; preparation takes 1.2 seconds.
3. Visit **Toppings**. Add the required ingredients, then choose **Confirm assembly**.
4. Visit **Oven** to load the raw pizza. Baking takes 3 seconds.
5. Collect it within 12 seconds after baking or it burns.
6. Serve the exact guest/seat, or explicitly transfer a baked regular pizza to **Waiter pickup** after hiring a waiter.

Each successful ingredient addition consumes one unit immediately. Wrong, duplicate and unavailable ingredients are rejected. A cancelled drag consumes nothing. Closing the window preserves additions in that particular dough. Dropped unfinished pizzas preserve their ingredients. Discarding them at **Bin**, expiration or order cancellation does not refund spent ingredients. Confirming assembly creates **raw** food, never ready food.

The **Orders** terminal lists accepted orders, exact table/seat, recipe icons, patience and cooking state. Orders remain active while baking, waiting at pickup or being delivered. Serving or expiration clears the order and all associated food. A chef can prepare only one pizza for the same order at a time.

| Recipe     | Ingredients                      | Base payment |
| ---------- | -------------------------------- | ------------ |
| Margherita | Dough, sauce, cheese             | 40 coins     |
| Pepperoni  | Dough, sauce, cheese, pepperoni  | 50 coins     |
| Veggie     | Dough, sauce, cheese, vegetables | 55 coins     |

Timely service adds a small bonus. Ordinary deliveries award 10 reputation. Expiration costs 5 reputation, down to zero. Start at one star and earn additional stars at 25, 50, 75 and 100 reputation. First to five stars wins; there is no match time limit. Star gains animate and play a short sound.

## Supplies and equipment

Both restaurants start with 100 coins and four of each ingredient. Opening **Supplies** is free; explicitly select Buy to purchase a pack of four:

| Ingredient | Price per pack of four |
| ---------- | ---------------------- |
| Dough      | 8                      |
| Sauce      | 8                      |
| Cheese     | 10                     |
| Pepperoni  | 12                     |
| Vegetables | 12                     |

Emergency aid is available when coins are below 8 and stock cannot complete any accepted recipe (or any recipe when no order has been accepted). It tops up only missing ingredients for one recipe. Repeating aid while that recipe is possible gives nothing. There is no ingredient resale.

**Storage** is the visible target for rats, separate from the shop. **Bin** discards carried food or a banana. Burned pizzas can be removed by interacting with the oven.

## Waiter

A waiter costs 140 coins. They physically walk to waiting ordinary guests, accept orders, walk to pickup, collect an explicitly transferred baked pizza, and carry it to its exact recipient. They use the same wall/furniture layout as the chefs through a small navigation grid. Payment occurs only after arrival at the recipient.

The waiter cannot cook, collect food from the chef's hands, accept dough/raw/burned food, serve opposing guests, or take/deliver VIP orders. Cancelled jobs release the waiter. Manual service remains available. Order acceptance and payment are idempotent, preventing duplicate rewards.

## Rivalry and rats

- **Rolling pin:** a short forward swing with a windup and active phase. The direction is locked for the swing, and each swing hits the opponent at most once. Moderate knockback drops carried items. A calm outline marks 2.5 seconds of immunity. Guests and staff are not attack targets; the pin does not kill rats.
- **Dash:** five-second cooldown; collision still applies. Ability icons shade during cooldown.
- **Banana, 25 coins:** requires free hands and appears in those hands. Carry it to clear floor and place with Q / Period. It warns for 1.2 seconds, then affects only the opponent. Maximum three installed traps per owner; traps expire after 40 seconds and disappear on triggering.
- **Dropped food/gadgets:** only the owner can recover them, after a 0.6-second delay. They expire after 45 seconds. Food is also removed if its order expires.
- **Rats:** four per wave, staggered 0.7 seconds apart. Rats walk from visible burrows to Storage, steal at most one existing ingredient each, and return with the real stolen item shown. They avoid walls and equipment. A chef within 65 pixels scares them back toward the burrow. A scared carrier drops its ingredient once; the owner can recover that stock with interact. A rat carrying nothing creates nothing. Dropped ingredients expire after 60 seconds.
- **Purchased wave, 80 coins:** targets the rival. A 60-second purchase cooldown and a four-rat cap prevent overlapping waves or an unlimited queue. Unavailable purchases do not charge money. Natural waves begin at 60 seconds and repeat about every 70 seconds, skipping kitchens with active rats.

## VIP

The first VIP appears in the central courtyard after 45 seconds. Both HUDs show the event and each viewport has a direction/distance indicator. The guest initially waits for service for 50 seconds. Each player must personally interact to unlock that same VIP order for themselves. The first acceptance gives the guest a shared 150-second cooking allowance; subsequent acceptance does not reset the clock or monopolize the guest.

Either chef can prepare and deliver. The first correct baked delivery awards 120 coins plus a speed bonus and 20 reputation exactly once, clearing the competing preparation. Waiters never handle VIPs.

## Deferred mechanics

Assistant hiring/AI and random fires are removed. There is no inert assistant or extinguisher purchase. Bin remains a separate discard station. Future fire work may use a carried extinguisher, directional moving spray particles and extinguishing on actual contact; matches are only a possible future sabotage proposal, not part of this build.

## Development and verification

Use the existing checkout; no installation or build is required to play. For browser development:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Run the dependency-free simulation tests:

```sh
node tests/game.test.cjs
```

**21 regression groups passed.** They cover both cooking cycles, six independent seats and gradual occupancy, acceptance timing, collision-safe routes, item purchases/aid, assembly accounting and interruption, walking waiter acceptance/delivery/cancellation, rejected raw/burned/wrong food, drops, bananas, directional active-frame strikes, rat theft/fear/recovery, wave limits, contested VIPs, simultaneous input, terminal states, victory and reset. A complete blue cooking route uses simulated movement and collision, without teleporting between stations. Other isolated tests position actors as fixtures to exercise specific interactions; no test grants reputation to manufacture a win.

Optional browser automation uses Playwright and Chromium already provided by the cloud environment (these are development tools, not game dependencies):

```sh
node tests/browser.test.cjs
```

Set `GAME_URL`, `CHROMIUM_PATH` or `ARTIFACT_DIR` to override the defaults (local port 8000, `/usr/bin/chromium`, and the system temporary directory). The suite launches headless Chromium with `--no-sandbox`, as required by this managed test container; this is not a game startup requirement. The `?test=1` URL explicitly enables a development-only hook; normal play omits it.

**Browser checks passed at 1366 × 768 and 1920 × 1080:** clean menu, actual audio gain/mute settings, both movement inputs, independent window focus, free shop opening/paid purchase, both keyboard assembly paths, cancelled and successful pointer drags across resize, both baked deliveries, terminal selection, ten actual deliveries through victory, Rematch, six seated guests, pause/settings/restart/main menu, and zero page errors. Menu, assembly, gameplay and six-seat screenshots were visually inspected. Browser fixtures position chefs near stations and accelerate simulation for long waits; pointer/keyboard actions and cooking/payment transitions use the actual application logic.

Direct `file://` navigation was attempted but the managed Chromium policy rejected it with `ERR_BLOCKED_BY_ADMINISTRATOR`. HTTP browser tests passed. This build uses only local classic scripts/styles and no fetching/module imports, so it is packaged for direct file opening, but direct-file execution in an unrestricted browser still needs confirmation. Audible sound quality, two-person hardware rollover, subjective readability and long-match balance need a human playtest. These are not claimed as completed.

Investigation of the old suspected raw-pizza reward did not reproduce an unbaked payment: its shared reward function already checked `stage === 'ready'`. The old waiter did, however, complete delivery by a timer instead of actual arrival. That path has been replaced, and tests cover all new reward entry points.

## Files and distribution

- `js/orders.js`: recipes, controls, prices and mirrored restaurant layout.
- `js/game.js`: shared simulation, navigation, state transitions and economy.
- `js/art.js`: procedural character and shared item/icon artwork.
- `js/render.js`: world rendering and independent player cameras.
- `js/main.js`: input, local UI focus, drag-and-drop, settings, sound and fixed-step loop.
- `tests/game.test.cjs`, `tests/browser.test.cjs`: simulation and browser regressions.

For itch.io, upload the ZIP as an HTML game and allow fullscreen. No external resources are required. Desktop keyboard play is intended; this is not a touch-control/mobile release.
