// Инициализация
let level = parseInt(localStorage.getItem('level')) || 1;
let progress = parseFloat(localStorage.getItem('progress')) || 0;
let coins = parseInt(localStorage.getItem('coins')) || 10;
let lastFeed = parseInt(localStorage.getItem('lastFeed')) || 0;
let lastPlay = parseInt(localStorage.getItem('lastPlay')) || 0;
let lastWalk = parseInt(localStorage.getItem('lastWalk')) || 0;

const feedBtn = document.getElementById('feed-btn');
const playBtn = document.getElementById('play-btn');
const walkBtn = document.getElementById('walk-btn');
const levelText = document.getElementById('level');
const progressBar = document.getElementById('progress-bar');
const coinsText = document.getElementById('coins');

function updateUI(){
    levelText.textContent = `Уровень: ${level}`;
    progressBar.style.width = `${progress}%`;
    coinsText.textContent = `Монеты: ${coins}`;
    playBtn.disabled = level < 2;
    walkBtn.disabled = level < 2;
}

function saveData(){
    localStorage.setItem('level', level);
    localStorage.setItem('progress', progress);
    localStorage.setItem('coins', coins);
    localStorage.setItem('lastFeed', lastFeed);
    localStorage.setItem('lastPlay', lastPlay);
    localStorage.setItem('lastWalk', lastWalk);
}

// Кормление
feedBtn.addEventListener('click', () => {
    let now = Date.now();
    if(now - lastFeed < 10*60*1000 && lastFeed != 0){
        alert("Покормить можно только раз в 10 минут (макс 5 раз за 10 минут)");
        return;
    }
    lastFeed = now;
    progress += 0.75;
    if(level === 1){ level = 2; } // Первое кормление повышает уровень
    if(progress >= 100){ progress -= 100; level +=1; }
    saveData();
    updateUI();
});

// Играть с игрушкой
playBtn.addEventListener('click', () => {
    let now = Date.now();
    if(now - lastPlay < 10*60*1000 && lastPlay !=0){ alert("Играть можно раз в 10 минут"); return; }
    lastPlay = now;
    progress += 0.35;
    if(progress >=100){ progress -=100; level +=1; }
    saveData();
    updateUI();
});

// Прогулка
walkBtn.addEventListener('click', () => {
    let now = Date.now();
    if(now - lastWalk < 60*60*1000 && lastWalk !=0){ alert("Прогулка доступна раз в час"); return; }
    lastWalk = now;
    progress += 3;
    coins +=30;
    if(progress>=100){ progress -=100; level +=1; }
    saveData();
    updateUI();
});

// Инициализация UI
updateUI();