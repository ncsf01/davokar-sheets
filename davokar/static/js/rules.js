// symbaroum rules as pure functions: they only read the character data and
// return results, never touch the page, so the app and the demo share them
window.Rules = (function () {
  "use strict";

  const ATTRIBUTES = ["accurate", "cunning", "discreet", "persuasive", "quick", "resolute", "strong", "vigilant"];
  const XP_COST = [0, 10, 30, 60];            // total cost per level
  const LEVEL_NAMES = ["", "Novice", "Adept", "Master"];
  const RANGED = ["bow", "crossbow", "sling", "throwing"];
  const TRADITIONS = ["Wizardry", "Theurgy", "Witchcraft", "Sorcery"];
  // traditions that remove the corruption of learning their powers (not sorcery)
  const SHIELDING_TRADITIONS = ["Wizardry", "Theurgy", "Witchcraft"];

  const toInt = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };

  // highest level in an ability, 0 if the character doesn't have it
  function level(c, name) {
    let best = 0;
    for (const a of c.abilities || []) if (a.name === name) best = Math.max(best, toInt(a.level));
    return best;
  }

  // attributes after bonuses (exceptional attribute adds +1 per level)
  function attributes(c) {
    const out = {};
    for (const key of ATTRIBUTES) out[key] = toInt(c.attrs && c.attrs[key]);
    for (const a of c.abilities || []) {
      if (a.name === "Exceptional Attribute" && out[a.attr] !== undefined) out[a.attr] += toInt(a.level);
    }
    return out;
  }

  function best(attrs, keys) {
    return keys.reduce((top, k) => (attrs[k] > attrs[top] ? k : top), keys[0]);
  }

  // d4 -> d6 -> d8 -> d10 -> d12
  function stepUp(sides) {
    return { 4: 6, 6: 8, 8: 10, 10: 12, 12: 12 }[sides] || sides;
  }

  // worn armor: protection dice and impeding penalty
  function armor(c) {
    const worn = (c.armors || []).find((a) => a.equipped);
    const q = (worn && worn.q) || [];
    let impeding = 0;
    const dice = [];
    if (worn) {
      impeding = { light: 2, medium: 3, heavy: 4 }[worn.weight] || 0;
      if (q.includes("Flexible")) impeding = Math.max(0, impeding - 2);
      if (q.includes("Cumbersome")) impeding += 1;
      let sides = { light: 4, medium: 6, heavy: 8 }[worn.weight] || 4;
      if (level(c, "Man-at-arms") >= 1) sides = stepUp(sides);      // man-at-arms novice
      dice.push("1D" + sides);
    }
    const robust = level(c, "Robust");
    if (robust) dice.push("1D" + [0, 4, 6, 8][robust]);              // robust
    if (level(c, "Survival Instinct") >= 2) dice.push("1D4");        // survival instinct adept
    return {
      worn: worn || null,
      formula: dice.join("+"),
      impeding,                                                      // penalty on powers
      defenseImpeding: level(c, "Man-at-arms") >= 2 ? 0 : impeding,  // man-at-arms adept
    };
  }

  // permanent corruption from learning powers and rituals
  function learnedCorruption(c) {
    let total = 0;
    for (const a of c.abilities || []) {
      const tags = String(a.tag || "").split("/");
      if (a.cat === "Mystical") {
        // 1 point per level, unless a tradition of the power covers that level
        for (let lvl = 1; lvl <= toInt(a.level); lvl++) {
          const covered = tags.some((t) => SHIELDING_TRADITIONS.includes(t) && level(c, t) >= lvl);
          if (!covered) total += 1;
        }
      } else if (a.cat === "Ritual") {
        // 1 point per ritual outside the character's tradition
        if (!tags.some((t) => TRADITIONS.includes(t) && level(c, t) >= 1)) total += 1;
      }
    }
    return total;
  }

  // every calculated value shown on the sheet
  function derive(c) {
    const A = attributes(c);
    const L = (name) => level(c, name);
    const arm = armor(c);

    const toughnessMax = Math.max(A.strong, 10);
    const toughness = c.toughCur === null || c.toughCur === undefined ? toughnessMax : toInt(c.toughCur);
    const painThreshold = Math.ceil(A.strong / 2);
    const corruptionThreshold = Math.ceil(A.resolute / 2);
    const corruptionMax = A.resolute;                 // abomination

    // defense: quick, or a better attribute unlocked by an ability
    const defenseKeys = ["quick"];
    if (L("Feint") >= 2) defenseKeys.push("discreet");
    if (L("Sixth Sense") >= 2) defenseKeys.push("vigilant");
    if (L("Tactician") >= 2) defenseKeys.push("cunning");
    const defenseAttr = best(A, defenseKeys);
    let defense = A[defenseAttr];
    const defenseParts = [cap(defenseAttr) + " " + A[defenseAttr]];
    const robust = L("Robust");
    if (robust) { defense -= robust + 1; defenseParts.push("Robust −" + (robust + 1)); }
    if (arm.defenseImpeding) { defense -= arm.defenseImpeding; defenseParts.push("Armor −" + arm.defenseImpeding); }
    const shield = (c.weapons || []).find((w) => w.equipped && w.kind === "shield");
    if (shield) {
      const bonus = L("Shield Fighter") >= 1 && !(shield.q || []).includes("Flexible") ? 2 : 1;
      defense += bonus; defenseParts.push("Shield +" + bonus);
    }
    const balanced = (c.weapons || []).filter((w) => w.equipped && (w.q || []).includes("Balanced")).length;
    if (balanced) { defense += balanced; defenseParts.push("Balanced +" + balanced); }

    const initKeys = ["quick"];
    if (L("Tactician") >= 1) initKeys.push("cunning");
    if (L("Sixth Sense") >= 2) initKeys.push("vigilant");
    const initiativeAttr = best(A, initKeys);

    const learned = learnedCorruption(c);
    const fromArtifacts = (c.artifacts || []).reduce((sum, a) => sum + toInt(a.corr), 0);
    const permanent = learned + fromArtifacts + toInt(c.corrExtra);
    const temporary = toInt(c.corrTemp);

    // rituals come with ritualist, free abilities cost nothing
    let spent = 0;
    for (const a of c.abilities || []) if (!a.free && a.cat !== "Ritual") spent += XP_COST[toInt(a.level)] || 0;

    // leader lets persuasive replace resolute for powers
    const castingAttr = L("Leader") >= 1 ? best(A, ["resolute", "persuasive"]) : "resolute";

    return {
      attrs: A,
      attributeSum: ATTRIBUTES.reduce((s, k) => s + toInt(c.attrs && c.attrs[k]), 0),
      toughness, toughnessMax, painThreshold,
      defense, defenseAttr, defenseParts,
      armor: arm,
      initiative: A[initiativeAttr], initiativeAttr,
      corruption: { permanent, temporary, total: permanent + temporary, learned, fromArtifacts,
                    threshold: corruptionThreshold, max: corruptionMax },
      experience: { total: toInt(c.xpTotal), spent, free: toInt(c.xpTotal) - spent },
      rituals: { known: (c.abilities || []).filter((a) => a.cat === "Ritual").length,
                 allowed: [0, 1, 3, 6][L("Ritualist")] },
      casting: { attr: castingAttr, value: A[castingAttr] - arm.impeding },
    };
  }

  // attack attribute and damage formula of a weapon
  function weapon(c, w, attrs) {
    const A = attrs || attributes(c);
    const L = (name) => level(c, name);
    const q = w.q || [];
    const melee = !RANGED.includes(w.kind);

    const keys = ["accurate"];
    if (melee) {
      if (L("Iron Fist") >= 1) keys.push("strong");
      if (L("Dominate") >= 1) keys.push("persuasive");
      if (L("Feint") >= 1 && (w.kind === "short" || q.includes("Precise"))) keys.push("discreet");
    } else if (L("Sixth Sense") >= 1 && w.kind !== "throwing") {
      keys.push("vigilant");
    }
    if (L("Tactician") >= 3 && w.kind !== "heavy") keys.push("cunning");
    const attackAttr = best(A, keys);
    const precise = q.includes("Precise") ? 1 : 0;

    let sides = toInt(String(w.die || "1D6").toUpperCase().split("D")[1]) || 6;
    if (w.kind === "heavy" && L("Two-handed Force") >= 1) sides = 12;
    if (w.kind === "long" && L("Polearm Mastery") >= 1) sides = stepUp(sides);
    if (w.kind === "bow" && L("Marksman") >= 1) sides = Math.max(sides, 10);
    if (w.kind === "crossbow" && L("Marksman") >= 1) sides = Math.max(sides, 12);
    if (w.kind === "throwing" && L("Steel Throw") >= 1) sides = Math.max(sides, 8);
    if (w.kind === "unarmed" && L("Natural Warrior") >= 1) sides = Math.max(sides, 6);
    const shieldInOtherHand = (c.weapons || []).some((x) => x !== w && x.equipped && x.kind === "shield");
    if (L("Shield Fighter") >= 1 && shieldInOtherHand) {
      if (w.kind === "single") sides = Math.max(sides, 10);
      if (w.kind === "short") sides = Math.max(sides, 8);
    }

    const dice = ["1D" + sides];
    const notes = [];
    if (q.includes("Deep Impact")) dice.push("1");
    if (melee && L("Iron Fist") >= 2) dice.push("1D4");
    const robust = L("Robust");
    if (melee && robust) { dice.push("1D" + [0, 4, 6, 8][robust]); notes.push("Robust bonus: once per turn"); }
    if (w.kind === "unarmed" && L("Natural Warrior") >= 3) dice.push("1D6");
    if (L("Backstab") >= 1) notes.push("Backstab: +1D4 with Advantage");
    if (melee && L("Berserker") >= 1) notes.push("Berserker: +1D6 while in a frenzy");

    return { attackAttr, attack: A[attackAttr] + precise, precise, damage: dice.join("+"), notes, melee };
  }

  // temporary corruption for casting a power or performing a ritual
  function castingCorruption(c, entry) {
    const tags = String(entry.tag || "").split("/");
    if (entry.cat === "Ritual") {
      return tags.some((t) => TRADITIONS.includes(t) && level(c, t) >= 1) ? "1" : "1D4";
    }
    // adept in the power's tradition: only 1 point
    return tags.some((t) => SHIELDING_TRADITIONS.includes(t) && level(c, t) >= 2) ? "1" : "1D4";
  }

  // --- dice ---

  function rollDie(sides) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return 1 + (buf[0] % sides);
  }

  // "1D8+1D4+1" -> {total, detail}
  function roll(formula) {
    const terms = String(formula).toUpperCase().replace(/\s+/g, "").match(/[+-]?[^+-]+/g) || [];
    let total = 0;
    const parts = [];
    for (let term of terms) {
      const sign = term[0] === "-" ? -1 : 1;
      term = term.replace(/^[+-]/, "");
      const m = term.match(/^(\d*)D(\d+)$/);
      if (m) {
        const count = Math.min(toInt(m[1]) || 1, 50), sides = toInt(m[2]);
        if (!sides) continue;
        const results = Array.from({ length: count }, () => rollDie(sides));
        total += sign * results.reduce((a, b) => a + b, 0);
        parts.push((sign < 0 ? "−" : "") + count + "D" + sides + "[" + results.join(",") + "]");
      } else if (/^\d+$/.test(term)) {
        total += sign * toInt(term);
        parts.push((sign < 0 ? "−" : "+") + term);
      }
    }
    return { total, detail: parts.join(" ") };
  }

  // d20 test: success if <= target, 1 always succeeds, 20 always fails
  function test(target) {
    const d20 = rollDie(20);
    const success = d20 === 1 || (d20 !== 20 && d20 <= target);
    return { d20, target, success };
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  return { ATTRIBUTES, XP_COST, LEVEL_NAMES, RANGED, TRADITIONS, toInt, level, attributes, armor,
           derive, weapon, castingCorruption, learnedCorruption, roll, rollDie, test, stepUp, cap };
})();
