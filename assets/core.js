/* דיבוריקה · הליבה המשותפת לכל הדפים.
 * נתונים, מאגר המילים, משתמשים והרשאות, הקראה, צלילים וחגיגות.
 * כל משחק וכל מסך בדשבורד עובדים רק דרך האובייקט DIB, כך שכשנחבר שרת
 * (Firebase) ישתנה רק החלק של השמירה כאן, ולא שום משחק.
 */
(function () {
  'use strict';

  const KEY = 'dibburika:v1';
  const SESSION_KEY = 'dibburika:user';

  const ROLES = {
    admin: { name: 'מנהל/ת', desc: 'גישה מלאה לדשבורד ולכל המשחקים' },
    clinician: { name: 'קלינאי/ת', desc: 'כל המשחקים המותרים, ותוצאות המטופלים' },
    parent: { name: 'הורה', desc: 'רק המשחקים שאושרו לו' }
  };

  function defaults() {
    return {
      v: 1,
      settings: {
        siteName: 'דיבוריקה',
        tagline: 'משחקי שפה ודיבור לקלינאיות תקשורת ולהורים',
        requireLogin: false,
        voiceRate: 0.85,
        sounds: true
      },
      words: { custom: [], edits: {} },
      uses: { custom: [], edits: {} },
      sentences: { custom: [], edits: {} },
      artic: { custom: [], edits: {} },
      lists: [],
      categories: { custom: [], edits: {} },
      games: {},
      users: [
        { id: 'admin', name: 'מנהל/ת ראשי/ת', role: 'admin', code: '1234', games: 'all', active: true, created: Date.now() }
      ],
      sessions: []
    };
  }

  /* ---------- אחסון ---------- */
  let state = null;

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    const base = defaults();
    if (!saved || typeof saved !== 'object') return base;
    // מיזוג רדוד כדי ששדות חדשים שנוסיף בגרסאות הבאות יקבלו ברירת מחדל
    return Object.assign(base, saved, {
      settings: Object.assign(base.settings, saved.settings || {}),
      words: Object.assign(base.words, saved.words || {}),
      uses: Object.assign(base.uses, saved.uses || {}),
      sentences: Object.assign(base.sentences, saved.sentences || {}),
      artic: Object.assign(base.artic, saved.artic || {}),
      categories: Object.assign(base.categories, saved.categories || {})
    });
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast('לא הצלחנו לשמור. ייתכן שהזיכרון בדפדפן מלא (בעיקר בגלל תמונות גדולות).', 'error');
      return false;
    }
  }

  function get() { if (!state) state = load(); return state; }
  function update(fn) { fn(get()); save(); emit('change'); }

  const listeners = {};
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt, data) { (listeners[evt] || []).forEach(fn => fn(data)); }

  // שינוי מלשונית אחרת (למשל הדשבורד פתוח לצד המשחק)
  window.addEventListener('storage', e => { if (e.key === KEY) { state = null; emit('change'); } });

  /* ---------- מזהים ---------- */
  function uid(prefix) { return (prefix || 'x') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function newCode() {
    const s = get();
    let c;
    do { c = String(Math.floor(1000 + Math.random() * 9000)); } while (s.users.some(u => u.code === c));
    return c;
  }

  /* ---------- קטגוריות ומילים ---------- */
  function builtinCategories() {
    return (window.DIB_WORDS || []).map(c => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color, builtin: true }));
  }

  function categories(opts) {
    const s = get();
    const all = builtinCategories().concat(s.categories.custom.map(c => Object.assign({ custom: true }, c)))
      .map(c => Object.assign({}, c, s.categories.edits[c.id] || {}));
    return (opts && opts.includeHidden) ? all : all.filter(c => !c.hidden);
  }

  function category(id) { return categories({ includeHidden: true }).find(c => c.id === id); }

  function builtinWords() {
    const out = [];
    (window.DIB_WORDS || []).forEach(c => {
      c.words.split('|').forEach(entry => {
        const [word, emoji, level] = entry.split(':');
        out.push({ id: c.id + ':' + word, word, emoji, cat: c.id, level: Number(level) || 1, builtin: true });
      });
    });
    return out;
  }

  /** כל המילים אחרי השינויים מהדשבורד. ברירת המחדל: בלי מוסתרות ובלי קטגוריות מוסתרות. */
  function words(opts) {
    opts = opts || {};
    const s = get();
    const hiddenCats = new Set(categories({ includeHidden: true }).filter(c => c.hidden).map(c => c.id));
    let list = builtinWords().concat(s.words.custom.map(w => Object.assign({ custom: true }, w)))
      .map(w => Object.assign({}, w, s.words.edits[w.id] || {}));
    if (!opts.includeHidden) list = list.filter(w => !w.hidden && !hiddenCats.has(w.cat));
    if (opts.cats && opts.cats.length) { const set = new Set(opts.cats); list = list.filter(w => set.has(w.cat)); }
    if (opts.maxLevel) list = list.filter(w => (w.level || 1) <= opts.maxLevel);
    return list;
  }

  function saveWord(w) {
    update(s => {
      const clean = { word: w.word.trim(), emoji: w.emoji || '', img: w.img || '', cat: w.cat, level: Number(w.level) || 1 };
      if (!w.id) {
        s.words.custom.push(Object.assign({ id: uid('w'), created: Date.now() }, clean));
      } else if (s.words.custom.some(x => x.id === w.id)) {
        s.words.custom = s.words.custom.map(x => x.id === w.id ? Object.assign({}, x, clean) : x);
      } else {
        s.words.edits[w.id] = Object.assign({}, s.words.edits[w.id] || {}, clean);
      }
    });
  }

  function setWordHidden(id, hidden) {
    update(s => {
      const c = s.words.custom.find(x => x.id === id);
      if (c) c.hidden = hidden;
      else s.words.edits[id] = Object.assign({}, s.words.edits[id] || {}, { hidden });
    });
  }

  /** מילה שהוספתם נמחקת לגמרי. מילה מהמאגר המובנה מוסתרת (אפשר להחזיר). */
  function deleteWord(id) {
    update(s => {
      if (s.words.custom.some(x => x.id === id)) s.words.custom = s.words.custom.filter(x => x.id !== id);
      else s.words.edits[id] = Object.assign({}, s.words.edits[id] || {}, { hidden: true });
    });
  }

  function resetWord(id) { update(s => { delete s.words.edits[id]; }); }

  function saveCategory(c) {
    update(s => {
      const clean = { name: c.name.trim(), emoji: c.emoji || '📁', color: c.color || '#5B5BD6' };
      if (!c.id) s.categories.custom.push(Object.assign({ id: uid('c') }, clean));
      else if (s.categories.custom.some(x => x.id === c.id)) s.categories.custom = s.categories.custom.map(x => x.id === c.id ? Object.assign({}, x, clean) : x);
      else s.categories.edits[c.id] = Object.assign({}, s.categories.edits[c.id] || {}, clean);
    });
  }

  function setCategoryHidden(id, hidden) {
    update(s => {
      const c = s.categories.custom.find(x => x.id === id);
      if (c) c.hidden = hidden;
      else s.categories.edits[id] = Object.assign({}, s.categories.edits[id] || {}, { hidden });
    });
  }

  function deleteCategory(id) {
    update(s => {
      s.categories.custom = s.categories.custom.filter(x => x.id !== id);
      s.words.custom = s.words.custom.filter(w => w.cat !== id);
    });
  }

  /* ---------- מאגרי תוכן נוספים: חפץ ושימוש, משפטים, היגוי ---------- */
  const POS = { start: 'תחילת מילה', mid: 'אמצע מילה', end: 'סוף מילה' };

  function builtin(coll) {
    if (coll === 'words') return builtinWords();
    if (coll === 'uses') return (window.DIB_USES || []).map(e => {
      const [word, use, emoji, level] = e.split(':');
      return { id: 'u:' + word, word, use, emoji: emoji || '', level: Number(level) || 1, builtin: true };
    });
    if (coll === 'sentences') return window.DIB_SENTENCES ? window.DIB_SENTENCES().map(x => Object.assign({ builtin: true }, x)) : [];
    if (coll === 'artic') {
      const out = [];
      (window.DIB_ARTIC || []).forEach(snd => Object.keys(POS).forEach(pos => (snd[pos] || '').split('|').filter(Boolean).forEach(e => {
        const [word, emoji] = e.split(':');
        out.push({ id: 'a:' + snd.id + ':' + pos + ':' + word, word, emoji: emoji || '', sound: snd.id, pos, builtin: true });
      })));
      return out;
    }
    return [];
  }

  /** פריטים מכל מאגר, אחרי השינויים מהדשבורד. */
  function items(coll, opts) {
    if (coll === 'words') return words(opts);
    opts = opts || {};
    const s = get(), c = s[coll] || { custom: [], edits: {} };
    let list = builtin(coll).concat(c.custom.map(x => Object.assign({ custom: true }, x)))
      .map(x => Object.assign({}, x, c.edits[x.id] || {}));
    if (!opts.includeHidden) list = list.filter(x => !x.hidden);
    if (opts.maxLevel) list = list.filter(x => (x.level || 1) <= opts.maxLevel);
    return list;
  }

  function saveItem(coll, item) {
    update(s => {
      const c = s[coll];
      const clean = {};
      Object.keys(item).forEach(k => { if (!['id', 'builtin', 'custom', 'hidden', 'created'].includes(k)) clean[k] = typeof item[k] === 'string' ? item[k].trim() : item[k]; });
      if (!item.id) c.custom.push(Object.assign({ id: uid(coll[0]), created: Date.now() }, clean));
      else if (c.custom.some(x => x.id === item.id)) c.custom = c.custom.map(x => x.id === item.id ? Object.assign({}, x, clean) : x);
      else c.edits[item.id] = Object.assign({}, c.edits[item.id] || {}, clean);
    });
  }
  function setItemHidden(coll, id, hidden) {
    update(s => {
      const c = s[coll], x = c.custom.find(y => y.id === id);
      if (x) x.hidden = hidden; else c.edits[id] = Object.assign({}, c.edits[id] || {}, { hidden });
    });
  }
  function deleteItem(coll, id) {
    update(s => {
      const c = s[coll];
      if (c.custom.some(x => x.id === id)) c.custom = c.custom.filter(x => x.id !== id);
      else c.edits[id] = Object.assign({}, c.edits[id] || {}, { hidden: true });
    });
  }
  function resetItem(coll, id) { update(s => { delete s[coll].edits[id]; }); }

  function sounds() { return (window.DIB_ARTIC || []).map(x => ({ id: x.id, name: x.name, letters: x.letters })); }

  /* ---------- משחקים ---------- */
  function games(opts) {
    const s = get();
    const list = (window.DIB_GAMES || []).map(g => Object.assign({}, g, { enabled: true }, s.games[g.id] || {}));
    return (opts && opts.includeDisabled) ? list : list.filter(g => g.enabled);
  }
  function gameSettings(id) {
    const g = (window.DIB_GAMES || []).find(x => x.id === id) || {};
    return Object.assign({}, g.defaults || {}, (get().games[id] || {}).defaults || {});
  }
  function setGame(id, patch) { update(s => { s.games[id] = Object.assign({}, s.games[id] || {}, patch); }); }

  /* ---------- משתמשים והרשאות ---------- */
  function currentUser() {
    let id = null;
    try { id = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY); } catch (e) { /* פרטי */ }
    const u = get().users.find(x => x.id === id);
    return u && u.active ? u : null;
  }

  function login(code, remember) {
    code = String(code || '').trim();
    const u = get().users.find(x => x.code === code);
    if (!u) return { error: 'הקוד לא מוכר. כדאי לבדוק אותו מול מי שנתן/ה לך אותו.' };
    if (!u.active) return { error: 'הגישה לקוד הזה הושהתה. אפשר לפנות למנהל/ת.' };
    try {
      sessionStorage.setItem(SESSION_KEY, u.id);
      if (remember) localStorage.setItem(SESSION_KEY, u.id);
    } catch (e) { /* פרטי */ }
    update(s => { const x = s.users.find(y => y.id === u.id); if (x) x.lastLogin = Date.now(); });
    return { user: u };
  }

  function logout() {
    try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); } catch (e) { /* פרטי */ }
  }

  function canPlay(user, gameId) {
    if (!user) return !get().settings.requireLogin;
    if (user.role === 'admin' || user.games === 'all') return true;
    return Array.isArray(user.games) && user.games.includes(gameId);
  }

  /* ---------- תיעוד מפגשים ---------- */
  function logSession(rec) {
    const u = currentUser();
    update(s => {
      s.sessions.unshift(Object.assign({ id: uid('s'), t: Date.now(), userId: u ? u.id : null, userName: u ? u.name : 'אורח/ת' }, rec));
      if (s.sessions.length > 2000) s.sessions.length = 2000;
    });
  }

  /* ---------- גיבוי ---------- */
  function exportAll() { return JSON.stringify(get(), null, 2); }
  function importAll(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || data.v !== 1 || !data.settings) throw new Error('הקובץ לא נראה כמו גיבוי של האתר.');
    state = null;
    localStorage.setItem(KEY, JSON.stringify(data));
    state = load();
    emit('change');
  }
  function resetAll() { localStorage.removeItem(KEY); state = null; emit('change'); }

  /* ---------- הקראה ---------- */
  let heVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    heVoice = vs.find(v => /^he|^iw/i.test(v.lang) && /google/i.test(v.name)) || vs.find(v => /^he|^iw/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  function canSpeak() { return 'speechSynthesis' in window; }
  function hasHebrewVoice() { pickVoice(); return !!heVoice; }

  function speak(text, opts) {
    if (!canSpeak() || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'he-IL';
      if (heVoice) u.voice = heVoice;
      u.rate = (opts && opts.rate) || get().settings.voiceRate || 0.85;
      u.pitch = 1.05;
      speechSynthesis.speak(u);
    } catch (e) { /* אין הקראה */ }
  }

  /* ---------- צלילים ---------- */
  let ctx = null;
  function tone(freqs, dur, type) {
    if (!get().settings.sounds) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ctx.currentTime;
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        const st = t0 + i * dur * 0.8;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.18, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g).connect(ctx.destination); o.start(st); o.stop(st + dur + 0.05);
      });
    } catch (e) { /* בלי צליל */ }
  }
  const sfx = {
    good: () => tone([523, 659, 784], 0.16, 'triangle'),
    bad: () => tone([300, 240], 0.18, 'sine'),
    tap: () => tone([660], 0.06, 'sine'),
    win: () => tone([523, 659, 784, 1047, 784, 1047], 0.14, 'triangle')
  };

  /* ---------- קונפטי ---------- */
  function confetti(n) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#5B5BD6', '#FF7A59', '#2BB89A', '#FFC24B', '#EC4899', '#38BDF8'];
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    for (let i = 0; i < (n || 90); i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.5 + 's';
      p.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
      p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
      p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      if (i % 3 === 0) p.style.borderRadius = '50%';
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 4000);
  }

  /* ---------- ממשק ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function toast(msg, kind) {
    let host = document.querySelector('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  /** תמונה של מילה: תמונה שהועלתה, ואם אין אז אימוג'י. */
  function pic(w, cls) {
    if (w.img) return '<img class="pic-img ' + (cls || '') + '" src="' + esc(w.img) + '" alt="' + esc(w.word) + '">';
    const label = esc(w.word || w.text || '');
    if (w.pics) {
      const parts = String(w.pics).trim().split(/\s+/);
      return '<span class="pic-multi n' + parts.length + ' ' + (cls || '') + '" role="img" aria-label="' + label + '">' + parts.map(p => '<span class="pic-emoji">' + esc(p) + '</span>').join('') + '</span>';
    }
    if (!w.emoji) return '<span class="pic-letter ' + (cls || '') + '" role="img" aria-label="' + label + '"><span>' + esc((w.word || w.text || '?').charAt(0)) + '</span></span>';
    return '<span class="pic-emoji ' + (cls || '') + '" role="img" aria-label="' + label + '">' + esc(w.emoji) + '</span>';
  }

  /** מקטין תמונה שהועלתה כדי שלא תמלא את הזיכרון. */
  function resizeImage(file, max) {
    max = max || 320;
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = reject;
      r.onload = () => {
        const im = new Image();
        im.onerror = reject;
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/webp', 0.82));
        };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function fmtDate(t) {
    const d = new Date(t);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }) + ' · ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  /** חלון כניסה עם קוד. מחזיר Promise שמתממש עם המשתמש. */
  function loginDialog(opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const d = document.createElement('dialog');
      d.className = 'modal login-modal';
      d.innerHTML =
        '<form method="dialog" class="login-card">' +
        '<div class="login-badge">🔐</div>' +
        '<h2>' + esc(opts.title || 'כניסה עם קוד') + '</h2>' +
        '<p class="muted">' + esc(opts.text || 'יש להקליד את הקוד האישי שקיבלת') + '</p>' +
        '<input class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="12" placeholder="••••" aria-label="קוד אישי" required>' +
        '<label class="check"><input type="checkbox" checked> לזכור אותי במכשיר הזה</label>' +
        '<p class="login-err" role="alert"></p>' +
        '<button class="btn btn-primary btn-lg" value="ok">כניסה</button>' +
        (opts.cancel ? '<a class="btn btn-ghost" href="' + esc(opts.cancel) + '">חזרה</a>' : '') +
        '</form>';
      document.body.appendChild(d);
      const input = d.querySelector('input.code-input');
      const err = d.querySelector('.login-err');
      d.addEventListener('cancel', e => { if (!opts.cancel) e.preventDefault(); });
      d.querySelector('form').addEventListener('submit', e => {
        e.preventDefault();
        const r = login(input.value, d.querySelector('.check input').checked);
        if (r.error) { err.textContent = r.error; input.select(); d.querySelector('.login-card').classList.add('shake'); setTimeout(() => d.querySelector('.login-card').classList.remove('shake'), 400); return; }
        if (opts.check && !opts.check(r.user)) { err.textContent = opts.denied || 'לקוד הזה אין הרשאה לכאן.'; logout(); return; }
        d.close(); d.remove(); resolve(r.user);
      });
      d.showModal();
      setTimeout(() => input.focus(), 50);
    });
  }

  /** שומר הכניסה למשחק: בודק שהמשחק פעיל ושלמשתמש יש הרשאה. */
  async function gate(gameId) {
    const g = games({ includeDisabled: true }).find(x => x.id === gameId);
    if (g && !g.enabled) {
      document.body.innerHTML = '<main class="blocked"><div class="blocked-card"><div class="big">🛠️</div><h1>המשחק כבוי כרגע</h1><p class="muted">אפשר להפעיל אותו מחדש מהדשבורד.</p><a class="btn btn-primary" href="../index.html">לכל המשחקים</a></div></main>';
      throw new Error('disabled');
    }
    const u = currentUser();
    if (canPlay(u, gameId)) return u;
    return loginDialog({
      title: 'כניסה למשחק',
      text: u ? 'לקוד שלך אין גישה למשחק הזה. אפשר להיכנס עם קוד אחר.' : 'המשחקים פתוחים למשתמשים רשומים. יש להקליד את הקוד שקיבלת.',
      cancel: '../index.html',
      check: user => canPlay(user, gameId),
      denied: 'לקוד הזה אין גישה למשחק הזה. אפשר לבקש גישה מהמנהל/ת.'
    });
  }

  window.DIB = {
    ROLES, get, update, save, on, emit, uid, newCode,
    POS, items, saveItem, setItemHidden, deleteItem, resetItem, sounds,
    categories, category, words, saveWord, setWordHidden, deleteWord, resetWord,
    saveCategory, setCategoryHidden, deleteCategory,
    games, gameSettings, setGame,
    currentUser, login, logout, canPlay, gate, loginDialog, logSession,
    exportAll, importAll, resetAll,
    speak, canSpeak, hasHebrewVoice, sfx, confetti,
    esc, toast, pic, resizeImage, shuffle, download, fmtDate
  };
})();
