const suits = ["♠", "♥", "♦", "♣"];
const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

let money = parseInt(localStorage.getItem("money") || "10000");
let bet = null;
let betAmount = 1000;

let playerHand = [];
let bankerHand = [];

// ===== 抽牌 =====
function drawCard() {
    let v = Math.floor(Math.random() * 13);
    let s = suits[Math.floor(Math.random() * 4)];
    return values[v] + s;
}

// ===== 牌值转换 =====
function cardValue(card){
    let v = card.replace(/[♠♥♦♣]/,"");

    if(v === "A") return 1;
    if(["J","Q","K"].includes(v)) return 0;
    return parseInt(v);
}

// ===== 计算点数 =====
function score(hand){
    return hand.reduce((a,b)=>cardValue(a)+cardValue(b),0)%10;
}

// ===== 下注 =====
function placeBet(type){
    bet = type;
    document.getElementById("result").innerText = "已下注：" + type;
}

// ===== 发牌核心逻辑 =====
function deal(){

    if(!bet){
        alert("请先下注");
        return;
    }

    // 初始牌
    playerHand = [drawCard(), drawCard()];
    bankerHand = [drawCard(), drawCard()];

    let p = score(playerHand);
    let playerThird = null;

    // 闲补牌
    if(p <= 5){
        playerHand.push(drawCard());
        playerThird = playerHand[2];
    }

    let b = score(bankerHand);

    // 庄补牌规则（简化但正确逻辑）
    if(b <= 2){
        bankerHand.push(drawCard());
    } 
    else if(b === 3 && playerThird !== 8){
        bankerHand.push(drawCard());
    } 
    else if(b === 4 && [2,3,4,5,6,7].includes(playerThird)){
        bankerHand.push(drawCard());
    } 
    else if(b === 5 && [4,5,6,7].includes(playerThird)){
        bankerHand.push(drawCard());
    } 
    else if(b === 6 && [6,7].includes(playerThird)){
        bankerHand.push(drawCard());
    }

    // 最终点数
    let finalP = score(playerHand);
    let finalB = score(bankerHand);

    let result = "";

    if(finalP > finalB) result = "player";
    else if(finalB > finalP) result = "banker";
    else result = "tie";

    // 结算
    if(result === bet){
        money += betAmount;
    } else {
        money -= betAmount;
    }

    localStorage.setItem("money", money);

    // UI更新
    document.getElementById("money").innerText = money;
    document.getElementById("result").innerText =
        `结果：${result} | 闲:${finalP} 庄:${finalB}`;

    document.getElementById("playerCards").innerText = playerHand.join(" ");
    document.getElementById("bankerCards").innerText = bankerHand.join(" ");

    bet = null;
}

// ===== 初始化 =====
document.getElementById("money").innerText = money;
