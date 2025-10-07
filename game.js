let hunger = 100;
let mood = 100;
let clean = 100;
let energy = 100;

function updateStats() {
  document.getElementById('hunger').textContent = hunger;
  document.getElementById('mood').textContent = mood;
  document.getElementById('clean').textContent = clean;
  document.getElementById('energy').textContent = energy;
}

function feedPet() {
  hunger = Math.min(hunger + 20, 100);
  mood = Math.min(mood + 5, 100);
  updateStats();
}

function playWithPet() {
  mood = Math.min(mood + 15, 100);
  energy = Math.max(energy - 10, 0);
  hunger = Math.max(hunger - 5, 0);
  updateStats();
}

function cleanPet() {
  clean = 100;
  mood = Math.min(mood + 10, 100);
  updateStats();
}

function restPet() {
  energy = 100;
  hunger = Math.max(hunger - 10, 0);
  updateStats();
}

// автоматическое уменьшение показателей со временем
setInterval(() => {
  hunger = Math.max(hunger - 1, 0);
  mood = Math.max(mood - 1, 0);
  clean = Math.max(clean - 1, 0);
  energy = Math.max(energy - 1, 0);
  updateStats();
}, 60000); // каждую минуту
