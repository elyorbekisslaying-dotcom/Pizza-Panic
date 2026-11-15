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
        ? "Arrows move · Enter interact · . use item · O window"
        : "WASD move · E interact · Q use item · I window") +
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
  let tutorialComplete = false,
    helpReturn = "menu";
  try {
    tutorialComplete = localStorage.getItem("pizza-tutorial-v1") === "complete";
  } catch {}
  const mentor = document.getElementById("mentor").getContext("2d");
  PizzaArt.chef(mentor, 45, 52, 1, 0, false, "#79b59b");
  function startTutorial() {
    unlock();
    new KitchenTutorial(game, () => {
      tutorialComplete = true;
      try {
        localStorage.setItem("pizza-tutorial-v1", "complete");
      } catch {}
      show("graduated");
    });
    views.forEach((v) => (v.signature = ""));
    show("play");
  }
  document.getElementById("recover").onclick = () => {
    game.tutorial?.recover();
    keys.clear();
    clearDrag();
    refresh();
  };
  document.getElementById("collapse-instructor").onclick = () => {
    const collapsed = document
      .getElementById("instructor")
      .classList.toggle("collapsed");
    const button = document.getElementById("collapse-instructor");
    button.textContent = collapsed ? "Expand" : "Collapse";
    button.setAttribute("aria-expanded", String(!collapsed));
  };
  document.getElementById("leave-tutorial").onclick = () => show("menu");
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
        slip: 270,
        event: 180,
        ready: 880,
        burn: 90,
        vip: 740,
        star: 990,
        win: 1200,
        count: 420,
        go: 840,
        lost: 140,
        warning: 380,
        flour: 210,
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
    match.hidden = ["menu", "settings", "help", "graduated"].includes(next);
    document.getElementById("instructor").hidden = !(
      game.mode === "tutorial" && next === "play"
    );
    document.body.classList.toggle(
      "tutorial",
      game.mode === "tutorial" && next !== "menu",
    );
    document.getElementById("countdown").hidden = true;
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
        [
          "How to Play",
          () => {
            helpReturn = "menu";
            show("help");
          },
        ],
        ["Tutorial", startTutorial],
        ["Competitive Mode", start],
        [
          "Settings",
          () => {
            settingsReturn = "menu";
            show("settings");
          },
        ],
      ]);
      const competitive = [
        ...document.querySelectorAll("#actions button"),
      ].find((b) => b.textContent === "Competitive Mode");
      competitive.disabled = !tutorialComplete;
      if (!tutorialComplete)
        desc.innerHTML +=
          '<p class="lock-note">Complete the practical Tutorial to unlock Competitive Mode.</p>';
    }
    if (next === "graduated") {
      title.textContent = "Ready for the rivalry!";
      desc.innerHTML =
        "<p>You cooked, served, hired staff and tried sabotage. Competitive Mode is unlocked.</p><p>First to 100 reputation wins. If no affordable recipe or recoverable paying food remains, bankruptcy ends the match. No free supplies or loans.</p><p>Red uses Arrows, Enter, Period and O. Both players use the same systems.</p>";
      buttons([
        ["Competitive Mode", start],
        ["Repeat Tutorial", startTutorial],
        ["Main menu", () => show("menu")],
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
        [
          "View controls",
          () => {
            helpReturn = "settings";
            show("help");
          },
        ],
        ["Back", () => show(settingsReturn)],
      ]);
    }
    if (next === "help") {
      title.textContent = "From dough to five stars";
      desc.innerHTML =
        '<div class="help"><p><b>Blue:</b> WASD move · E interact · Q use held gadget · I open/close window.</p><p><b>Red:</b> Arrows move · Enter interact · . use held gadget · O open/close window.</p><p><b>Windows:</b> your movement keys select, E / Enter adds or buys. Select Confirm to assemble. Q / . closes; I / O also closes. Mouse click or drag ingredients onto the dough.</p><p>Greet a seated guest → Dough → Toppings → add recipe ingredients → Confirm → Oven (3s) → collect within 12s → serve the exact seat. Orders terminal changes your selected task. Tutorial uses turquoise routes and yellow highlights on the next window button.</p><p>Supplies sells packs of four. Waiter (100) takes orders and carries baked regular pizzas from the shared Pickup queue. Up to four cooks (180 each) each reserve a separate regular order, prepare it, walk to the shared four-slot oven, bake and carry ready food to Pickup. Collect it yourself or let the waiter deliver. At Dough, empty hands and no valid selection automatically assign the most urgent unclaimed regular order.</p><p>Q / Period uses your held gadget: banana (12), flour throw (18), or striped sabotage sauce (15). Dirty empty rival tables need 2.5 seconds of held interaction to clean. Blue gadget stalls are above the central VIP table; Red stalls are below. Hire staff beside your kitchen. Flip the sign beside either real entrance door; Closed stops new guests while everyone inside can leave.</p><p>Each VIP in the central courtyard needs personal service: 40 coins and 12 reputation. First to 100 reputation wins. Bankruptcy means no affordable recipe or recoverable paying food remains, not merely zero coins. No free supplies. Escape pauses everyone; M toggles sound.</p></div>';
      buttons([["Back", () => show(helpReturn)]]);
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
        [
          "Restart",
          () => (game.mode === "tutorial" ? startTutorial() : start()),
        ],
        ["Main menu", () => show("menu")],
      ]);
    }
    if (next === "win") {
      title.textContent =
        game.winner === -1
          ? "Draw — both kitchens bankrupt"
          : (game.winner ? "Red" : "Blue") + " wins!";
      desc.textContent =
        game.resultReason +
        " · " +
        game.teams
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
    if (!tutorialComplete) return false;
    game.reset("competitive");
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
    if (p.panel === "terminal") {
      const active = [...t.customers, ...game.vips]
        .filter((o) => game.accepted(o, p.id))
        .sort((a, b) => a.patience - b.patience);
      p.orderList = (p.orderList || []).filter((id) =>
        active.some((o) => o.id === id),
      );
      for (const o of active)
        if (!p.orderList.includes(o.id)) p.orderList.push(o.id);
      return [
        ...(p.orderList || [])
          .filter((id) => game.accepted(game.order(id), p.id))
          .map((key) => ({ action: "select", key })),
        { action: "inspect" },
        { action: "close" },
      ];
    }
    return [];
  }
  function action(p, a) {
    if (state !== "play" || !game.active() || p.stun || !p.panel) return;
    if (a.action === "buy") game.buy(p, a.key);
    if (a.action === "inspect") {
      game.record("inspect", { id: p.id });
      game.say(
        p,
        "Stock: " +
          Kitchen.stockKeys
            .map((k) => k + " " + game.teams[p.id].stock[k])
            .join(" · "),
      );
    }
    if (a.action === "add") game.addIngredient(p, a.key);
    if (a.action === "confirm") game.assemble(p);
    if (a.action === "select") game.select(p, Number(a.key));
    if (a.action === "close") p.panel = null;
    refresh();
  }
  const carriedIcons = new Map();
  function carriedIcon(item) {
    if (!item) return icon("order");
    if (["banana", "flour", "bottle"].includes(item.kind))
      return icon(item.kind);
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
    const instructor = document.getElementById("instructor");
    instructor.hidden = !(game.mode === "tutorial" && state === "play");
    if (game.tutorial && !game.tutorial.done) {
      document.getElementById("lesson-title").textContent =
        "Chef Rosa · Lesson " +
        (game.tutorial.index + 1) +
        " / " +
        game.tutorial.steps.length;
      document.getElementById("lesson-text").textContent =
        game.tutorial.step.text;
    }

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
        '/100</small><span class="open-badge">' +
        (t.open ? "OPEN" : "CLOSED") +
        '</span></div><div class="inventory">' +
        Kitchen.stockKeys
          .map(
            (k) =>
              '<button data-stock="' +
              k +
              '" class="stock ' +
              (!t.stock[k] ? "empty" : "") +
              '" title="' +
              k +
              (t.stock[k] ? "" : " — out of stock") +
              '">' +
              icon(k) +
              "<span>" +
              t.stock[k] +
              "</span></button>",
          )
          .join("") +
        '</div><div class="task-row"><span class="hand">' +
        carriedIcon(p.hand) +
        (["banana", "flour", "bottle"].includes(p.hand?.kind)
          ? p.hand.kind + " [" + (p.id ? "." : "Q") + "]"
          : p.hand?.stage || "Free hands") +
        '</span><span class="task" title="' +
        (o ? Kitchen.recipes[o.recipe].name : "Greet a waiting guest") +
        '">' +
        (o
          ? icon("recipe" + o.recipe) +
            Kitchen.recipes[o.recipe].name +
            " · " +
            game.status(o, p.id)
          : "Greet a waiting guest") +
        "</span>" +
        "</div>";
      if (v.hudSignature !== hudHtml) {
        v.hud.innerHTML = hudHtml;
        v.hudSignature = hudHtml;
      }
      v.toast.hidden = p.messageTime <= 0 && !t.alerts.length;
      v.toast.textContent = t.alerts.length
        ? t.alerts.map((a) => a.text).join(" / ")
        : p.message;
      v.panel.hidden = !p.panel;
      if (!p.panel) {
        v.signature = "";
        continue;
      }
      const list = choices(p);
      if (p.panel === "terminal" && p.focusOrder) {
        const index = list.findIndex((a) => a.key === p.focusOrder);
        if (index >= 0) p.cursor = index;
        else {
          p.cursor = list.length - 1;
          p.focusOrder = null;
        }
      }
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
      v.panel.classList.toggle("assembly-panel", p.panel === "assembly");
      let content = "";
      if (p.panel === "supply") {
        content = Kitchen.stockKeys
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
          .join("");
      }
      if (p.panel === "terminal") {
        content =
          list
            .filter((a) => a.action === "select")
            .map((a, i) => {
              const o = game.order(Number(a.key));
              return (
                '<div class="order-row ' +
                (game.status(o, p.id).startsWith("Ready")
                  ? "ready-order"
                  : "") +
                '">' +
                icon("order") +
                '<span class="details"><b>' +
                (o.team === -1
                  ? "VIP"
                  : "T" +
                    (t.seats[o.seat].table + 1) +
                    " / Seat " +
                    t.seats[o.seat].place) +
                " · " +
                (o.name || "Guest") +
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
        content +=
          btn("Inspect stock", list[list.length - 2], list.length - 2) +
          t.history
            .map((h) => "<p>" + h.name + " · " + h.label + "</p>")
            .join("");
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
    document
      .querySelectorAll(".lesson-target")
      .forEach((el) => el.classList.remove("lesson-target"));
    const hint = game.tutorial?.uiTarget;
    if (hint && state === "play") {
      const target = views[0].el.querySelector(hint);
      target?.classList.add("lesson-target");
      if (views[0].lessonHint !== hint)
        target?.scrollIntoView({ block: "nearest" });
      views[0].lessonHint = hint;
    } else views[0].lessonHint = null;
    document.getElementById("event").textContent =
      game.noticeTime > 0
        ? game.notice
        : game.vip
          ? "VIP waiting in the courtyard"
          : "";
  }
  for (const v of views) {
    v.hud.addEventListener("click", (e) => {
      if (state === "play" && e.target.closest("[data-stock]")) {
        game.record("inspect", { id: Number(v.el.dataset.player) });
        game.say(
          game.players[Number(v.el.dataset.player)],
          "Ingredients are spent only when added. Zero stock is marked red.",
        );
      }
    });

    v.panel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-action]");
      if (b?.dataset.action === "add" && performance.now() < suppressClick)
        return;
      if (b?.dataset.action === "select" && v.pendingSelect) {
        const id = v.pendingSelect;
        v.pendingSelect = null;
        action(game.players[Number(v.el.dataset.player)], {
          action: "select",
          key: id,
        });
        return;
      }
      if (b)
        action(game.players[Number(v.el.dataset.player)], {
          action: b.dataset.action,
          key: b.dataset.key,
        });
    });
    v.panel.addEventListener("pointerdown", (e) => {
      const select = e.target.closest('[data-action="select"]');
      v.pendingSelect = select?.dataset.key || null;
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
    if (state !== "play" || !game.active()) return;
    if (reserved.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    Kitchen.controls.forEach((c, id) => {
      const p = game.players[id];
      if (game.mode === "tutorial" && id === 1) return;
      if (!Object.values(c).includes(e.code)) return;
      if (p.panel) {
        const list = choices(p);
        if (e.code === c.up || e.code === c.left)
          p.cursor = (p.cursor + list.length - 1) % list.length;
        else if (e.code === c.down || e.code === c.right)
          p.cursor = (p.cursor + 1) % list.length;
        else if (e.code === c.interact) action(p, list[p.cursor]);
        else if (e.code === c.panel || e.code === c.trap) p.panel = null;
        p.focusOrder =
          list[p.cursor]?.action === "select" ? list[p.cursor].key : null;
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
      if (e.code === c.trap) game.useItem(p);
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
        interact: keys.has(c.interact),
      }));
      if (game.mode === "tutorial") input[1] = game.tutorial?.input() || {};
      while (accumulator >= 1 / 120) {
        game.step(1 / 120, input);
        accumulator = Math.max(0, accumulator - 1 / 120);
        if (state !== "play") break;
        if (game.winner !== null) {
          show("win");
          break;
        }
      }
      game.sounds.splice(0).forEach(sound);
      if (drag && game.players[drag.id].panel !== "assembly") clearDrag();
    }
    const count = document.getElementById("countdown");
    count.hidden = state !== "play" || game.countdown <= 0;
    count.textContent =
      game.countdown > 0.6 ? Math.ceil(game.countdown - 0.6) : "GO!";
    if (!match.hidden) {
      views.forEach((v, id) => {
        if (game.mode === "tutorial" && id === 1) return;
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
      startTutorial,
      get tutorialComplete() {
        return tutorialComplete;
      },
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
