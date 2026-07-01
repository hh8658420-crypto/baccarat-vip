const suits=["♠","♥","♦","♣"];
const ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const chipValues=[100,500,1000,5000,10000,50000];
const payTable={player:2,banker:1.95,tie:9,playerPair:12,bankerPair:12,anyPair:6,perfectPair:26,big:1.54,small:2.5};
const betNames={player:"闲",banker:"庄",tie:"和",playerPair:"闲对",bankerPair:"庄对",anyPair:"任意对子",perfectPair:"完美对子",big:"大",small:"小"};
const betKeys=Object.keys(payTable);
const $=id=>document.getElementById(id);

let balance=Number(localStorage.getItem("vip10_balance")||100000);
let history=JSON.parse(localStorage.getItem("vip10_history")||"[]");
let shoeNo=Number(localStorage.getItem("vip10_shoe")||1);
let roundNo=Number(localStorage.getItem("vip10_round")||0);
let soundOn=localStorage.getItem("vip10_sound")!=="off";
let shoe=[];
let selectedChip=1000;
let bets={};
let lastBets=null;
let locked=false;
let countdown=15;
let timer=null;
betKeys.forEach(k=>bets[k]=0);

const el={
  balance:$("balance"),shoeNo:$("shoeNo"),roundNo:$("roundNo"),cardsLeft:$("cardsLeft"),countdown:$("countdown"),
  playerCards:$("playerCards"),bankerCards:$("bankerCards"),playerScore:$("playerScore"),bankerScore:$("bankerScore"),message:$("message"),
  chipRack:$("chipRack"),dealBtn:$("dealBtn"),repeatBtn:$("repeatBtn"),undoBtn:$("undoBtn"),clearBtn:$("clearBtn"),soundBtn:$("soundBtn"),
  beadRoad:$("beadRoad"),bigRoad:$("bigRoad"),eyeRoad:$("eyeRoad"),smallRoad:$("smallRoad"),
  bankerWins:$("bankerWins"),playerWins:$("playerWins"),tieWins:$("tieWins"),chipFly:$("chipFly")
};

function save(){
  localStorage.setItem("vip10_balance",String(balance));
  localStorage.setItem("vip10_history",JSON.stringify(history.slice(-120)));
  localStorage.setItem("vip10_shoe",String(shoeNo));
  localStorage.setItem("vip10_round",String(roundNo));
  localStorage.setItem("vip10_sound",soundOn?"on":"off");
}
function moneyText(n){return n>=10000?(n/10000).toFixed(n%10000?1:0)+"万":String(n)}
function totalBet(){return betKeys.reduce((s,k)=>s+bets[k],0)}
function msg(t){el.message.innerHTML=t}
function beep(freq=520,duration=.055){
  if(!soundOn)return;
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type="sine";osc.frequency.value=freq;gain.gain.value=.038;
    osc.connect(gain);gain.connect(ctx.destination);osc.start();
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
    osc.stop(ctx.currentTime+duration+.01);setTimeout(()=>ctx.close(),120);
  }catch(e){}
}
function initShoe(){
  shoe=[];
  for(let d=0;d<8;d++) for(const suit of suits) for(const rank of ranks) shoe.push({rank,suit});
  for(let i=shoe.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shoe[i],shoe[j]]=[shoe[j],shoe[i]];}
  shoeNo++;roundNo=0;save();
}
function draw(){if(shoe.length<26)initShoe();return shoe.pop()}
function value(c){return c.rank==="A"?1:["10","J","Q","K"].includes(c.rank)?0:Number(c.rank)}
function score(hand){return hand.reduce((s,c)=>s+value(c),0)%10}
function isPair(a,b){return a.rank===b.rank}
function isPerfectPair(a,b){return a.rank===b.rank&&a.suit===b.suit}
function bankerDraw(bs,pv){
  if(pv===null)return bs<=5;
  if(bs<=2)return true;
  if(bs===3)return pv!==8;
  if(bs===4)return pv>=2&&pv<=7;
  if(bs===5)return pv>=4&&pv<=7;
  if(bs===6)return pv===6||pv===7;
  return false;
}
function clearCards(){el.playerCards.innerHTML="";el.bankerCards.innerHTML="";el.playerScore.textContent="0";el.bankerScore.textContent="0"}
function renderOne(side,card,delay=0){
  setTimeout(()=>{
    const box=side==="player"?el.playerCards:el.bankerCards;
    const d=document.createElement("div");
    d.className="card "+((card.suit==="♥"||card.suit==="♦")?"red":"");
    d.innerHTML=`${card.rank}<small>${card.suit}</small>`;
    box.appendChild(d);beep(520+box.children.length*45);
  },delay);
}
function makeRound(){
  const p=[draw(),draw()], b=[draw(),draw()];
  let ps=score(p),bs=score(b),pThird=null;
  if(ps<8&&bs<8){
    if(ps<=5){pThird=draw();p.push(pThird);bs=score(b);if(bankerDraw(bs,value(pThird)))b.push(draw());}
    else if(bs<=5)b.push(draw());
  }
  ps=score(p);bs=score(b);
  const winner=ps>bs?"player":bs>ps?"banker":"tie";
  const total=p.length+b.length;
  return {p,b,ps,bs,winner,total,flags:{playerPair:isPair(p[0],p[1]),bankerPair:isPair(b[0],b[1]),anyPair:isPair(p[0],p[1])||isPair(b[0],b[1]),perfectPair:isPerfectPair(p[0],p[1])||isPerfectPair(b[0],b[1]),big:total>=5,small:total===4}};
}
function startRound(){
  if(locked)return;
  if(totalBet()<=0){msg("请先下注");beep(220,.08);return;}
  locked=true;stopTimer();clearWin();clearCards();msg("发牌中...");
  roundNo++;
  const r=makeRound();
  const seq=[["player",r.p[0]],["banker",r.b[0]],["player",r.p[1]],["banker",r.b[1]]];
  if(r.p[2])seq.push(["player",r.p[2]]); if(r.b[2])seq.push(["banker",r.b[2]]);
  seq.forEach((x,i)=>renderOne(x[0],x[1],260*i));
  setTimeout(()=>{el.playerScore.textContent=r.ps;el.bankerScore.textContent=r.bs;settle(r);},seq.length*260+520);
}
function settle(r){
  let payout=0, wins=[];
  if(r.winner==="player"){payout+=bets.player*payTable.player;wins.push("player");}
  if(r.winner==="banker"){payout+=bets.banker*payTable.banker;wins.push("banker");}
  if(r.winner==="tie"){payout+=bets.tie*payTable.tie+bets.player+bets.banker;wins.push("tie");}
  ["playerPair","bankerPair","anyPair","perfectPair","big","small"].forEach(k=>{if(r.flags[k]){payout+=bets[k]*payTable[k];wins.push(k)}});
  balance+=Math.floor(payout);
  history.push(r.winner); if(history.length>120)history.shift();
  wins.forEach(k=>document.querySelector(`[data-bet="${k}"]`)?.classList.add("win"));
  const name=betNames[r.winner];
  const net=Math.floor(payout)-lastBetTotal;
  msg(`${name}赢　闲 ${r.ps} / 庄 ${r.bs}　${net>=0?"净赢 +"+net:"净输 "+net}`);
  beep(net>=0?880:260,.12);
  lastBets={...bets};
  betKeys.forEach(k=>bets[k]=0);
  locked=false;countdown=15;save();updateUI();renderRoads();startTimer();
}
let lastBetTotal=0;
function placeBet(type,fromRepeat=false){
  if(locked)return;
  if(balance<selectedChip){msg("模拟余额不足");beep(180,.08);return;}
  balance-=selectedChip;bets[type]+=selectedChip;lastBetTotal=totalBet();
  const box=document.querySelector(`[data-bet="${type}"]`);box?.classList.add("has-bet");
  if(!fromRepeat)flyChip(box);
  msg(`已下注 ${betNames[type]} ${moneyText(selectedChip)}`);beep(660,.045);updateUI();
}
function flyChip(target){
  if(!target)return;
  const rack=document.querySelector(".chip.active")?.getBoundingClientRect();const to=target.getBoundingClientRect();if(!rack)return;
  el.chipFly.classList.remove("go");el.chipFly.style.left=rack.left+rack.width/2-20+"px";el.chipFly.style.top=rack.top+rack.height/2-20+"px";
  el.chipFly.style.setProperty("--dx",(to.left+to.width/2-rack.left-rack.width/2)+"px");el.chipFly.style.setProperty("--dy",(to.top+to.height/2-rack.top-rack.height/2)+"px");
  void el.chipFly.offsetWidth;el.chipFly.classList.add("go");
}
function repeatBet(){
  if(locked||!lastBets){msg("暂无上一局下注");return;}
  const need=Object.values(lastBets).reduce((a,b)=>a+b,0);if(balance<need){msg("余额不足，无法重复下注");return;}
  betKeys.forEach(k=>{balance-=lastBets[k];bets[k]+=lastBets[k];});lastBetTotal=totalBet();msg("已重复上一局下注");beep(700);updateUI();
}
function undoBet(){
  if(locked)return;
  for(let i=betKeys.length-1;i>=0;i--){const k=betKeys[i];if(bets[k]>0){const v=Math.min(selectedChip,bets[k]);bets[k]-=v;balance+=v;msg(`已撤销 ${betNames[k]} ${moneyText(v)}`);break;}}
  lastBetTotal=totalBet();updateUI();
}
function clearBets(){if(locked)return;balance+=totalBet();betKeys.forEach(k=>bets[k]=0);lastBetTotal=0;msg("已清空下注");updateUI();clearWin()}
function clearWin(){document.querySelectorAll(".bet-box").forEach(x=>x.classList.remove("win"))}
function resetAll(){
  balance=100000;history=[];shoeNo=0;roundNo=0;betKeys.forEach(k=>bets[k]=0);lastBets=null;initShoe();clearCards();msg("已重置模拟数据");updateUI();renderRoads();
}
function updateUI(){
  el.balance.textContent=moneyText(balance);el.shoeNo.textContent=String(shoeNo).padStart(2,"0");el.roundNo.textContent=String(roundNo).padStart(3,"0");el.cardsLeft.textContent=shoe.length;
  el.soundBtn.textContent=soundOn?"🔊":"🔇";
  betKeys.forEach(k=>{const node=$("bet_"+k);if(node)node.textContent=bets[k]?moneyText(bets[k]):"0";const box=document.querySelector(`[data-bet="${k}"]`);box?.classList.toggle("has-bet",bets[k]>0);});
  el.bankerWins.textContent=history.filter(x=>x==="banker").length;el.playerWins.textContent=history.filter(x=>x==="player").length;el.tieWins.textContent=history.filter(x=>x==="tie").length;
}
function renderRoads(){
  el.beadRoad.innerHTML="";el.bigRoad.innerHTML="";el.eyeRoad.innerHTML="";el.smallRoad.innerHTML="";
  history.slice(-72).forEach(x=>{const d=document.createElement("div");d.className="dot "+x;d.textContent=x==="player"?"闲":x==="banker"?"庄":"和";el.beadRoad.appendChild(d);});
  history.slice(-72).forEach(x=>{const d=document.createElement("div");d.className="big-dot "+x;el.bigRoad.appendChild(d);});
  history.slice(-80).forEach((x,i)=>{const d=document.createElement("div");d.className="tiny-dot "+(i%3===0?x:(x==="tie"?"tie":x));el.eyeRoad.appendChild(d.cloneNode());el.smallRoad.appendChild(d);});
}
function buildChips(){
  el.chipRack.innerHTML="";chipValues.forEach(v=>{const c=document.createElement("button");c.className="chip"+(v===selectedChip?" active":"");c.dataset.chip=v;c.textContent=moneyText(v);c.addEventListener("pointerdown",()=>{selectedChip=v;document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");msg("筹码 "+moneyText(v));beep(440,.04);});el.chipRack.appendChild(c);});
}
function startTimer(){stopTimer();el.countdown.classList.remove("low");el.countdown.textContent=countdown;timer=setInterval(()=>{if(locked)return;countdown--;el.countdown.textContent=countdown;el.countdown.classList.toggle("low",countdown<=5);if(countdown<=0)startRound();},1000)}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}

function bind(){
  document.querySelectorAll(".bet-box").forEach(b=>b.addEventListener("pointerdown",e=>{e.preventDefault();placeBet(b.dataset.bet)}));
  el.dealBtn.addEventListener("pointerdown",e=>{e.preventDefault();startRound()});
  el.repeatBtn.addEventListener("pointerdown",e=>{e.preventDefault();repeatBet()});
  el.undoBtn.addEventListener("pointerdown",e=>{e.preventDefault();undoBet()});
  el.clearBtn.addEventListener("pointerdown",e=>{e.preventDefault();clearBets()});
  el.soundBtn.addEventListener("pointerdown",e=>{e.preventDefault();soundOn=!soundOn;save();updateUI();beep(900)});
  el.clearBtn.addEventListener("dblclick",resetAll);
}

if(!shoe.length)initShoe();
buildChips();bind();updateUI();renderRoads();startTimer();
