/* Turn-based board duel: mana, minions, hero attacks and a five-slot board. */
import { h, clear, modal, wait } from '../ui/dom.js';
import { renderCard } from '../ui/card.js';
import { CARD_BY_ID } from '../data/cards.js';
import { MANA_ABILITIES, abilityIdFor } from '../data/abilities.js';
import { save, recordWin } from '../core/state.js';

let game = null, host = null, ctxRef = null, stage = null, epoch = 0;
let unitSeq = 0, summoning = null, selectedUid = null, attackingUid = null, hitUid = null, heroHit = null;
const costOf = (c) => Math.min(7, Math.max(1, c.tier + 1));
const shuffle = (a) => a.slice().sort(() => Math.random() - .5);

const abilityOf = (card) => abilityIdFor(card);
const helperCard = (el) => ({ id:`helper-${el}`, name:'שומר זוטר', el, tier:0, atk:1, def:0, recipe:null });
const unit = (cardOrId, { helper=false }={}) => {
  const c=typeof cardOrId==='string'?CARD_BY_ID[cardOrId]:cardOrId;
  const ability=helper?null:abilityOf(c);
  return { uid:`m${++unitSeq}`, card:c, hp:helper?2:c.def+2, atk:c.atk, ready:ability==='charge', ability, shield:ability==='barrier' };
};

export function startTavernBattle(root, ctx, st) {
  epoch++; host=root; ctxRef=ctx; stage=st;
  summoning=null; selectedUid=null; attackingUid=null; hitUid=null; heroHit=null;
  game={ turn:1, playerTurn:true, busy:false, over:false, player:{hp:30,maxHp:30,mana:1,max:1,deck:shuffle(save.deck),hand:[],board:[]}, enemy:{hp:st.hp||30,maxHp:st.hp||30,mana:1,max:1,deck:shuffle(st.deck),hand:[],board:[]} };
  for(let i=0;i<3;i++){ draw(game.player); draw(game.enemy); }
  paint();
}
function draw(side){ if(side.deck.length && side.hand.length<8) side.hand.push(side.deck.shift()); }
function paint(){
  clear(host); host.className='screen is-battle';
  host.append(h('div',{class:'mana-arena'},[
    hero('enemy'), board('enemy'),
    h('div',{class:'turn-ribbon',text:game.playerTurn?`תור ${game.turn} · שלך`:`תור ${game.turn} · היריב חושב…`}),
    board('player'), hero('player'),
    hand(), h('button',{class:'btn btn--gold end-turn',disabled:!game.playerTurn||game.busy,text:'סיים תור',onclick:endTurn}),
  ]));
}
function hero(key){const s=game[key],targetable=key==='enemy'&&game.playerTurn&&!game.busy&&!!selectedUid&&!game.enemy.board.length;return h('div',{
  class:'mana-hero '+key+(targetable?' is-targetable':'')+(heroHit===key?' is-hit':''),
  role:targetable?'button':null,tabindex:targetable?'0':null,
  onclick:targetable?attackHeroDirect:null,
  onkeydown:targetable?(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();attackHeroDirect();}}:null,
},[
  h('b',{text:key==='player'?'אתה':stage.name}),h('span',{text:`♥ ${s.hp}`}),
  h('span',{class:'mana-crystals',text:`◆ ${s.mana}/${s.max}`}),h('small',{text:targetable?'לחץ לתקיפה ישירה':`${s.deck.length} בקופה`})
]);}
function board(key){const s=game[key];return h('div',{class:'minion-board '+key},[
  ...s.board.map((u,i)=>h('button',{
    class:'minion '+(u.ready?'is-ready ':'')+(summoning===u.uid?'is-summoning ':'')+(selectedUid===u.uid?'is-selected ':'')+(attackingUid===u.uid?'is-attacking ':'')+(hitUid===u.uid?'is-hit ':'')+(key==='enemy'&&selectedUid?'is-targetable ':''),
    'data-el':u.card.el,
    disabled:!game.playerTurn||game.busy||(key==='player'&&!u.ready)||(key==='enemy'&&!selectedUid),
    onclick:()=>key==='player'?selectAttacker(u.uid):attackTarget(i),
  },[
    renderCard(u.card,{size:'sm',atk:u.atk,def:u.hp,lvl:0,className:'mana-unit-card'}),
    abilityBadge(u.ability, u.shield),
    h('span',{class:'minion-name',text:u.card.name}),
    h('span',{class:'minion-action',text:key==='enemy'&&selectedUid?'בחר כמטרה':selectedUid===u.uid?'נבחר':u.ready?'בחר לתקיפה':'ממתין'})
  ])),...Array.from({length:Math.max(0,5-s.board.length)},()=>h('i',{class:'board-slot'}))
]);}
function hand(){return h('div',{class:'mana-hand'},game.player.hand.map((id,i)=>{const c=CARD_BY_ID[id],cost=costOf(c);return h('button',{class:'mana-card',disabled:!game.playerTurn||game.busy||cost>game.player.mana||game.player.board.length>=5,onclick:()=>playCard(i)},[
  h('b',{class:'mana-cost',text:String(cost)}),abilityBadge(abilityOf(c)),renderCard(c,{size:'sm',lvl:0,className:'mana-hand-card'})
]);}));}
function abilityBadge(id, shieldActive=false){
  if(!id)return null;const a=MANA_ABILITIES[id];
  return h('span',{class:'mana-ability '+(shieldActive?'is-active':''),title:`${a.name}: ${a.text}`,text:`${a.icon} ${a.name}`});
}
function applySummon(side,u){
  if(u.ability==='mend')side.hp=Math.min(side.maxHp,side.hp+3);
  if(u.ability==='rally')side.board.forEach(x=>{if(x.uid!==u.uid)x.atk+=1;});
  if(u.ability==='legion'){
    const spaces=Math.max(0,5-side.board.length);
    for(let n=0;n<Math.min(2,spaces);n++)side.board.push(unit(helperCard(u.card.el),{helper:true}));
  }
}
async function playCard(i){const id=game.player.hand[i],c=CARD_BY_ID[id],cost=costOf(c);if(cost>game.player.mana||game.player.board.length>=5||game.busy)return;game.busy=true;game.player.mana-=cost;game.player.hand.splice(i,1);const u=unit(id);game.player.board.push(u);applySummon(game.player,u);summoning=u.uid;paint();await wait(900);summoning=null;game.busy=false;paint();}
function selectAttacker(uid){
  const u=game.player.board.find(x=>x.uid===uid);
  if(!u?.ready||game.busy)return;
  selectedUid=selectedUid===uid?null:uid;
  paint();
}
async function attackTarget(targetIndex){
  const attacker=game.player.board.find(x=>x.uid===selectedUid),target=game.enemy.board[targetIndex];
  if(!attacker?.ready||!target||game.busy)return;
  game.busy=true;attacker.ready=false;attackingUid=attacker.uid;hitUid=target.uid;paint();
  await wait(620);if(!game)return;
  const attack=attacker.atk+(attacker.ability==='fury'?2:0);
  const blocked=target.shield;target.shield=false;
  const overflow=blocked?0:Math.max(0,attack-target.hp);
  if(!blocked)target.hp-=attack;
  if(overflow)game.enemy.hp-=overflow;
  if(overflow&&attacker.ability==='drain')game.player.hp=Math.min(game.player.maxHp,game.player.hp+overflow);
  if(target.hp<=0)game.enemy.board.splice(targetIndex,1);
  selectedUid=null;attackingUid=null;hitUid=null;game.busy=false;
  if(checkOver())return;paint();
}
async function attackHeroDirect(){
  const attacker=game.player.board.find(x=>x.uid===selectedUid);
  if(!attacker?.ready||game.enemy.board.length||game.busy)return;
  game.busy=true;attacker.ready=false;attackingUid=attacker.uid;heroHit='enemy';paint();
  await wait(620);if(!game)return;
  const attack=attacker.atk+(attacker.ability==='fury'?2:0);
  game.enemy.hp-=attack;
  if(attacker.ability==='drain')game.player.hp=Math.min(game.player.maxHp,game.player.hp+attack);
  selectedUid=null;attackingUid=null;heroHit=null;game.busy=false;
  if(checkOver())return;paint();
}
async function endTurn(){
  if(!game.playerTurn||game.busy)return;const mine=epoch;selectedUid=null;game.busy=true;game.playerTurn=false;paint();await wait(850);if(mine!==epoch)return;
  game.enemy.max=Math.min(10,game.turn);game.enemy.mana=game.enemy.max;draw(game.enemy);
  while(game.enemy.board.length<5){const i=game.enemy.hand.findIndex(id=>costOf(CARD_BY_ID[id])<=game.enemy.mana);if(i<0)break;const id=game.enemy.hand.splice(i,1)[0];game.enemy.mana-=costOf(CARD_BY_ID[id]);const u=unit(id);game.enemy.board.push(u);applySummon(game.enemy,u);summoning=u.uid;paint();await wait(760);if(mine!==epoch)return;summoning=null;paint();}
  await wait(700);if(mine!==epoch)return;
  for(const u of [...game.enemy.board].filter(x=>x.ready)){
    if(mine!==epoch)return;
    const targets=game.player.board;
    if(targets.length){
      const targetIndex=targets.reduce((best,x,i,a)=>x.hp<a[best].hp?i:best,0),target=targets[targetIndex];
      attackingUid=u.uid;hitUid=target.uid;paint();await wait(620);if(mine!==epoch)return;
      const attack=u.atk+(u.ability==='fury'?2:0),blocked=target.shield;target.shield=false;
      const overflow=blocked?0:Math.max(0,attack-target.hp);if(!blocked)target.hp-=attack;if(overflow)game.player.hp-=overflow;
      if(overflow&&u.ability==='drain')game.enemy.hp=Math.min(game.enemy.maxHp,game.enemy.hp+overflow);
      if(target.hp<=0)targets.splice(targetIndex,1);
    }else{
      attackingUid=u.uid;heroHit='player';paint();await wait(620);if(mine!==epoch)return;const attack=u.atk+(u.ability==='fury'?2:0);game.player.hp-=attack;if(u.ability==='drain')game.enemy.hp=Math.min(game.enemy.maxHp,game.enemy.hp+attack);
    }
    u.ready=false;attackingUid=null;hitUid=null;heroHit=null;if(checkOver())return;paint();
  }
  game.turn++;game.player.max=Math.min(10,game.turn);game.player.mana=game.player.max;draw(game.player);game.player.board.forEach(u=>u.ready=true);game.enemy.board.forEach(u=>u.ready=true);game.playerTurn=true;game.busy=false;paint();
}
function checkOver(){if(game.player.hp>0&&game.enemy.hp>0)return false;game.over=true;game.busy=true;const won=game.enemy.hp<=0,reward=won?recordWin(stage.id):{gold:0};paint();modal(api=>[
 h('p',{class:'eyebrow',text:'Duellum Mana'}),h('h2',{text:won?'ניצחון בלוח':'תבוסה בלוח'}),
 h('div',{class:'modal-body'},[h('p',{text:won?`${stage.name} הובס בקרב תורות. זכית ב־${reward.gold} זהב.`:'הלוח שלך נשבר. סדר את החפיסה ונסה שוב.'}),
 h('div',{class:'modal-actions'},[h('button',{class:'btn btn--gold',text:'חזרה למפה',onclick:()=>{api.close();ctxRef.go('map');}}),h('button',{class:'btn',text:'קרב חוזר',onclick:()=>{api.close();startTavernBattle(host,ctxRef,stage);}})])])
 ],{dismissible:false});return true;}
export const inTavernBattle=()=>!!game&&!game.over;
export function exitTavernBattle(){epoch++;game=null;summoning=null;selectedUid=null;attackingUid=null;hitUid=null;heroHit=null;}
