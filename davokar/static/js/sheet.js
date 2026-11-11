// sheet.js: makes the character sheet work.
// the html (sheet.html) already has every element; this file only:
// - fills numbers and texts (data-out, data-attack, data-cost...)
// - reacts to buttons (data-action)
// - saves changes through window.SheetStorage
// - reloads the page when something is added or removed, so jinja draws the lists
(function () {
  "use strict";

  const R = window.Rules;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const payload = JSON.parse($("#sheet-data").textContent);
  const sheet = payload.data;
  let modifier = 0;

  // --- reading and writing values ---

  // "attrs.quick" -> sheet.attrs.quick, "@name" -> payload.name
  function getPath(path) {
    if (path.startsWith("@")) return payload[path.slice(1)];
    return path.split(".").reduce((obj, key) => (obj == null ? undefined : obj[key]), sheet);
  }

  function setPath(path, value) {
    if (path.startsWith("@")) { payload[path.slice(1)] = value; return; }
    const keys = path.split(".");
    let obj = sheet;
    for (const key of keys.slice(0, -1)) obj = obj[key] = obj[key] || {};
    obj[keys[keys.length - 1]] = value;
  }

  function readInput(el) {
    if (el.type === "checkbox") return el.checked;
    if (el.dataset.type === "int") return R.toInt(el.value);
    return el.value;
  }

  // the list item (ability, weapon...) an element belongs to
  function itemOf(el) {
    const row = el.closest("[data-list]");
    if (!row) return null;
    const list = sheet[row.dataset.list];
    return { row, list, index: R.toInt(row.dataset.index), item: list[R.toInt(row.dataset.index)] };
  }

  // --- money ---

  function moneyTotal() {
    return R.toInt(sheet.money.t) * 100 + R.toInt(sheet.money.s) * 10 + R.toInt(sheet.money.o);
  }

  function setMoney(ortegs) {
    sheet.money = { t: Math.floor(ortegs / 100), s: Math.floor((ortegs % 100) / 10), o: ortegs % 10 };
  }

  function moneyText(ortegs) {
    const t = Math.floor(ortegs / 100), s = Math.floor((ortegs % 100) / 10), o = ortegs % 10;
    const parts = [];
    if (t) parts.push(t + " thaler");
    if (s) parts.push(s + (s === 1 ? " shilling" : " shillings"));
    if (o || !parts.length) parts.push(o + (o === 1 ? " orteg" : " ortegs"));
    return parts.join(", ");
  }

  // --- showing calculated values ---

  function setState(el, state) {
    el.classList.remove("is-warning", "is-danger", "is-corrupt");
    if (state) el.classList.add(state);
  }

  function render() {
    const D = R.derive(sheet);
    const cor = D.corruption;
    const pct = (part, whole) => Math.max(0, Math.min(100, (part / Math.max(1, whole)) * 100)) + "%";

    const values = {
      initial: (payload.name || "?").trim().charAt(0).toUpperCase(),
      toughness: D.toughness,
      toughnessMax: D.toughnessMax,
      painThreshold: D.painThreshold,
      defense: D.defense,
      defenseParts: D.defenseParts.join(" · "),
      armorFormula: D.armor.formula || "—",
      armorName: D.armor.worn ? D.armor.worn.name : "no armor worn",
      corruptionTotal: cor.total,
      corruptionMax: cor.max,
      corruptionTemporary: cor.temporary,
      corruptionPermanent: cor.permanent,
      corruptionThreshold: cor.threshold,
      corruptionBadge: cor.total >= cor.max ? "abomination" : cor.total >= cor.threshold ? "marked" : "",
      xpFree: D.experience.free,
      xpSpent: D.experience.spent,
      attrSum: D.attributeSum,
      initiative: R.cap(D.initiativeAttr) + " " + D.initiative,
      learnedCorruption: "from learning: " + cor.learned,
      ritualCount: D.rituals.known + " of " + D.rituals.allowed + " rituals",
      modifier: modifier > 0 ? "+" + modifier : modifier < 0 ? "−" + Math.abs(modifier) : "±0",
      money: moneyText(moneyTotal()),
    };
    for (const key of R.ATTRIBUTES) values["attr." + key] = D.attrs[key];

    for (const el of $$("[data-out]")) {
      if (values[el.dataset.out] !== undefined) el.textContent = values[el.dataset.out];
    }
    for (const el of $$('[data-out="corruptionBadge"]')) el.hidden = !values.corruptionBadge;

    $('[data-out-width="toughness"]').style.width = pct(D.toughness, D.toughnessMax);
    $('[data-out-width="corruption"]').style.width = pct(cor.total, cor.max);

    setState($('[data-state="toughness"]'),
      D.toughness <= 0 ? "is-danger" : D.toughness <= D.painThreshold ? "is-warning" : "");
    setState($('[data-state="corruption"]'), cor.total >= cor.threshold ? "is-corrupt" : "");
    setState($('[data-state="xp"]'), D.experience.free < 0 ? "is-danger" : "");
    $('[data-state="attrSum"]').style.color = D.attributeSum === 80 ? "var(--moss)" : "var(--gold-light)";

    // weapons: attack attribute and damage with every ability applied
    for (const row of $$('[data-list="weapons"]')) {
      const w = sheet.weapons[R.toInt(row.dataset.index)];
      const info = R.weapon(sheet, w, D.attrs);
      $("[data-attack-label]", row).textContent = "attack · " + info.attackAttr;
      $("[data-attack]", row).textContent = info.attack;
      $("[data-damage]", row).textContent = info.damage;
      $("[data-notes]", row).textContent = info.notes.join(" · ");
      row.classList.toggle("off", !w.equipped);
    }
    for (const row of $$('[data-list="armors"]')) {
      row.classList.toggle("off", !sheet.armors[R.toInt(row.dataset.index)].equipped);
    }
  }

  // updates one ability card after its level or "free" changes
  function renderAbility(row, a) {
    for (const btn of $$('[data-action="set-level"]', row)) {
      btn.classList.toggle("active", R.toInt(a.level) >= R.toInt(btn.dataset.level));
    }
    $("[data-cost]", row).textContent = a.free ? "free"
      : a.cat === "Ritual" ? "via Ritualist" : R.XP_COST[R.toInt(a.level)] + " XP";
    ["novice", "adept", "master"].forEach((tier, i) => {
      $('[data-tier="' + tier + '"]', row).classList.toggle("have", R.toInt(a.level) >= i + 1);
    });
  }

  // --- saving ---

  let saveTimer = null;
  let saving = false;
  let again = false;
  let saveState = "saved";

  function setSaveStatus(state) {
    saveState = state;
    const badge = $("#save-status");
    const look = {
      saved: ["text-bg-success", "Saved"],
      pending: ["text-bg-warning", "Saving…"],
      error: ["text-bg-danger", "Not saved, retrying…"],
    }[state];
    badge.className = "badge rounded-pill " + look[0];
    badge.textContent = look[1];
  }

  function changed() {
    setSaveStatus("pending");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700);  // waits for typing to stop
  }

  async function save() {
    if (saving) { again = true; return; }
    saving = true;
    try {
      await window.SheetStorage.save({ name: payload.name, occupation: payload.occupation, data: sheet });
      setSaveStatus(again ? "pending" : "saved");
    } catch (err) {
      setSaveStatus("error");
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 4000);
    } finally {
      saving = false;
      if (again) { again = false; save(); }
    }
  }

  // saves now and reloads, so the new list is drawn by the template
  async function saveAndReload(message) {
    clearTimeout(saveTimer);
    try {
      await window.SheetStorage.save({ name: payload.name, occupation: payload.occupation, data: sheet });
    } catch (err) {
      setSaveStatus("error");
      return;
    }
    setSaveStatus("saved");
    if (message) sessionStorage.setItem("sheet-toast", message);
    location.reload();
  }

  // --- messages and rolls ---

  function toast(message) {
    $("#toast-text").textContent = message;
    bootstrap.Toast.getOrCreateInstance($("#toast")).show();
  }

  // the last 30 rolls stay in this browser, one list per character
  const ROLLS_KEY = "davokar.rolls." + payload.id;
  let rolls = [];

  function loadRolls() {
    try {
      rolls = JSON.parse(localStorage.getItem(ROLLS_KEY) || "[]") || [];
    } catch (e) {
      rolls = [];
    }
    for (const roll of rolls.slice().reverse()) showRoll(roll);
  }

  function showRoll(roll) {
    const entry = $("#roll-entry").content.firstElementChild.cloneNode(true);
    entry.classList.add(roll.kind);
    $(".roll-label", entry).textContent = roll.label;
    $(".roll-result", entry).textContent = roll.result;
    $(".roll-detail", entry).textContent = roll.detail;
    $("#roll-empty").hidden = true;
    $("#roll-list").prepend(entry);
  }

  function addRoll(label, result, detail, kind) {
    const roll = { label, result, detail, kind };
    showRoll(roll);
    rolls = [roll, ...rolls].slice(0, 30);
    try { localStorage.setItem(ROLLS_KEY, JSON.stringify(rolls)); } catch (e) { /* storage blocked */ }
  }

  function testRoll(label, target, extra) {
    const t = R.test(target + modifier);
    const mod = modifier ? " (" + target + (modifier > 0 ? "+" : "−") + Math.abs(modifier) + ")" : "";
    addRoll(label, t.d20, "d20 " + t.d20 + " vs " + t.target + mod + " · " +
      (t.success ? "success" : "failure") + (extra ? " · " + extra : ""), t.success ? "success" : "failure");
  }

  function diceRoll(label, formula, kind = "damage") {
    const r = R.roll(formula);
    addRoll(label, r.total, formula + " → " + r.detail, kind);
    return r.total;
  }

  // --- compendium (rules text kept in this browser) ---

  const COMPENDIUM_KEY = "davokar.compendium.v1";
  let compendium = {};

  function loadCompendium() {
    try {
      compendium = JSON.parse(localStorage.getItem(COMPENDIUM_KEY) || "{}") || {};
    } catch (e) {
      compendium = {};
    }
  }

  // accepts a list [{name, effect, tiers}] or {abilities, mystical_powers, rituals, traits}
  function parseCompendium(data) {
    const out = {};
    const tiersOf = (v) => (v.novice || v.adept || v.master) ? { novice: v.novice, adept: v.adept, master: v.master } : null;
    if (Array.isArray(data)) {
      for (const x of data) {
        if (x && typeof x.name === "string" && (x.effect || x.tiers)) out[x.name] = { effect: x.effect || "", tiers: x.tiers || null };
      }
    } else if (data && typeof data === "object") {
      for (const group of ["abilities", "mystical_powers", "rituals", "traits"]) {
        for (const [name, v] of Object.entries(data[group] || {})) {
          out[name] = { effect: (v.material ? "Material: " + v.material + " " : "") + (v.description || ""), tiers: tiersOf(v) };
        }
      }
    }
    return out;
  }

  // writes the rules text into the [data-effect] / [data-tier] spots of every card and list row
  function fillCompendiumTexts() {
    const hasCompendium = Object.keys(compendium).length > 0;
    $("#compendium-notice").classList.toggle("d-none", hasCompendium);
    $("#compendium-status").textContent = hasCompendium
      ? Object.keys(compendium).length + " entries with rules text"
      : "No compendium imported yet";

    for (const box of $$("[data-name]")) {
      const text = compendium[box.dataset.name];
      const effect = $("[data-effect]", box);
      if (!effect) continue;
      effect.textContent = text ? text.effect : "No rules text. Import your compendium to read it.";
      for (const li of $$("[data-tier]", box)) {
        const tierText = text && text.tiers && text.tiers[li.dataset.tier];
        li.textContent = tierText ? R.cap(li.dataset.tier) + ": " + tierText : "";
      }
    }
  }

  // --- actions (buttons with data-action) ---

  const actions = {
    "roll-attribute"(el) {
      testRoll(R.cap(el.dataset.attr) + " test", R.derive(sheet).attrs[el.dataset.attr]);
    },
    "roll-defense"() {
      testRoll("Defense", R.derive(sheet).defense);
    },
    "roll-armor"() {
      const D = R.derive(sheet);
      if (D.armor.formula) diceRoll("Armor", D.armor.formula);
    },
    "roll-attack"(el) {
      const { item } = itemOf(el);
      const info = R.weapon(sheet, item);
      testRoll("Attack: " + item.name, info.attack, info.attackAttr + (info.precise ? " +1 precise" : ""));
    },
    "roll-damage"(el) {
      const { item } = itemOf(el);
      diceRoll("Damage: " + item.name, R.weapon(sheet, item).damage);
    },
    cast(el) {
      const { item } = itemOf(el);
      const D = R.derive(sheet);
      testRoll("Cast " + item.name, D.casting.value, D.casting.attr + (D.armor.impeding ? " −" + D.armor.impeding + " armor" : ""));
      sheet.corrTemp = R.toInt(sheet.corrTemp) + diceRoll("Temporary corruption", R.castingCorruption(sheet, item), "corruption");
      render();
      changed();
    },
    "perform-ritual"(el) {
      const { item } = itemOf(el);
      const D = R.derive(sheet);
      testRoll("Ritual: " + item.name, D.casting.value, D.casting.attr);
      sheet.corrTemp = R.toInt(sheet.corrTemp) + diceRoll("Temporary corruption", R.castingCorruption(sheet, item), "corruption");
      render();
      changed();
    },
    "roll-free"(el) {
      diceRoll("Free roll", el.dataset.formula);
    },
    modifier(el) {
      modifier = Math.max(-10, Math.min(10, modifier + R.toInt(el.dataset.delta)));
      render();
    },
    corruption(el) {
      sheet.corrTemp = Math.max(0, R.toInt(sheet.corrTemp) + R.toInt(el.dataset.delta));
      render();
      changed();
    },
    "end-scene"() {
      sheet.corrTemp = 0;  // temporary corruption fades at the end of a scene
      render();
      changed();
      toast("End of scene: temporary corruption cleared.");
    },
    damage() {
      const amount = R.toInt($("#damage-amount").value);
      if (amount <= 0) return;
      const D = R.derive(sheet);
      sheet.toughCur = D.toughness - amount;
      let note = "toughness " + D.toughness + " → " + sheet.toughCur;
      if (amount >= D.painThreshold) note += " · pain threshold reached";
      if (sheet.toughCur <= 0) note += " · dying";
      addRoll("Damage taken", amount, note, "failure");
      render();
      changed();
    },
    heal() {
      const amount = R.toInt($("#damage-amount").value);
      if (amount <= 0) return;
      const D = R.derive(sheet);
      sheet.toughCur = Math.min(D.toughnessMax, D.toughness + amount);
      if (sheet.toughCur === D.toughnessMax) sheet.toughCur = null;  // null = full toughness
      render();
      changed();
    },
    "set-level"(el) {
      const { row, item } = itemOf(el);
      const lvl = R.toInt(el.dataset.level);
      item.level = item.level === lvl && lvl > 1 ? lvl - 1 : lvl;  // clicking the current level lowers it
      renderAbility(row, item);
      render();
      changed();
    },
    quantity(el) {
      const { row, item } = itemOf(el);
      item.qty = Math.max(0, R.toInt(item.qty) + R.toInt(el.dataset.delta));
      $("[data-qty]", row).textContent = item.qty;
      changed();
    },
    remove(el) {
      const { list, index, item } = itemOf(el);
      list.splice(index, 1);
      saveAndReload((item.name || "Item") + " removed.");
    },
    "add-artifact"() {
      sheet.artifacts.push({ name: "", powers: "", corr: 0 });
      saveAndReload("Artifact added.");
    },
    "add-ability"(el) {
      const entry = el.closest("[data-entry]");
      const level = R.toInt(el.dataset.level);
      const isTrait = entry.dataset.cat === "Trait";
      sheet.abilities.push({
        name: entry.dataset.name,
        cat: entry.dataset.cat,
        tag: entry.dataset.tag,
        level,
        free: isTrait && !entry.querySelector('[data-level="2"]'),  // single-level traits are free
      });
      saveAndReload(entry.dataset.name + " added.");
    },
    "clear-rolls"() {
      rolls = [];
      try { localStorage.removeItem(ROLLS_KEY); } catch (e) { /* storage blocked */ }
      for (const entry of $$("#roll-list .roll")) entry.remove();
      $("#roll-empty").hidden = false;
    },
    "shop-add"(el) { addFromShop(el, false); },
    "shop-buy"(el) { addFromShop(el, true); },
    "clear-compendium"() {
      try { localStorage.removeItem(COMPENDIUM_KEY); } catch (e) { /* storage blocked */ }
      loadCompendium();
      fillCompendiumTexts();
      bootstrap.Modal.getOrCreateInstance($("#compendium")).hide();
      toast("Compendium removed.");
    },
    export() {
      const file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = (payload.name || "character").replace(/[^\w-]+/g, "_") + ".json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    },
  };

  function addFromShop(el, buy) {
    const entry = el.closest("[data-entry]");
    const shop = el.closest(".modal").id;
    const cost = R.toInt(entry.dataset.cost);
    const name = entry.dataset.name;
    const qualities = entry.dataset.q ? entry.dataset.q.split("|") : [];

    if (buy && cost > moneyTotal()) {
      toast("Not enough money.");
      return;
    }
    if (shop === "shop-weapons") {
      sheet.weapons.push({ name, kind: entry.dataset.kind, die: entry.dataset.die, q: qualities, equipped: true });
    } else if (shop === "shop-armors") {
      const nothingWorn = !sheet.armors.some((a) => a.equipped);
      sheet.armors.push({ name, weight: entry.dataset.weight, q: qualities, equipped: nothingWorn });
    } else {
      const existing = sheet.items.find((i) => i.name === name);
      if (existing) existing.qty = R.toInt(existing.qty) + 1;
      else sheet.items.push({ name, qty: 1, note: "" });
    }
    if (buy) setMoney(moneyTotal() - cost);
    saveAndReload(name + (buy ? " bought for " + moneyText(cost) + "." : " added."));
  }

  // --- events ---

  document.addEventListener("click", (event) => {
    const el = event.target.closest("[data-action]");
    if (el && actions[el.dataset.action]) actions[el.dataset.action](el);
  });

  document.addEventListener("input", (event) => {
    const el = event.target;
    if (el.dataset.bind) {
      setPath(el.dataset.bind, readInput(el));
      render();
      changed();
      return;
    }
    if (el.dataset.field) {
      const found = itemOf(el);
      if (!found) return;
      found.item[el.dataset.field] = readInput(el);
      // only one armor can be worn
      if (found.row.dataset.list === "armors" && el.dataset.field === "equipped" && el.checked) {
        sheet.armors.forEach((a, i) => { if (i !== found.index) a.equipped = false; });
        for (const box of $$('[data-list="armors"] [data-field="equipped"]')) box.checked = box === el;
      }
      if (found.row.dataset.list === "abilities") renderAbility(found.row, found.item);
      render();
      changed();
      return;
    }
    if (el.matches("[data-search]")) filterModal(el.closest(".modal"));
  });

  document.addEventListener("change", (event) => {
    if (event.target.name === "ability-filter") filterModal($("#add-ability"));
  });

  // hides list rows that don't match the search box (and the group filter, in the ability modal)
  function filterModal(modal) {
    const text = $("[data-search]", modal).value.trim().toLowerCase();
    const groupInput = $('[name="ability-filter"]:checked', modal);
    const group = groupInput ? groupInput.value : "all";
    for (const entry of $$("[data-entry]", modal)) {
      const matchesText = !text || entry.dataset.name.toLowerCase().includes(text);
      const matchesGroup = group === "all" || entry.dataset.group === group;
      entry.classList.toggle("d-none", !(matchesText && matchesGroup));  // bootstrap's d-flex beats "hidden"
    }
  }

  // opening the ability modal from a section selects that section's filter
  $("#add-ability").addEventListener("show.bs.modal", (event) => {
    const group = (event.relatedTarget && event.relatedTarget.dataset.group) || "all";
    $("#filter-" + group).checked = true;
    $("[data-search]", event.target).value = "";
    filterModal(event.target);
  });

  // buy buttons are disabled when the purse is too light
  for (const id of ["shop-weapons", "shop-armors", "shop-items"]) {
    $("#" + id).addEventListener("show.bs.modal", (event) => {
      const purse = moneyTotal();
      for (const entry of $$("[data-entry]", event.target)) {
        const buy = $('[data-action="shop-buy"]', entry);
        if (buy) buy.disabled = R.toInt(entry.dataset.cost) > purse;
      }
      render();
    });
  }

  $("#formula-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formula = event.target.formula.value.trim().toUpperCase();
    if (/^(\d*D\d+|\d+)([+-](\d*D\d+|\d+))*$/.test(formula)) diceRoll("Free roll", formula);
  });

  for (const form of $$("[data-custom]")) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = form.name.value.trim();
      const kind = form.dataset.custom;
      if (kind === "ability") sheet.abilities.push({ name, cat: form.cat.value, tag: "", level: 1, free: false, custom: true });
      if (kind === "shop-weapons") sheet.weapons.push({ name, kind: "single", die: "1D8", q: [], equipped: true });
      if (kind === "shop-armors") sheet.armors.push({ name, weight: "light", q: [], equipped: false });
      if (kind === "shop-items") sheet.items.push({ name, qty: 1, note: "" });
      saveAndReload(name + " added.");
    });
  }

  $("#compendium-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let entries = {};
      try { entries = parseCompendium(JSON.parse(reader.result)); } catch (e) { entries = {}; }
      const count = Object.keys(entries).length;
      event.target.value = "";
      if (!count) {
        $("#compendium-status").textContent = "That file is not a compendium in a known format.";
        return;
      }
      try {
        localStorage.setItem(COMPENDIUM_KEY, JSON.stringify(entries));
      } catch (e) {
        $("#compendium-status").textContent = "This browser blocked local storage.";
        return;
      }
      loadCompendium();
      fillCompendiumTexts();
      bootstrap.Modal.getOrCreateInstance($("#compendium")).hide();
      toast("Compendium imported: " + count + " entries.");
    };
    reader.readAsText(file);
  });

  // keeps the open tab after a reload
  for (const tab of $$('[data-bs-toggle="tab"]')) {
    tab.addEventListener("shown.bs.tab", () => sessionStorage.setItem("sheet-tab", tab.dataset.bsTarget));
  }

  window.addEventListener("beforeunload", (event) => {
    if (saveState !== "saved") event.preventDefault();  // asks before leaving with unsaved changes
  });

  // --- start ---

  loadCompendium();
  fillCompendiumTexts();
  loadRolls();
  render();
  setSaveStatus("saved");

  const savedTab = sessionStorage.getItem("sheet-tab");
  if (savedTab) {
    const tab = $('[data-bs-target="' + savedTab + '"]');
    if (tab) bootstrap.Tab.getOrCreateInstance(tab).show();
  }
  const message = sessionStorage.getItem("sheet-toast");
  if (message) {
    sessionStorage.removeItem("sheet-toast");
    toast(message);
  }
})();
