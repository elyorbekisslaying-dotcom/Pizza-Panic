"use strict";
(() => {
  const game = new RivalGame.Game(),
    keys = new Set(),
    match = document.getElementById("match"),
    overlay = document.getElementById("overlay"),
    players = document.getElementById("players");
  let state = "menu",
    settingsReturn = "menu",
    audio,
    master,
    volume = 0.5,
    muted = false,
    previous = null,
    accumulator = 0,
    uiClock = 0,
    drag = null;
  try {
    const saved = JSON.parse(localStorage.getItem("pizza-settings"));
    if (saved) {
      volume = Math.max(0, Math.min(1, Number(saved.volume) || 0));
      muted = !!saved.muted;
    }
  } catch {}
  const icon = (k, cls = "") =>
    '<img class="icon ' +
    cls +
    '" src="' +
    GameIcons.url(k) +
    '" alt="' +
    k +
    '" title="' +
    k +
    '" draggable="false">';
  const views = [0, 1].map((id) => {
    const el = document.createElement("section");
    el.className = "player " + (id ? "red" : "blue");
    el.dataset.player = id;
    el.innerHTML =
      '<div class="hud"></div><div class="view"><canvas class="world" aria-label="' +
      (id ? "Red" : "Blue") +
      ' kitchen viewport"></canvas><div class="toast" role="status" hidden></div><section class="panel" hidden></section></div><div class="controls">' +
      (id
        ? "Arrows move · Enter interact · / swing · . trap · RShift dash · O window"
        : "WASD move · E interact · F swing · Q trap · LShift dash · I window") +
      "</div>";
    players.append(el);
    return {
      el,
      hud: el.querySelector(".hud"),
      canvas: el.querySelector("canvas"),
      panel: el.querySelector(".panel"),
      toast: el.querySelector(".toast"),
      signature: "",
    };
  });
  const brand = document.getElementById("brand").getContext("2d");
  PizzaArt.chef(brand, 65, 65, 1, 3, false, Kitchen.colors[0]);
  PizzaArt.chef(brand, 295, 65, -1, -3, false, Kitchen.colors[1]);
  PizzaArt.pizza(brand, 180, 64, { cheese: true, pepperoni: true }, 1.7);
  function syncSound() {
    if (master) master.gain.value = muted ? 0 : volume;
    try {
      localStorage.setItem("pizza-settings", JSON.stringify({ volume, muted }));
    } catch {}
  }
  function unlock() {
    try {
      audio ??= new AudioContext();
      if (!master) {
        master = audio.createGain();
        master.connect(audio.destination);
        syncSound();
      }
      audio.resume().catch(() => {});
    } catch {}
  }
  function sound(type) {
    if (!audio || audio.state !== "running" || muted) return;
    const o = audio.createOscillator(),
      gain = audio.createGain(),
      now = audio.currentTime;
    o.frequency.value =
      {
        serve: 650,
        punch: 110,
        slip: 270,
        event: 180,
        ready: 880,
        burn: 90,
        vip: 740,
        star: 990,
        win: 1200,
        dash: 300,
      }[type] || 440;
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    o.connect(gain).connect(master);
    o.start();
    o.stop(now + 0.21);
  }
  function buttons(items) {
    const a = document.getElementById("actions");
    a.replaceChildren(
      ...items.map(([label, handler]) => {
        const b = document.createElement("button");
        b.textContent = label;
        b.onclick = handler;
        return b;
      }),
    );
  }
  function clearDrag() {
    drag = null;
    document.getElementById("drag-ghost").hidden = true;
  }
  function show(next) {
    state = next;
    keys.clear();
    accumulator = 0;
    clearDrag();
    overlay.hidden = next === "play";
    match.hidden = ["menu", "settings", "help"].includes(next);
    const title = document.getElementById("title"),
      desc = document.getElementById("description");
    if (next === "play") {
      document.activeElement?.blur();
      refresh();
      return;
    }
    if (next === "menu") {
      game.reset();
      views.forEach((v) => (v.signature = ""));
      title.textContent = "Pizza Panic — Kitchen Rivals";
      desc.innerHTML =
        "<p>Two chefs. One keyboard. A race to five stars.</p><p>Greet guests, craft pizzas, and outcook your rival.</p>";
      buttons([
        ["Play", start],
        [
          "Settings",
          () => {
            settingsReturn = "menu";
            show("settings");
          },
        ],
        ["Quick guide", () => show("help")],
      ]);
    }
    if (next === "settings") {
      title.textContent = "Settings";
      desc.innerHTML =
        '<label>Sound <input id="sound-toggle" type="checkbox" ' +
        (!muted ? "checked" : "") +
        '></label><label>Effects volume <input id="volume" aria-label="Effects volume" type="range" min="0" max="1" step="0.05" value="' +
        volume +
        '"></label>';
      document.getElementById("sound-toggle").onchange = (e) => {
        muted = !e.target.checked;
        unlock();
        syncSound();
        sound("ready");
      };
      document.getElementById("volume").oninput = (e) => {
        volume = Number(e.target.value);
        unlock();
        syncSound();
        sound("ready");
      };
      buttons([
        ["View controls", () => show("help")],
        ["Back", () => show(settingsReturn)],
      ]);
    }
    if (next === "help") {
      title.textContent = "From dough to five stars";
      desc.innerHTML =
        '<div class="help"><p><b>Blue:</b> WASD move · E interact · F rolling pin · Q place banana · Left Shift dash · I open/close window.</p><p><b>Red:</b> Arrows move · Enter interact · / rolling pin · . place banana · Right Shift dash · O open/close window.</p><p><b>Windows:</b> your movement keys select, E / Enter adds or buys. Select Confirm to assemble. Q / . closes; I / O also closes. Mouse click or drag ingredients onto the dough.</p><p>Greet a seated guest → Dough → Toppings → add recipe ingredients → Confirm → Oven (3s) → collect within 12s → serve the exact seat. Orders terminal changes your selected task.</p><p>Supplies sells four of each ingredient separately. A hired waiter takes orders and carries baked regular pizzas from Waiter pickup. VIP is in the shared central courtyard. Escape pauses everyone; M toggles sound.</p></div>';
      buttons([["Back", () => show("settings")]]);
    }
    if (next === "pause") {
      title.textContent = "Kitchen break";
      desc.textContent = "Both restaurants are paused.";
      buttons([
        ["Resume", () => show("play")],
        [
          "Settings",
          () => {
            settingsReturn = "pause";
            show("settings");
          },
        ],
        ["Restart", start],
        ["Main menu", () => show("menu")],
      ]);
    }
    if (next === "win") {
      title.textContent =
        (game.winner ? "Red" : "Blue") + " wins — five stars!";
      desc.textContent = game.teams
        .map(
          (t) =>
            (t.id ? "Red" : "Blue") +
            ": " +
            t.served +
            " served, " +
            t.rep +
            " reputation",
        )
        .join(" · ");
      buttons([
        ["Rematch", start],
        ["Main menu", () => show("menu")],
      ]);
    }
  }
  function start() {
    game.reset();
    views.forEach((v) => (v.signature = ""));
    unlock();
    show("play");
  }
  document.getElementById("pause").onclick = () => show("pause");
  function choices(p) {
    const t = game.teams[p.id];
    if (p.panel === "supply")
      return [
        ...Kitchen.stockKeys.map((key) => ({ action: "buy", key })),
        { action: "aid" },
        { action: "close" },
      ];
    if (p.panel === "assembly")
      return [
        ...Kitchen.stockKeys
          .filter((k) => k !== "dough")
          .map((key) => ({ action: "add", key })),
        { action: "confirm" },
        { action: "close" },
      ];
    if (p.panel === "terminal")
      return [
        ...t.customers
          .filter((o) => game.accepted(o, p.id))
          .map((o) => ({ action: "select", key: o.id })),
        ...(game.accepted(game.vip, p.id)
          ? [{ action: "select", key: game.vip.id }]
          : []),
        { action: "close" },
      ];
    return [];
  }
  function action(p, a) {
    if (state !== "play" || p.stun || !p.panel) return;
    if (a.action === "buy") game.buy(p, a.key);
    if (a.action === "aid") game.aid(p);
    if (a.action === "add") game.addIngredient(p, a.key);
    if (a.action === "confirm") game.assemble(p);
    if (a.action === "select") game.select(p, Number(a.key));
    if (a.action === "close") p.panel = null;
    refresh();
  }
  const carriedIcons = new Map();
  function carriedIcon(item) {
    if (!item) return icon("order");
    if (item.kind === "banana") return icon("banana");
    const key = item.stage + ":" + (item.added || []).join(",");
    if (!carriedIcons.has(key)) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      RivalRenderer.food(canvas.getContext("2d"), item, 32, 32, 1);
      carriedIcons.set(key, canvas.toDataURL());
    }
    return (
      '<img class="icon" src="' +
      carriedIcons.get(key) +
      '" alt="' +
      item.stage +
      ' pizza">'
    );
  }
  function refresh() {
    for (const p of game.players) {
      const v = views[p.id],
        t = game.teams[p.id],
        o = game.order(p.selected);
      const hudHtml =
        '<div class="summary"><h2>' +
        (p.id ? "RED · SLICE & DICE" : "BLUE · THE ROLLING PIN") +
        '</h2><span class="coins">' +
        icon("coin") +
        t.money +
        '</span></div><div class="rating ' +
        (t.starFX ? "star-up" : "") +
        '"><div class="stars">' +
        [0, 1, 2, 3, 4]
          .map((i) =>
            icon("star", i > Math.floor(t.rep / 25) ? "unearned" : ""),
          )
          .join("") +
        '</div><progress max="25" value="' +
        (t.rep === 100 ? 25 : t.rep % 25) +
        '" aria-label="Progress to next star"></progress><small>' +
        t.rep +
        '/100</small></div><div class="inventory">' +
        Kitchen.stockKeys
          .map(
            (k) =>
              '<div class="stock ' +
              (!t.stock[k] ? "empty" : "") +
              '" title="' +
              k +
              (t.stock[k] ? "" : " — out of stock") +
              '">' +
              icon(k) +
              "<span>" +
              t.stock[k] +
              "</span></div>",
          )
          .join("") +
        '</div><div class="task-row"><span class="hand">' +
        carriedIcon(p.hand) +
        (p.hand?.kind === "banana" ? "Banana" : p.hand?.stage || "Free hands") +
        '</span><span class="task" title="' +
        (o ? Kitchen.recipes[o.recipe].name : "Greet a waiting guest") +
        '">' +
        (o
          ? Kitchen.recipes[o.recipe].name + " · " + game.status(o, p.id)
          : "Greet a waiting guest") +
        "</span>" +
        [
          ["pin", p.punchCD / 1.2],
          ["dash", p.dashCD / 5],
        ]
          .map(
            ([k, ratio]) =>
              '<span class="ability" title="' +
              k +
              '">' +
              icon(k) +
              '<i style="height:' +
              Math.min(100, ratio * 100) +
              '%"></i></span>',
          )
          .join("") +
        "</div>";
      if (v.hudSignature !== hudHtml) {
        v.hud.innerHTML = hudHtml;
        v.hudSignature = hudHtml;
      }
      v.toast.hidden = p.messageTime <= 0;
      v.toast.textContent = p.message;
      v.panel.hidden = !p.panel;
      if (!p.panel) {
        v.signature = "";
        continue;
      }
      const list = choices(p);
      p.cursor = Math.min(p.cursor, list.length - 1);
      const btn = (label, a, i) =>
        '<button data-action="' +
        a.action +
        '" data-key="' +
        (a.key ?? "") +
        '" class="' +
        (i === p.cursor ? "selected" : "") +
        '">' +
        label +
        "</button>";
      let content = "";
      if (p.panel === "supply") {
        content =
          Kitchen.stockKeys
            .map(
              (k, i) =>
                '<div class="shop-row">' +
                icon(k) +
                '<span class="details"><b>' +
                k +
                "</b><small>In stock: " +
                t.stock[k] +
                " · pack of 4</small></span>" +
                btn("Buy · " + Kitchen.prices[k], list[i], i) +
                "</div>",
            )
            .join("") + btn("Emergency aid", list[5], 5);
      }
      if (p.panel === "terminal") {
        content =
          list
            .filter((a) => a.action === "select")
            .map((a, i) => {
              const o = game.order(Number(a.key));
              return (
                '<div class="order-row">' +
                icon("order") +
                '<span class="details"><b>' +
                (o.team === -1
                  ? "VIP"
                  : "T" +
                    (Math.floor(o.seat / 2) + 1) +
                    " / Seat " +
                    ((o.seat % 2) + 1)) +
                " · " +
                Kitchen.recipes[o.recipe].name +
                "</b><small>" +
                game.status(o, p.id) +
                " · " +
                Math.ceil(o.patience) +
                "s</small>" +
                Kitchen.recipes[o.recipe].items.map((k) => icon(k)).join("") +
                "</span>" +
                btn("Select", a, i) +
                "</div>"
              );
            })
            .join("") || "<p>No accepted orders. Greet a guest first.</p>";
      }
      if (p.panel === "assembly" && p.hand) {
        content =
          '<h4 class="assembly-title">' +
          Kitchen.recipes[p.hand.recipe].name +
          '</h4><canvas class="pizza-drop" width="260" height="200" aria-label="Drop ingredients onto dough"></canvas><div class="recipe">' +
          Kitchen.recipes[p.hand.recipe].items
            .map((k) =>
              icon(
                k,
                k === "dough" || p.hand.added.includes(k) ? "" : "missing",
              ),
            )
            .join("") +
          '</div><div class="ingredients">' +
          list
            .filter((a) => a.action === "add")
            .map(
              (a, i) =>
                '<button class="ingredient ' +
                (i === p.cursor ? "selected" : "") +
                '" data-action="add" data-key="' +
                a.key +
                '">' +
                icon(a.key) +
                "<br>" +
                a.key +
                " · " +
                t.stock[a.key] +
                (p.hand.added.includes(a.key) ? " ✓" : "") +
                "</button>",
            )
            .join("") +
          '</div><p class="assembly-title"><small>Faded recipe icons still needed. Added ingredients stay in this dough.</small></p>';
      }
      const html =
        "<header><h3>" +
        {
          supply: "Supplies",
          terminal: "Order terminal",
          assembly: "Build your pizza",
        }[p.panel] +
        "</h3><span>" +
        (p.id ? "RED" : "BLUE") +
        '</span></header><div class="hint">' +
        (p.id
          ? "Arrows select · Enter activate · O / . close"
          : "WASD select · E activate · I / Q close") +
        '</div><div class="panel-content">' +
        content +
        "</div><footer>" +
        (p.panel === "assembly"
          ? btn("Confirm assembly", list[list.length - 2], list.length - 2)
          : "") +
        btn("Close", list[list.length - 1], list.length - 1) +
        "</footer>";
      if (v.signature !== html) {
        const scroll = v.panel.querySelector(".panel-content")?.scrollTop || 0;
        v.panel.innerHTML = html;
        v.signature = html;
        v.panel.querySelector(".panel-content").scrollTop = scroll;
        const selected = v.panel.querySelector(".selected");
        if (v.lastCursor !== p.cursor) {
          selected?.scrollIntoView({ block: "nearest" });
          v.lastCursor = p.cursor;
        }
      }
      if (p.panel === "assembly" && p.hand) {
        const c = v.panel.querySelector("canvas").getContext("2d");
        c.clearRect(0, 0, 260, 200);
        RivalRenderer.food(c, p.hand, 130, 100, 3.5);
      }
    }
    document.getElementById("event").textContent =
      game.noticeTime > 0
        ? game.notice
        : game.vip
          ? "VIP waiting in the courtyard"
          : "";
  }
  for (const v of views) {
    v.panel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-action]");
      if (b?.dataset.action === "add" && performance.now() < suppressClick)
        return;
      if (b)
        action(game.players[Number(v.el.dataset.player)], {
          action: b.dataset.action,
          key: b.dataset.key,
        });
    });
    v.panel.addEventListener("pointerdown", (e) => {
      const b = e.target.closest('[data-action="add"]');
      if (!b || state !== "play") return;
      drag = {
        id: Number(v.el.dataset.player),
        key: b.dataset.key,
        x: e.clientX,
        y: e.clientY,
        moved: false,
      };
    });
  }
  let suppressClick = 0;
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5)
      drag.moved = true;
    if (drag.moved) {
      const ghost = document.getElementById("drag-ghost");
      ghost.hidden = false;
      ghost.innerHTML = icon(drag.key);
      ghost.style.left = e.clientX + "px";
      ghost.style.top = e.clientY + "px";
    }
  });
  window.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const d = drag;
    if (d.moved) {
      suppressClick = performance.now() + 250;
      const target = views[d.id].panel.querySelector(".pizza-drop"),
        r = target?.getBoundingClientRect();
      if (
        r &&
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      )
        action(game.players[d.id], { action: "add", key: d.key });
    }
    clearDrag();
  });
  window.addEventListener("pointercancel", clearDrag);
  const reserved = new Set(Kitchen.controls.flatMap((c) => Object.values(c)));
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
      e.preventDefault();
      if (state === "play") show("pause");
      else if (state === "pause") show("play");
      return;
    }
    if (e.code === "KeyM") {
      if (!e.repeat) {
        muted = !muted;
        syncSound();
      }
      return;
    }
    if (state !== "play") return;
    if (reserved.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    Kitchen.controls.forEach((c, id) => {
      const p = game.players[id];
      if (!Object.values(c).includes(e.code)) return;
      if (p.panel) {
        const list = choices(p);
        if (e.code === c.up || e.code === c.left)
          p.cursor = (p.cursor + list.length - 1) % list.length;
        else if (e.code === c.down || e.code === c.right)
          p.cursor = (p.cursor + 1) % list.length;
        else if (e.code === c.interact) action(p, list[p.cursor]);
        else if (e.code === c.panel || e.code === c.trap) p.panel = null;
        refresh();
        return;
      }
      keys.add(e.code);
      if (e.code === c.interact) game.interact(p);
      if (e.code === c.panel) {
        const s = game.nearest(p);
        if (s && ["supply", "terminal", "topping"].includes(s.type))
          game.interact(p);
        else game.say(p, "Approach Orders, Supplies or Toppings");
      }
      if (e.code === c.punch) game.punch(p);
      if (e.code === c.trap) game.trap(p);
      if (e.code === c.dash) game.dash(p);
      refresh();
    });
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    keys.clear();
    if (state === "play") show("pause");
  });
  function frame(now) {
    const dt = previous === null ? 0 : Math.min(0.1, (now - previous) / 1000);
    previous = now;
    if (state === "play") {
      accumulator += dt;
      const input = Kitchen.controls.map((c) => ({
        x: Number(keys.has(c.right)) - Number(keys.has(c.left)),
        y: Number(keys.has(c.down)) - Number(keys.has(c.up)),
      }));
      while (accumulator >= 1 / 120) {
        game.step(1 / 120, input);
        accumulator -= 1 / 120;
        if (game.winner !== null) {
          show("win");
          break;
        }
      }
      game.sounds.splice(0).forEach(sound);
      if (drag && game.players[drag.id].panel !== "assembly") clearDrag();
    }
    if (!match.hidden) {
      views.forEach((v, id) => {
        const rect = v.canvas.getBoundingClientRect();
        if (
          v.canvas.width !== Math.round(rect.width) ||
          v.canvas.height !== Math.round(rect.height)
        ) {
          v.canvas.width = Math.round(rect.width);
          v.canvas.height = Math.round(rect.height);
        }
        RivalRenderer.render(v.canvas.getContext("2d"), game, id);
      });
      uiClock += dt;
      if (uiClock > 0.1) {
        refresh();
        uiClock = 0;
      }
    }
    requestAnimationFrame(frame);
  }
  if (location.search.includes("test=1"))
    window.rivalTest = {
      game,
      start,
      show,
      refresh,
      get state() {
        return state;
      },
      get sound() {
        return { volume, muted, gain: master?.gain.value };
      },
      views,
    };
  show("menu");
  requestAnimationFrame(frame);
})();
