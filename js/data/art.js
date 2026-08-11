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
