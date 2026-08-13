/* ============================================================================
   MONSTER ART — the 35 portraits from THE-ARENA (Ld2000king/THE-ARENA,
   monsters.js + art/), matched onto this game's cards.

   Each entry carries three things from the source project:
     img     the portrait, re-encoded at card size by tools/fetch-art.mjs
     imgPos  THE-ARENA's own object-position, which frames the subject's face
     title   THE-ARENA's Hebrew name for that monster

   `rename: true` promotes `title` to be the card's actual name. That is only
   done where the source name denotes the same kind of thing as the card, or
   where nothing else is fused from it — because this game's card names are
   read inside fusion recipes ("חיה + תופת = דרקון"), and a name that turns a
   substance into a character makes the recipe nonsense ("אבן + תופת =
   עכביש הפלדה"). Cards without `rename` keep their functional name and show
   the ARENA title as a subtitle in the card detail instead, so every monster
   still arrives with both its picture and its name.
   ========================================================================= */

export const ARENA_ART = {
  /* ---- original elemental warriors generated for FusGame -------------- */
  fire:             { img: 'fire-warrior.jpg',             imgPos: 'center 20%', title: 'איגניס, הלהבה הראשונה', rename: true },
  water:            { img: 'water-warrior.jpg',            imgPos: 'center 18%', title: 'נריה, שומרת הגאות', rename: true },
  earth:            { img: 'earth-warrior.jpg',            imgPos: 'center 18%', title: 'גארון, לב האבן', rename: true },
  air:              { img: 'air-warrior.jpg',              imgPos: 'center 24%', title: 'זפרה, להב השמיים', rename: true },
  steam:            { img: 'steam-warrior.jpg',            imgPos: 'center 20%', title: 'ויירון, מחושל הערפל', rename: true },
  lava:             { img: 'lava-warrior.jpg',             imgPos: 'center 20%', title: 'מגמורה, מלכת הלבה', rename: true },
  energy:           { img: 'energy-warrior.jpg',           imgPos: 'center 20%', title: 'ארקון, הנחשול החי', rename: true },
  mud:              { img: 'mud-warrior.jpg',              imgPos: 'center 20%', title: 'מורגרום, ענק הביצה', rename: true },
  rain:             { img: 'rain-warrior.jpg',             imgPos: 'center 18%', title: 'טליה, אורגת הסערה', rename: true },
  dust:             { img: 'dust-warrior.jpg',             imgPos: 'center 20%', title: 'סאהיר, קוצר האבק', rename: true },
  inferno:          { img: 'inferno-warrior.jpg',          imgPos: 'center 20%', title: 'רזיאל, חותם התופת', rename: true },
  ocean:            { img: 'ocean-warrior.jpg',            imgPos: 'center 18%', title: 'תאלור, אדמירל התהום', rename: true },
  mountain:         { img: 'mountain-warrior.jpg',         imgPos: 'center 20%', title: 'דורן, מבקע הפסגות', rename: true },
  storm:            { img: 'storm-warrior.jpg',            imgPos: 'center 22%', title: 'קייליס, רומח הסערה', rename: true },
  stone:            { img: 'stone-warrior.jpg',            imgPos: 'center 20%', title: 'בראקה, אגרוף האבן', rename: true },
  obsidian:         { img: 'obsidian-warrior.jpg',         imgPos: 'center 18%', title: 'ניקסאר, הזכוכית השחורה', rename: true },
  cloud:            { img: 'cloud-warrior.jpg',            imgPos: 'center 20%', title: 'אוריאל, שומרת העננים', rename: true },
  life:             { img: 'life-warrior.jpg',             imgPos: 'center 20%', title: 'אלנדרה, פריחת החיים', rename: true },
  sand:             { img: 'sand-warrior.jpg',             imgPos: 'center 20%', title: 'חפרה, טופר הדיונה', rename: true },
  glass:            { img: 'glass-warrior.jpg',            imgPos: 'center 18%', title: 'ויטרה, מלכת הרסיסים', rename: true },
  volcano:          { img: 'volcano-warrior.jpg',          imgPos: 'center 20%', title: 'וולקאר, אדון הקלדרה', rename: true },
  ice:              { img: 'ice-warrior.jpg',              imgPos: 'center 18%', title: 'איסקאר, חוד הכפור', rename: true },
  snow:             { img: 'snow-warrior.jpg',             imgPos: 'center 18%', title: 'נווארה, הצעיף הלבן', rename: true },
  fish:             { img: 'fish-warrior.jpg',             imgPos: 'center 20%', title: 'מארוק, להב השונית', rename: true },
  bird:             { img: 'bird-warrior.jpg',             imgPos: 'center 22%', title: 'אוואריס, מכת הטופר', rename: true },
  blade:            { img: 'blade-warrior.jpg',            imgPos: 'center 18%', title: 'סריק, חוד הברזל', rename: true },
  crystal:          { img: 'crystal-warrior.jpg',          imgPos: 'center 18%', title: 'אמטרה, נביאת הגביש', rename: true },
  tree:             { img: 'tree-warrior.jpg',             imgPos: 'center 20%', title: 'אוקן וארד, שומר השורש', rename: true },
  desert:           { img: 'desert-warrior.jpg',           imgPos: 'center 18%', title: 'זאהיר, צלקת השמש', rename: true },
  phoenix:          { img: 'phoenix-warrior.jpg',          imgPos: 'center 22%', title: 'פיראליס, הנולד מחדש', rename: true },
  kraken:           { img: 'kraken-warrior.jpg',           imgPos: 'center 18%', title: 'קורוואקס, כובל המעמקים', rename: true },
  wolf:             { img: 'wolf-warrior.jpg',             imgPos: 'center 18%', title: 'פנריק, ניב הירח', rename: true },
  bear:             { img: 'bear-warrior.jpg',             imgPos: 'center 18%', title: 'אורסאן, עור הברזל', rename: true },
  mammoth:          { img: 'mammoth-warrior.jpg',          imgPos: 'center 18%', title: 'מורקאר, שומר החטים', rename: true },
  zombie:           { img: 'zombie-warrior.jpg',           imgPos: 'center 18%', title: 'וארגוס, הבלתי מת', rename: true },
  skeleton:         { img: 'skeleton-warrior.jpg',         imgPos: 'center 18%', title: 'אוסיוואר, מרשל העצמות', rename: true },
  hydra:            { img: 'hydra-warrior.jpg',            imgPos: 'center 20%', title: 'הידריון, רב הכתרים', rename: true },
  leviathan:        { img: 'leviathan-warrior.jpg',        imgPos: 'center 18%', title: 'לווירוס, שובר הגאות', rename: true },
  werewolf:         { img: 'werewolf-warrior.jpg',         imgPos: 'center 18%', title: 'ואריק, ירח הדם', rename: true },
  djinn:            { img: 'djinn-warrior.jpg',            imgPos: 'center 20%', title: 'אזהר, ג׳יני הסערה', rename: true },
  behemoth:         { img: 'behemoth-warrior.jpg',         imgPos: 'center 18%', title: 'בהמאר, מרעיד העולם', rename: true },
  sphinx:           { img: 'sphinx-warrior.jpg',           imgPos: 'center 20%', title: 'ספירה, להב החידה', rename: true },
  ancientDragon:    { img: 'ancientDragon-warrior.jpg',    imgPos: 'center 20%', title: 'דרקורין, הדרקון הראשון', rename: true },
  worldTree:        { img: 'worldTree-warrior.jpg',        imgPos: 'center 18%', title: 'יגארה, המשמר הנצחי', rename: true },
  chaos:            { img: 'chaos-warrior.jpg',            imgPos: 'center 18%', title: 'כאור, חסר הכבלים', rename: true },
  philosopherStone: { img: 'philosopherStone-warrior.jpg', imgPos: 'center 18%', title: 'אורליוס, החכם הארגמני', rename: true },
  /* ---- renamed: the source name means the same kind of thing ----------- */
  dragon:      { img: 'lava-dragon.jpg',     imgPos: 'center 25%', title: 'דרקון הלבה',          rename: true },
  golem:       { img: 'ice-golem.jpg',       imgPos: 'center 28%', title: 'גולם הקרח',           rename: true },
  lich:        { img: 'lich-king.jpg',       imgPos: 'center 18%', title: 'מלך הצללים',          rename: true },
  knight:      { img: 'blood-knight.jpg',    imgPos: 'center 18%', title: 'אביר הדם',            rename: true },
  wizard:      { img: 'abyss-mage.jpg',      imgPos: 'center 16%', title: 'מכשף התהום',          rename: true },
  titan:       { img: 'titan-prime.jpg',     imgPos: 'center 12%', title: 'טיטאן פריים',         rename: true },
  shark:       { img: 'sand-shark.jpg',      imgPos: 'center 16%', title: 'כרישון החול',         rename: true },
  void:        { img: 'void-tyrant.jpg',     imgPos: 'center 22%', title: 'דארק לורד האופל',     rename: true },

  /* ---- renamed: nothing is fused from these, so the tree is unaffected -- */
  demon:       { img: 'dark-fist.jpg',       imgPos: '74% 22%',    title: 'טאי אגקוף האופל',     rename: true },
  vampire:     { img: 'night-vampire.jpg',   imgPos: 'center 14%', title: 'הרוזן באט',           rename: true },
  archmage:    { img: 'crimson-warlock.jpg', imgPos: 'center 22%', title: 'אשף הארגמן',          rename: true },
  ghost:       { img: 'mist-phantom.jpg',    imgPos: 'center 30%', title: 'פנטום הערפל',         rename: true },
  chimera:     { img: 'rose-destroyer.jpg',  imgPos: 'center 12%', title: 'מונרה המשמיד',        rename: true },
  paladin:     { img: 'saiyan-king.jpg',     imgPos: 'center 20%', title: 'פירס מלך הסאיאן',     rename: true },
  thunderbird: { img: 'storm-sentinel.jpg',  imgPos: 'center 20%', title: 'איירון ספארק',        rename: true },
  elemental:   { img: 'machine-guardian.jpg', imgPos: 'center 15%', title: 'העכביש הרובוטי',     rename: true },
  death:       { img: 'abyss-prince.jpg',    imgPos: 'center 15%', title: 'אכזר האפל',           rename: true },

  /* ---- art only: the card's own name is load-bearing in recipes --------- */
  glacier:     { img: 'ice-dragoness.jpg',   imgPos: 'center 12%', title: 'אייס נסיכת הקרח' },
  human:       { img: 'blue-fist-monk.jpg',  imgPos: 'center 20%', title: 'קאי אגרוף האור' },
  armor:       { img: 'iron-vanguard.jpg',   imgPos: 'center 45%', title: 'דרקון המתכת' },
  metal:       { img: 'steel-spider.jpg',    imgPos: 'center 40%', title: 'עכביש הפלדה' },
  angel:       { img: 'azure-guardian.jpg',  imgPos: 'center 20%', title: 'שומר התכלת' },
  plant:       { img: 'poison-spore.jpg',    imgPos: 'center 40%', title: 'פטריון רעל' },
  beast:       { img: 'lava-cub.jpg',        imgPos: 'center 40%', title: 'גור הלבה' },
  shadow:      { img: 'shadow-imp.jpg',      imgPos: 'center 28%', title: 'שדון הצללים' },
  lightning:   { img: 'thunder-orb.jpg',     imgPos: 'center 40%', title: 'בועת הרעם' },
  swamp:       { img: 'swamp-crawler.jpg',   imgPos: 'center 38%', title: 'זוחל הביצה' },
  sun:         { img: 'sun-monarch.jpg',     imgPos: 'center 14%', title: 'סאן לוחם השמש' },
  moon:        { img: 'night-warden.jpg',    imgPos: 'center 22%', title: 'שומר הלילה' },
  warrior:     { img: 'chrono-racer.jpg',    imgPos: 'center 20%', title: 'האצן' },
  forest:      { img: 'ranger-guard.jpg',    imgPos: 'center 18%', title: 'קשתית האמרלד' },
  ent:         { img: 'ranger-strike.jpg',   imgPos: 'center 20%', title: 'קשתית האמרלד' },
  star:        { img: 'galaxy-knight.jpg',   imgPos: '68% 35%',    title: 'לומינוס מאיר השמיים' },
  griffin:     { img: 'orion.jpg',           imgPos: 'center 18%', title: 'אוריון' },
  genesis:     { img: 'nossa.jpg',           imgPos: 'center 16%', title: 'נובה' },
};

/** Where the art lives, relative to the page. The bundler swaps these for
 *  data URIs so the single-file build makes no network requests. */
export const ART_BASE = 'art/';
