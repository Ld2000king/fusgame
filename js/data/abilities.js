/* Shared character lore and mana abilities used by battle, lab and codex. */

export const MANA_ABILITIES = {
  charge:  { icon:'⚡', name:'הסתערות', text:'יכול לתקוף מיד בתור שבו זומן.' },
  legion:  { icon:'♟', name:'מפקד לגיון', text:'מזמן שני עוזרים חלשים לצדו.' },
  barrier: { icon:'⬡', name:'מגן קרב', text:'חוסם לחלוטין את הפגיעה הראשונה.' },
  mend:    { icon:'✚', name:'ריפוי', text:'מחזיר 3 נקודות חיים לגיבור בזימון.' },
  rally:   { icon:'▲', name:'קריאת קרב', text:'מעניק 1+ התקפה לכל בעלי הברית האחרים.' },
  fury:    { icon:'✦', name:'זעם', text:'גורם 2+ נזק בכל פעם שהוא תוקף.' },
  drain:   { icon:'☾', name:'שאיבת חיים', text:'מרפא את הגיבור לפי הנזק שחדר ליריב.' },
};

export const ABILITY_BY_CARD = {
  lightning:'charge', warrior:'charge', phoenix:'charge', wolf:'charge', griffin:'charge', thunderbird:'charge',
  forest:'legion', wizard:'legion', lich:'legion', worldTree:'legion', genesis:'legion',
  armor:'barrier', golem:'barrier', bear:'barrier', mammoth:'barrier', paladin:'barrier', titan:'barrier',
  water:'mend', life:'mend', angel:'mend', ocean:'mend',
  knight:'rally', archmage:'rally', elemental:'rally', sphinx:'rally',
  dragon:'fury', demon:'fury', chimera:'fury', ancientDragon:'fury', sun:'fury', chaos:'fury',
  vampire:'drain', ghost:'drain', werewolf:'drain', death:'drain', moon:'drain', void:'drain',
};

const ELEMENT_LORE = {
  fire: 'נולד מתוך להבות הקרב ומעדיף הכרעה מהירה וחסרת רחמים.',
  water: 'שולט בזרימת הקרב, סופג לחץ וממתין לרגע המדויק להכות.',
  earth: 'לוחם כבד ויציב שנבנה להחזיק את קו החזית מול כל איום.',
  air: 'נע במהירות בין היריבים ותוקף לפני שהם מספיקים להתארגן.',
  life: 'שואב כוח מהטבע ומגן על בני בריתו בקרבות ממושכים.',
  arcane: 'מתעל כוח נסתר כדי לשנות את חוקי הקרב לטובתו.',
  shadow: 'צייד אפל שמחליש את יריביו ומתחזק מהפחד שלהם.',
  metal: 'לוחם ממושמע עטוף שריון, המשלב כוח פגיעה עם הגנה עיקשת.',
};

const RANK_LORE = [
  'כוח בסיסי, אך חיוני לכל חפיסה.',
  'כבר הוכיח את עצמו בקרבות הראשונים.',
  'לוחם מנוסה בעל נוכחות מסוכנת בזירה.',
  'דמות חזקה שמסוגלת לשנות את מהלך הקרב.',
  'אלוף נדיר שרק מעטים מסוגלים לעמוד מולו.',
  'ישות עתיקה שכוחה מוכר בכל הממלכות.',
  'אגדה חיה המסוגלת להכריע צבא שלם.',
];

export function abilityIdFor(card) { return ABILITY_BY_CARD[card.id] || null; }
export function abilityFor(card) {
  const id=abilityIdFor(card);
  return id ? { id, ...MANA_ABILITIES[id] } : null;
}

export function characterDescription(card) {
  const style = card.atk >= card.def + 3
    ? 'סגנון הלחימה שלו התקפי במיוחד ומבוסס על שבירת ההגנה במהירות.'
    : card.def >= card.atk
      ? 'סגנון הלחימה שלו הגנתי, והוא מצטיין בעמידה מול פגיעות קשות.'
      : 'סגנון הלחימה שלו מאוזן ומשלב כוח, עמידות ותזמון נכון.';
  return `${ELEMENT_LORE[card.el]} ${style} ${RANK_LORE[card.tier]}`;
}
