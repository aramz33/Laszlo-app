// Laszlo Playground — all logic
// Sections: config · helpers · artworks · stage · actions · scenarios · init

// ─── Config & state ──────────────────────────────────────────────────────────

const base    = () => $('base').value.replace(/\/$/, '');
const fnUrl   = (n) => `${base()}/functions/v1/${n}`;
const H       = () => ({ 'Authorization': `Bearer ${$('key').value}`, 'Content-Type': 'application/json' });
const lang    = () => $('lang').value;
const profile = () => {
  const interets = [...document.querySelectorAll('.interest:checked')].map(c => c.value);
  const p = {
    allure:    $('allure').value,
    niveau:    $('niveau').value,
    interets,
    free_text: $('freetext').value || null,
  };
  if ($('injectPersona').checked && personaSummary) p.persona_summary = personaSummary;
  return p;
};
const steering = () => ({ lens: $('lens').value || null, tone: $('tone').value || null });

let personaSummary  = null;
let currentArtwork  = null;
let point           = null;
let history         = [];
let lastCall        = null;
let hotspotItems    = {};
let overviewItem    = null;
let activeHotspotId = null;   // null = overview active
let statusTimer     = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function status(msg, cls = '') {
  const el = $('status');
  el.textContent = msg;
  el.className = `status-bar ${cls}`;
  clearTimeout(statusTimer);
  if (cls === 'good') statusTimer = setTimeout(() => { el.textContent = ''; el.className = 'status-bar'; }, 3000);
}

function addLatency(label, ms) {
  const c = ms < 1500 ? 'good' : ms < 4000 ? 'warn' : 'bad';
  const row = document.createElement('div');
  row.className = 'lat-row';
  row.innerHTML = `<span class="lat-pill ${c}">${ms} ms</span><span>${label}</span>`;
  const el = $('latencies');
  if (el.textContent === '—') el.innerHTML = '';
  el.prepend(row);
}

function showRaw(req, res, ms) {
  lastCall = { url: req.url, body: req.body };
  if ($('debug').checked) {
    $('rawReq').textContent = `→ ${req.url}\n${JSON.stringify(req.body, null, 2)}`;
    $('rawRes').textContent = `← (${ms} ms)\n${typeof res === 'string' ? res : JSON.stringify(res, null, 2)}`;
    $('rawDetails').open = true;
  }
}

function copyCurl() {
  if (!lastCall) return;
  const c = `curl -s '${lastCall.url}' \\\n  -H 'Authorization: Bearer ${$('key').value}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(lastCall.body)}'`;
  navigator.clipboard.writeText(c).then(() => status('curl copié', 'good'));
}

function copyText(id) {
  const text = $(id).textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => status('copié', 'good'));
}

// ─── Core API ────────────────────────────────────────────────────────────────

async function gen(body, label) {
  const t = performance.now();
  const r = await fetch(fnUrl('generate'), { method: 'POST', headers: H(), body: JSON.stringify(body) });
  const ms = Math.round(performance.now() - t);
  const data = await r.json();
  addLatency(`${label || body.mode}`, ms);
  showRaw({ url: fnUrl('generate'), body }, data, ms);
  if (!r.ok) throw new Error(data.message || r.status);
  return data;
}

// ─── Artworks ────────────────────────────────────────────────────────────────

async function loadArtworks() {
  try {
    const url = `${base()}/rest/v1/artwork?select=id,object_number,title_en,title_nl,image_url,hotspot(id,title,narration_text,x,y)&ref_image_url=not.is.null&order=object_number`;
    const r = await fetch(url, { headers: { apikey: $('key').value, Authorization: `Bearer ${$('key').value}` } });
    window._artworks = await r.json();
    $('artwork').innerHTML = window._artworks.map((a, i) =>
      `<option value="${i}">${a.title_en || a.title_nl || a.object_number}</option>`
    ).join('');
    renderArtwork();
    status(`${window._artworks.length} œuvres chargées`, 'good');
  } catch (e) {
    status('Chargement œuvres KO : ' + e.message, 'bad');
  }
}

// ─── Stage (artwork + dots) ───────────────────────────────────────────────────

function renderArtwork() {
  const a = window._artworks?.[$('artwork').value];
  if (!a) return;
  currentArtwork  = a;
  point           = null;
  hotspotItems    = {};
  overviewItem    = null;
  activeHotspotId = null;

  clearPointUI();
  $('stagemeta').textContent = `${a.object_number} · ${(a.hotspot || []).length} hotspots`;

  const dots = (a.hotspot || []).map(h =>
    `<div class="dot active-pending" data-id="${h.id}"
          style="left:${h.x * 100}%;top:${h.y * 100}%"
          title="${h.title}"
          onclick="event.stopPropagation();openHotspot('${h.id}')"></div>`
  ).join('');

  const ovDot = `<div class="dot-overview active" id="dot-ov"
                      title="✦ Vue d'ensemble"
                      onclick="event.stopPropagation();openOverview()">✦</div>`;

  $('stage').innerHTML = `<div class="stagewrap" id="sw">
    <img src="${a.image_url}" />
    ${dots}${ovDot}
  </div>`;
  $('sw').onclick = placePoint;
  fetchNotices(a.id);  // load notices for grounding panel

  // Reset response panel
  $('hsTitle').textContent = '✦ Vue d\'ensemble';
  $('hsTitle').classList.add('muted');
  $('hsText').textContent = 'Génération…';
  $('hsSrc').textContent = '';
  $('answerCard').style.display = 'none';
  $('followupsWrap').style.display = 'none';
  $('audio').style.display = 'none';

  openOverview();
}

function placePoint(e) {
  if (e.target.classList.contains('dot') || e.target.classList.contains('dot-overview')) return;
  const img = e.currentTarget.querySelector('img');
  const r = img.getBoundingClientRect();
  point = {
    x: +((e.clientX - r.left) / r.width).toFixed(3),
    y: +((e.clientY - r.top) / r.height).toFixed(3),
  };
  $('pointlbl').textContent = `point: ${point.x}, ${point.y}`;
  $('clearPointBtn').style.display = '';

  $('sw').querySelectorAll('.point-marker').forEach(p => p.remove());
  const d = document.createElement('div');
  d.className = 'point-marker';
  d.style.left = `${point.x * 100}%`;
  d.style.top  = `${point.y * 100}%`;
  $('sw').appendChild(d);
}

function clearPoint() {
  point = null;
  clearPointUI();
}

function clearPointUI() {
  $('pointlbl').textContent = 'point: aucun';
  $('clearPointBtn').style.display = 'none';
  $('sw')?.querySelectorAll('.point-marker').forEach(p => p.remove());
}

function setActiveDot(id) {
  // id = null → overview; id = hotspot uuid → that hotspot
  $('sw')?.querySelectorAll('.dot').forEach(d => d.classList.toggle('active', d.dataset.id === id));
  const ov = $('dot-ov');
  if (ov) ov.classList.toggle('active', id === null);
  activeHotspotId = id;
}

function showHotspotResult(title, text, sources) {
  $('hsTitle').textContent = title;
  $('hsTitle').classList.remove('muted');
  $('hsText').textContent = text || '';
  $('hsSrc').textContent = sources?.length
    ? 'sources : ' + sources.map(s => `${s.source}/${s.lang}`).join(', ')
    : '';
  window._lastText = text;
}

// ─── Grounding (raw Supabase data) ───────────────────────────────────────────

let currentNotices = [];

async function fetchNotices(artworkId) {
  try {
    const url = `${base()}/rest/v1/notice?artwork_id=eq.${artworkId}&select=source,lang,text,groundedness&order=source`;
    const r = await fetch(url, { headers: { apikey: $('key').value, Authorization: `Bearer ${$('key').value}` } });
    currentNotices = await r.json();
    renderGrounding(null);
  } catch {
    currentNotices = [];
  }
}

// hotspotId = null → show overview grounding (no seed); uuid → show hotspot seed too
function renderGrounding(hotspotId) {
  const el = $('grounding');
  if (!currentNotices.length && !hotspotId) {
    el.innerHTML = '<span class="muted small">Aucune notice disponible.</span>';
    return;
  }

  const noticeCards = currentNotices.map(n => {
    const preview = n.text.length > 280 ? n.text.slice(0, 280) + '…' : n.text;
    const badgeClass = n.groundedness === 'ok' ? 'ok' : 'review';
    const badgeLabel = n.groundedness === 'ok' ? '✓ ok' : '⚠ review';
    return `<div class="notice-card">
      <div class="notice-meta">
        <span class="notice-badge ${badgeClass}">${badgeLabel}</span>
        <span class="muted">${n.source} / ${n.lang}</span>
      </div>
      <div class="notice-text">${preview}</div>
    </div>`;
  }).join('');

  let seedCard = '';
  if (hotspotId) {
    const h = (currentArtwork?.hotspot || []).find(x => x.id === hotspotId);
    if (h?.narration_text) {
      seedCard = `<div class="seed-card">
        <div class="seed-label">✦ Seed hotspot — "${h.title}"</div>
        ${h.narration_text}
      </div>`;
    }
  }

  el.innerHTML = seedCard + noticeCards;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

async function openArtwork() {
  const a = currentArtwork;
  if (!a) return;
  const ids = (a.hotspot || []).map(h => h.id);
  $('stagemeta').textContent = `${a.object_number} · génération…`;
  try {
    const [d] = await Promise.all([
      gen({ mode: 'hotspot', artwork_id: a.id, hotspot_ids: ids, lang: lang(), profile: profile(), steering: steering() }, 'hotspot batch'),
      openOverview(),
    ]);
    hotspotItems = {};
    d.items.forEach((it, i) => { hotspotItems[ids[i]] = it; });
    $('stagemeta').textContent = `${a.object_number} · ${d.items.length} hotspots prêts`;
    status('hotspots générés', 'good');
  } catch (e) {
    status(e.message, 'bad');
  }
}

async function openOverview() {
  const a = currentArtwork;
  if (!a) return;
  setActiveDot(null);
  window._lastHotspot = null;
  $('hsTitle').textContent = '✦ Vue d\'ensemble';
  $('hsTitle').classList.add('muted');

  if (overviewItem) {
    showHotspotResult('✦ Vue d\'ensemble', overviewItem.text, overviewItem.sources);
    return;
  }
  $('hsText').textContent = 'Génération…';
  $('hsSrc').textContent = '';
  try {
    const d = await gen({ mode: 'overview', artwork_id: a.id, lang: lang(), profile: profile(), steering: steering() }, 'overview');
    overviewItem = d;
    showHotspotResult('✦ Vue d\'ensemble', d.text, d.sources);
    renderGrounding(null);
    loadFollowups(null);  // auto follow-ups
  } catch (e) {
    $('hsText').textContent = 'Erreur : ' + e.message;
  }
}

async function openHotspot(id) {
  if (!currentArtwork) return;
  setActiveDot(id);
  const h = (currentArtwork.hotspot || []).find(x => x.id === id) || {};
  window._lastHotspot = id;

  let it = hotspotItems[id];
  if (!it) {
    $('hsTitle').textContent = h.title || id;
    $('hsTitle').classList.remove('muted');
    $('hsText').textContent = 'Génération…';
    $('hsSrc').textContent = '';
    try {
      const d = await gen({ mode: 'hotspot', artwork_id: currentArtwork.id, hotspot_ids: [id], lang: lang(), profile: profile(), steering: steering() }, 'hotspot');
      it = d.items[0];
      hotspotItems[id] = it;
    } catch (e) {
      $('hsText').textContent = 'Erreur : ' + e.message;
      return;
    }
  }
  showHotspotResult(h.title || id, it.text ?? it.message ?? '', it.sources);
  renderGrounding(id);
  loadFollowups(id);  // auto follow-ups
}

// Regenerate the currently active item (clears cache first)
async function regenerateCurrent() {
  if (activeHotspotId === null) {
    overviewItem = null;
    await openOverview();
  } else {
    delete hotspotItems[activeHotspotId];
    await openHotspot(activeHotspotId);
  }
}

async function ask() {
  if (!currentArtwork) return status('Sélectionne une œuvre d\'abord', 'warn');
  const q = $('question').value.trim();
  if (!q) return;

  const body = {
    mode: 'ask',
    artwork_id: currentArtwork.id,
    question: q,
    lang: lang(),
    profile: profile(),
    steering: steering(),
    history: history.slice(-8),
  };
  if (point)                   body.point      = point;
  if (window._lastHotspot)     body.hotspot_id = window._lastHotspot;

  $('answerCard').style.display = '';
  $('answer').textContent = '';
  $('answerSrc').textContent = '';
  $('answerCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const t = performance.now();
  try {
    const res = await fetch(fnUrl('generate'), { method: 'POST', headers: H(), body: JSON.stringify(body) });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '', full = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const ev = JSON.parse(line.slice(5));
        if (ev.type === 'delta') {
          full += ev.delta;
          $('answer').textContent = full;
          $('answerCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (ev.type === 'done') {
          $('answerSrc').textContent = ev.sources?.length
            ? 'sources : ' + ev.sources.map(s => `${s.source}/${s.lang}`).join(', ')
            : '';
        } else if (ev.type === 'error') {
          status(ev.message, 'bad');
        }
      }
    }
    const ms = Math.round(performance.now() - t);
    addLatency('ask (stream)', ms);
    showRaw({ url: fnUrl('generate'), body }, full, ms);
    history.push(
      { role: 'user',      content: q,    artwork_id: currentArtwork.id },
      { role: 'assistant', content: full, artwork_id: currentArtwork.id },
    );
    renderHistory();
    window._lastText = full;
    loadFollowups(window._lastHotspot);  // auto follow-ups after ask
  } catch (e) {
    status(e.message, 'bad');
  }
}

async function loadFollowups(hotspotId) {
  if (!currentArtwork) return;
  $('followupsWrap').style.display = '';
  $('followups').innerHTML = '<span class="muted small">Génération…</span>';
  try {
    const d = await gen({
      mode: 'followups',
      artwork_id: currentArtwork.id,
      hotspot_id: hotspotId || null,
      lang: lang(),
      profile: profile(),
      steering: steering(),
    }, 'followups');
    $('followups').innerHTML = '';
    d.questions.forEach(q => {
      const item = document.createElement('div');
      item.className = 'followup-item';
      const span = document.createElement('span');
      span.textContent = q;
      const btn = document.createElement('button');
      btn.textContent = 'ask →';
      btn.onclick = () => { $('question').value = q; ask(); };
      item.append(span, btn);
      $('followups').appendChild(item);
    });
  } catch (e) {
    status(e.message, 'bad');
  }
}

async function speak(text) {
  if (!text) return status('Rien à lire', 'warn');
  status('Synthèse…', '');
  const body = { text, lang: lang(), provider: $('provider').value, speed: +$('speed').value };
  const t = performance.now();
  try {
    const r = await fetch(fnUrl('speak'), { method: 'POST', headers: H(), body: JSON.stringify(body) });
    const d = await r.json();
    const ms = Math.round(performance.now() - t);
    addLatency('speak', ms);
    showRaw({ url: fnUrl('speak'), body }, d, ms);
    if (!d.audio_url) throw new Error(d.message || 'no audio');
    const audio = $('audio');
    audio.style.display = '';
    audio.src = d.audio_url;
    audio.play();
    const expectedEngine = $('provider').value;
    status(`voix OK · moteur: ${d.engine}`, expectedEngine === 'auto' || expectedEngine === d.engine ? 'good' : 'warn');
  } catch (e) {
    status(e.message, 'bad');
  }
}

async function identify() {
  const f = $('imgfile').files[0];
  if (!f) return status('Choisis une image', 'warn');
  const form = new FormData();
  form.append('image', f);
  if (window._artworks) form.append('candidate_ids', window._artworks.map(a => a.id).join(','));
  status('Identification…', '');
  const t = performance.now();
  try {
    const r = await fetch(fnUrl('identify'), { method: 'POST', headers: { Authorization: `Bearer ${$('key').value}` }, body: form });
    const d = await r.json();
    addLatency('identify', Math.round(performance.now() - t));
    const a = (window._artworks || []).find(x => x.id === d.artwork_id);
    if (a) {
      [...$('artwork').options].forEach((o, i) => { if (window._artworks[i].id === a.id) $('artwork').value = i; });
      renderArtwork();
    }
    status(`identify → ${a ? a.object_number : (d.artwork_id || 'aucun match')} (conf ${d.confidence})`, a ? 'good' : 'warn');
  } catch (e) {
    status(e.message, 'bad');
  }
}

async function transcribe() {
  const f = $('audfile').files[0];
  if (!f) return status('Choisis un fichier audio', 'warn');
  const form = new FormData();
  form.append('audio', f);
  form.append('lang_hint', lang());
  status('Transcription…', '');
  try {
    const r = await fetch(fnUrl('transcribe'), { method: 'POST', headers: { Authorization: `Bearer ${$('key').value}` }, body: form });
    const d = await r.json();
    $('question').value = d.text || '';
    status(`Transcrit (${d.duration_s ?? '?'}s)`, 'good');
  } catch (e) {
    status(e.message, 'bad');
  }
}

// ─── Persona ──────────────────────────────────────────────────────────────────

function buildPersona() {
  const onboarding = {
    allure:    $('allure').value,
    niveau:    $('niveau').value,
    interets:  [...document.querySelectorAll('.interest:checked')].map(c => c.value),
    free_text: $('freetext').value || null,
  };
  $('persona').textContent = '…';
  gen({ mode: 'persona', lang: lang(), onboarding }, 'persona')
    .then(d => {
      personaSummary = d.persona_summary;
      $('persona').textContent = d.persona_summary;
      $('injectPersona').checked = true;
    })
    .catch(e => status(e.message, 'bad'));
}

// ─── History ──────────────────────────────────────────────────────────────────

function renderHistory() {
  if (!history.length) { $('history').innerHTML = '<span class="muted small">Vide.</span>'; return; }
  $('history').innerHTML = history.map(m => {
    const artRef = (window._artworks || []).find(a => a.id === m.artwork_id)?.object_number || '';
    return `<div class="history-msg">
      <div class="role ${m.role}">${m.role}<span class="artwork-ref">${artRef}</span></div>
      <div>${m.content}</div>
    </div>`;
  }).join('');
}

function resetHistory() {
  history = [];
  renderHistory();
  status('Conversation réinitialisée', 'good');
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

function setProfile(allure, niveau, interets) {
  $('allure').value = allure;
  $('niveau').value = niveau;
  document.querySelectorAll('.interest').forEach(c => c.checked = interets.includes(c.value));
}
function setLang(l) { $('lang').value = l; }
function selectObj(obj) {
  const i = (window._artworks || []).findIndex(a => a.object_number === obj);
  if (i >= 0) { $('artwork').value = i; renderArtwork(); }
}

const SCENARIOS = [
  {
    name: '✦ Vue d\'ensemble',
    help: 'Ouvre la Ronde de nuit et génère la présentation générale (mode=overview).',
    run: async () => { setLang('fr'); setProfile('moyen', 'amateur', ['stories']); selectObj('SK-C-5'); await openOverview(); },
  },
  {
    name: '👀 Débutant FR',
    help: 'Profil court/découverte — réponses courtes et simples.',
    run: async () => { setLang('fr'); setProfile('court', 'decouverte', ['technique']); selectObj('SK-C-5'); await openArtwork(); },
  },
  {
    name: '🎓 Passionné EN',
    help: 'Profil long/passionne en anglais — vocabulaire pointu. Compare avec Débutant FR.',
    run: async () => { setLang('en'); setProfile('long', 'passionne', ['technique', 'stories']); selectObj('SK-C-5'); await openArtwork(); },
  },
  {
    name: '🧠 Inter-œuvres',
    help: 'Laitière → question → Ronde de nuit. La 2e réponse doit tenir compte de la 1re.',
    run: async () => {
      setLang('fr');
      selectObj('SK-A-2344'); await openArtwork();
      $('question').value = 'Qu\'est-ce qui rend cette scène intime ?'; await ask();
      selectObj('SK-C-5'); await openArtwork();
      status('Pose maintenant : "et par rapport à la scène précédente ?"', 'warn');
    },
  },
  {
    name: '🕳️ Appât hallucination',
    help: 'Demande le prix payé (absent des notices). Le guide doit dire qu\'il n\'a pas l\'info.',
    run: async () => { setLang('fr'); selectObj('SK-C-5'); await openArtwork(); $('question').value = 'Combien Rembrandt a-t-il été payé pour ce tableau ?'; await ask(); },
  },
  {
    name: '🔊 Test voix',
    help: 'Génère l\'overview de la Ronde de nuit et le lit avec le provider sélectionné.',
    run: async () => { selectObj('SK-C-5'); await openArtwork(); await speak(window._lastText); },
  },
  {
    name: '⏱️ Bench latence',
    help: 'Overview + hotspot batch + ask. Lire le panneau Latences (vert <1.5s, rouge >4s).',
    run: async () => { selectObj('SK-C-5'); await openArtwork(); $('question').value = 'Décris la lumière.'; await ask(); },
  },
];

async function runScenario(i) {
  const s = SCENARIOS[i];
  status('▶ ' + s.name, 'warn');
  try { await s.run(); } catch (e) { status(e.message, 'bad'); }
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

$('question').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    ask();
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

$('scenarios').innerHTML = SCENARIOS.map((s, i) =>
  `<button title="${s.help}" onclick="runScenario(${i})">${s.name}</button>`
).join('');

loadArtworks();
