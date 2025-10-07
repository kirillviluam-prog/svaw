const mathModal = document.getElementById('math-modal');
const mathClose = document.getElementById('math-close');
const mathQuestion = document.getElementById('math-question');
const mathAnswer = document.getElementById('math-answer');
const mathSubmit = document.getElementById('math-submit');

document.getElementById('earn-btn').addEventListener('click', () => {
    if(coins <=0){
        showNotification("Недостаточно монет");
        return;
    }
    generateQuestion();
    mathModal.style.display = "block";
});

mathClose.onclick = () => { mathModal.style.display = "none"; }

function generateQuestion(){
    let a = Math.floor(Math.random()*100)+1;
    let b = Math.floor(Math.random()*100)+1;
    let ops = ['+','-','*','/'];
    let op = ops[Math.floor(Math.random()*ops.length)];
    if(op === '/'){ b = Math.floor(Math.random()*10)+1; a = b * Math.floor(Math.random()*10+1); } // целое деление
    mathQuestion.textContent = `${a} ${op} ${b} = ?`;
    mathQuestion.dataset.answer = eval(a+op+b);
}

mathSubmit.addEventListener('click', ()=>{
    let ans = parseFloat(mathAnswer.value);
    let correct = parseFloat(mathQuestion.dataset.answer);
    if(ans === correct){
        coins +=1;
        progress +=0.1;
    } else {
        coins = Math.max(0, coins-1);
        progress = Math.max(0, progress-0.5);
    }
    saveData();
    updateUI();
    mathAnswer.value = '';
    mathModal.style.display = "none";
});

function showNotification(msg){
    const notif = document.getElementById('notification');
    const notifText = document.getElementById('notif-text');
    const notifClose = document.getElementById('notif-close');
    notifText.textContent = msg;
    notif.style.display = "block";
    notifClose.onclick = () => { notif.style.display = "none"; }
}