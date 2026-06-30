const suits=["♠","♥","♦","♣"];
const ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

let money=Number(localStorage.getItem("live_money")||10000);
let history=JSON.parse(localStorage.getItem("live_history")||"[]");
let betRecord=JSON.parse(localStorage.getItem("live_bets")||"[]");
let soundOn=localStorage.getItem("live_sound")!=="off";

let shoe=[];
let betType=null;
let lastBetType=null;
let betAmount=1000;
let lastBetAmount=1000;
let locked=false;

const $=id=>document.getElementById(id);

const el={
  money:$("money"),
  playerCards:$("playerCards"),
  bankerCards:$("bankerCards"),
  message:$("message"),
  bWins:$("bWins"),
  pWins:$("pWins"),
  tWins:$("tWins"),
  rounds:$("rounds"),
  winRate:$("winRate"),
  beadRoad:$("beadRoad"),
  bigRoad:$("bigRoad"),
  soundBtn:$("soundBtn"),
  dealBtn:$("dealBtn"),
  repeatBtn:$("repeatBtn"),
  cancelBtn:$("cancelBtn")
};

function save(){
  localStorage.setItem("live_money",money);
  localStorage.setItem("live_history",JSON.stringify(history));
  localStorage.setItem("live_bets",JSON.stringify(betRecord));
  localStorage.setItem("live_sound",soundOn?"on":"off");
}

function beep(freq=520,duration=.06){
  if(!soundOn)return;
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.frequency.value=freq;
    gain.gain.value=.045;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime+duration);
  }catch(e){}
}

function initShoe(){
  shoe=[];
  for(let d=0;d<8;d++){
    for(const s of suits){
      for(const r of ranks){
        shoe.push({rank:r,suit:s});
      }
    }
  }
  for(let i=shoe.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [shoe[i],shoe[j]]=[shoe[j],shoe[i]];
  }
}

function draw(){
  if(shoe.length<20)initShoe();
  return shoe.pop();
}

function cardValue(c){
  if(c.rank==="A")return 1;
  if(["10","J","Q","K"].includes(c.rank))return 0;
  return Number(c.rank);
}

function score(hand){
  return hand.reduce((s,c)=>s+cardValue(c),0)%10;
}

function renderCards(target,hand){
  target.innerHTML=hand.map(c=>{
    const red=c.suit==="♥"||c.suit==="♦"?"red":"";
    return `<span class="card ${red}">${c.rank}${c.suit}</span>`;
  }).join("");
}

function msg(t){el.message.textContent=t}

function selectChip(amount){
  if(locked)return;
  betAmount=amount;
  document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
  document.querySelector(`[data-chip="${amount}"]`).classList.add("active");
  msg("已选择筹码："+amount);
  beep(440);
}

function placeBet(type){
  if(locked)return;
  betType=type;
  lastBetType=type;
  lastBetAmount=betAmount;
  document.querySelectorAll(".bet-box").forEach(x=>x.classList.remove("active"));
  document.querySelector(`[data-bet="${type}"]`).classList.add("active");
  const n=type==="player"?"闲":type==="banker"?"庄":"和";
  msg(`已下注：${n} ${betAmount}`);
  beep(660);
}

function repeatBet(){
  if(locked)return;
  if(!lastBetType){msg("暂无上一局下注");return}
  betAmount=lastBetAmount;
  selectChip(betAmount);
  placeBet(lastBetType);
}

function cancelBet(){
  if(locked)return;
  betType=null;
  document.querySelectorAll(".bet-box").forEach(x=>x.classList.remove("active"));
  msg("已取消下注");
}

function deal(){
  if(locked)return;
  if(!betType){alert("请先下注");return}
  if(money<betAmount){alert("资金不足");return}

  locked=true;
  el.playerCards.innerHTML="";
  el.bankerCards.innerHTML="";
  msg("发牌中...");

  let p=[],b=[];

  setTimeout(()=>{p.push(draw());renderCards(el.playerCards,p);beep(520)},220);
  setTimeout(()=>{b.push(draw());renderCards(el.bankerCards,b);beep(540)},520);
  setTimeout(()=>{p.push(draw());renderCards(el.playerCards,p);beep(560)},820);
  setTimeout(()=>{b.push(draw());renderCards(el.bankerCards,b);beep(580)},1120);
  setTimeout(()=>resolveRound(p,b),1450);
}

function resolveRound(p,b){
  let ps=score(p),bs=score(b);
  const natural=ps>=8||bs>=8;
  let p3=null;

  if(!natural){
    if(ps<=5){
      p3=draw();
      p.push(p3);
      renderCards(el.playerCards,p);
      beep(620);
    }

    const bankerScore=score(b);
    const pv=p3?cardValue(p3):null;

    if(p3===null){
      if(bankerScore<=5)b.push(draw());
    }else{
      if(bankerScore<=2)b.push(draw());
      else if(bankerScore===3&&pv!==8)b.push(draw());
      else if(bankerScore===4&&[2,3,4,5,6,7].includes(pv))b.push(draw());
      else if(bankerScore===5&&[4,5,6,7].includes(pv))b.push(draw());
      else if(bankerScore===6&&[6,7].includes(pv))b.push(draw());
    }
  }

  renderCards(el.playerCards,p);
  renderCards(el.bankerCards,b);

  ps=score(p);bs=score(b);

  let result="tie";
  if(ps>bs)result="player";
  else if(bs>ps)result="banker";

  settle(result,ps,bs);
}

function settle(result,ps,bs){
  let profit=0;
  let text="";

  if(result==="tie"){
    if(betType==="tie"){
      profit=betAmount*8;
      text=`和局命中 +${profit}`;
    }else{
      profit=0;
      text="和局退回";
    }
  }else if(result===betType){
    profit=result==="banker"?Math.floor(betAmount*.95):betAmount;
    text=`赢了 +${profit}`;
  }else{
    profit=-betAmount;
    text=`输了 ${profit}`;
  }

  money+=profit;
  history.push(result);
  betRecord.push(profit>0?"win":profit<0?"lose":"push");

  if(history.length>80)history.shift();
  if(betRecord.length>80)betRecord.shift();

  const rn=result==="player"?"闲胜":result==="banker"?"庄胜":"和局";
  msg(`${rn}｜闲:${ps} 庄:${bs}｜${text}`);

  betType=null;
  locked=false;
  document.querySelectorAll(".bet-box").forEach(x=>x.classList.remove("active"));

  save();
  updateUI();
}

function updateUI(){
  el.money.textContent=money;
  el.soundBtn.textContent=soundOn?"🔊":"🔇";
  el.rounds.textContent=history.length;
  el.bWins.textContent=history.filter(x=>x==="banker").length;
  el.pWins.textContent=history.filter(x=>x==="player").length;
  el.tWins.textContent=history.filter(x=>x==="tie").length;

  const wins=betRecord.filter(x=>x==="win").length;
  const losses=betRecord.filter(x=>x==="lose").length;
  const total=wins+losses;
  el.winRate.textContent=total?Math.round(wins/total*100)+"%":"0%";

  el.beadRoad.innerHTML=history.map(x=>{
    const t=x==="banker"?"庄":x==="player"?"闲":"和";
    return `<div class="dot ${x}">${t}</div>`;
  }).join("");

  el.bigRoad.innerHTML=history.map(x=>{
    return `<div class="big-dot ${x}"></div>`;
  }).join("");
}

function toggleSound(){
  soundOn=!soundOn;
  save();
  updateUI();
  beep(800);
}

function resetAll(){
  money=10000;
  history=[];
  betRecord=[];
  betType=null;
  locked=false;
  initShoe();
  save();
  updateUI();
  el.playerCards.innerHTML="";
  el.bankerCards.innerHTML="";
  msg("已重置");
}

document.querySelectorAll(".chip").forEach(x=>{
  x.addEventListener("click",()=>selectChip(Number(x.dataset.chip)));
});
document.querySelectorAll(".bet-box").forEach(x=>{
  x.addEventListener("click",()=>placeBet(x.dataset.bet));
});
el.dealBtn.addEventListener("click",deal);
el.repeatBtn.addEventListener("click",repeatBet);
el.cancelBtn.addEventListener("click",cancelBet);
el.soundBtn.addEventListener("click",toggleSound);

initShoe();
updateUI();
