/* דיבוריקה · תוכן משותף למשחקים.
 * כל משחק בוחר "ממה לשחק" דרך אותו רכיב: אוצר מילים לפי קטגוריות, חפץ ושימוש,
 * משפטים, היגוי לפי צליל ומיקום, או רשימה אישית. כך מכניקת המשחק נפרדת מהתוכן,
 * וכל משחק חדש מקבל את כל המאגרים ואת שליחת הקישור להורה בלי עבודה נוספת.
 */
(function () {
  'use strict';
  const esc = DIB.esc;

  const SOURCES = {
    words: { name: 'אוצר מילים', em: '📚', desc: 'שמות עצם לפי נושאים' },
    uses: { name: 'חפץ ושימוש', em: '🔑', desc: 'מתקדמים: מפתח, פותחים' },
    sentences: { name: 'משפטים', em: '💬', desc: 'ילד אוכל תפוח' },
    artic: { name: 'היגוי', em: '👄', desc: 'מילים לפי צליל ומיקום' },
    list: { name: 'רשימה שלי', em: '📝', desc: 'מקלידים מילים לתרגול' }
  };
  const LEVELS = [{ v: 1, t: 'בסיסי' }, { v: 2, t: 'בינוני' }, { v: 3, t: 'הכל' }];
  const SENT_LEVELS = [{ v: 1, t: '2 מילים' }, { v: 2, t: '3 מילים' }, { v: 3, t: 'כולל רבים' }];

  /* ---------- הדגשת הצליל ---------- */
  function hlIndices(word, letters, pos) {
    const ch = [...word];
    const idx = ch.map((c, i) => letters.includes(c) ? i : -1).filter(i => i >= 0);
    if (!idx.length) return [];
    let last = ch.length - 1;
    while (last > 0 && ch[last] === ' ') last--;
    if (pos === 'start') return idx[0] === 0 ? [0] : [idx[0]];
    if (pos === 'end') return idx.includes(last) ? [last] : [idx[idx.length - 1]];
    if (pos === 'mid') { const m = idx.find(i => i > 0 && i < last); return [m != null ? m : idx[0]]; }
    return idx;
  }
  function hlText(text, hl) {
    if (!hl || !hl.length) return esc(text);
    const set = new Set(hl);
    return [...text].map((c, i) => set.has(i) ? '<span class="hl">' + esc(c) + '</span>' : esc(c)).join('');
  }

  /* ---------- רשימה אישית ---------- */
  function parseList(text) {
    return [...new Set(String(text || '').split(/[\n,،;]+/).map(x => x.trim()).filter(Boolean))];
  }
  let lookup = null;
  function findPic(word) {
    if (!lookup) {
      lookup = {};
      ['artic', 'uses', 'words'].forEach(c => DIB.items(c, { includeHidden: true }).forEach(x => { if (x.word && (x.emoji || x.img)) lookup[x.word] = x; }));
      DIB.on('change', () => { lookup = null; });
    }
    return lookup[word] || null;
  }

  /* ---------- כרטיסים ---------- */
  /** הופך הגדרות לרשימת כרטיסים אחידה: טקסט, תמונה, שורה שנייה, מה להקריא ומה להדגיש. */
  function cards(cfg) {
    const src = cfg.src;
    if (src === 'words') {
      return DIB.words({ cats: cfg.cats, maxLevel: cfg.level || 3 }).map(w => ({ id: w.id, text: w.word, emoji: w.emoji, img: w.img, speak: w.word, cat: w.cat }));
    }
    if (src === 'uses') {
      return DIB.items('uses', { maxLevel: cfg.level || 3 }).map(w => ({ id: w.id, text: w.word, sub: w.use, emoji: w.emoji, img: w.img, speak: w.word + '. ' + w.use, pair: w.use }));
    }
    if (src === 'sentences') {
      const lv = cfg.slevels && cfg.slevels.length ? cfg.slevels : [1, 2];
      return DIB.items('sentences').filter(x => lv.includes(x.level || 1)).map(x => ({ id: x.id, text: x.text, pics: x.pics, img: x.img, speak: x.text, group: x.group }));
    }
    if (src === 'artic') {
      const snd = DIB.sounds().find(x => x.id === cfg.sound) || DIB.sounds()[0];
      if (!snd) return [];
      const pos = cfg.pos && cfg.pos.length ? cfg.pos : ['start'];
      const seen = new Set();
      return DIB.items('artic').filter(x => x.sound === snd.id && pos.includes(x.pos)).filter(x => { if (seen.has(x.word)) return false; seen.add(x.word); return true; })
        .map(x => ({ id: x.id, text: x.word, emoji: x.emoji, img: x.img, speak: x.word, hl: hlIndices(x.word, snd.letters, x.pos) }));
    }
    if (src === 'list') {
      const letters = (cfg.hl || '').replace(/[^֐-׿]/g, '');
      return parseList(cfg.list).map((word, i) => {
        const f = findPic(word);
        return { id: 'l:' + i + ':' + word, text: word, emoji: f ? f.emoji : '', img: f ? f.img : '', speak: word, hl: letters ? hlIndices(word, letters, 'all') : [] };
      });
    }
    return [];
  }

  function describe(cfg) {
    const s = SOURCES[cfg.src] || {};
    if (cfg.src === 'words') {
      const names = (cfg.cats || []).map(id => (DIB.category(id) || {}).name).filter(Boolean);
      return s.name + ' · ' + (names.length ? names.slice(0, 3).join(', ') + (names.length > 3 ? ' ועוד' : '') : 'כל הנושאים');
    }
    if (cfg.src === 'artic') {
      const snd = DIB.sounds().find(x => x.id === cfg.sound) || {};
      return 'היגוי · הצליל ' + (snd.name || '') + ' ב' + (cfg.pos || ['start']).map(p => DIB.POS[p]).join(', ');
    }
    if (cfg.src === 'list') return (cfg.listName ? 'הרשימה "' + cfg.listName + '"' : 'רשימה אישית') + ' · ' + parseList(cfg.list).length + ' מילים';
    return s.name || '';
  }

  /** תצוגת כרטיס: תמונה, מילה (עם הדגשה), שורה שנייה. */
  function cardHTML(c, opts) {
    opts = opts || {};
    return '<div class="c-pic">' + DIB.pic({ word: c.text, emoji: c.emoji, img: c.img, pics: c.pics }) + '</div>' +
      (opts.noText ? '' : '<div class="c-text">' + hlText(c.text, c.hl) + '</div>') +
      (c.sub && !opts.noSub ? '<div class="c-sub">' + esc(c.sub) + '</div>' : '');
  }

  /* ---------- חלון המילה שקופצת ---------- */
  function popup(c, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const o = document.createElement('div');
      o.className = 'word-pop';
      o.innerHTML = '<div class="wp-card" role="dialog" aria-label="' + esc(c.text) + '">' +
        '<div class="wp-burst" aria-hidden="true">' + '✦✧✦✧✦✧'.split('').map((s, i) => '<i style="--a:' + (i * 60) + 'deg">' + s + '</i>').join('') + '</div>' +
        cardHTML(c) +
        '<div class="wp-btns"><button class="btn btn-outline btn-lg wp-say" aria-label="השמעה">🔊</button><button class="btn btn-primary btn-lg wp-ok">' + esc(opts.okText || 'המשך ▶') + '</button></div></div>';
      document.body.appendChild(o);
      const say = () => DIB.speak(c.speak || c.text);
      o.querySelector('.wp-say').onclick = say;
      let done = false;
      const close = () => { if (done) return; done = true; o.classList.add('out'); setTimeout(() => { o.remove(); resolve(); }, 260); };
      o.querySelector('.wp-ok').onclick = close;
      setTimeout(say, 280);
      setTimeout(() => o.querySelector('.wp-ok').focus(), 50);
      if (opts.autoClose) setTimeout(close, opts.autoClose);
    });
  }

  /* ---------- קישור להורה ---------- */
  function readLink() {
    const p = new URLSearchParams(location.search).get('c');
    if (!p) return null;
    try { return JSON.parse(p); } catch (e) { return null; }
  }
  function makeLink(cfg) {
    const clean = {};
    Object.keys(cfg).forEach(k => { if (k !== 'patient' && cfg[k] !== '' && cfg[k] != null && !(Array.isArray(cfg[k]) && !cfg[k].length)) clean[k] = cfg[k]; });
    return location.origin + location.pathname + '?c=' + encodeURIComponent(JSON.stringify(clean));
  }
  function shareDialog(cfg, title) {
    const url = makeLink(cfg);
    const msg = 'משחק לתרגול בבית 🎈\n' + title + ' · ' + describe(cfg) + '\n' + url;
    const d = document.createElement('dialog');
    d.className = 'modal';
    d.innerHTML = '<div class="modal-body"><div class="modal-head"><h2>שליחה להורה</h2><button class="btn btn-ghost btn-icon" data-x aria-label="סגירה">✕</button></div>' +
      '<p class="muted">הקישור פותח את המשחק עם בדיוק ההגדרות האלה: <b>' + esc(describe(cfg)) + '</b>. ההורה רק לוחץ "מתחילים".</p>' +
      '<textarea class="input" readonly style="min-height:110px;direction:rtl">' + esc(msg) + '</textarea>' +
      '<div class="modal-foot"><button class="btn btn-primary" data-copy>📋 העתקה</button>' +
      '<a class="btn btn-mint" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">שליחה בוואטסאפ</a>' +
      (navigator.share ? '<button class="btn btn-outline" data-share>שיתוף…</button>' : '') + '</div></div>';
    document.body.appendChild(d);
    d.addEventListener('close', () => d.remove());
    d.querySelector('[data-x]').onclick = () => d.close();
    d.querySelector('[data-copy]').onclick = () => {
      const ta = d.querySelector('textarea');
      (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(() => DIB.toast('הועתק', 'ok'), () => { ta.select(); document.execCommand('copy'); DIB.toast('הועתק', 'ok'); });
    };
    const sh = d.querySelector('[data-share]'); if (sh) sh.onclick = () => navigator.share({ title, text: msg }).catch(() => {});
    d.showModal();
  }

  /* ---------- רשימות שמורות ---------- */
  function lists() { return DIB.get().lists || []; }
  function saveList(name, text, hl) {
    DIB.update(s => {
      s.lists = s.lists || [];
      const ex = s.lists.find(l => l.name === name);
      if (ex) Object.assign(ex, { text, hl }); else s.lists.push({ id: DIB.uid('l'), name, text, hl: hl || '', created: Date.now() });
    });
  }

  /* ---------- בורר התוכן ---------- */
  function picker(host, cfg, sources, onChange) {
    function render() {
      if (!sources.includes(cfg.src)) cfg.src = sources[0];
      const n = cards(cfg).length;
      let h = sources.length > 1 ? '<div class="src-row">' + sources.map(id => '<button class="src' + (cfg.src === id ? ' on' : '') + '" data-src="' + id + '"><span class="em">' + SOURCES[id].em + '</span><b>' + SOURCES[id].name + '</b></button>').join('') + '</div>' : '';

      if (cfg.src === 'words') {
        const cats = DIB.categories();
        cfg.cats = (cfg.cats || []).filter(id => cats.some(c => c.id === id));
        const counts = {};
        DIB.words({ maxLevel: cfg.level || 3 }).forEach(w => counts[w.cat] = (counts[w.cat] || 0) + 1);
        h += '<div class="sub-label">נושאים</div><div class="cats">' +
          '<button class="cat all' + (!cfg.cats.length ? ' on' : '') + '" style="--c:var(--brand)" data-cat="">✨ הכל</button>' +
          cats.map(c => '<button class="cat' + (cfg.cats.includes(c.id) ? ' on' : '') + '" style="--c:' + c.color + '" data-cat="' + c.id + '"><span class="em">' + c.emoji + '</span>' + esc(c.name) + '</button>').join('') + '</div>' +
          seg('רמה', 'level', LEVELS, cfg.level || 3);
      }
      if (cfg.src === 'uses') h += seg('רמה', 'level', LEVELS, cfg.level || 3) + '<p class="muted small" style="margin-top:10px">כל כרטיס מציג חפץ ואת מה שעושים איתו, למשל: <b>מפתח · פותחים</b>.</p>';
      if (cfg.src === 'sentences') {
        cfg.slevels = cfg.slevels && cfg.slevels.length ? cfg.slevels : [1, 2];
        h += '<div class="sub-label">סוגי משפטים</div><div class="cats">' + SENT_LEVELS.map(l => '<button class="cat' + (cfg.slevels.includes(l.v) ? ' on' : '') + '" style="--c:var(--brand)" data-sl="' + l.v + '">' + l.t + '</button>').join('') + '</div>';
      }
      if (cfg.src === 'artic') {
        const snds = DIB.sounds();
        if (!snds.some(x => x.id === cfg.sound)) cfg.sound = snds[0] && snds[0].id;
        cfg.pos = cfg.pos && cfg.pos.length ? cfg.pos : ['start'];
        h += '<div class="sub-label">צליל</div><div class="sounds">' + snds.map(x => '<button class="snd' + (cfg.sound === x.id ? ' on' : '') + '" data-snd="' + x.id + '">' + esc(x.name) + '</button>').join('') + '</div>' +
          '<div class="sub-label">מיקום במילה</div><div class="cats">' + Object.keys(DIB.POS).map(p => '<button class="cat' + (cfg.pos.includes(p) ? ' on' : '') + '" style="--c:var(--coral)" data-pos="' + p + '">' + DIB.POS[p] + '</button>').join('') + '</div>';
      }
      if (cfg.src === 'list') {
        const ls = lists();
        h += (ls.length ? '<div class="sub-label">רשימות שמורות</div><div class="cats">' + ls.map(l => '<button class="cat' + (cfg.listName === l.name ? ' on' : '') + '" style="--c:var(--mint)" data-list="' + esc(l.id) + '">📝 ' + esc(l.name) + '</button>').join('') + '</div>' : '') +
          '<label class="field" style="margin-top:12px"><span>המילים לתרגול (מופרדות בפסיק או בשורה חדשה)</span><textarea class="input" data-k="list" placeholder="רכבת, רגל, ארנב, גזר">' + esc(cfg.list || '') + '</textarea></label>' +
          '<div class="list-row"><label class="field" style="margin:0;flex:1 1 160px"><span>אותיות להדגשה (לא חובה)</span><input class="input" data-k="hl" value="' + esc(cfg.hl || '') + '" placeholder="למשל: ר"></label>' +
          '<button class="btn btn-outline" data-savelist>💾 שמירת הרשימה</button></div>' +
          '<p class="muted small">מילה שקיימת במאגר תופיע עם התמונה שלה. מילה חדשה תופיע עם האות הראשונה, ואפשר להוסיף לה תמונה בדשבורד.</p>';
      }
      h += '<div class="avail-line"><b>' + n + '</b> ' + (cfg.src === 'sentences' ? 'משפטים' : 'מילים') + ' זמינים</div>';
      host.innerHTML = h;

      host.querySelectorAll('[data-src]').forEach(b => b.onclick = () => { cfg.src = b.dataset.src; changed(); });
      host.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { const id = b.dataset.cat; cfg.cats = !id ? [] : cfg.cats.includes(id) ? cfg.cats.filter(x => x !== id) : cfg.cats.concat(id); changed(); });
      host.querySelectorAll('[data-sl]').forEach(b => b.onclick = () => { const v = Number(b.dataset.sl); cfg.slevels = cfg.slevels.includes(v) ? cfg.slevels.filter(x => x !== v) : cfg.slevels.concat(v); if (!cfg.slevels.length) cfg.slevels = [v]; changed(); });
      host.querySelectorAll('[data-snd]').forEach(b => b.onclick = () => { cfg.sound = b.dataset.snd; changed(); });
      host.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => { const p = b.dataset.pos; cfg.pos = cfg.pos.includes(p) ? cfg.pos.filter(x => x !== p) : cfg.pos.concat(p); if (!cfg.pos.length) cfg.pos = [p]; changed(); });
      host.querySelectorAll('.seg[data-k]').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => { cfg[sg.dataset.k] = Number(b.dataset.v); changed(); }));
      host.querySelectorAll('[data-list]').forEach(b => b.onclick = () => { const l = lists().find(x => x.id === b.dataset.list); cfg.list = l.text; cfg.hl = l.hl; cfg.listName = l.name; changed(); });
      host.querySelectorAll('textarea[data-k], input[data-k]').forEach(i => {
        i.oninput = () => { cfg[i.dataset.k] = i.value; cfg.listName = ''; const a = host.querySelector('.avail-line b'); if (a) a.textContent = cards(cfg).length; onChange(true); };
      });
      const sv = host.querySelector('[data-savelist]');
      if (sv) sv.onclick = () => {
        if (!parseList(cfg.list).length) { DIB.toast('הרשימה ריקה', 'error'); return; }
        const name = prompt('איך לקרוא לרשימה?', cfg.listName || '');
        if (!name) return;
        saveList(name.trim(), cfg.list, cfg.hl); cfg.listName = name.trim(); DIB.toast('הרשימה נשמרה', 'ok'); changed();
      };
    }
    function seg(label, k, opts, v) {
      return '<div class="sub-label">' + label + '</div><div class="seg" data-k="' + k + '">' + opts.map(o => '<button class="' + (v === o.v ? 'on' : '') + '" data-v="' + o.v + '">' + o.t + '</button>').join('') + '</div>';
    }
    function changed() { render(); onChange(); }
    render();
    return { render };
  }

  /* ---------- מסך הגדרות אחיד לכל המשחקים ---------- */
  /**
   * opts: { game, title, emoji, intro, sources, defaults, options(cfg) -> html, bindOptions(root, cfg, rerender), minItems, onStart(cfg, cards) }
   */
  function setupScreen(app, opts) {
    const KEY = 'dibburika:' + opts.game + ':last';
    const fromLink = readLink();
    let cfg = Object.assign({}, opts.defaults, DIB.gameSettings(opts.game));
    if (fromLink) Object.assign(cfg, fromLink);
    else { try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ } }
    const persist = () => { if (!fromLink) { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } } };
    let showAll = !fromLink;
    let moreOpen = false;

    function draw() {
      const n = cards(cfg).length;
      const min = opts.minItems || 3;
      const top = '<div class="bar"><a class="title" href="../index.html"><span class="em">' + opts.emoji + '</span>' + esc(opts.title) + '</a><a class="btn btn-ghost btn-sm" href="../index.html">→ לכל המשחקים</a></div>';
      if (!showAll) {
        app.innerHTML = '<div class="wrap">' + top + '<div class="ready"><div class="ready-card"><div class="ready-em">' + opts.emoji + '</div><h1>הכל מוכן!</h1>' +
          '<p class="muted">' + esc(opts.title) + '<br><b>' + esc(describe(cfg)) + '</b></p>' +
          '<button class="btn btn-coral btn-lg" id="go"' + (n < min ? ' disabled' : '') + '>מתחילים ▶</button>' +
          '<button class="btn btn-ghost btn-sm" id="more">שינוי הגדרות</button></div></div></div>';
        app.querySelector('#go').onclick = () => opts.onStart(cfg, cards(cfg));
        app.querySelector('#more').onclick = () => { showAll = true; draw(); };
        return;
      }
      const back = '<div class="bar"><a class="btn btn-ghost btn-sm" href="../index.html">→ לכל המשחקים</a></div>';
      app.innerHTML = '<div class="wrap">' + back + '<div class="setup"><h1><span class="h-em">' + opts.emoji + '</span>' + esc(opts.title) + '</h1><p class="sub">' + esc(opts.intro) + '</p>' +
        '<div class="panel"><h2>ממה משחקים?</h2><div id="picker"></div></div>' +
        '<details class="panel more"' + (moreOpen ? ' open' : '') + '><summary>הגדרות נוספות</summary><div class="opts">' + (opts.options ? opts.options(cfg) : '') +
        '<label class="field" style="margin:0"><span>שם המטופל/ת (לתיעוד, לא חובה)</span><input class="input" id="patient" value="' + esc(cfg.patient || '') + '" placeholder="למשל: נועה"></label></div></details>' +
        '<div class="start-row"><button class="btn btn-outline" id="share">📤 שליחה להורה</button>' +
        '<button class="btn btn-coral btn-lg" id="start"' + (n < min ? ' disabled' : '') + '>' + (n < min ? 'צריך לפחות ' + min : 'מתחילים! ▶') + '</button></div></div></div>';
      picker(app.querySelector('#picker'), cfg, opts.sources, soft => {
        persist();
        const ok = cards(cfg).length >= min;
        const st = app.querySelector('#start');
        st.disabled = !ok; st.textContent = ok ? 'מתחילים! ▶' : 'צריך לפחות ' + min;
        if (!soft && opts.onSourceChange) opts.onSourceChange(cfg, draw);
      });
      app.querySelectorAll('.opts .seg[data-o]').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => {
        cfg[sg.dataset.o] = isNaN(b.dataset.v) ? b.dataset.v : Number(b.dataset.v); persist(); draw();
      }));
      app.querySelectorAll('.opts input[data-t]').forEach(i => i.onchange = () => { cfg[i.dataset.t] = i.checked; persist(); });
      if (opts.bindOptions) opts.bindOptions(app, cfg, draw, persist);
      app.querySelector('details.more').addEventListener('toggle', e => { moreOpen = e.target.open; });
      app.querySelector('#patient').oninput = e => { cfg.patient = e.target.value.trim(); persist(); };
      app.querySelector('#share').onclick = () => shareDialog(cfg, opts.title);
      app.querySelector('#start').onclick = () => opts.onStart(cfg, cards(cfg));
    }
    draw();
    return { redraw: draw, cfg: () => cfg };
  }

  /** שורת אפשרויות מסוג "בחירה אחת" למסך ההגדרות. */
  function optSeg(label, key, values, cur) {
    return '<div><span class="opt-label">' + label + '</span><div class="seg" data-o="' + key + '">' + values.map(v => {
      const val = Array.isArray(v) ? v[0] : v, txt = Array.isArray(v) ? v[1] : v;
      return '<button class="' + (String(cur) === String(val) ? 'on' : '') + '" data-v="' + val + '">' + txt + '</button>';
    }).join('') + '</div></div>';
  }
  function optToggle(label, key, cur) {
    return '<label class="toggle"><span>' + label + '</span><span class="switch"><input type="checkbox" data-t="' + key + '"' + (cur ? ' checked' : '') + '><i></i></span></label>';
  }

  /** מסך סיום אחיד. */
  function endScreen(app, o) {
    const st = o.stars == null ? 3 : o.stars;
    if (st === 3) { DIB.sfx.win(); DIB.confetti(); } else DIB.sfx.win();
    app.innerHTML = '<div class="wrap end"><div class="endcard">' +
      '<div class="trophy">' + (o.trophy || ['🌱', '👍', '🏅', '🏆'][st]) + '</div>' +
      '<div class="stars">' + [1, 2, 3].map(i => '<span class="' + (i <= st ? '' : 'off') + '">⭐</span>').join('') + '</div>' +
      '<h1>' + esc(o.title) + '</h1>' + (o.sub ? '<p class="muted">' + esc(o.sub) + '</p>' : '') +
      (o.kpis ? '<div class="kpis">' + o.kpis.map(k => '<div class="kpi"><b>' + esc(k[0]) + '</b><span>' + esc(k[1]) + '</span></div>').join('') + '</div>' : '') +
      (o.words && o.words.length ? '<div class="seen"><h3>' + esc(o.wordsTitle || 'המילים שפגשנו') + '</h3><div class="list">' + o.words.map(c => '<button class="seen-w" data-say="' + esc(c.speak || c.text) + '">' + DIB.pic({ word: c.text, emoji: c.emoji, img: c.img, pics: c.pics }) + ' ' + esc(c.text) + '</button>').join('') + '</div></div>' : '') +
      '<div class="endbtns"><button class="btn btn-coral btn-lg" id="again">↻ עוד פעם</button><button class="btn btn-outline btn-lg" id="settings">הגדרות</button></div>' +
      '</div></div>';
    if (o.say) DIB.speak(o.say);
    app.querySelectorAll('[data-say]').forEach(b => b.onclick = () => DIB.speak(b.dataset.say));
    app.querySelector('#again').onclick = o.onAgain;
    app.querySelector('#settings').onclick = o.onSettings;
  }

  window.DIBC = { SOURCES, cards, describe, cardHTML, hlText, popup, picker, setupScreen, optSeg, optToggle, endScreen, shareDialog, makeLink, readLink, parseList, lists, saveList };
})();
