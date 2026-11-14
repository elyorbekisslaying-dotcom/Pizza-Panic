# Pizza Panic — Kitchen Rivals

A competitive, two-player local cooking game. Two chefs share one keyboard and race to build the first five-star restaurant. Runs offline with Canvas, vanilla JavaScript, and generated Web Audio sounds.

## Play

Download and extract the project, then open `index.html` in a modern desktop browser. No installation, server, account, assets download, or build is required. Both players need the same keyboard. Some keyboards limit simultaneous key presses. Actions trigger once per press, so release and press again at the next station.

The **How to play** button opens the tutorial. Escape pauses both restaurants. M toggles sound. Browser focus loss pauses the game.

| Action | Blue | Red |
| --- | --- | --- |
| Move | WASD | Arrow keys |
| Select / interact / purchase / serve | E | Enter |
| Punch | F | Slash |
| Deploy purchased banana | Q | Period |
| Turbo dash | Left Shift | Right Shift |

## Cook and serve

1. Approach one of your occupied tables and press interact to select its order. Orders appear automatically.
2. Approach Dough and interact. Preparation takes 1.2 seconds and uses one dough.
3. At Toppings, interact to consume the remaining ingredients. Assembly takes 1.2 seconds.
4. Put the raw pizza in your Oven. Baking takes 3 seconds.
5. Collect within 8 seconds of completion or the pizza burns.
6. Serve at the table belonging to that exact order.

Interact at an oven to remove a burned pizza. The extinguisher also discards carried food when there is no fire. Expired or fulfilled orders automatically clear unfinished, carried, dropped, and staff-held pizzas associated with them.

| Pizza | Ingredients | Base payment |
| --- | --- | --- |
| Margherita | Dough, sauce, cheese | $40 |
| Pepperoni | Dough, sauce, cheese, pepperoni | $50 |
| Veggie | Dough, sauce, cheese, vegetables | $55 |

Each restaurant starts with $100 and four of each ingredient. Supplies cost $30 for four of everything. If you cannot afford a pack and lack an ingredient, the supply station restores enough for one recipe free. Quick service gives a small cash bonus.

## Reputation and victory

Start at one star. Earn +10 reputation per ordinary delivery and +20 per VIP. An expired regular order costs 5 reputation, down to a minimum of zero. Stars increase at 25, 50, 75 and 100 reputation. Reaching 100 wins immediately. There is no overall match time limit.

Customers occupy at most two tables per restaurant and wait 65 seconds. The central VIP first arrives after 35 seconds and waits 45 seconds. Either chef may select and cook the VIP order. The first matching delivery earns $120 plus a speed bonus and +20 reputation. The other preparation is cleared after the VIP leaves. Further VIPs arrive after a short interval.

## Rivalry, disasters, and purchases

All purchase stations are at the bottom of your kitchen. Approach the labeled station and press your interact key to buy immediately. Opponents cannot use your stations or serve your customers.

- Punch is free, with a 2-second cooldown. A successful hit knocks back, briefly stuns and drops carried food. Victims receive 2.5 seconds of immunity.
- Only the owner can retrieve a dropped pizza, after a 0.6-second delay. Dropped food expires after 30 seconds or when its order expires. Fire destroys dropped food.
- Bananas cost $25. Carry up to three. Traps arm after a visible 1.2-second warning, affect opponents only, and expire after 35 seconds.
- Turbo dash has a 5-second cooldown and respects furniture and walls.
- Paid rats cost $80, target the rival kitchen, and have a 45-second cooldown.
- Natural rats occasionally invade both kitchens. Each rat steals at most one available ingredient. Approach or punch to repel it.
- An occasional oven fire blocks a small area and oven interaction. Visit your extinguisher to clear it. The surrounding routes stay open.

## Staff

- **Waiter, $140:** place a finished regular pizza at your waiter pickup station. Delivery takes 2.5 seconds. The waiter cannot serve VIPs or opposing customers. Manual table service remains available.
- **Assistant, $240:** prepares one raw pizza at a time for an unclaimed regular order, consuming your actual ingredients. Preparation takes 4 seconds. Retrieve it at Dough, then bake and deliver yourself. Assistants never take VIP orders.

Both hires last for the match. Rematch resets all stock, staff, money, reputation, orders and events.

## Files

- `js/orders.js`: recipes, controls and symmetric kitchen layout
- `js/game.js`: simulation, economy, orders, sabotage and staff
- `js/art.js`: original procedural food and chef artwork
- `js/render.js`: restaurant, customers, stations and effects
- `js/main.js`: input, menus, HUD, audio and fixed-step animation loop

## Validation

Run `node tests/game.test.cjs` if Node is available. Playing does not require Node.

Eleven regression groups cover cooking for each team, ownership and duplicate rewards, contested VIP preparation, collision and movement, purchases and emergency supplies, punch/drop/immunity, traps, rats and fire, staff, canceled and burned food, victory/reset, and frame-rate comparisons.

A separate development harness exercised the actual input handlers, menu/tutorial, pause/resume, mute, restart, victory and rematch with simulated DOM objects. The actual Canvas renderer was exercised using a native Canvas implementation and inspected as images.

Chromium startup was attempted but blocked by this development environment's socket restriction. Browser layout, audible output, real-keyboard rollover, and the intended 4–7-minute match pacing still need a two-person browser playtest. This is not a claim of completed browser testing.

## itch.io

Upload a ZIP with `index.html`, `style.css` and the `js` folder at its root. Choose an HTML game and enable fullscreen. A desktop embed around 1200 × 900 is recommended for readable controls and status panels. No remote services are used.
