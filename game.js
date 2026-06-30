const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

let money = Number(localStorage.getItem("vip_money") || 10000);
let history = JSON.parse(localStorage.getItem("vip_history") || "[]");
let betHistory = JSON.parse(localStorage.getItem("vip_bet_history") || "[]");
let soundOn = localStorage.getItem("vip_sound") !== "off";

let shoe = [];
let betType = null;
let lastBetType = null;
let betAmount = 1000;
let lastBetAmount = 1000;
let locked = false;

const el = {
  money: document.getElementById("money"),
  playerCards: document.getElementById("playerCards"),
  bankerCards: document.getElementById("bankerCards"),
  playerScore: document.getElementById("playerScore"),
  bankerScore: document.getElementById("bankerScore"),
  message: document.getElementById("message"),
  table: document.getElementById("table"),
  soundBtn: document.getElementById("soundBtn"),
  dealBtn: document.getElementById("dealBtn"),
  repeatBtn: document.getElementById("repeatBtn"),
  resetBtn: document.getElementById("resetBtn"),
  rounds: document.getElementById("rounds"),
  pWins: document.getElementById("pWins"),
  bWins: document.getElementById("bWins"),
  tWins: document.getElementById("tWins"),
  winRate: document.getElementById("winRate"),
  streak: document.getElementById("streak"),
  beadRoad: document.getElementById("beadRoad"),
  bigRoad: document.getElementById("bigRoad")
};

function save(){
  localStorage.setItem("vip_money", String(money));
  localStorage.setItem("vip_history", JSON.stringify(history));
  localStorage.setItem("vip_bet_history", JSON.stringify(betHistory));
  localStorage.setItem("vip_sound", soundOn ? "on" : "off");
}

function beep(freq = 520, duration = 0.07){
  if(!soundOn) return;

  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq;
    gain.gain.value = 0.055;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }catch(e){}
}

function initShoe(){
  shoe = [];

  for(let d = 0; d < 8; d++){
    for(const suit of suits){
      for(const rank of ranks){
        shoe.push({ rank, suit });
      }
    }
  }

  for(let i = shoe.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
}

function draw(){
  if(shoe.length < 20){
    initShoe();
    showMessage("重新洗牌");
  }

  return shoe.pop();
}

function cardValue(card){
  if(card.rank === "A") return 1;
  if(["10", "J", "Q", "K"].includes(card.rank)) return 0;
  return Number(card.rank);
}

function score(hand){
  return hand.reduce((sum, card) => sum + cardValue(card), 0) % 10;
}

function renderCards(target, hand){
  target.innerHTML = hand.map(card => {
    const red = card.suit === "♥" || card.suit === "♦" ? "red" : "";
    return `<span class="card ${red}">${card.rank}${card.suit}</span>`;
  }).join("");
}

function showMessage(text){
  el.message.textContent = text;
}

function selectChip(amount){
  if(locked) return;

  betAmount = amount;

  document.querySelectorAll(".chip").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`[data-chip="${amount}"]`).classList.add("active");

  showMessage(`已选择筹码：${amount}`);
  beep(450, 0.05);
}

function placeBet(type){
  if(locked) return;

  betType = type;
  lastBetType = type;
  lastBetAmount = betAmount;

  document.querySelectorAll(".betZone").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`[data-bet="${type}"]`).classList.add("active");

  const name = type === "player" ? "闲" : type === "banker" ? "庄" : "和";
  showMessage(`已下注：${name} ${betAmount}`);

  beep(650, 0.05);
}

function repeatBet(){
  if(locked) return;
  if(!lastBetType){
    showMessage("还没有上一局下注");
    return;
  }

  betAmount = lastBetAmount;
  selectChip(betAmount);
  placeBet(lastBetType);
}

function clearRoundUI(){
  el.playerCards.innerHTML = "";
  el.bankerCards.innerHTML = "";
  el.playerScore.textContent = "-";
  el.bankerScore.textContent = "-";
}

function deal(){
  if(locked) return;

  if(!betType){
    alert("请先选择庄、闲或和");
    return;
  }

  if(money < betAmount){
    alert("资金不足");
    return;
  }

  locked = true;
  clearRoundUI();
  showMessage("发牌中...");

  const player = [];
  const banker = [];

  setTimeout(() => {
    player.push(draw());
    renderCards(el.playerCards, player);
    beep(520, 0.05);
  }, 220);

  setTimeout(() => {
    banker.push(draw());
    renderCards(el.bankerCards, banker);
    beep(540, 0.05);
  }, 520);

  setTimeout(() => {
    player.push(draw());
    renderCards(el.playerCards, player);
    beep(560, 0.05);
  }, 820);

  setTimeout(() => {
    banker.push(draw());
    renderCards(el.bankerCards, banker);
    beep(580, 0.05);
  }, 1120);

  setTimeout(() => resolveRound(player, banker), 1450);
}

function resolveRound(player, banker){
  let pScore = score(player);
  let bScore = score(banker);

  const natural = pScore >= 8 || bScore >= 8;
  let playerThird = null;

  if(!natural){
    if(pScore <= 5){
      playerThird = draw();
      player.push(playerThird);
      renderCards(el.playerCards, player);
      beep(630, 0.05);
    }

    const b = score(banker);
    const pv = playerThird ? cardValue(playerThird) : null;

    if(playerThird === null){
      if(b <= 5){
        banker.push(draw());
        beep(650, 0.05);
      }
    }else{
      if(b <= 2) banker.push(draw());
      else if(b === 3 && pv !== 8) banker.push(draw());
      else if(b === 4 && [2,3,4,5,6,7].includes(pv)) banker.push(draw());
      else if(b === 5 && [4,5,6,7].includes(pv)) banker.push(draw());
      else if(b === 6 && [6,7].includes(pv)) banker.push(draw());
    }
  }

  renderCards(el.playerCards, player);
  renderCards(el.bankerCards, banker);

  pScore = score(player);
  bScore = score(banker);

  el.playerScore.textContent = pScore;
  el.bankerScore.textContent = bScore;

  let result = "tie";

  if(pScore > bScore) result = "player";
  else if(bScore > pScore) result = "banker";

  settle(result, pScore, bScore);
}

function settle(result, pScore, bScore){
  let profit = 0;
  let detail = "";

  if(result === "tie"){
    if(betType === "tie"){
      profit = betAmount * 8;
      detail = `和局命中 +${profit}`;
    }else{
      profit = 0;
      detail = "和局，庄/闲退回";
    }
  }else if(result === betType){
    if(result === "banker"){
      profit = Math.floor(betAmount * 0.95);
    }else{
      profit = betAmount;
    }

    detail = `赢了 +${profit}`;
  }else{
    profit = -betAmount;
    detail = `输了 ${profit}`;
  }

  money += profit;

  history.push(result);
  betHistory.push(profit > 0 ? "win" : profit < 0 ? "lose" : "push");

  if(history.length > 100) history.shift();
  if(betHistory.length > 100) betHistory.shift();

  const resultName = result === "player" ? "闲胜" : result === "banker" ? "庄胜" : "和局";

  showMessage(`${resultName}｜闲:${pScore} 庄:${bScore}｜${detail}`);

  if(profit > 0){
    el.table.classList.add("winFlash");
    beep(920, 0.09);
    setTimeout(() => el.table.classList.remove("winFlash"), 850);
  }else{
    beep(260, 0.08);
  }

  betType = null;
  locked = false;

  document.querySelectorAll(".betZone").forEach(btn => btn.classList.remove("active"));

  save();
  updateUI();
}

function currentStreak(){
  let streak = 0;

  for(let i = betHistory.length - 1; i >= 0; i--){
    if(betHistory[i] === "win") streak++;
    else if(betHistory[i] === "lose") break;
  }

  return streak;
}

function updateRoads(){
  el.beadRoad.innerHTML = history.map(item => {
    const text = item === "player" ? "闲" : item === "banker" ? "庄" : "和";
    return `<div class="dot ${item}">${text}</div>`;
  }).join("");

  el.bigRoad.innerHTML = history.map(item => {
    return `<div class="bigDot ${item}"></div>`;
  }).join("");
}

function updateUI(){
  el.money.textContent = money;
  el.soundBtn.textContent = soundOn ? "🔊" : "🔇";

  el.rounds.textContent = history.length;
  el.pWins.textContent = history.filter(x => x === "player").length;
  el.bWins.textContent = history.filter(x => x === "banker").length;
  el.tWins.textContent = history.filter(x => x === "tie").length;

  const wins = betHistory.filter(x => x === "win").length;
  const losses = betHistory.filter(x => x === "lose").length;
  const total = wins + losses;

  el.winRate.textContent = total ? Math.round(wins / total * 100) + "%" : "0%";
  el.streak.textContent = currentStreak();

  updateRoads();
}

function resetGame(){
  if(!confirm("确定重置资金、路单和统计吗？")) return;

  money = 10000;
  history = [];
  betHistory = [];
  betType = null;
  locked = false;

  initShoe();
  clearRoundUI();
  save();
  updateUI();

  document.querySelectorAll(".betZone").forEach(btn => btn.classList.remove("active"));
  showMessage("已重置");
}

function toggleSound(){
  soundOn = !soundOn;
  save();
  updateUI();
  beep(780, 0.05);
}

document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => selectChip(Number(btn.dataset.chip)));
});

document.querySelectorAll(".betZone").forEach(btn => {
  btn.addEventListener("click", () => placeBet(btn.dataset.bet));
});

el.dealBtn.addEventListener("click", deal);
el.repeatBtn.addEventListener("click", repeatBet);
el.resetBtn.addEventListener("click", resetGame);
el.soundBtn.addEventListener("click", toggleSound);

initShoe();
updateUI();
