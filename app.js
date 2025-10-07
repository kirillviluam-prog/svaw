const CLIENT_ID = 'b5a0c12ba7154ea2836d4f4fcde3fb21';
const REDIRECT_URI = 'https://kirillviluam-prog.github.io/svaw/callback.html';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-private',
  'user-library-modify',
  'user-read-currently-playing'
].join(' ');

let accessToken = null;
let tokenExpiry = null;
let pool = [];
let currentIndex = 0;
let audio = null;

const loginBtn = document.getElementById('loginBtn');
const authStatus = document.getElementById('authStatus');
const playerSection = document.getElementById('player');
const filtersSection = document.getElementById('filters');
const coverImg = document.getElementById('cover');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const metaGenre = document.getElementById('metaGenre');
const metaReleased = document.getElementById('metaReleased');
const poolCount = document.getElementById('poolCount');
const genreListDiv = document.getElementById('genreList');
const genreSearch = document.getElementById('genreSearch');
const selectedGenresDiv = document.getElementById('selectedGenres');
const buildPoolBtn = document.getElementById('buildPoolBtn');
const playPoolBtn = document.getElementById('playPoolBtn');
const playBtn = document.getElementById('playBtn');
const nextBtn = document.getElementById('nextBtn');
const likeBtn = document.getElementById('likeBtn');
const logEl = document.getElementById('log');

let availableGenres = [];
let selectedGenres = [];
let popularityFilter = 'all';
let decadeRange = 'all';

function log(msg){ logEl.textContent = msg; }
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function init(){
  bindUI();

  const hash = location.hash.substring(1);
  if(hash){
    const params = new URLSearchParams(hash);
    if(params.get('access_token')){
      accessToken = params.get('access_token');
      tokenExpiry = Date.now() + parseInt(params.get('expires_in')||'0',10)*1000;
      history.replaceState(null,'',location.pathname + location.search);
      onLoggedIn();
      return;
    }
  }

  const stored = sessionStorage.getItem('spotify_access_token');
  const stored_exp = sessionStorage.getItem('spotify_token_expiry');
  if(stored && stored_exp && Date.now() < parseInt(stored_exp,10)){
    accessToken = stored;
    tokenExpiry = parseInt(stored_exp,10);
    onLoggedIn();
  }
}

function bindUI(){
  loginBtn.onclick = startImplicitAuth;
  buildPoolBtn.onclick = buildPool;
  playPoolBtn.onclick = playPool;
  playBtn.onclick = togglePlay;
  nextBtn.onclick = playNext;
  likeBtn.onclick = likeCurrent;
}

function startImplicitAuth(){
  const url = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('response_type','token');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  window.location.href = url.toString();
}

async function onLoggedIn(){
  authStatus.textContent = 'Logged in (implicit)';
  show(playerSection);
  show(filtersSection);
  sessionStorage.setItem('spotify_access_token', accessToken);
  if(tokenExpiry) sessionStorage.setItem('spotify_token_expiry', tokenExpiry.toString());
  await loadGenreSeeds();
  log('Ready. Build pool and play previews.');
}

async function loadGenreSeeds(){
  try{
    const r = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
      headers:{Authorization:'Bearer '+accessToken}
    });
    const data = await r.json();
    availableGenres = data.genres || [];
    renderGenreList(availableGenres);
  }catch(e){ log('Failed to load genres: '+e.message); }
}

function renderGenreList(list){
  genreListDiv.innerHTML = '';
  list.forEach(g=>{
    const el = document.createElement('div');
    el.textContent = g;
    el.className = 'genreItem';
    el.onclick = ()=>{
      if(!selectedGenres.includes(g)){
        selectedGenres.push(g);
        renderSelectedGenres();
      }
    };
    genreListDiv.appendChild(el);
  });
}

function renderSelectedGenres(){
  selectedGenresDiv.innerHTML = '';
  selectedGenres.forEach(g=>{
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = g+' ✕';
    chip.onclick = ()=>{
      selectedGenres = selectedGenres.filter(x=>x!==g);
      renderSelectedGenres();
    };
    selectedGenresDiv.appendChild(chip);
  });
}

async function buildPool(){
  if(!accessToken){ log('Авторизуйтесь'); return; }
  pool = [];
  const qParts = [];
  if(selectedGenres.length) qParts.push('(' + selectedGenres.map(g=>`genre:"${g}"`).join(' OR ') + ')');
  if(decadeRange!=='all'){
    if(decadeRange==='<'1950') qParts.push('year:..1949');
    else qParts.push(`year:${decadeRange}`);
  }
  let popQuery='';
  if(popularityFilter==='high') popQuery='popularity:50..100';
  if(popularityFilter==='low') popQuery='popularity:0..49';
  if(popQuery) qParts.push(popQuery);
  const q = qParts.join(' AND ');
  try{
    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.set('q', q || '');
    url.searchParams.set('type','track');
    url.searchParams.set('limit','50');
