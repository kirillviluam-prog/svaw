// --- Статистика питомца ---
let coins = parseInt(localStorage.getItem('coins')) || 0;
let hunger = parseInt(localStorage.getItem('hunger')) || 50;
let happiness = parseInt(localStorage.getItem('happiness')) || 50;

const coinsEl = document.getElementById('coins');
const hungerEl = document.getElementById('hunger');
const happinessEl = document.getElementById('happiness');

function updateUI() {
    coinsEl.textContent = coins;
    hungerEl.textContent = hunger;
    happinessEl.textContent = happiness;
    localStorage.setItem('coins', coins);
    localStorage.setItem('hunger', hunger);
    localStorage.setItem('happiness', happiness);
}

// --- Действия ---
function feedPet() {
    if (coins >= 5) {
        coins -= 5;
        hunger = Math.min(hunger + 20, 100);
        happiness = Math.min(happiness + 10, 100);
        animatePet('feed');
        spawnCoin(5);
        updateUI();
    } else alert("Недостаточно монет!");
}

function playWithPet() {
    happiness = Math.min(happiness + 20, 100);
    coins += 2;
    hunger = Math.max(hunger - 10, 0);
    animatePet('play');
    spawnCoin(2);
    updateUI();
}

function cleanPet() {
    happiness = Math.min(happiness + 15, 100);
    coins += 1;
    animatePet('clean');
    spawnCoin(1);
    updateUI();
}

// Авто уменьшение показателей
setInterval(()=>{
    hunger = Math.max(hunger - 1,0);
    happiness = Math.max(happiness - 1,0);
    updateUI();
},5000);

updateUI();

// --- Three.js 3D питомец ---
const container = document.getElementById('pet-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8edea);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Свет
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5,5,5);
scene.add(light);
const ambient = new THREE.AmbientLight(0xffffff,0.6);
scene.add(ambient);

// Питомец: тело
const body = new THREE.Mesh(
    new THREE.SphereGeometry(1,32,32),
    new THREE.MeshStandardMaterial({color:0xff99cc})
);
scene.add(body);

// Глаза
const eyeMaterial = new THREE.MeshStandardMaterial({color:0x000000});
const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.15,16,16), eyeMaterial);
const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.15,16,16), eyeMaterial);
leftEye.position.set(-0.35,0.3,0.9);
rightEye.position.set(0.35,0.3,0.9);
body.add(leftEye); body.add(rightEye);

// Позиция камеры
camera.position.z = 5;

// --- Частицы вокруг питомца ---
const particleCount = 100;
const particles = new THREE.Group();
for(let i=0;i<particleCount;i++){
    const pMat = new THREE.MeshBasicMaterial({color:0xffff00});
    const pGeom = new THREE.SphereGeometry(0.02,8,8);
    const p = new THREE.Mesh(pGeom,pMat);
    p.position.set((Math.random()-0.5)*4, Math.random()*2, (Math.random()-0.5)*2);
    particles.add(p);
}
scene.add(particles);

// --- Анимации питомца ---
let jump = 0;
function animatePet(action){
    let scale = 1;
    if(action==='feed') scale=1.2;
    if(action==='play') scale=1.3;
    if(action==='clean') scale=1.15;

    jump=0.3;
    const duration=200;
    const start=performance.now();
    function step(time){
        const t=(time-start)/duration;
        if(t<1){
            body.scale.set(scale - t*(scale-1), scale - t*(scale-1), scale - t*(scale-1));
            requestAnimationFrame(step);
        } else body.scale.set(1,1,1);
    }
    requestAnimationFrame(step);
}

// --- Анимация монет ---
function spawnCoin(value){
    const spriteMap = new THREE.TextureLoader().load('assets/coin.png');
    const material = new THREE.SpriteMaterial({map:spriteMap, transparent:true});
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0,1.2,0);
    sprite.scale.set(0.5,0.5,0.5);
    scene.add(sprite);
    let alpha=1;
    function animateCoin(){
        sprite.position.y +=0.02;
        alpha-=0.02;
        material.opacity=alpha;
        if(alpha>0) requestAnimationFrame(animateCoin);
        else scene.remove(sprite);
    }
    animateCoin();
}

// --- Основной рендер ---
function animate(){
    requestAnimationFrame(animate);
    body.rotation.y +=0.01;
    body.position.y = Math.sin(Date.now()*0.003)*jump;
    // Частицы движение
    particles.children.forEach(p=>{
        p.position.y += Math.sin(Date.now()*0.001+p.position.x)*0.001;
    });
    renderer.render(scene,camera);
}
animate();

// --- Адаптивность ---
window.addEventListener('resize', ()=>{
    camera.aspect = container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth,container.clientHeight);
});
