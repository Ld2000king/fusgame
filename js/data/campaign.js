/* ============================================================================
   CAMPAIGN — twelve opponents along the road of the Great Work.
   `deck` is expressed as {cardId: copies} and expanded at battle time.
   `skill` (0..1) controls how often the AI takes its best line.
   ========================================================================= */

function expand(spec) {
  const out = [];
  for (const [id, n] of Object.entries(spec)) {
    for (let i = 0; i < n; i++) out.push(id);
  }
  return out;
}

const stage = (o) => ({ ...o, deck: expand(o.deck) });

export const CAMPAIGN = [
  stage({
    id: 'ember',
    name: 'שוליית הגחלת',
    title: 'הנר הראשון',
    blurb: 'ילד שלמד להצית ולא למד לכבות.',
    el: 'fire',
    hp: 22,
    skill: 0.5,
    class: 'elementalist',
    gold: 30,
    deck: { fire: 6, air: 4, dust: 4, lava: 3, inferno: 2 },
  }),
  stage({
    id: 'tide',
    name: 'נערת הגאות',
    title: 'המזח השבור',
    blurb: 'סופרת גלים בקול רם, וטועה בכוונה.',
    el: 'water',
    hp: 24,
    skill: 0.55,
    class: 'healer',
    gold: 35,
    deck: { water: 5, rain: 3, steam: 4, fish: 3, ocean: 3, mud: 2 },
  }),
  stage({
    id: 'warden',
    name: 'שומר האבן',
    title: 'שער התחתית',
    blurb: 'לא זז. זה כל הטריק.',
    el: 'earth',
    hp: 26,
    skill: 0.6,
    class: 'enchanter',
    gold: 40,
    deck: { earth: 4, mud: 3, stone: 4, sand: 3, mountain: 3, lava: 2, desert: 2 },
  }),
  stage({
    id: 'whisper',
    name: 'לוחשת הרוח',
    title: 'הרמה הפתוחה',
    blurb: 'מגיעה לפני שהחלטת להסתובב.',
    el: 'air',
    hp: 30,
    skill: 0.64,
    class: 'elementalist',
    gold: 45,
    deck: { air: 4, energy: 3, storm: 4, dust: 2, cloud: 4, lightning: 3 },
  }),
  stage({
    id: 'steamwright',
    name: 'אמן הקיטור',
    title: 'בית היוצר',
    blurb: 'הפך את המעבדה שלו למכונה אחת גדולה.',
    el: 'metal',
    hp: 28,
    skill: 0.68,
    class: 'enchanter',
    gold: 55,
    deck: { steam: 3, energy: 3, stone: 3, metal: 3, blade: 3, armor: 2, golem: 1 },
  }),
  stage({
    id: 'smith',
    name: 'נפח הצללים',
    title: 'הכבשן האפל',
    blurb: 'מרתך לפי אור שאיש אינו רואה.',
    el: 'shadow',
    hp: 30,
    skill: 0.7,
    class: 'enchanter',
    gold: 60,
    deck: { obsidian: 3, metal: 3, shadow: 3, blade: 3, armor: 2, ghost: 2, vampire: 2, warrior: 2 },
  }),
  stage({
    id: 'shepherd',
    name: 'רועת החיות',
    title: 'הגבול הירוק',
    blurb: 'קוראת לכולם בשם, וכולם באים.',
    el: 'life',
    hp: 28,
    skill: 0.72,
    class: 'healer',
    gold: 70,
    deck: { plant: 4, human: 3, beast: 3, wolf: 3, tree: 3, bear: 2, forest: 2 },
  }),
  stage({
    id: 'frost',
    name: 'מכשפת הכפור',
    title: 'האגם הקפוא',
    blurb: 'מקפיאה את התור שלך ואת הידיים שלך.',
    el: 'water',
    hp: 32,
    skill: 0.76,
    class: 'healer',
    gold: 80,
    deck: { ice: 3, snow: 3, fish: 2, ocean: 2, shark: 2, glacier: 3, kraken: 2, leviathan: 1, moon: 1 },
  }),
  stage({
    id: 'ironmarch',
    name: 'מצביא הברזל',
    title: 'צעדת המסדר',
    blurb: 'אין לו קסם. יש לו שורה ראשונה.',
    el: 'metal',
    hp: 32,
    skill: 0.8,
    class: 'enchanter',
    gold: 95,
    deck: { human: 3, metal: 3, blade: 3, armor: 2, warrior: 2, golem: 2, knight: 2 },
  }),
  stage({
    id: 'abyss',
    name: 'נסיך התהום',
    title: 'המדרגה האחרונה',
    blurb: 'משלם בחיים שלו כדי לקצר את שלך.',
    el: 'shadow',
    hp: 34,
    skill: 0.84,
    class: 'elementalist',
    gold: 110,
    deck: { skeleton: 2, zombie: 3, shadow: 3, vampire: 3, demon: 3, werewolf: 2, lich: 2, death: 1 },
  }),
  stage({
    id: 'dragonward',
    name: 'שומר הדרקונים',
    title: 'הקן הגבוה',
    blurb: 'גידל אותם. הם עדיין לא מקשיבים.',
    el: 'fire',
    hp: 36,
    skill: 0.88,
    class: 'elementalist',
    gold: 130,
    deck: {
      fire: 4, lava: 3, inferno: 3, lightning: 3, volcano: 2, phoenix: 3,
      dragon: 3, thunderbird: 2, chimera: 2, ancientDragon: 1,
    },
  }),
  stage({
    id: 'magnum',
    name: 'אדון המלאכה',
    title: 'האופוס הגדול',
    blurb: 'סיים את העבודה שאתה רק התחלת.',
    el: 'arcane',
    hp: 40,
    skill: 0.95,
    class: 'enchanter',
    gold: 180,
    deck: {
      energy: 3, lightning: 3, crystal: 3, wizard: 3, angel: 2,
      elemental: 2, sphinx: 1, archmage: 2, sun: 1, titan: 1,
      star: 1, philosopherStone: 1,
    },
  }),
];

export const CAMPAIGN_BY_ID = Object.fromEntries(CAMPAIGN.map((s) => [s.id, s]));

/** Recommended collection size before a stage stops being a wall. */
export function gateFor(index) {
  return [0, 6, 9, 12, 16, 20, 25, 30, 35, 40, 46, 52][index] || 0;
}
