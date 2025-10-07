/* app.js — Implicit Grant flow + preview playback
   CLIENT_ID and REDIRECT_URI inserted for you.
   NOTE: implicit flow returns access_token in URL hash; no refresh token.
*/
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
let audio = null; // HTMLAudioElement for preview playback

// UI
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
  // parse hash for token (implicit flow)
  const hash = location.hash.substring(1);
  if(hash){
    const params = new URLSearchParams(hash);
    if(params.get('access_token')){
      accessToken = params.get('access_token');
      const expires_in = parseInt(params.get('expires_in')||'0',10);
      tokenExpiry = Date.now() + (expires_in*1000);
      // clean hash from url
      history.replaceState(null, '', location.pathname + location.search);
      onLoggedIn();
      return;
    }
  }
  // also support token stored in sessionStorage (short-lived)
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
  genreSearch.oninput = filterGenreList;
  document.querySelectorAll('.segmented button').forEach(b=>{
    b.onclick = ()=>{ document.querySelectorAll('.segmented button').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); popularityFilter=b.dataset.pop; };
  });
  document.querySelectorAll('.decades button').forEach(b=>{
    b.onclick = ()=>{ document.querySelectorAll('.decades button').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); decadeRange=b.dataset.range; };
  });
}

function startImplicitAuth(){
  const url = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('response_type','token');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('state', 'implicit-'+Math.random().toString(36).slice(2));
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
    if(!r.ok) throw new Error('Failed to get genres ('+r.status+')');
    const data = await r.json();
    availableGenres = data.genres || [];
    renderGenreList(availableGenres);
  }catch(e){
    log('Не удалось загрузить список жанров: '+e.message);
  }
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
    chip.onclick = ()=>{ selectedGenres = selectedGenres.filter(x=>x!==g); renderSelectedGenres(); };
    selectedGenresDiv.appendChild(chip);
  });
}
function filterGenreList(){
  const q = genreSearch.value.trim().toLowerCase();
  renderGenreList(availableGenres.filter(g=>g.includes(q)));
}

async function buildPool(){
  if(!accessToken){ log('Авторизуйтесь сначала'); return; }
  log('Building pool...');
  pool = [];
  const qParts = [];
  if(selectedGenres.length){
    qParts.push('(' + selectedGenres.map(g=>`genre:"${g}"`).join(' OR ') + ')');
  }
  if(decadeRange && decadeRange!=='all'){
    if(decadeRange === '<1950') qParts.push('year:..1949');
    else qParts.push(`year:${decadeRange}`);
  }
  let popQuery = '';
  if(popularityFilter==='high') popQuery = 'popularity:50..100';
  if(popularityFilter==='low') popQuery = 'popularity:0..49';
  if(popQuery) qParts.push(popQuery);
  const q = qParts.length ? qParts.join(' AND ') : '';
  const limit = 50;
  let fetched = 0;
  let offset = 0;
  let total = 0;
  try{
    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.set('q', q || '');
    url.searchParams.set('type', 'track');
    url.searchParams.set('limit', limit);
    url.searchParams.set('offset', offset);
    const r = await fetch(url.toString(), {headers:{Authorization:'Bearer '+accessToken}});
    if(!r.ok) throw new Error(`Search failed ${r.status}`);
    const res = await r.json();
    total = res.tracks.total || 0;
    poolCount.textContent = total;
    pool = pool.concat(res.tracks.items || []);
    fetched += res.tracks.items.length;
    const maxToFetch = 300;
    while(fetched < Math.min(total, maxToFetch)){
      offset += limit;
      url.searchParams.set('offset', offset);
      const r2 = await fetch(url.toString(), {headers:{Authorization:'Bearer '+accessToken}});
      if(!r2.ok) break;
      const res2 = await r2.json();
      pool = pool.concat(res2.tracks.items || []);
      fetched += (res2.tracks.items || []).length;
    }
    log(`Pool built: collected ${'{'}pool.length{'}'} tracks (reported total ${'{'}total{'}'}).`);
  }catch(e){
    log('Ошибка при сборе пула: '+e.message);
  }
}

function setTrackInfoFromTrackObj(track){
  if(!track) return;
  coverImg.src = track.album.images?.[0]?.url || '';
  trackTitle.textContent = track.name;
  trackArtist.textContent = track.artists.map(a=>a.name).join(', ');
  metaGenre.textContent = selectedGenres.length ? selectedGenres.join(', ') : '—';
  metaReleased.textContent = track.album.release_date || '—';
}

async function playPool(){
  if(!accessToken){ log('Авторизуйтесь'); return; }
  if(!pool.length) { await buildPool(); if(!pool.length) { log('Нет треков в пуле'); return; } }
  currentIndex = Math.floor(Math.random()*pool.length);
  let track = pool[currentIndex];
  setTrackInfoFromTrackObj(track);
  playPreviewOfTrack(track);
  poolCount.textContent = pool.length;
}

function playPreviewOfTrack(track){
  // preview_url may be null; try to find next with preview
  let idx = currentIndex;
  let attempts = 0;
  while((!track.preview_url || attempts<1) && attempts<10){
    if(track.preview_url) break;
    idx = (idx+1)%pool.length;
    track = pool[idx];
    attempts++;
  }
  if(!track.preview_url){
    log('Нет preview для выбранного трека. Попробуйте собрать пул заново или убрать фильтры.');
    return;
  }
  currentIndex = idx;
  if(audio){ audio.pause(); audio = null; }
  audio = new Audio(track.preview_url);
  audio.play().catch(e=>log('Playback error: '+e.message));
  setTrackInfoFromTrackObj(track);
  log('Playing preview (30s)');
  audio.onended = ()=>{ /* do nothing */ };
}

async function playNext(){
  if(!pool.length) return;
  currentIndex = (currentIndex + 1) % pool.length;
  const track = pool[currentIndex];
  setTrackInfoFromTrackObj(track);
  playPreviewOfTrack(track);
}

function togglePlay(){
  if(!audio) return;
  if(audio.paused) audio.play().catch(e=>log('Playback error: '+e.message));
  else audio.pause();
}

async function likeCurrent(){
  if(!accessToken) { log('Авторизуйтесь'); return; }
  if(!pool.length) return;
  const track = pool[currentIndex];
  if(!track) return;
  try{
    const r = await fetch('https://api.spotify.com/v1/me/tracks?ids='+track.id, {method:'PUT', headers:{Authorization:'Bearer '+accessToken}});
    if(r.ok) log('Track saved to Your Library');
    else log('Save failed: '+r.status);
  }catch(e){
    log('Save error: '+e.message);
  }
}

init();
