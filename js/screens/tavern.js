/* Turn-based board duel: mana, minions, hero attacks and a five-slot board. */
import { h, clear, modal, wait } from '../ui/dom.js';
import { renderCard } from '../ui/card.js';
import { CARD_BY_ID } from '../data/cards.js';
import { save, recordWin } from '../core/state.js';

let game = null, host = null, ctxRef = null, stage = null, epoch = 0;
let unitSeq = 0, summoning = null;
const costOf = (c) => Math.min(7, Math.max(1, c.tier + 1));
const shuffle = (a) => a.slice().sort(() => Math.random() - .5);
const unit = (id) => { const c = CARD_BY_ID[id]; return { uid:`m${++unitSeq}`, card:c, hp:c.def + 2, atk:c.atk, ready:false }; };

export function startTavernBattle(root, ctx, st) {
  epoch++; host=root; ctxRef=ctx; stage=st;
  summoning=null;
  game={ turn:1, playerTurn:true, busy:false, over:false, player:{hp:30,mana:1,max:1,deck:shuffle(save.deck),hand:[],board:[]}, enemy:{hp:st.hp||30,mana:1,max:1,deck:shuffle(st.deck),hand:[],board:[]} };
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
function hero(key){const s=game[key];return h('div',{class:'mana-hero '+key},[
  h('b',{text:key==='player'?'אתה':stage.name}),h('span',{text:`♥ ${s.hp}`}),
  h('span',{class:'mana-crystals',text:`◆ ${s.mana}/${s.max}`}),h('small',{text:`${s.deck.length} בקופה`})
]);}
function board(key){const s=game[key];return h('div',{class:'minion-board '+key},[
  ...s.board.map((u,i)=>h('button',{class:'minion '+(u.ready?'is-ready ':'')+(summoning===u.uid?'is-summoning':''),'data-el':u.card.el,disabled:key==='enemy'||!game.playerTurn||!u.ready||game.busy,onclick:()=>attackHero(i)},[
    renderCard(u.card,{size:'sm',atk:u.atk,def:u.hp,lvl:0}),h('span',{text:u.ready?'תקוף':'ממתין'})
  ])),...Array.from({length:Math.max(0,5-s.board.length)},()=>h('i',{class:'board-slot'}))
]);}
function hand(){return h('div',{class:'mana-hand'},game.player.hand.map((id,i)=>{const c=CARD_BY_ID[id],cost=costOf(c);return h('button',{class:'mana-card',disabled:!game.playerTurn||game.busy||cost>game.player.mana||game.player.board.length>=5,onclick:()=>playCard(i)},[
  h('b',{class:'mana-cost',text:String(cost)}),renderCard(c,{size:'sm',lvl:0})
]);}));}
async function playCard(i){const id=game.player.hand[i],c=CARD_BY_ID[id],cost=costOf(c);if(cost>game.player.mana||game.player.board.length>=5||game.busy)return;game.busy=true;game.player.mana-=cost;game.player.hand.splice(i,1);const u=unit(id);game.player.board.push(u);summoning=u.uid;paint();await wait(900);summoning=null;game.busy=false;paint();}
function attackHero(i){const u=game.player.board[i];if(!u?.ready)return;u.ready=false;game.enemy.hp-=u.atk;if(checkOver())return;paint();}
async function endTurn(){
  if(!game.playerTurn||game.busy)return;const mine=epoch;game.busy=true;game.playerTurn=false;paint();await wait(850);if(mine!==epoch)return;
  game.enemy.max=Math.min(10,game.turn);game.enemy.mana=game.enemy.max;draw(game.enemy);
  while(game.enemy.board.length<5){const i=game.enemy.hand.findIndex(id=>costOf(CARD_BY_ID[id])<=game.enemy.mana);if(i<0)break;const id=game.enemy.hand.splice(i,1)[0];game.enemy.mana-=costOf(CARD_BY_ID[id]);const u=unit(id);game.enemy.board.push(u);summoning=u.uid;paint();await wait(760);if(mine!==epoch)return;summoning=null;paint();}
  await wait(700);if(mine!==epoch)return;
  for(const u of game.enemy.board){game.player.hp-=u.atk;await wait(420);if(checkOver()||mine!==epoch)return;paint();}
  game.turn++;game.player.max=Math.min(10,game.turn);game.player.mana=game.player.max;draw(game.player);game.player.board.forEach(u=>u.ready=true);game.enemy.board.forEach(u=>u.ready=true);game.playerTurn=true;game.busy=false;paint();
}
function checkOver(){if(game.player.hp>0&&game.enemy.hp>0)return false;game.over=true;game.busy=true;const won=game.enemy.hp<=0,reward=won?recordWin(stage.id):{gold:0};paint();modal(api=>[
 h('p',{class:'eyebrow',text:'Duellum Mana'}),h('h2',{text:won?'ניצחון בלוח':'תבוסה בלוח'}),
 h('div',{class:'modal-body'},[h('p',{text:won?`${stage.name} הובס בקרב תורות. זכית ב־${reward.gold} זהב.`:'הלוח שלך נשבר. סדר את החפיסה ונסה שוב.'}),
 h('div',{class:'modal-actions'},[h('button',{class:'btn btn--gold',text:'חזרה למפה',onclick:()=>{api.close();ctxRef.go('map');}}),h('button',{class:'btn',text:'קרב חוזר',onclick:()=>{api.close();startTavernBattle(host,ctxRef,stage);}})])])
 ],{dismissible:false});return true;}
export const inTavernBattle=()=>!!game&&!game.over;
export function exitTavernBattle(){epoch++;game=null;summoning=null;}
