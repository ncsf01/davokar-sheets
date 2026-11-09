"use strict";
/* ============ Dados ============ */
const BASE = window.COMPENDIUM_BASE || [];
const COMP_KEY = 'symb.compendium.v1';
let COMP = [], CMAP = {}, IMPORTED = 0;
// Merge the built-in name list with the compendium the user imported (kept in this browser).
function loadCompendium() {
  let extra = [];
  try { extra = JSON.parse(localStorage.getItem(COMP_KEY) || '[]') || []; } catch (e) {}
  const map = {};
  for (const x of BASE) map[x.name] = { ...x };
  for (const x of extra) map[x.name] = { ...(map[x.name] || { category: x.category, tag: x.tag }), ...x, tiered: !!(x.tiers || map[x.name]?.tiered) };
  CMAP = map; COMP = Object.values(map); IMPORTED = extra.length;
}
// Accepts the flat list format ([{name, category, tag, effect, tiers}]) or the grouped
// symbaroum_data.json format ({abilities:{...}, mystical_powers:{...}, rituals:{...}, traits:{...}}).
function normalizeCompendium(data) {
  const out = [];
  const tiersOf = v => (v.novice || v.adept || v.master) ? { novice: v.novice || '', adept: v.adept || '', master: v.master || '' } : undefined;
  if (Array.isArray(data)) {
    for (const x of data) if (x && x.name && ['General', 'Combat', 'Mystical', 'Ritual', 'Trait'].includes(x.category))
      out.push({ name: String(x.name), category: x.category, tag: String(x.tag || ''), effect: String(x.effect || ''), tiers: x.tiers || undefined });
  } else if (data && typeof data === 'object') {
    const add = (group, cat, tagFn) => { for (const [name, v] of Object.entries(data[group] || {})) {
      const known = BASE.find(b => b.name === name);
      let effect = String(v.description || ''); if (v.material) effect = 'Material: ' + v.material + ' ' + effect;
      if (v.stat_block) effect += ' ' + (typeof v.stat_block === 'string' ? v.stat_block : JSON.stringify(v.stat_block));
      out.push({ name, category: known?.category || cat, tag: tagFn(v, known), effect, tiers: tiersOf(v) }); } };
    const trad = v => Array.isArray(v.tradition) ? v.tradition.join('/') : String(v.tradition || '');
    add('abilities', 'General', (v, k) => k?.tag || 'General');
    add('mystical_powers', 'Mystical', trad);
    add('rituals', 'Ritual', trad);
    add('traits', 'Trait', () => 'Trait');
  }
  return out;
}
loadCompendium();
const CAT_PT = {General:'Geral', Combat:'Combate', Mystical:'Poder místico', Ritual:'Ritual', Trait:'Traço'};
const ATTRS = [
  ['accurate','Acurado','Accurate'],['cunning','Astuto','Cunning'],['discreet','Discreto','Discreet'],['persuasive','Persuasivo','Persuasive'],
  ['quick','Rápido','Quick'],['resolute','Resoluto','Resolute'],['strong','Forte','Strong'],['vigilant','Vigilante','Vigilant']];
const ATTR_PT = Object.fromEntries(ATTRS.map(a => [a[0], a[1]]));
const LVL = ['', 'Novato', 'Adepto', 'Mestre'];
const XP_COST = [0, 10, 30, 60];
const TRADITIONS = ['Wizardry','Theurgy','Witchcraft','Sorcery'];
const KIND_PT = {heavy:'Arma pesada', long:'Arma longa', single:'Uma mão', short:'Arma curta', unarmed:'Desarmado', shield:'Escudo', bow:'Arco', crossbow:'Besta', sling:'Funda', throwing:'Arremesso'};
const RANGED = ['bow','crossbow','sling','throwing'];
const WEIGHT_PT = {light:'Leve', medium:'Média', heavy:'Pesada'};
const Q_PT = {'Precise':'Precisa','Deep Impact':'Impacto profundo','Jointed':'Articulada','Long':'Longa','Blunt':'Rombuda','Short':'Curta','Balanced':'Balanceada','Flexible':'Flexível','Cumbersome':'Desajeitada'};
const QUAL_DESC = {
  'Precise':'+1 nos testes de ataque.', 'Deep Impact':'+1 de dano.', 'Jointed':'Mesmo com aparo bem-sucedido, acerta em resultado ímpar (1D6 de dano).',
  'Long':'Um Ataque Livre por turno contra quem entra no alcance (se ele não tiver arma longa).', 'Blunt':'Um dado de efeito abaixo.',
  'Short':'Sacada como Ação Livre; pode ser usada com Finta.', 'Balanced':'+1 na Defesa.', 'Flexible':'Reduz a penalidade de Impedimento.', 'Cumbersome':'Impedimento 1 ponto pior.'};

// custos em ortegs (1 thaler = 10 xelins = 100 ortegs)
const T = 100, SH = 10;
const WEAPONS = [
  ['Heavy Weapon','heavy','1D10',[],10*T],['Bastard Sword','heavy','1D10',['Precise'],50*T],['Double-axe','heavy','1D10',['Deep Impact'],50*T],['Heavy Flail','heavy','1D10',['Jointed'],50*T],
  ['Long Weapon','long','1D8',['Long'],3*T],['Halberd','long','1D8',['Long','Deep Impact'],15*T],['Pike','long','1D8',['Long','Precise'],15*T],['Quarterstaff','long','1D6',['Long','Blunt'],1*SH],
  ['Crossbow','crossbow','1D10',[],8*T],['Arbalest','crossbow','1D10',['Deep Impact'],40*T],['Bow','bow','1D8',[],5*T],['Longbow','bow','1D8',['Precise'],25*T],['Sling','sling','1D6',[],0],
  ['Single-Handed Weapon','single','1D8',[],5*T],["Crow's Beak",'single','1D8',['Deep Impact'],25*T],['Fencing Sword','single','1D8',['Precise'],25*T],['Flail','single','1D8',['Jointed'],25*T],
  ['Shield','shield','1D4',[],3*T],['Buckler','shield','1D4',['Flexible'],15*T],['Steel Shield','shield','1D4',['Balanced'],15*T],
  ['Short Weapon','short','1D6',['Short'],1*T],['Parrying Dagger','short','1D6',['Short','Balanced'],5*T],['Stiletto','short','1D6',['Short','Deep Impact'],5*T],
  ['Throwing Weapon','throwing','1D6',[],2*T],['Spear Sling','throwing','1D6',['Deep Impact'],10*T],
  ['Unarmed Attack','unarmed','1D4',['Short'],0],['Battle Claw','unarmed','1D4',['Short','Deep Impact'],1*T]];
const ARMORS = [
  ['Light Armor','light',[],2*T],['Blessed Robe','light',['Flexible'],10*T],['Order Cloak','light',['Flexible'],10*T],['Witch Gown','light',['Flexible'],10*T],['Wolf Skin','light',['Cumbersome'],1*T],['Woven Silk','light',['Flexible'],10*T],
  ['Medium Armor','medium',[],5*T],['Crow Armor','medium',['Cumbersome'],2*T],['Lacquered Silk Cuirass','medium',['Flexible'],25*T],
  ['Heavy Armor','heavy',[],10*T],['Full Plate','heavy',['Flexible'],50*T]];
const ITEMS = [
  // [nome, grupo, custo, descrição, efeito de uso]
  ['Antidote (Weak)','Elixires',1*T,'Reduz um veneno em um grau. Teste de Astuto.'],
  ['Antidote (Moderate)','Elixires',2*T,'Reduz um veneno em dois graus. Teste de Astuto.'],
  ['Antidote (Strong)','Elixires',3*T,'Reduz um veneno em três graus. Teste de Astuto.'],
  ['Choking Spores','Elixires',2*T,'Usado com a habilidade Strangler.'],
  ['Concentrated Magic','Elixires',1*T,'Segunda chance no próximo teste de Resoluto para usar um poder.'],
  ['Eye Drops','Elixires',2*T,'Devolve a visão a uma criatura temporariamente cega.'],
  ['Elemental Essence','Elixires',2*T,'Arma ou munição causa +1D4 de dano elemental por uma cena.'],
  ['Elixir of Life','Elixires',6*T,'Cura 1D6 de Resistência por 1D6 turnos; 1 corrupção temporária por turno.','life'],
  ['Ghost Candle','Elixires',2*T,'Torna visíveis coisas invisíveis no local.'],
  ['Herbal Cure','Elixires',1*T,'Cura 1 de Resistência (mais com Medicus).','herbal'],
  ['Poison (Weak)','Elixires',2*T,'1D4 de dano por turno durante 1D4 turnos.'],
  ['Poison (Moderate)','Elixires',4*T,'1D6 de dano por turno durante 1D6 turnos.'],
  ['Poison (Strong)','Elixires',6*T,'1D8 de dano por turno durante 1D8 turnos.'],
  ['Protective Oil','Elixires',2*T,'+1D4 de Armadura contra um elemento por uma cena.'],
  ['Spore Bomb','Elixires',3*T,'Usada com a habilidade Strangler.'],
  ['Waybread','Elixires',1*T,'Comida para uma semana.'],
  ['Wraith Dust','Elixires',2*T,'Força um espírito a assumir forma física por uma cena.'],
  ['10 arrows or bolts','Munição',1*T,''],
  ['Bandages','Equipamento',5,''],['Bear trap','Equipamento',5*SH,''],['Blanket','Equipamento',2,''],['Brass bell','Equipamento',6*SH,''],['Climbing equipment','Equipamento',1*T,''],
  ['Crayons','Equipamento',1,''],['Drinking horn','Equipamento',2,''],['Drum','Equipamento',3*SH,''],['Field equipment','Equipamento',5*SH,'Saco de dormir, panela, lenha, pederneira, corda, cantil. Grátis para personagens novos.'],
  ['Fishing line and hook','Equipamento',3,''],['Fishing net','Equipamento',1*SH,''],['Flute','Equipamento',3*SH,''],['Grappling hook','Equipamento',1*T,''],['Horn','Equipamento',4,''],
  ['Hour glass','Equipamento',4*T,''],['Ink and feather','Equipamento',1*SH,''],['Ladder','Equipamento',7,''],['Lamp oil','Equipamento',1,''],['Lantern','Equipamento',4,''],['Lockpicks','Equipamento',1*T,''],
  ['Needle and thread','Equipamento',1,''],['Paper','Equipamento',3,''],['Parchment','Equipamento',2,''],['Pocket mirror','Equipamento',7*T,''],['Rope','Equipamento',1*SH,''],['Rope ladder','Equipamento',3*SH,''],
  ['Snares','Equipamento',3*SH,''],['Snow shoes','Equipamento',5*SH,''],['Soap','Equipamento',5,''],['Spy glass','Equipamento',10*T,''],['Tankard','Equipamento',1,''],['Tent','Equipamento',3*SH,''],
  ['Torch','Equipamento',1,''],['Wax candle','Equipamento',4,''],['Weapon maintenance kit','Equipamento',5*SH,''],['Whetstone','Equipamento',4,''],['Whistle','Equipamento',2*SH,''],
  ['Backpack','Recipientes',1*T,''],['Barrel','Recipientes',4,''],['Basket','Recipientes',2,''],['Belt pouch','Recipientes',5,''],['Chest, small','Recipientes',3*SH,''],['Chest, large','Recipientes',1*T,''],
  ['Clay pitcher','Recipientes',5,''],['Coin purse','Recipientes',3,''],['Glass vial','Recipientes',1*SH,''],['Knapsack','Recipientes',1*SH,''],['Quiver','Recipientes',1*SH,''],['Sack','Recipientes',2,''],
  ['Torn rags','Roupas',5,''],['Simple garb','Roupas',1*SH,''],["Artisan's garb",'Roupas',5*SH,''],["Burgher's garb",'Roupas',1*T,''],["Noble's garb",'Roupas',10*T,''],['Boots','Roupas',1*SH,''],
  ['Cloak','Roupas',2,''],['Coat','Roupas',5,''],['Hat','Roupas',2,''],['Mask','Roupas',5,''],['Robe','Roupas',1*SH,''],
  ['Artisan tool','Ferramentas',1*T,''],['Chain','Ferramentas',1*T,''],['Hammer','Ferramentas',1*T,''],['Mining pick','Ferramentas',5*SH,''],['Shovel','Ferramentas',3*SH,''],['Sledgehammer','Ferramentas',1*T,''],
  ['Mule','Transporte',3*T,''],['Riding horse, light','Transporte',5*T,''],['Riding horse, heavy','Transporte',7*T,''],['Cart','Transporte',1*T,''],['Wagon','Transporte',5*T,''],['Canoe','Transporte',2*T,''],['Dog','Transporte',1*SH,'']];
const RACES = {
  'Ambriano': ['Privileged'], 'Bárbaro': ['Bushcraft'], 'Changeling': ['Long-Lived','Shapeshifter'],
  'Goblin': ['Pariah','Short-Lived','Survival Instinct'], 'Ogro': ['Long-Lived','Pariah','Robust']};

/* ============ Utilidades ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));
const n = v => { const x = parseInt(v, 10); return Number.isFinite(x) ? x : 0; };
const initials = s => (String(s || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase();
const signed = v => v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '±0';
function fmtMoney(o) {
  o = Math.max(0, Math.round(o)); const t = Math.floor(o / 100), s = Math.floor((o % 100) / 10), r = o % 10;
  const p = []; if (t) p.push(t + ' thaler'); if (s) p.push(s + (s === 1 ? ' xelim' : ' xelins')); if (r || !p.length) p.push(r + (r === 1 ? ' orteg' : ' ortegs'));
  return p.join(', ');
}
const moneyTotal = m => n(m?.t) * 100 + n(m?.s) * 10 + n(m?.o);
function rollDie(s) { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % s); }
function rollFormula(f) {
  const terms = String(f).toUpperCase().replace(/\s+/g, '').replace(/−/g, '-').match(/[+-]?[^+-]+/g) || [];
  let total = 0; const parts = [];
  for (let t of terms) {
    const sign = t[0] === '-' ? -1 : 1; t = t.replace(/^[+-]/, '');
    const m = t.match(/^(\d*)D(\d+)$/);
    if (m) { const k = Math.min(n(m[1]) || 1, 50), s = n(m[2]); if (!s) continue; const rs = []; for (let i = 0; i < k; i++) rs.push(rollDie(s)); const sum = rs.reduce((a, b) => a + b, 0) * sign; total += sum; parts.push((sign < 0 ? '−' : '') + k + 'D' + s + '[' + rs.join(',') + ']'); }
    else if (/^\d+$/.test(t)) { total += sign * n(t); parts.push((sign < 0 ? '−' : '+') + t); }
  }
  return { total, detail: parts.join(' ') };
}

/* ============ Estado ============ */
const S = { chars: {}, curId: null, tab: 'hab', rolls: [], group: { name: '', goal: '' }, mod: 0, modal: null, open: new Set(),
  db: null, mode: 'connecting', logOpen: false, lastRoll: null, toast: null, hasPendingSnap: false };
try { S.curId = localStorage.getItem('symb.cur'); S.tab = localStorage.getItem('symb.tab') || 'hab'; } catch (e) {}
const cur = () => S.chars[S.curId] || null;

function newChar(o = {}) {
  const c = { id: uid(), name: o.name || 'Novo personagem', player: o.player || '', race: o.race || '', occupation: o.occupation || '',
    shadow: '', quote: '', attrs: Object.fromEntries(ATTRS.map(a => [a[0], 10])), xpTotal: 50,
    toughCur: null, corrTemp: 0, corrExtra: 0, abilities: [], weapons: [], armors: [], items: [], money: { t: 5, s: 0, o: 0 },
    artifacts: [], bio: { age: '', height: '', weight: '', appearance: '', background: '', goal: '' }, companions: [], notes: '',
    createdAt: Date.now(), updatedAt: Date.now() };
  (RACES[o.race] || []).forEach(t => addAbility(c, t, 1, true));
  c.weapons.push({ uid: uid(), name: 'Unarmed Attack', kind: 'unarmed', die: '1D4', q: ['Short'], equipped: true, note: '' });
  c.items.push({ uid: uid(), name: 'Field equipment', qty: 1, note: 'Grátis para personagens novos' });
  if (o.race === 'Ambriano') c.money = { t: 50, s: 0, o: 0 };
  if (o.race === 'Goblin' || o.race === 'Ogro') c.money = { t: 0, s: 5, o: 0 };
  return c;
}
function addAbility(c, name, level, free) {
  const e = CMAP[name];
  if (c.abilities.some(a => a.name === name && !a.custom)) return false;
  c.abilities.push({ uid: uid(), name, cat: e?.category || 'General', tag: e?.tag || '', level: e?.tiered ? (level || 1) : 1, free: !!free,
    attr: name === 'Exceptional Attribute' ? 'accurate' : undefined });
  return true;
}

/* ============ Regras / cálculos ============ */
function lvl(c, name) { let m = 0; for (const a of c.abilities) if (a.name === name) m = Math.max(m, n(a.level)); return m; }
function effAttrs(c) {
  const A = {}; for (const [k] of ATTRS) A[k] = n(c.attrs?.[k]);
  for (const a of c.abilities) if (a.name === 'Exceptional Attribute' && a.attr && A[a.attr] != null) A[a.attr] += n(a.level);
  return A;
}
function bestOf(A, keys) { let b = keys[0]; for (const k of keys) if (A[k] > A[b]) b = k; return b; }
function stepDie(d) { return { 4: 6, 6: 8, 8: 10, 10: 12, 12: 12 }[d] || d; }
function armorInfo(c) {
  const arm = c.armors.find(a => a.equipped);
  const L = x => lvl(c, x);
  let imp = 0, formula = [], name = arm?.name || null;
  if (arm) {
    imp = { light: 2, medium: 3, heavy: 4 }[arm.weight] || 0;
    if (arm.q?.includes('Flexible')) imp = Math.max(0, imp - 2);
    if (arm.q?.includes('Cumbersome')) imp += 1;
    let d = { light: 4, medium: 6, heavy: 8 }[arm.weight] || 4;
    if (L('Man-at-arms') >= 1) d = stepDie(d);
    formula.push('1D' + d);
  }
  const rob = L('Robust'); if (rob) formula.push('1D' + [0, 4, 6, 8][rob]);
  if (L('Survival Instinct') >= 2) formula.push('1D4');
  return { arm, name, imp, defImp: L('Man-at-arms') >= 2 ? 0 : imp, formula: formula.join('+') };
}
function derive(c) {
  const A = effAttrs(c), L = x => lvl(c, x);
  const tMax = Math.max(A.strong, 10), pain = Math.ceil(A.strong / 2);
  const cth = Math.ceil(A.resolute / 2), cmax = A.resolute;
  // Defesa
  const dk = ['quick']; if (L('Feint') >= 2) dk.push('discreet'); if (L('Sixth Sense') >= 2) dk.push('vigilant'); if (L('Tactician') >= 2) dk.push('cunning');
  const defAttr = bestOf(A, dk); const ai = armorInfo(c); const parts = [ATTR_PT[defAttr] + ' ' + A[defAttr]];
  let def = A[defAttr];
  const rob = L('Robust'); if (rob) { def -= rob + 1; parts.push('Robust −' + (rob + 1)); }
  if (ai.defImp) { def -= ai.defImp; parts.push('Armadura −' + ai.defImp); }
  const shield = c.weapons.find(w => w.equipped && w.kind === 'shield');
  if (shield) { const b = L('Shield Fighter') >= 1 && !shield.q?.includes('Flexible') ? 2 : 1; def += b; parts.push('Escudo +' + b); }
  const bal = c.weapons.filter(w => w.equipped && w.q?.includes('Balanced')).length; if (bal) { def += bal; parts.push('Balanceada +' + bal); }
  const ik = ['quick']; if (L('Tactician') >= 1) ik.push('cunning'); if (L('Sixth Sense') >= 2) ik.push('vigilant');
  const initAttr = bestOf(A, ik);
  // Corrupção permanente
  let perm = n(c.corrExtra); const permParts = [];
  const tradLvl = t => L(t);
  for (const a of c.abilities) {
    if (a.cat === 'Mystical') {
      const tags = (a.tag || '').split('/');
      for (let t = 1; t <= n(a.level); t++) {
        const covered = tags.some(tg => ['Wizardry','Theurgy','Witchcraft'].includes(tg) && tradLvl(tg) >= t);
        if (!covered) { perm++; }
      }
    } else if (a.cat === 'Ritual') {
      const tags = (a.tag || '').split('/');
      if (!tags.some(tg => TRADITIONS.includes(tg) && tradLvl(tg) >= 1)) perm++;
    }
  }
  const learned = perm - n(c.corrExtra);
  const artCorr = c.artifacts.reduce((s, a) => s + n(a.corr), 0); perm += artCorr;
  const temp = n(c.corrTemp);
  // XP
  let spent = 0; for (const a of c.abilities) if (!a.free && a.cat !== 'Ritual') spent += XP_COST[n(a.level)] || 0;
  const ritCap = [0, 1, 3, 6][L('Ritualist')], ritCount = c.abilities.filter(a => a.cat === 'Ritual').length;
  const tough = c.toughCur == null ? tMax : n(c.toughCur);
  const attrSum = ATTRS.reduce((s, [k]) => s + n(c.attrs?.[k]), 0);
  const resAttr = L('Leader') >= 1 ? bestOf(A, ['resolute', 'persuasive']) : 'resolute';
  return { A, tMax, tough, pain, cth, cmax, def, defAttr, defParts: parts, ai, initAttr, init: A[initAttr], perm, learned, artCorr, temp, total: perm + temp,
    spent, unspent: n(c.xpTotal) - spent, ritCap, ritCount, attrSum, mystImp: ai.imp, resAttr };
}
function weaponInfo(c, w, D) {
  const A = D.A, L = x => lvl(c, x); const melee = !RANGED.includes(w.kind);
  const keys = ['accurate'];
  if (melee) { if (L('Iron Fist') >= 1) keys.push('strong'); if (L('Dominate') >= 1) keys.push('persuasive');
    if (L('Feint') >= 1 && (w.kind === 'short' || w.q?.includes('Precise'))) keys.push('discreet'); }
  else if (L('Sixth Sense') >= 1 && w.kind !== 'throwing') keys.push('vigilant');
  if (L('Tactician') >= 3 && w.kind !== 'heavy') keys.push('cunning');
  if (L('Backstab') >= 1) {} // só com Vantagem; não entra no cálculo fixo
  const atk = bestOf(A, keys); const bonus = w.q?.includes('Precise') ? 1 : 0;
  let d = n(String(w.die || '1D6').toUpperCase().split('D')[1]) || 6;
  if (w.kind === 'heavy' && L('Two-handed Force') >= 1) d = 12;
  if (w.kind === 'long' && L('Polearm Mastery') >= 1) d = stepDie(d);
  if (w.kind === 'bow' && L('Marksman') >= 1) d = Math.max(d, 10);
  if (w.kind === 'crossbow' && L('Marksman') >= 1) d = Math.max(d, 12);
  if (w.kind === 'throwing' && L('Steel Throw') >= 1) d = Math.max(d, 8);
  if (w.kind === 'unarmed' && L('Natural Warrior') >= 1) d = Math.max(d, 6);
  const shieldOn = c.weapons.some(x => x.equipped && x.kind === 'shield' && x.uid !== w.uid);
  if (L('Shield Fighter') >= 1 && shieldOn) { if (w.kind === 'single') d = Math.max(d, 10); if (w.kind === 'short') d = Math.max(d, 8); }
  const f = ['1D' + d]; const notes = [];
  if (w.q?.includes('Deep Impact')) f.push('1');
  if (melee && L('Iron Fist') >= 2) { f.push('1D4'); if (L('Iron Fist') >= 3) notes.push('Iron Fist mestre: 1 ataque/turno com +1D8 no lugar de +1D4'); }
  const rob = L('Robust'); if (melee && rob) { f.push('1D' + [0, 4, 6, 8][rob]); notes.push('Robust: extra em 1 ataque corpo a corpo por turno'); }
  if (w.kind === 'unarmed' && L('Natural Warrior') >= 3) f.push('1D6');
  if (L('Backstab') >= 1) notes.push('Backstab: +1D4 com Vantagem');
  if (L('Berserker') >= 1 && melee) notes.push('Berserker: +1D6 em frenesi');
  return { atk, atkVal: A[atk] + bonus, bonus, dmg: f.join('+'), notes, melee };
}

/* ============ Persistência ============ */
const LS_KEY = 'symb.chars.v1';
const ver = {}, inflight = {}, timers = {}, dirty = new Set();
function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(S.chars)); } catch (e) {} }
function touch(c, rerender = true) {
  c.updatedAt = Date.now(); S.chars[c.id] = c; dirty.add(c.id); ver[c.id] = (ver[c.id] || 0) + 1;
  clearTimeout(timers[c.id]); timers[c.id] = setTimeout(() => flush(c.id), 450);
  if (rerender) render();
}
async function flush(id) {
  if (inflight[id]) { timers[id] = setTimeout(() => flush(id), 250); return; }
  const c = S.chars[id]; const v = ver[id];
  if (!c) { dirty.delete(id); return; }
  inflight[id] = true;
  try {
    if (S.db) await S.db.doc('characters/' + id).set(clone(c)); else saveLocal();
  } catch (e) {
    if (e?.code === 'invalid_argument') { toast('Você não tem permissão para salvar fichas. Peça acesso de Editor ao dono da página.'); }
    else if (e?.code === 'quota_exceeded') { toast('O armazenamento está cheio. Exclua fichas antigas.'); }
    else { toast('Não foi possível salvar agora. Tentando de novo…'); setTimeout(() => flush(id), 1500 + Math.random() * 1000); }
  }
  inflight[id] = false;
  if (ver[id] === v) dirty.delete(id);
}
async function removeChar(id) {
  delete S.chars[id]; dirty.delete(id); clearTimeout(timers[id]);
  if (S.curId === id) S.curId = Object.keys(S.chars)[0] || null;
  try { if (S.db) await S.db.doc('characters/' + id).delete(); else saveLocal(); } catch (e) { toast('Não foi possível excluir.'); }
  render();
}
let groupTimer = null;
function saveGroup() {
  clearTimeout(groupTimer);
  groupTimer = setTimeout(async () => { try { if (S.db) await S.db.doc('group/main').set(clone(S.group)); else localStorage.setItem('symb.group', JSON.stringify(S.group)); } catch (e) {} }, 500);
}
async function pushRoll(r) {
  r.ts = Date.now(); r.id = uid();
  S.lastRoll = r; clearTimeout(pushRoll.t); pushRoll.t = setTimeout(() => { S.lastRoll = null; render(); }, 4500);
  if (S.db) {
    S.rolls = [r, ...S.rolls.filter(x => x.id !== r.id)].slice(0, 40); render();
    try { await S.db.collection('rolls').doc(r.id).set(r); } catch (e) {}
  } else { S.rolls = [r, ...S.rolls].slice(0, 40); try { localStorage.setItem('symb.rolls', JSON.stringify(S.rolls)); } catch (e) {} render(); }
}
async function pruneRolls() {
  try { const cut = Date.now() - 1000 * 60 * 60 * 24 * 3; const q = await S.db.collection('rolls').where('ts', '<', cut).limit(100).get();
    for (const d of q.docs) { await S.db.doc('rolls/' + d.id).delete(); } } catch (e) {}
}

async function boot() {
  render();
  let db = null;
  try { db = window.claude?.use ? await window.claude.use('db') : null; } catch (e) { db = null; }
  if (!db) {
    S.mode = 'local';
    try { S.chars = JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; S.rolls = JSON.parse(localStorage.getItem('symb.rolls') || '[]'); S.group = JSON.parse(localStorage.getItem('symb.group') || 'null') || S.group; } catch (e) {}
    if (!S.chars[S.curId]) S.curId = Object.keys(S.chars)[0] || null;
    render(); return;
  }
  S.db = db; S.mode = 'online';
  let first = true;
  db.collection('characters').onSnapshot(snap => {
    const next = {};
    for (const d of snap.docs) { if (dirty.has(d.id) && S.chars[d.id]) next[d.id] = S.chars[d.id]; else next[d.id] = clone(d.data()); next[d.id].id = d.id; }
    for (const id of dirty) if (S.chars[id] && !next[id]) next[id] = S.chars[id];
    S.chars = next;
    if (first) { first = false; if (!S.chars[S.curId]) S.curId = sortedChars()[0]?.id || null; }
    render();
  }, e => { toast('A conexão com as fichas caiu. Recarregue a página.'); });
  db.collection('rolls').orderBy('ts', 'desc').limit(40).onSnapshot(snap => { S.rolls = snap.docs.map(d => d.data()); render(); }, () => {});
  db.doc('group/main').onSnapshot(s => { if (s.exists && !String(document.activeElement?.id || '').startsWith('f-grp')) { S.group = { name: '', goal: '', ...s.data() }; render(); } }, () => {});
  setTimeout(pruneRolls, 5000);
}
const sortedChars = () => Object.values(S.chars).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

/* ============ Rolagens ============ */
function testRoll(c, label, target, detailExtra = '') {
  const mod = S.mod; const tgt = target + mod; const r = rollDie(20);
  const ok = r === 1 ? true : r === 20 ? false : r <= tgt;
  pushRoll({ who: c?.name || '—', player: c?.player || '', label, kind: ok ? 'ok' : 'fail', res: r,
    det: `d20 = ${r} contra ${tgt}${mod ? ` (${target} ${signed(mod)})` : ''} · ${ok ? 'sucesso' : 'falha'}${r === 1 ? ' (1 natural)' : r === 20 ? ' (20 natural)' : ''}${detailExtra ? ' · ' + detailExtra : ''}` });
  return ok;
}
function dmgRoll(c, label, formula, kind = 'dmg') {
  const r = rollFormula(formula);
  pushRoll({ who: c?.name || '—', player: c?.player || '', label, kind, res: r.total, det: `${formula} → ${r.detail}` });
  return r.total;
}
function toast(msg) { S.toast = msg; clearTimeout(toast.t); toast.t = setTimeout(() => { S.toast = null; render(); }, 3800); render(); }

/* ============ Render ============ */
function render() {
  const f = document.activeElement; const fid = f?.id; let ss = null, se = null;
  try { if (fid && 'selectionStart' in f) { ss = f.selectionStart; se = f.selectionEnd; } } catch (e) {}
  const scrollers = {}; document.querySelectorAll('[data-keep-scroll]').forEach(el => scrollers[el.dataset.keepScroll] = el.scrollTop);
  $('#app').innerHTML = view();
  document.querySelectorAll('[data-keep-scroll]').forEach(el => { if (scrollers[el.dataset.keepScroll] != null) el.scrollTop = scrollers[el.dataset.keepScroll]; });
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); try { if (ss != null) el.setSelectionRange(ss, se); } catch (e) {} } }
}
const LOGO = `<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 4 L16 28 M9 10 L16 16 L23 10 M9 22 L16 16 L23 22" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
function view() {
  const c = cur();
  const chars = sortedChars();
  let h = `<header class="top"><div class="top-in">
    <div class="brand">${LOGO}<span>Fichas de Symbaroum</span></div>
    <nav class="roster" aria-label="Personagens">${chars.map(x => `<button class="chip-char" data-act="pick" data-id="${x.id}" aria-current="${x.id === S.curId}"><span class="medal">${esc(initials(x.name))}</span>${esc(x.name)}${x.player ? `<span class="faint">· ${esc(x.player)}</span>` : ''}</button>`).join('')}</nav>
    <button class="btn" data-act="modal" data-m="compendium" title="Importar compêndio">📖 Compêndio</button>
    <button class="btn gold" data-act="modal" data-m="new">+ Nova ficha</button>
  </div></header>`;
  if (S.mode === 'local') h += `<div class="banner">Modo local: as fichas ficam salvas só neste navegador.</div>`;
  if (S.mode === 'connecting' && !chars.length) h += `<div class="welcome"><p>Abrindo as fichas do grupo…</p></div>`;
  else if (!c) h += welcome();
  else {
    h += `<div class="shell"><main>${sheet(c)}</main><aside class="logcol">${logPanel()}</aside></div>`;
  }
  h += `<button class="btn gold fab" data-act="log">🎲 Mesa ${S.rolls.length ? `<span class="pill" style="border-color:var(--brass-ink);color:var(--brass-ink)">${S.rolls.length}</span>` : ''}</button>`;
  if (S.logOpen) h += `<div class="scrim" data-act="log-close" style="place-items:end stretch;padding:0"></div><div class="drawer">${logPanel(true)}</div>`;
  if (S.lastRoll && !S.logOpen) { const r = S.lastRoll; h += `<div class="last-roll ${r.kind}" role="status"><div><div class="faint" style="font-size:12px">${esc(r.who)}</div><div style="font-weight:500">${esc(r.label)}</div></div><div class="res">${esc(r.res)}</div></div>`; }
  if (S.modal) h += modal();
  if (S.toast) h += `<div class="toast" role="status">${esc(S.toast)}</div>`;
  return h;
}
function welcome() {
  return `<div class="welcome"><h1>As fichas do grupo ficam aqui</h1>
  <p>Crie a ficha do seu personagem. Resistência, Defesa, Armadura, Corrupção e Experiência são calculadas sozinhas a partir dos atributos, habilidades e equipamento. Todos do grupo veem as fichas e as rolagens da mesa.</p>
  <button class="btn gold" data-act="modal" data-m="new">+ Criar personagem</button></div>`;
}
function sheet(c) {
  const D = derive(c);
  const tPct = Math.max(0, Math.min(100, D.tough / D.tMax * 100));
  const cPct = Math.max(0, Math.min(100, D.total / Math.max(1, D.cmax) * 100));
  const thPct = Math.min(100, D.cth / Math.max(1, D.cmax) * 100);
  const cState = D.total >= D.cmax ? `<span class="pill bad">Abominação</span>` : D.total >= D.cth ? `<span class="pill rot">Marcado</span>` : '';
  const tState = D.tough <= 0 ? 'down' : D.tough <= D.pain ? 'hurt' : '';
  let h = `<section class="hero">
    <div class="medal">${esc(initials(c.name))}</div>
    <div class="hero-main">
      <input class="name-in" id="f-name" data-bind="name" value="${esc(c.name)}" aria-label="Nome do personagem">
      <div class="sub-row">
        <label>Raça<input id="f-race" data-bind="race" value="${esc(c.race)}" list="races" placeholder="Raça"></label>
        <label>Ocupação<input id="f-occ" data-bind="occupation" value="${esc(c.occupation)}" placeholder="Ocupação"></label>
        <label>Jogador<input id="f-player" data-bind="player" value="${esc(c.player)}" placeholder="Jogador"></label>
      </div>
      <datalist id="races">${Object.keys(RACES).map(r => `<option value="${r}">`).join('')}</datalist>
    </div>
    <div class="hero-actions">
      <button class="btn" data-act="scene-end" title="Zera a corrupção temporária">Fim de cena</button>
      <button class="btn ghost" data-act="modal" data-m="more">⋯ Mais</button>
    </div>
  </section>
  <section class="stats">
    <div class="stat tough ${tState}">
      <div class="lbl"><span>Resistência</span>${D.tough <= 0 ? '<span class="pill bad">Morrendo</span>' : ''}</div>
      <div class="big">${D.tough}<small> / ${D.tMax}</small></div>
      <div class="bar"><i style="width:${tPct}%;${tState === 'down' ? 'background:var(--blood)' : tState === 'hurt' ? 'background:var(--warn)' : ''}"></i></div>
      <div class="row"><input class="mini-in" id="f-dmg" type="number" min="0" placeholder="0" aria-label="Valor de dano ou cura"><button class="btn sm danger" data-act="hurt">Dano</button><button class="btn sm" data-act="heal">Cura</button></div>
    </div>
    <div class="stat"><div class="lbl">Limiar de dor</div><div class="big">${D.pain}</div><div class="foot">Um golpe com dano ≥ ${D.pain} derruba ou dá Ataque Livre.</div></div>
    <div class="stat clickable" data-act="roll-def"><div class="lbl"><span>Defesa</span><span class="faint">rolar</span></div><div class="big">${D.def}</div><div class="foot">${esc(D.defParts.join(' · '))}</div></div>
    <div class="stat clickable" data-act="roll-armor"><div class="lbl"><span>Armadura</span><span class="faint">rolar</span></div><div class="big formula">${D.ai.formula ? esc(D.ai.formula) : '—'}</div><div class="foot">${D.ai.name ? esc(D.ai.name) : 'Nenhuma armadura equipada'}${D.ai.imp ? ` · Impedimento −${D.ai.imp}` : ''}</div></div>
    <div class="stat">
      <div class="lbl"><span>Corrupção</span>${cState}</div>
      <div class="big" style="color:${D.total >= D.cth ? 'var(--rot)' : 'var(--ink)'}">${D.total}<small> / ${D.cmax}</small></div>
      <div class="bar rot"><i style="width:${cPct}%"></i><span class="mark" style="left:calc(${thPct}% - 1px)" title="Limiar de corrupção"></span></div>
      <div class="row" style="font-size:12.5px;color:var(--muted)">Temp.<button class="iconbtn" style="width:24px;height:24px;font-size:14px" data-act="ctemp" data-d="-1" aria-label="Menos corrupção temporária">−</button><b class="num">${D.temp}</b><button class="iconbtn" style="width:24px;height:24px;font-size:14px" data-act="ctemp" data-d="1" aria-label="Mais corrupção temporária">+</button><span>Perm. <b class="num">${D.perm}</b></span></div>
      <div class="foot">Limiar ${D.cth} · Abominação em ${D.cmax}</div>
    </div>
    <div class="stat">
      <div class="lbl">Experiência</div>
      <div class="big" style="color:${D.unspent < 0 ? 'var(--blood)' : 'var(--ink)'}">${D.unspent}<small> livre</small></div>
      <div class="row" style="font-size:12.5px;color:var(--muted)">Total <input class="mini-in" id="f-xp" type="number" data-bind="xpTotal" data-type="num" value="${n(c.xpTotal)}" aria-label="Experiência total"> · gasto ${D.spent}</div>
      <div class="foot">Novato 10 · Adepto +20 · Mestre +30</div>
    </div>
  </section>
  <div class="body">
    <section class="attrs" aria-label="Atributos">
      ${ATTRS.map(([k, pt, en]) => {
        const base = n(c.attrs?.[k]), eff = D.A[k];
        return `<div class="attr"><button class="an" data-act="roll-attr" data-k="${k}">${pt}<small>${en}</small></button>
        <button class="av" data-act="roll-attr" data-k="${k}" title="Rolar ${pt}">${eff}</button>
        <div class="base"><span>base</span><input type="number" min="5" max="15" id="f-at-${k}" data-bind="attrs.${k}" data-type="num" value="${base}" aria-label="${pt} base">${eff !== base ? `<span class="pill gold">${signed(eff - base)}</span>` : ''}</div></div>`;
      }).join('')}
      <div class="attrsum">Soma dos atributos: <b class="num" style="color:${D.attrSum === 80 ? 'var(--moss)' : 'var(--warn)'}">${D.attrSum}</b> / 80 · Iniciativa: ${ATTR_PT[D.initAttr]} ${D.init}</div>
    </section>
    <section>
      ${tabs(c, D)}
      <div class="panel">${panel(c, D)}</div>
    </section>
  </div>`;
  return h;
}
function tabs(c) {
  const T_ = [['hab', 'Habilidades & Poderes', c.abilities.length], ['com', 'Combate', c.weapons.length + c.armors.length], ['inv', 'Inventário', c.items.length],
    ['art', 'Artefatos', c.artifacts.length], ['his', 'História'], ['grp', 'Grupo'], ['not', 'Notas']];
  return `<div class="tabs" role="tablist">${T_.map(([k, l, cnt]) => `<button class="tab" role="tab" data-act="tab" data-t="${k}" aria-selected="${S.tab === k}">${l}${cnt ? `<span class="count">${cnt}</span>` : ''}</button>`).join('')}</div>`;
}
function panel(c, D) {
  switch (S.tab) {
    case 'com': return combatPanel(c, D);
    case 'inv': return invPanel(c, D);
    case 'art': return artPanel(c, D);
    case 'his': return hisPanel(c);
    case 'grp': return grpPanel(c);
    case 'not': return `<label class="field"><span>Anotações da campanha</span><textarea id="f-notes" data-bind="notes" rows="16" placeholder="Pistas, nomes, dívidas, segredos…">${esc(c.notes)}</textarea></label>`;
    default: return habPanel(c, D);
  }
}
function abCard(c, a, D) {
  const e = CMAP[a.name]; const open = S.open.has(a.uid);
  const hasTiers = !!e?.tiered;
  const cost = a.free ? 'grátis' : a.cat === 'Ritual' ? 'via Ritualist' : (XP_COST[n(a.level)] || 0) + ' XP';
  const tags = (a.tag || '').split('/');
  let act = '';
  if (a.cat === 'Mystical') act = `<button class="btn sm rot" data-act="cast" data-uid="${a.uid}">Conjurar</button>`;
  if (a.cat === 'Ritual') act = `<button class="btn sm rot" data-act="ritual" data-uid="${a.uid}">Realizar</button>`;
  let h = `<article class="ab ${open ? 'open' : ''}">
    <div class="ab-h"><button class="ab-name" data-act="ab-open" data-uid="${a.uid}" aria-expanded="${open}">${esc(a.name)}<div class="ab-tag">${esc(CAT_PT[a.cat] || a.cat)}${a.tag && a.tag !== a.cat && a.tag !== 'General' && a.tag !== 'Combat' && a.tag !== 'Trait' ? ' · ' + esc(a.tag) : ''}</div></button>
    ${hasTiers || a.custom ? `<div class="pips">${[1, 2, 3].map(l => `<button class="pip ${n(a.level) >= l ? 'on' : ''}" data-act="ab-level" data-uid="${a.uid}" data-l="${l}" title="${LVL[l]}" aria-label="${LVL[l]}">${'NAM'[l - 1]}</button>`).join('')}</div>` : ''}</div>
    <div class="ab-meta">${a.name === 'Exceptional Attribute' ? `<select id="f-ab-${a.uid}-attr" data-bind="abilities.#${a.uid}.attr" aria-label="Atributo">${ATTRS.map(([k, pt]) => `<option value="${k}" ${a.attr === k ? 'selected' : ''}>${pt} +${n(a.level)}</option>`).join('')}</select>` : ''}
      <span class="pill ${a.free ? '' : 'gold'}">${cost}</span>${act}<span class="sp"></span>
      ${open ? `<label class="chk"><input type="checkbox" id="f-ab-${a.uid}-free" data-bind="abilities.#${a.uid}.free" data-type="bool" ${a.free ? 'checked' : ''}>Grátis</label><button class="btn sm ghost danger" data-act="ab-del" data-uid="${a.uid}">Remover</button>` : ''}</div>`;
  if (open) {
    h += `<div class="ab-body">`;
    if (a.custom) h += `<textarea id="f-ab-${a.uid}-text" data-bind="abilities.#${a.uid}.text" rows="4" placeholder="Descrição">${esc(a.text)}</textarea>`;
    else if (e) {
      h += e.effect ? `<p class="muted">${esc(e.effect)}</p>` : `<p class="faint">Importe um compêndio (botão Compêndio no topo) para ver a descrição.</p>`;
      if (e.tiers) h += ['novice', 'adept', 'master'].map((t, i) => e.tiers[t] ? `<div class="tier ${n(a.level) >= i + 1 ? 'have' : ''}"><b>${LVL[i + 1]}</b><span>${esc(e.tiers[t])}</span></div>` : '').join('');
    }
    h += `<input class="note-in" id="f-ab-${a.uid}-note" data-bind="abilities.#${a.uid}.note" value="${esc(a.note)}" placeholder="Anotação pessoal…"></div>`;
  } else if (a.note) h += `<div class="faint" style="font-size:13px">${esc(a.note)}</div>`;
  return h + `</article>`;
}
function habPanel(c, D) {
  const groups = [
    ['Habilidades', a => a.cat === 'General' || a.cat === 'Combat', 'abil'],
    ['Poderes místicos', a => a.cat === 'Mystical', 'Mystical'],
    ['Rituais', a => a.cat === 'Ritual', 'Ritual'],
    ['Traços', a => a.cat === 'Trait', 'Trait']];
  const trads = TRADITIONS.filter(t => lvl(c, t)).map(t => `${t} ${LVL[lvl(c, t)]}`);
  return groups.map(([title, fn, cat]) => {
    const list = c.abilities.filter(fn);
    let meta = '';
    if (cat === 'Mystical') meta = `${trads.length ? `<span class="pill rot">${esc(trads.join(' · '))}</span>` : ''}<span class="pill rot">Corrupção por aprendizado: ${D.learned}</span>${D.mystImp ? `<span class="pill bad">Armadura −${D.mystImp} nos poderes</span>` : ''}`;
    if (cat === 'Ritual') meta = `<span class="pill ${D.ritCount > D.ritCap ? 'bad' : ''}">${D.ritCount} de ${D.ritCap} rituais (Ritualist)</span>`;
    return `<div class="sec-h"><h3>${title}</h3><div class="meta">${meta}<button class="btn sm" data-act="modal" data-m="ability" data-cat="${cat}">+ Adicionar</button></div></div>
    ${list.length ? `<div class="cards">${list.map(a => abCard(c, a, D)).join('')}</div>` : `<div class="empty">${cat === 'Ritual' ? 'Rituais exigem a habilidade Ritualist.' : 'Nada aqui ainda.'}</div>`}`;
  }).join('');
}
function combatPanel(c, D) {
  let h = `<div class="summary">
    <button class="stat clickable" data-act="roll-def" style="text-align:left"><div class="lbl"><span>Defesa</span><span class="faint">rolar</span></div><div class="big">${D.def}</div><div class="foot">${esc(D.defParts.join(' · '))}</div></button>
    <button class="stat clickable" data-act="roll-armor" style="text-align:left"><div class="lbl"><span>Armadura</span><span class="faint">rolar</span></div><div class="big formula">${esc(D.ai.formula || '—')}</div><div class="foot">${esc(D.ai.name || 'Sem armadura')}</div></button>
    <button class="stat clickable" data-act="roll-init" style="text-align:left"><div class="lbl"><span>Iniciativa</span><span class="faint">rolar</span></div><div class="big">${D.init}</div><div class="foot">${ATTR_PT[D.initAttr]}; empate: Vigilante ${D.A.vigilant}</div></button>
  </div>`;
  h += `<div class="sec-h"><h3>Armas</h3><div class="meta"><button class="btn sm" data-act="modal" data-m="weapon">+ Adicionar arma</button></div></div><div class="list">`;
  h += c.weapons.length ? c.weapons.map(w => {
    const W = weaponInfo(c, w, D);
    return `<div class="item ${w.equipped ? '' : 'off'}"><div style="min-width:0">
      <div class="item-name">${esc(w.name)}</div>
      <div class="item-sub"><span>${KIND_PT[w.kind] || w.kind}</span>${(w.q || []).map(q => `<span class="pill" title="${esc(QUAL_DESC[q] || '')}">${esc(Q_PT[q] || q)}</span>`).join('')}</div>
      ${W.notes.length ? `<div class="faint" style="font-size:12.5px;margin-top:2px">${esc(W.notes.join(' · '))}</div>` : ''}
      <input class="note-in" id="f-w-${w.uid}-note" data-bind="weapons.#${w.uid}.note" value="${esc(w.note)}" placeholder="Anotação…">
    </div><div class="item-act">
      <button class="rollbox" data-act="roll-atk" data-uid="${w.uid}"><small>ataque · ${ATTR_PT[W.atk]}</small><b>${W.atkVal}</b></button>
      <button class="rollbox" data-act="roll-dmg" data-uid="${w.uid}"><small>dano</small><b>${esc(W.dmg)}</b></button>
      <label class="chk"><input type="checkbox" id="f-w-${w.uid}-eq" data-bind="weapons.#${w.uid}.equipped" data-type="bool" ${w.equipped ? 'checked' : ''}>Em mãos</label>
      <button class="iconbtn danger" data-act="del" data-list="weapons" data-uid="${w.uid}" aria-label="Remover ${esc(w.name)}">×</button>
    </div></div>`;
  }).join('') : `<div class="empty">Nenhuma arma.</div>`;
  h += `</div><div class="sec-h"><h3>Armaduras</h3><div class="meta"><button class="btn sm" data-act="modal" data-m="armor">+ Adicionar armadura</button></div></div><div class="list">`;
  h += c.armors.length ? c.armors.map(a => {
    let d = { light: 4, medium: 6, heavy: 8 }[a.weight] || 4; if (lvl(c, 'Man-at-arms') >= 1) d = stepDie(d);
    let imp = { light: 2, medium: 3, heavy: 4 }[a.weight] || 0; if (a.q?.includes('Flexible')) imp = Math.max(0, imp - 2); if (a.q?.includes('Cumbersome')) imp++;
    return `<div class="item ${a.equipped ? '' : 'off'}"><div style="min-width:0"><div class="item-name">${esc(a.name)}</div>
      <div class="item-sub"><span>${WEIGHT_PT[a.weight]}</span><span>1D${d}</span><span>Impedimento −${imp}</span>${(a.q || []).map(q => `<span class="pill" title="${esc(QUAL_DESC[q] || '')}">${esc(Q_PT[q] || q)}</span>`).join('')}</div></div>
      <div class="item-act"><label class="chk"><input type="radio" name="armor-eq" id="f-a-${a.uid}-eq" data-act="armor-eq" data-uid="${a.uid}" ${a.equipped ? 'checked' : ''}>Vestindo</label>
      ${a.equipped ? `<button class="btn sm ghost" data-act="armor-off">Tirar</button>` : ''}
      <button class="iconbtn" data-act="del" data-list="armors" data-uid="${a.uid}" aria-label="Remover ${esc(a.name)}">×</button></div></div>`;
  }).join('') : `<div class="empty">Nenhuma armadura.</div>`;
  return h + `</div>`;
}
function invPanel(c) {
  const tot = moneyTotal(c.money);
  let h = `<div class="sec-h"><h3>Dinheiro</h3><div class="meta faint" style="font-size:13px">1 thaler = 10 xelins = 100 ortegs</div></div>
  <div class="money">
    <label>Thaler<input type="number" min="0" id="f-m-t" data-bind="money.t" data-type="num" value="${n(c.money?.t)}"></label>
    <label>Xelins<input type="number" min="0" id="f-m-s" data-bind="money.s" data-type="num" value="${n(c.money?.s)}"></label>
    <label>Ortegs<input type="number" min="0" id="f-m-o" data-bind="money.o" data-type="num" value="${n(c.money?.o)}"></label>
    <span class="muted" style="font-size:14px;padding-bottom:8px">Total: ${fmtMoney(tot)}</span>
  </div>
  <div class="sec-h"><h3>Equipamento</h3><div class="meta"><button class="btn sm" data-act="modal" data-m="item">+ Adicionar / comprar</button></div></div><div class="list">`;
  h += c.items.length ? c.items.map(it => {
    const cat = ITEMS.find(x => x[0] === it.name);
    return `<div class="item"><div style="min-width:0"><div class="item-name">${esc(it.name)}</div>${cat?.[3] ? `<div class="item-sub">${esc(cat[3])}</div>` : ''}
    <input class="note-in" id="f-i-${it.uid}-note" data-bind="items.#${it.uid}.note" value="${esc(it.note)}" placeholder="Anotação…"></div>
    <div class="item-act">${cat?.[4] ? `<button class="btn sm" data-act="use" data-uid="${it.uid}">Usar</button>` : ''}
      <span class="qty"><button class="iconbtn" data-act="qty" data-uid="${it.uid}" data-d="-1" aria-label="Menos">−</button><span>${n(it.qty)}</span><button class="iconbtn" data-act="qty" data-uid="${it.uid}" data-d="1" aria-label="Mais">+</button></span>
      <button class="iconbtn" data-act="del" data-list="items" data-uid="${it.uid}" aria-label="Remover ${esc(it.name)}">×</button></div></div>`;
  }).join('') : `<div class="empty">Mochila vazia.</div>`;
  return h + `</div>`;
}
function artPanel(c, D) {
  let h = `<div class="sec-h"><h3>Artefatos & tesouros místicos</h3><div class="meta"><span class="pill rot">Corrupção de artefatos: ${D.artCorr}</span><button class="btn sm" data-act="add-art">+ Adicionar artefato</button></div></div><div class="list">`;
  h += c.artifacts.length ? c.artifacts.map(a => `<div class="item"><div style="min-width:0;display:flex;flex-direction:column;gap:6px">
      <input id="f-ar-${a.uid}-name" data-bind="artifacts.#${a.uid}.name" value="${esc(a.name)}" placeholder="Nome" style="font-family:var(--display);font-size:18px">
      <textarea id="f-ar-${a.uid}-pow" data-bind="artifacts.#${a.uid}.powers" rows="2" placeholder="Poderes" style="min-height:56px">${esc(a.powers)}</textarea></div>
      <div class="item-act"><label class="field" style="align-items:center"><span>Corrupção</span><input type="number" min="0" class="mini-in" id="f-ar-${a.uid}-corr" data-bind="artifacts.#${a.uid}.corr" data-type="num" value="${n(a.corr)}"></label>
      <button class="iconbtn" data-act="del" data-list="artifacts" data-uid="${a.uid}" aria-label="Remover artefato">×</button></div></div>`).join('')
    : `<div class="empty">Nenhum artefato. A corrupção permanente de artefatos vinculados entra no total da ficha.</div>`;
  h += `</div><div class="sec-h"><h3>Outras fontes de corrupção permanente</h3></div>
    <label class="field" style="max-width:260px"><span>Corrupção permanente extra</span><input type="number" min="0" id="f-cextra" data-bind="corrExtra" data-type="num" value="${n(c.corrExtra)}"></label>
    <div class="hint">Poderes e rituais aprendidos já somam sozinhos (${D.learned}). Use este campo para corrupção vinda da história.</div>`;
  return h;
}
function hisPanel(c) {
  const b = c.bio || {};
  return `<div class="grid3">
    <label class="field"><span>Idade</span><input id="f-b-age" data-bind="bio.age" value="${esc(b.age)}"></label>
    <label class="field"><span>Altura</span><input id="f-b-h" data-bind="bio.height" value="${esc(b.height)}"></label>
    <label class="field"><span>Peso</span><input id="f-b-w" data-bind="bio.weight" value="${esc(b.weight)}"></label></div>
  <div class="grid2">
    <label class="field"><span>Sombra</span><input id="f-shadow" data-bind="shadow" value="${esc(c.shadow)}" placeholder="Ex.: verde-musgo com reflexos dourados"></label>
    <label class="field"><span>Citação</span><input id="f-quote" data-bind="quote" value="${esc(c.quote)}" placeholder="Uma frase que o define"></label></div>
  <label class="field"><span>Aparência</span><textarea id="f-b-app" data-bind="bio.appearance" rows="3">${esc(b.appearance)}</textarea></label>
  <label class="field"><span>Histórico</span><textarea id="f-b-bg" data-bind="bio.background" rows="6">${esc(b.background)}</textarea></label>
  <label class="field"><span>Objetivo pessoal</span><textarea id="f-b-goal" data-bind="bio.goal" rows="3">${esc(b.goal)}</textarea></label>`;
}
function grpPanel(c) {
  const chars = sortedChars();
  return `<div class="grid2">
    <label class="field"><span>Nome do grupo</span><input id="f-grp-name" data-group="name" value="${esc(S.group.name)}" placeholder="Ex.: Os Lanternas de Thistle Hold"></label>
    <label class="field"><span>Objetivo do grupo</span><input id="f-grp-goal" data-group="goal" value="${esc(S.group.goal)}"></label></div>
  <div class="sec-h"><h3>Personagens do grupo</h3><div class="meta faint" style="font-size:13px">Atualiza sozinho com as fichas salvas</div></div>
  <div class="party">${chars.map(x => { const d = derive(x); return `<button class="pc" data-act="pick" data-id="${x.id}"><span class="medal">${esc(initials(x.name))}</span><div style="min-width:0"><b>${esc(x.name)}</b><span>${esc([x.race, x.occupation].filter(Boolean).join(' · ') || '—')}${x.player ? ' · ' + esc(x.player) : ''}</span><br><span class="num">Resist. ${d.tough}/${d.tMax} · Def. ${d.def} · Corr. ${d.total}/${d.cmax}</span></div></button>`; }).join('')}</div>
  <div class="sec-h"><h3>Amigos & companheiros</h3><div class="meta"><button class="btn sm" data-act="add-comp">+ Adicionar</button></div></div>
  <div class="list">${(c.companions || []).map(p => `<div class="item"><div class="formgrid" style="min-width:0">
    <input id="f-cp-${p.uid}-n" data-bind="companions.#${p.uid}.name" value="${esc(p.name)}" placeholder="Nome">
    <input id="f-cp-${p.uid}-r" data-bind="companions.#${p.uid}.race" value="${esc(p.race)}" placeholder="Raça">
    <input id="f-cp-${p.uid}-o" data-bind="companions.#${p.uid}.occupation" value="${esc(p.occupation)}" placeholder="Ocupação">
    <input id="f-cp-${p.uid}-p" data-bind="companions.#${p.uid}.note" value="${esc(p.note)}" placeholder="Relação / anotação"></div>
    <div class="item-act"><button class="iconbtn" data-act="del" data-list="companions" data-uid="${p.uid}" aria-label="Remover">×</button></div></div>`).join('') || '<div class="empty">NPCs aliados, contatos e montarias.</div>'}</div>`;
}
function logPanel(drawer) {
  return `<div class="log" ${drawer ? '' : 'style="max-height:calc(100vh - 90px)"'}>
    <div class="log-h"><h2>Mesa ${drawer ? `<button class="iconbtn" data-act="log-close" aria-label="Fechar">×</button>` : ''}</h2>
      <div class="modrow">Modificador do teste <button class="iconbtn" data-act="mod" data-d="-1" aria-label="Diminuir modificador">−</button><b>${signed(S.mod)}</b><button class="iconbtn" data-act="mod" data-d="1" aria-label="Aumentar modificador">+</button>${S.mod ? `<button class="btn sm ghost" data-act="mod" data-d="0">zerar</button>` : ''}</div>
      <div class="dice">${[4, 6, 8, 10, 12, 20].map(d => `<button class="die" data-act="die" data-f="1D${d}">d${d}</button>`).join('')}</div>
      <form class="row" data-form="formula"><input id="f-formula${drawer ? '-d' : ''}" name="f" placeholder="1D8+1D4+1" style="flex:1"><button class="btn sm">Rolar</button></form>
    </div>
    <div class="log-list" data-keep-scroll="log${drawer ? 'd' : ''}">${S.rolls.length ? S.rolls.map(r => `<div class="entry ${esc(r.kind)}"><div class="who">${esc(r.who)}${r.player ? ' · ' + esc(r.player) : ''} · ${new Date(r.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div><div class="res">${esc(r.res)}</div><div class="what">${esc(r.label)}</div><div class="det">${esc(r.det)}</div></div>`).join('') : '<div class="empty" style="padding:8px">Clique num atributo, arma ou poder para rolar. Todos do grupo veem as rolagens aqui.</div>'}</div>
  </div>`;
}

/* ============ Modais ============ */
function modal() {
  const M = S.modal; const c = cur();
  if (M.type === 'new') return `<div class="scrim" data-act="close-bg"><form class="modal small" data-form="new" role="dialog" aria-label="Nova ficha">
    <div class="modal-h"><h2>Nova ficha <button type="button" class="iconbtn" data-act="close" aria-label="Fechar">×</button></h2></div>
    <div class="modal-b"><div class="formgrid">
      <label class="field full"><span>Nome</span><input id="n-name" name="name" required placeholder="Ex.: Aroaleta"></label>
      <label class="field"><span>Raça</span><select id="n-race" name="race"><option value="">Outra</option>${Object.keys(RACES).map(r => `<option>${r}</option>`).join('')}</select></label>
      <label class="field"><span>Ocupação</span><input id="n-occ" name="occupation" placeholder="Ex.: Caçador de tesouros"></label>
      <label class="field full"><span>Jogador</span><input id="n-player" name="player" placeholder="Seu nome"></label></div>
      <p class="hint">A raça escolhida adiciona os traços dela como grátis (${Object.entries(RACES).map(([r, t]) => r + ': ' + t.join(', ')).join(' · ')}). Você pode remover ou trocar depois. Começa com 50 de experiência e atributos em 10 (distribua 80 pontos).</p></div>
    <div class="modal-f"><button type="button" class="btn ghost" data-act="close">Cancelar</button><button class="btn gold">Criar ficha</button></div></form></div>`;
  if (M.type === 'more') return `<div class="scrim" data-act="close-bg"><div class="modal small" role="dialog" aria-label="Opções da ficha">
    <div class="modal-h"><h2>${esc(c.name)} <button class="iconbtn" data-act="close" aria-label="Fechar">×</button></h2></div>
    <div class="modal-b">
      <button class="btn" data-act="dup">Duplicar ficha</button>
      <button class="btn" data-act="export-json">Exportar ficha (.json)</button>
      <button class="btn" data-act="copy-json">Copiar ficha como JSON</button>
      <label class="field"><span>Importar ficha (arquivo JSON)</span><input type="file" id="imp-file" accept=".json,application/json"></label>
      <button class="btn" data-act="reset-tough">Restaurar Resistência ao máximo</button>
      ${M.confirm ? `<div class="row" style="gap:8px;padding:8px;border:1px solid var(--blood);border-radius:6px"><span style="flex:1">Excluir ${esc(c.name)} para todo o grupo?</span><button class="btn danger" data-act="del-char">Excluir</button><button class="btn ghost" data-act="del-cancel">Não</button></div>`
        : `<button class="btn danger" data-act="del-ask">Excluir ficha…</button>`}
    </div></div></div>`;
  if (M.type === 'ability') return abilityModal(c, M);
  if (M.type === 'compendium') return `<div class="scrim" data-act="close-bg"><div class="modal small" role="dialog" aria-label="Compêndio">
    <div class="modal-h"><h2>Compêndio <button class="iconbtn" data-act="close" aria-label="Fechar">×</button></h2></div>
    <div class="modal-b">
      <p class="muted" style="margin:0">O site vem só com os nomes de habilidades, poderes, rituais e traços. Para ver as descrições, importe o arquivo JSON do compêndio da sua mesa. Ele fica salvo só neste navegador.</p>
      <p style="margin:0">${IMPORTED ? `<span class="pill ok">${IMPORTED} entradas importadas</span>` : '<span class="pill">Nenhum compêndio importado</span>'}</p>
      <label class="field"><span>Importar compêndio (JSON)</span><input type="file" id="imp-comp" accept=".json,application/json"></label>
      <p class="hint" style="margin:0">Formatos aceitos: lista <code>[{name, category, tag, effect, tiers}]</code> ou o formato agrupado <code>{abilities, mystical_powers, rituals, traits}</code>.</p>
      ${IMPORTED ? `<button class="btn danger" data-act="clear-comp">Remover compêndio importado</button>` : ''}
    </div></div></div>`;
  if (M.type === 'weapon' || M.type === 'armor' || M.type === 'item') return shopModal(c, M);
  return '';
}
function abilityModal(c, M) {
  const q = (M.q || '').toLowerCase();
  const cats = [['all', 'Tudo'], ['abil', 'Habilidades'], ['Mystical', 'Poderes'], ['Ritual', 'Rituais'], ['Trait', 'Traços']];
  const catOk = x => M.cat === 'all' || (M.cat === 'abil' ? (x.category === 'General' || x.category === 'Combat') : x.category === M.cat);
  const tradOk = x => !M.trad || (x.tag || '').split('/').includes(M.trad);
  const list = COMP.filter(x => catOk(x) && tradOk(x) && (!q || x.name.toLowerCase().includes(q) || (x.effect || '').toLowerCase().includes(q)));
  const owned = new Set(c.abilities.map(a => a.name));
  return `<div class="scrim" data-act="close-bg"><div class="modal" role="dialog" aria-label="Adicionar do compêndio">
    <div class="modal-h"><h2>Compêndio <button class="iconbtn" data-act="close" aria-label="Fechar">×</button></h2>
      <input class="search" id="m-q" data-modal="q" value="${esc(M.q || '')}" placeholder="Buscar por nome ou efeito…" autocomplete="off">
      <div class="filters">${cats.map(([k, l]) => `<button class="fchip" data-act="mcat" data-c="${k}" aria-pressed="${M.cat === k}">${l}</button>`).join('')}
      ${(M.cat === 'Mystical' || M.cat === 'Ritual') ? `<span class="faint" style="padding:0 4px">·</span>${TRADITIONS.map(t => `<button class="fchip" data-act="mtrad" data-t="${t}" aria-pressed="${M.trad === t}">${t}</button>`).join('')}` : ''}</div></div>
    <div class="modal-b" data-keep-scroll="mlist">
      ${list.map(x => { const sel = M.sel === x.name; const have = owned.has(x.name);
        return `<div class="res-item ${sel ? 'sel' : ''}"><button data-act="msel" data-name="${esc(x.name)}" aria-expanded="${sel}"><span><span class="rn">${esc(x.name)}</span> <span class="faint" style="font-size:13px">${esc(CAT_PT[x.category])}${x.tag && !['General', 'Combat', 'Trait'].includes(x.tag) ? ' · ' + esc(x.tag) : ''}</span></span>${have ? '<span class="have">na ficha</span>' : ''}</button>
        ${sel ? `<div class="res-detail">${x.effect ? `<p class="muted">${esc(x.effect)}</p>` : `<p class="faint">Sem descrição. Importe um compêndio para ver o texto das regras.</p>`}
          ${x.tiers ? ['novice', 'adept', 'master'].map((t, i) => x.tiers[t] ? `<div class="tier have"><b>${LVL[i + 1]}</b><span>${esc(x.tiers[t])}</span></div>` : '').join('') : ''}
          <div class="row">${have ? '<span class="have">Já está na ficha. Mude o nível pelos botões N A M.</span>' : x.tiered ? [1, 2, 3].map(l => `<button class="btn ${l === 1 ? 'gold' : ''}" data-act="add-ab" data-name="${esc(x.name)}" data-l="${l}">+ ${LVL[l]} ${x.category === 'Ritual' ? '' : x.category === 'Trait' ? '' : '· ' + XP_COST[l] + ' XP'}</button>`).join('') : `<button class="btn gold" data-act="add-ab" data-name="${esc(x.name)}" data-l="1">+ Adicionar</button>`}</div></div>` : ''}</div>`; }).join('') || '<div class="empty">Nada encontrado.</div>'}
      <div class="sec-h" style="margin-top:10px"><h3 style="font-size:18px">Criar habilidade própria</h3></div>
      <form class="row" data-form="custom-ab"><input id="m-cname" name="name" placeholder="Nome" style="flex:1;min-width:160px"><select id="m-ccat" name="cat">${Object.entries(CAT_PT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="btn">Criar</button></form>
    </div></div></div>`;
}
function shopModal(c, M) {
  const q = (M.q || '').toLowerCase(); const money = moneyTotal(c.money);
  let rows = [], title = '';
  if (M.type === 'weapon') { title = 'Armas'; rows = WEAPONS.map(w => ({ key: w[0], name: w[0], sub: `${KIND_PT[w[1]]} · ${w[2]}${w[3].length ? ' · ' + w[3].map(x => Q_PT[x]).join(', ') : ''}`, cost: w[4] })); }
  if (M.type === 'armor') { title = 'Armaduras'; rows = ARMORS.map(a => ({ key: a[0], name: a[0], sub: `${WEIGHT_PT[a[1]]} · 1D${{ light: 4, medium: 6, heavy: 8 }[a[1]]}${a[2].length ? ' · ' + a[2].map(x => Q_PT[x]).join(', ') : ''}`, cost: a[3] })); }
  if (M.type === 'item') { title = 'Equipamento'; rows = ITEMS.map(i => ({ key: i[0], name: i[0], sub: i[1] + (i[3] ? ' · ' + i[3] : ''), cost: i[2] })); }
  rows = rows.filter(r => !q || r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q));
  return `<div class="scrim" data-act="close-bg"><div class="modal" role="dialog" aria-label="${title}">
    <div class="modal-h"><h2>${title} <button class="iconbtn" data-act="close" aria-label="Fechar">×</button></h2>
    <input class="search" id="m-q" data-modal="q" value="${esc(M.q || '')}" placeholder="Buscar…" autocomplete="off">
    <div class="hint">Na bolsa: ${fmtMoney(money)}. "Comprar" desconta o preço; "Adicionar" coloca sem custo.</div></div>
    <div class="modal-b" data-keep-scroll="shop">${rows.map(r => `<div class="res-item"><div class="row" style="padding:8px 12px;justify-content:space-between">
      <div style="min-width:0;flex:1"><span class="rn">${esc(r.name)}</span><div class="faint" style="font-size:13px">${esc(r.sub)}</div></div>
      <span class="muted num" style="font-size:13px;min-width:90px;text-align:right">${r.cost ? fmtMoney(r.cost) : '—'}</span>
      <button class="btn sm" data-act="shop-add" data-key="${esc(r.key)}" data-buy="0">Adicionar</button>
      ${r.cost ? `<button class="btn sm gold" data-act="shop-add" data-key="${esc(r.key)}" data-buy="1" ${r.cost > money ? 'disabled title="Dinheiro insuficiente" style="opacity:.45;cursor:not-allowed"' : ''}>Comprar</button>` : ''}</div></div>`).join('') || '<div class="empty">Nada encontrado.</div>'}
      <div class="sec-h" style="margin-top:10px"><h3 style="font-size:18px">Item personalizado</h3></div>
      <form class="row" data-form="custom-${M.type}"><input id="m-cn" name="name" placeholder="Nome" required style="flex:1;min-width:150px">
      ${M.type === 'weapon' ? `<select id="m-ck" name="kind">${Object.entries(KIND_PT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><input id="m-cd" name="die" value="1D8" style="width:70px" aria-label="Dano">` : ''}
      ${M.type === 'armor' ? `<select id="m-cw" name="weight">${Object.entries(WEIGHT_PT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>` : ''}
      <button class="btn">Adicionar</button></form>
    </div></div></div>`;
}

/* ============ Ações ============ */
function setPath(obj, path, val) {
  const segs = path.split('.'); let o = obj;
  for (let i = 0; i < segs.length - 1; i++) { const s = segs[i]; if (s[0] === '#') { o = o.find(x => x.uid === s.slice(1)); } else { if (o[s] == null || typeof o[s] !== 'object') o[s] = {}; o = o[s]; } if (!o) return; }
  o[segs[segs.length - 1]] = val;
}
const ACT = {
  pick(el) { S.curId = el.dataset.id; S.logOpen = false; try { localStorage.setItem('symb.cur', S.curId); } catch (e) {} render(); window.scrollTo({ top: 0 }); },
  tab(el) { S.tab = el.dataset.t; try { localStorage.setItem('symb.tab', S.tab); } catch (e) {} render(); },
  modal(el) { S.modal = { type: el.dataset.m, cat: el.dataset.cat || 'all', q: '' }; render(); setTimeout(() => { const i = $('#m-q') || $('#n-name'); i?.focus(); }, 0); },
  close() { S.modal = null; render(); },
  'close-bg'(el, e) { if (e.target === el) { S.modal = null; render(); } },
  log() { S.logOpen = true; render(); },
  'log-close'(el, e) { if (e.target === el || el.tagName === 'BUTTON') { S.logOpen = false; render(); } },
  mod(el) { const d = n(el.dataset.d); S.mod = d === 0 ? 0 : Math.max(-10, Math.min(10, S.mod + d)); render(); },
  die(el) { dmgRoll(cur(), 'Rolagem livre ' + el.dataset.f.toLowerCase(), el.dataset.f, 'dmg'); },
  'roll-attr'(el) { const c = cur(), D = derive(c), k = el.dataset.k; testRoll(c, 'Teste de ' + ATTR_PT[k], D.A[k]); },
  'roll-def'() { const c = cur(), D = derive(c); testRoll(c, 'Defesa', D.def); },
  'roll-init'() { const c = cur(), D = derive(c); pushRoll({ who: c.name, player: c.player, label: 'Iniciativa', kind: 'dmg', res: D.init, det: `${ATTR_PT[D.initAttr]} ${D.init} · desempate por Vigilante ${D.A.vigilant} ou 1D20` }); },
  'roll-armor'() { const c = cur(), D = derive(c); if (!D.ai.formula) return toast('Nenhuma armadura equipada.'); dmgRoll(c, 'Armadura' + (D.ai.name ? ' (' + D.ai.name + ')' : ''), D.ai.formula); },
  'roll-atk'(el) { const c = cur(), D = derive(c), w = c.weapons.find(x => x.uid === el.dataset.uid), W = weaponInfo(c, w, D); testRoll(c, 'Ataque: ' + w.name, W.atkVal, ATTR_PT[W.atk] + (W.bonus ? ' +1 Precisa' : '') + ' · use o modificador para a Defesa do alvo'); },
  'roll-dmg'(el) { const c = cur(), D = derive(c), w = c.weapons.find(x => x.uid === el.dataset.uid); dmgRoll(c, 'Dano: ' + w.name, weaponInfo(c, w, D).dmg); },
  cast(el) {
    const c = cur(), D = derive(c), a = c.abilities.find(x => x.uid === el.dataset.uid);
    const tags = (a.tag || '').split('/');
    const tgt = D.A[D.resAttr] - D.mystImp;
    testRoll(c, `Conjurar ${a.name} (${LVL[n(a.level)]})`, tgt, `${ATTR_PT[D.resAttr]}${D.mystImp ? ` −${D.mystImp} armadura` : ''}`);
    const low = tags.some(t => ['Wizardry', 'Theurgy', 'Witchcraft'].includes(t) && lvl(c, t) >= 2);
    const amt = low ? 1 : rollFormula('1D4').total;
    c.corrTemp = n(c.corrTemp) + amt;
    pushRoll({ who: c.name, player: c.player, label: 'Corrupção temporária', kind: 'corr', res: amt, det: low ? 'Tradição adepta: só 1 ponto' : '1D4' + (lvl(c, 'Sorcery') ? ' · Sorcery novato: teste de Resoluto reduz para 1' : '') });
    touch(c);
  },
  ritual(el) {
    const c = cur(), D = derive(c), a = c.abilities.find(x => x.uid === el.dataset.uid);
    testRoll(c, 'Ritual: ' + a.name, D.A[D.resAttr] - D.mystImp, ATTR_PT[D.resAttr]);
    const tags = (a.tag || '').split('/'); const low = tags.some(t => TRADITIONS.includes(t) && lvl(c, t) >= 1);
    const amt = low ? 1 : rollFormula('1D4').total; c.corrTemp = n(c.corrTemp) + amt;
    pushRoll({ who: c.name, player: c.player, label: 'Corrupção temporária', kind: 'corr', res: amt, det: low ? 'Ritual da sua tradição: 1 ponto' : '1D4 (ritual fora da sua tradição)' });
    touch(c);
  },
  ctemp(el) { const c = cur(); c.corrTemp = Math.max(0, n(c.corrTemp) + n(el.dataset.d)); touch(c); },
  'scene-end'() { const c = cur(); if (!n(c.corrTemp)) return toast('Sem corrupção temporária para limpar.'); c.corrTemp = 0; touch(c); toast('Fim de cena: corrupção temporária zerada.'); },
  hurt() { const c = cur(), D = derive(c), v = n($('#f-dmg')?.value); if (v <= 0) return toast('Digite o valor do dano.'); c.toughCur = D.tough - v; touch(c);
    if (v >= D.pain) toast(`Dano ${v} ≥ limiar de dor ${D.pain}: o personagem cai ou o inimigo ganha Ataque Livre.`); if (D.tough - v <= 0) toast(`${c.name} está morrendo! Faça testes de morte.`); },
  heal() { const c = cur(), D = derive(c), v = n($('#f-dmg')?.value); if (v <= 0) return toast('Digite o valor da cura.'); c.toughCur = Math.min(D.tMax, D.tough + v); touch(c); },
  'reset-tough'() { const c = cur(); c.toughCur = null; S.modal = null; touch(c); },
  'ab-open'(el) { const u = el.dataset.uid; S.open.has(u) ? S.open.delete(u) : S.open.add(u); render(); },
  'ab-level'(el) { const c = cur(), a = c.abilities.find(x => x.uid === el.dataset.uid), l = n(el.dataset.l); a.level = a.level === l && l > 1 ? l - 1 : l; touch(c); },
  'ab-del'(el) { const c = cur(); c.abilities = c.abilities.filter(x => x.uid !== el.dataset.uid); touch(c); },
  del(el) { const c = cur(), L = el.dataset.list; c[L] = c[L].filter(x => x.uid !== el.dataset.uid); touch(c); },
  mcat(el) { S.modal.cat = el.dataset.c; S.modal.trad = null; render(); },
  mtrad(el) { S.modal.trad = S.modal.trad === el.dataset.t ? null : el.dataset.t; render(); },
  msel(el) { S.modal.sel = S.modal.sel === el.dataset.name ? null : el.dataset.name; render(); },
  'add-ab'(el) { const c = cur(), name = el.dataset.name, e = CMAP[name]; addAbility(c, name, n(el.dataset.l), e?.category === 'Trait'); S.tab = 'hab'; touch(c); toast(`${name} adicionada.`); },
  'shop-add'(el) {
    const c = cur(), M = S.modal, key = el.dataset.key, buy = el.dataset.buy === '1'; let cost = 0;
    if (M.type === 'weapon') { const w = WEAPONS.find(x => x[0] === key); cost = w[4]; c.weapons.push({ uid: uid(), name: w[0], kind: w[1], die: w[2], q: [...w[3]], equipped: true, note: '' }); }
    if (M.type === 'armor') { const a = ARMORS.find(x => x[0] === key); cost = a[3]; const first = !c.armors.some(x => x.equipped); c.armors.push({ uid: uid(), name: a[0], weight: a[1], q: [...a[2]], equipped: first }); }
    if (M.type === 'item') { const i = ITEMS.find(x => x[0] === key); cost = i[2]; const ex = c.items.find(x => x.name === key); if (ex) ex.qty = n(ex.qty) + 1; else c.items.push({ uid: uid(), name: key, qty: 1, note: '' }); }
    if (buy) { const left = moneyTotal(c.money) - cost; if (left < 0) return toast('Dinheiro insuficiente.'); c.money = { t: Math.floor(left / 100), s: Math.floor(left % 100 / 10), o: left % 10 }; }
    touch(c); toast(`${key} ${buy ? 'comprado por ' + fmtMoney(cost) : 'adicionado'}.`);
  },
  'armor-eq'(el) { const c = cur(); c.armors.forEach(a => a.equipped = a.uid === el.dataset.uid); touch(c); },
  'armor-off'() { const c = cur(); c.armors.forEach(a => a.equipped = false); touch(c); },
  qty(el) { const c = cur(), it = c.items.find(x => x.uid === el.dataset.uid); it.qty = Math.max(0, n(it.qty) + n(el.dataset.d)); touch(c); },
  use(el) {
    const c = cur(), D = derive(c), it = c.items.find(x => x.uid === el.dataset.uid); if (n(it.qty) <= 0) return toast('Acabou.');
    const eff = ITEMS.find(x => x[0] === it.name)?.[4]; it.qty = n(it.qty) - 1;
    if (eff === 'herbal') { const med = lvl(c, 'Medicus'); if (med) { const f = ['', '1D6', '1D8', '1D10'][med]; const v = dmgRoll(c, 'Herbal Cure + Medicus', f); c.toughCur = Math.min(D.tMax, D.tough + v); } else { c.toughCur = Math.min(D.tMax, D.tough + 1); pushRoll({ who: c.name, player: c.player, label: 'Herbal Cure', kind: 'dmg', res: 1, det: 'Cura 1 de Resistência' }); } }
    if (eff === 'life') { const turns = rollFormula('1D6').total; let tot = 0; for (let i = 0; i < turns; i++) tot += rollDie(6); c.toughCur = Math.min(D.tMax, D.tough + tot); c.corrTemp = n(c.corrTemp) + turns;
      pushRoll({ who: c.name, player: c.player, label: 'Elixir of Life', kind: 'corr', res: tot, det: `${turns} turnos · cura total ${tot} · +${turns} corrupção temporária` }); }
    touch(c);
  },
  'add-art'() { const c = cur(); c.artifacts.push({ uid: uid(), name: '', powers: '', corr: 0 }); touch(c); },
  'add-comp'() { const c = cur(); (c.companions ||= []).push({ uid: uid(), name: '', race: '', occupation: '', note: '' }); touch(c); },
  dup() { const c = clone(cur()); c.id = uid(); c.name += ' (cópia)'; c.createdAt = Date.now(); S.curId = c.id; S.modal = null; touch(c); },
  'export-json'() {
    const c = cur(); const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (c.name || 'character').replace(/[^\w\-]+/g, '_') + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  'clear-comp'() { try { localStorage.removeItem(COMP_KEY); } catch (e) {} loadCompendium(); render(); toast('Compêndio removido.'); },
  'copy-json'() { const txt = JSON.stringify(cur(), null, 2); navigator.clipboard?.writeText(txt).then(() => toast('Ficha copiada.'), () => toast('Não foi possível copiar neste aplicativo.')); },
  'del-ask'() { S.modal.confirm = true; render(); },
  'del-cancel'() { S.modal.confirm = false; render(); },
  'del-char'() { const id = S.curId; S.modal = null; removeChar(id); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'INPUT' && el.type === 'radio') { fn(el, e); return; }
  if (el.classList.contains('scrim') && e.target !== el) return;
  fn(el, e);
});
function bindValue(el) {
  if (el.dataset.type === 'num') return n(el.value);
  if (el.dataset.type === 'bool') return el.checked;
  return el.value;
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.bind) { const c = cur(); if (!c) return; setPath(c, el.dataset.bind, bindValue(el)); touch(c, el.type === 'checkbox' || el.tagName === 'SELECT'); }
  else if (el.dataset.group) { S.group[el.dataset.group] = el.value; saveGroup(); }
  else if (el.dataset.modal && S.modal) { S.modal[el.dataset.modal] = el.value; render(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.bind) { const c = cur(); if (!c) return; setPath(c, el.dataset.bind, bindValue(el)); touch(c); }
  if (el.id === 'imp-comp' && el.files?.[0]) {
    const r = new FileReader(); r.onload = () => {
      try { const list = normalizeCompendium(JSON.parse(r.result)); if (!list.length) throw 0;
        localStorage.setItem(COMP_KEY, JSON.stringify(list)); loadCompendium(); render(); toast(`${list.length} entradas importadas.`);
      } catch (x) { toast('Não reconheci esse arquivo como compêndio.'); } };
    r.readAsText(el.files[0]);
  }
  if (el.id === 'imp-file' && el.files?.[0]) {
    const r = new FileReader(); r.onload = () => { try { const c = JSON.parse(r.result); if (!c || !Array.isArray(c.abilities)) throw 0; c.id = uid(); c.createdAt = Date.now(); S.curId = c.id; S.modal = null; touch(c); toast('Ficha importada.'); } catch (x) { toast('Esse arquivo não é uma ficha válida.'); } };
    r.readAsText(el.files[0]);
  }
});
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target, fd = new FormData(f), kind = f.dataset.form; const c = cur();
  if (kind === 'new') { const nc = newChar({ name: fd.get('name'), race: fd.get('race'), occupation: fd.get('occupation'), player: fd.get('player') }); S.curId = nc.id; S.modal = null; S.tab = 'hab'; try { localStorage.setItem('symb.cur', nc.id); } catch (x) {} touch(nc); }
  if (kind === 'formula') { const v = String(fd.get('f') || '').trim(); if (!/\d*d\d+/i.test(v) && !/^\d+$/.test(v)) return toast('Use o formato 2D6+1.'); dmgRoll(c, 'Rolagem livre', v.toUpperCase()); }
  if (kind === 'custom-ab') { const name = String(fd.get('name') || '').trim(); if (!name) return; c.abilities.push({ uid: uid(), name, cat: fd.get('cat'), tag: '', level: 1, free: false, custom: true, text: '' }); S.modal = null; touch(c); }
  if (kind === 'custom-weapon') { c.weapons.push({ uid: uid(), name: fd.get('name'), kind: fd.get('kind'), die: String(fd.get('die') || '1D8').toUpperCase(), q: [], equipped: true, note: '' }); S.modal = null; touch(c); }
  if (kind === 'custom-armor') { c.armors.push({ uid: uid(), name: fd.get('name'), weight: fd.get('weight'), q: [], equipped: !c.armors.some(a => a.equipped) }); S.modal = null; touch(c); }
  if (kind === 'custom-item') { c.items.push({ uid: uid(), name: fd.get('name'), qty: 1, note: '' }); S.modal = null; touch(c); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && (S.modal || S.logOpen)) { S.modal = null; S.logOpen = false; render(); } });
boot();
