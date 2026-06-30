let money = parseInt(localStorage.getItem("money") || "10000");
let bet = null;
let betAmount = 1000;

let shoe = [];
let playerHand = [];
let bankerHand = [];

// ===== 生成8副牌 =====
function initShoe() {
    shoe = [];
    for (let d = 0; d < 8; d++) {
        for (let i = 0; i < 52; i++) {
            let v = (i % 13) + 1;
            if (v > 9) v = 0;
            shoe.push(v);
        }
    }
    shuffle(shoe);
}

// 洗牌
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// 抽牌
function draw() {
    return shoe.pop();
}

// 点数
function score(hand) {
    return hand.reduce((a,b)=>a+b,0)%10;
}

// 下注
function placeBet(type){
    bet = type;
    document.getElementById("result").innerText = "已下注：" + type;
}

// 发牌
function deal(){

    if(!bet){
        alert("请先下注");
        return;
    }

    playerHand = [draw(), draw()];
    bankerHand = [draw(), draw()];

    let p = score(playerHand);
    let b = score(bankerHand);

    // ===== 闲补牌 =====
    let playerThird = null;
    if(p <= 5){
        playerHand.push(draw());
        playerThird = playerHand[2];
    }

    // ===== 庄补牌（简化核心规则版）=====
    let bankerThird = null;
    let bScore = score(bankerHand);

    if(bScore <= 2){
        bankerHand.push(draw());
    } else if(bScore === 3 && playerThird !== 8){
        bankerHand.push(draw());
    } else if(bScore === 4 && [2,3,4,5,6,7].includes(playerThird)){
        bankerHand.push(draw());
    } else if(bScore === 5 && [4,5,6,7].includes(playerThird)){
        bankerHand.push(draw());
    } else if(bScore === 6 && [6,7].includes(playerThird)){
        bankerHand.push(draw());
    }

    let finalP = score(playerHand);
    let finalB = score(bankerHand);

    let result = "";

    if(finalP > finalB) result = "player";
    else if(finalB > finalP) result = "banker";
    else result = "tie";

    if(result === bet){
        money += betAmount;
    } else {
        money -= betAmount;
    }

    localStorage.setItem("money", money);

    document.getElementById("money").innerText = money;
    document.getElementById("result").innerText =
        `结果：${result} | 闲:${finalP} 庄:${finalB}`;

    bet = null;
}

// 初始化
initShoe();
document.getElementById("money").innerText = money;
console.log("update");
