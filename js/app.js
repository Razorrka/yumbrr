/* app.js — wiring. */
(function () {
  'use strict';

  var PREVIEW_W = 1400, THUMB_W = 250;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var SEED = "I was never good\nat being [kept].\n\nteach me the exact weight\nof a hand that means [stay].\n\nshow me the [hallway light]\nsomebody leaves on.";

  var state = {
    id: null, text: SEED, attrib: '', handle: '', glyph: true,
    look: 'flash', film: Object.assign({}, Film.DEFAULTS),
    photoSrc: null, focusX: 0.5, focusY: 0.5
  };

  var img = null;        // working bitmap (original this session, shrunk when restored)
  var processed = null;  // film-treated canvas handed to Card.render
  var lastFrame = null;  // geometry from the most recent paint, for hit-testing

  var card = $('#card'), ctx = card.getContext('2d');

  /* Framed hosts (an embedded viewer) make script-started downloads inert, so
     there the file is handed over on-page instead of through a download. */
  var FRAMED = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  var leftPane = 'write', mobileCard = false;
  var desktop = function () { return window.matchMedia('(min-width:861px)').matches; };

  /* ── chrome ─────────────────────────────────────────────────────────── */

  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }

  var sheet = $('#sheet');
  function openSheet(title, hint, node, copyText) {
    $('#sheetTitle').textContent = title;
    $('#sheetHint').textContent = hint;
    var body = $('#sheetBody'); body.innerHTML = ''; body.appendChild(node);
    var copy = $('#sheetCopy');
    copy.hidden = !copyText;
    copy.onclick = function () {
      if (navigator.clipboard) navigator.clipboard.writeText(copyText).then(function () { toast('Copied'); });
    };
    sheet.classList.add('is-on');
  }
  function closeSheet() { sheet.classList.remove('is-on'); $('#sheetBody').innerHTML = ''; }
  $('#sheetClose').addEventListener('click', closeSheet);
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  /* A framed host won't let the page start a download, but it may offer a
     save capability instead. Ask once, and keep the on-page sheet for when
     neither route is open. */
  var savedNS, savedAsked = false;
  function saveApi() {
    if (savedAsked) return Promise.resolve(savedNS);
    savedAsked = true;
    if (!window.claude || !window.claude.use) return Promise.resolve(null);
    return window.claude.use('downloads').then(
      function (ns) { savedNS = ns; return ns; },
      function () { return null; }
    );
  }

  function sheetFallback(o) {
    if (o.kind === 'image') {
      var im = new Image();
      im.src = o.url || URL.createObjectURL(o.blob); im.alt = o.name;
      openSheet(o.name, 'Right-click the image and choose Save image as — or long-press it on a phone.', im);
    } else {
      var ta = document.createElement('textarea'); ta.readOnly = true; ta.value = o.text;
      openSheet(o.name, 'Copy this and save it as ' + o.name + '. Import brings it back.', ta, o.text);
    }
  }

  /* One place decides how a finished file reaches the user. */
  function deliver(o) {
    if (!FRAMED) {
      var url = o.url || URL.createObjectURL(o.blob);
      var a = document.createElement('a');
      a.href = url; a.download = o.name;
      document.body.appendChild(a); a.click(); a.remove();
      if (!o.url) setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('Saved ' + o.name);
      return;
    }
    saveApi().then(function (api) {
      if (!api) { sheetFallback(o); return; }
      api.save({ filename: o.name, data: o.blob || o.text }).then(
        function (r) { toast(r.status === 'delivered' ? 'Sent ' + o.name : 'Saved ' + o.name); },
        function (err) {
          if (err && err.code === 'declined') return;                 // they said no
          if (err && err.code === 'rate_limited') { toast('One save at a time — try again in a moment.'); return; }
          sheetFallback(o);
        }
      );
    });
  }

  function applyPanes() {
    var d = desktop();
    $$('.pane').forEach(function (p) {
      var n = p.dataset.pane, on;
      if (n === 'card') on = d || mobileCard;
      else on = n === leftPane && (d || !mobileCard);
      p.classList.toggle('is-on', on);
    });
    var active = (!d && mobileCard) ? 'card' : leftPane;
    $$('.tab').forEach(function (t) { t.classList.toggle('is-on', t.dataset.pane === active); });
  }
  function setPane(n) {
    if (n === 'card') mobileCard = true; else { mobileCard = false; leftPane = n; }
    applyPanes();
    if (n === 'shelf') renderShelf();
  }

  (function addCardTab() {
    var b = document.createElement('button');
    b.className = 'tab'; b.dataset.pane = 'card'; b.textContent = 'Card'; b.setAttribute('role', 'tab');
    $('.tabs').appendChild(b);
  })();
  $$('.tab').forEach(function (t) { t.addEventListener('click', function () { setPane(t.dataset.pane); }); });
  window.addEventListener('resize', applyPanes);

  /* ── paint ──────────────────────────────────────────────────────────── */

  function paint() {
    lastFrame = Card.render(ctx, PREVIEW_W, {
      text: state.text, attrib: state.attrib, handle: state.handle, glyph: state.glyph,
      photo: processed, focusX: state.focusX, focusY: state.focusY
    });
    sidebar();
  }

  function sidebar() {
    var tok = Card.tokenize(state.text || '');
    var th = Craft.thread(tok.segs), box = $('#thread');

    if (!(state.text || '').trim()) box.innerHTML = '';
    else if (!th.length) box.innerHTML = '<b>Blue thread</b><span class="none">No highlights yet. Tap a word in the card, or select one and press ⌘K.</span>';
    else box.innerHTML = '<b>Blue thread</b>' + th.map(function (w, i) {
      return (i ? '<span class="sep">·</span>' : '') + '<span class="tw">' + esc(w) + '</span>';
    }).join('');

    var notes = Craft.review(state.text || '', tok.segs);
    $('#notes').innerHTML = notes.map(function (n) {
      return '<div class="note ' + (n.level === 'warn' ? 'warn' : '') + '">' + n.msg + '</div>';
    }).join('');

    var lines = (state.text || '').split('\n').filter(function (l) { return l.trim(); }).length;
    var words = (state.text || '').replace(/[\[\]]/g, '').split(/\s+/).filter(Boolean).length;
    $('#count').textContent = lines + (lines === 1 ? ' line' : ' lines') + ' · ' + words + 'w';
  }

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]; }); }

  /* ── photo ──────────────────────────────────────────────────────────── */

  function frameSize(W) { var w = W * (1 - Card.SPEC.gutter * 2); return { w: w, h: w * Card.SPEC.photoAspect }; }

  var reprocessT;
  function reprocess(now) {
    clearTimeout(reprocessT);
    var run = function () {
      if (!img) { processed = null; paint(); return; }
      var f = frameSize(PREVIEW_W);
      processed = Film.process(img, f.w, f.h, state.film);
      paint();
    };
    if (now) run(); else reprocessT = setTimeout(run, 90);
  }

  function setPhoto(src, keepFocus) {
    return Film.load(src).then(function (im) {
      img = im;
      state.photoSrc = Film.shrink(im, 1600, 0.82);
      if (!keepFocus) { state.focusX = 0.5; state.focusY = 0.5; }
      $('#drop').hidden = true; $('#film').hidden = false;
      reprocess(true); saveDraft();
    }).catch(function (e) { toast(e.message || 'Could not open that image.'); });
  }

  function clearPhoto() {
    img = null; processed = null; state.photoSrc = null;
    $('#drop').hidden = false; $('#film').hidden = true;
    paint(); saveDraft();
  }

  var drop = $('#drop'), fileIn = $('#file');
  drop.addEventListener('click', function () { fileIn.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } });
  fileIn.addEventListener('change', function () {
    if (fileIn.files && fileIn.files[0]) Film.readFile(fileIn.files[0]).then(setPhoto).catch(function (e) { toast(e.message); });
    fileIn.value = '';
  });
  ['dragenter', 'dragover'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('hot'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'dragleave' && e.relatedTarget) return; drop.classList.remove('hot'); });
  });
  document.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /^image\//.test(f.type)) Film.readFile(f).then(setPhoto).catch(function (er) { toast(er.message); });
  });
  document.addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (/^image\//.test(items[i].type)) {
        var f = items[i].getAsFile();
        if (f) { e.preventDefault(); Film.readFile(f).then(setPhoto).catch(function (er) { toast(er.message); }); }
        return;
      }
    }
  });
  $('#clearPhoto').addEventListener('click', clearPhoto);
  $('#swapPhoto').addEventListener('click', function () { fileIn.click(); });

  /* film controls */
  var SLIDERS = ['grain', 'fade', 'warmth', 'exposure', 'vignette'];
  SLIDERS.forEach(function (k) {
    var el = $('#' + k);
    el.addEventListener('input', function () {
      state.film[k] = +el.value;
      el.parentNode.querySelector('i').textContent = el.value;
      $$('.look').forEach(function (b) { b.classList.remove('is-on'); });
      state.look = null; reprocess(); saveDraft();
    });
  });
  function syncSliders() {
    SLIDERS.forEach(function (k) {
      var el = $('#' + k); el.value = state.film[k];
      el.parentNode.querySelector('i').textContent = el.value;
    });
  }
  (function buildLooks() {
    var wrap = $('#looks');
    Object.keys(Film.LOOKS).forEach(function (key) {
      var b = document.createElement('button');
      b.className = 'look' + (key === state.look ? ' is-on' : '');
      b.textContent = Film.LOOKS[key].label;
      b.addEventListener('click', function () {
        state.look = key;
        SLIDERS.forEach(function (k) { state.film[k] = Film.LOOKS[key][k]; });
        $$('.look').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        syncSliders(); reprocess(); saveDraft();
      });
      wrap.appendChild(b);
    });
  })();

  /* ── card interaction: tap a word, drag the photo ───────────────────── */

  function cardPoint(e) {
    var r = card.getBoundingClientRect(), s = card.width / r.width;
    return { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s };
  }

  var drag = null;
  card.addEventListener('pointerdown', function (e) {
    if (!lastFrame) return;
    var p = cardPoint(e), ph = lastFrame.photo;
    if (processed && p.x >= ph.x && p.x <= ph.x + ph.w && p.y >= ph.y && p.y <= ph.y + ph.h) {
      var s = Math.max(ph.w / processed.width, ph.h / processed.height);
      drag = {
        x: e.clientX, y: e.clientY, fx: state.focusX, fy: state.focusY, moved: false,
        ox: processed.width * s - ph.w, oy: processed.height * s - ph.h,
        scale: card.width / card.getBoundingClientRect().width
      };
      card.setPointerCapture(e.pointerId);
    }
  });
  card.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = (e.clientX - drag.x) * drag.scale, dy = (e.clientY - drag.y) * drag.scale;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.ox > 1) state.focusX = Math.min(1, Math.max(0, drag.fx - dx / drag.ox));
    if (drag.oy > 1) state.focusY = Math.min(1, Math.max(0, drag.fy - dy / drag.oy));
    paint();
  });
  card.addEventListener('pointerup', function (e) {
    if (drag) { var m = drag.moved; drag = null; if (m) { saveDraft(); return; } }
    if (!lastFrame) return;
    var p = cardPoint(e), pad = Card.SPEC.fontSize * PREVIEW_W * 0.28, b, i;
    for (i = 0; i < lastFrame.boxes.length; i++) {
      b = lastFrame.boxes[i];
      if (p.x >= b.x - 2 && p.x <= b.x + b.w + 2 && p.y >= b.y - pad && p.y <= b.y + b.h + pad) {
        state.text = Card.toggle(state.text, b.seg);
        $('#text').value = state.text;
        paint(); saveDraft(); return;
      }
    }
  });
  card.addEventListener('pointercancel', function () { drag = null; });

  /* ── editor ─────────────────────────────────────────────────────────── */

  var ta = $('#text');
  ta.value = state.text;
  ta.addEventListener('input', function () { state.text = ta.value; paint(); saveDraft(); });

  function doWrap() {
    var r = Card.wrapRange(ta.value, ta.selectionStart, ta.selectionEnd);
    if (!r) return;
    ta.value = state.text = r.text;
    ta.setSelectionRange(r.caret, r.caret);
    ta.focus(); paint(); saveDraft();
  }
  $('#linkBtn').addEventListener('click', doWrap);

  ['attrib', 'handle'].forEach(function (k) {
    var el = $('#' + k);
    el.addEventListener('input', function () { state[k] = el.value; paint(); saveDraft(); });
  });
  $('#glyph').addEventListener('change', function () { state.glyph = $('#glyph').checked; paint(); saveDraft(); });

  document.addEventListener('keydown', function (e) {
    var mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); doWrap(); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); savePoem(); }
    else if (mod && e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); exportPNG(); }
  });

  /* ── export ─────────────────────────────────────────────────────────── */

  function slug(s) {
    return (s || 'poem').toLowerCase().replace(/[\[\]]/g, '').replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '').slice(0, 46) || 'poem';
  }

  function exportPNG() {
    var W = +$('#size').value;
    var cv = document.createElement('canvas'), c2 = cv.getContext('2d');
    var hi = processed;
    if (img) { var f = frameSize(W); hi = Film.process(img, f.w, f.h, state.film); }   // grain at true size
    Card.render(c2, W, {
      text: state.text, attrib: state.attrib, handle: state.handle, glyph: state.glyph,
      photo: hi, focusX: state.focusX, focusY: state.focusY
    });
    var name = slug(Store.title(state.text)) + '.png';
    if (cv.toBlob) cv.toBlob(function (b) {
      deliver(b ? { name: name, kind: 'image', blob: b }
                : { name: name, kind: 'image', url: cv.toDataURL('image/png') });
    }, 'image/png');
    else deliver({ name: name, kind: 'image', url: cv.toDataURL('image/png') });
  }
  $('#pngBtn').addEventListener('click', exportPNG);

  /* ── shelf ──────────────────────────────────────────────────────────── */

  function snapshot() {
    return {
      id: state.id, text: state.text, attrib: state.attrib, handle: state.handle,
      glyph: state.glyph, look: state.look, film: Object.assign({}, state.film),
      photoSrc: state.photoSrc, focusX: state.focusX, focusY: state.focusY
    };
  }

  var draftT;
  function saveDraft() {
    clearTimeout(draftT);
    draftT = setTimeout(function () { Store.draft(snapshot()); }, 900);
  }

  function savePoem() {
    if (!(state.text || '').trim()) { toast('Nothing to save yet.'); return; }
    var r = Store.save(snapshot());
    if (!r.ok) {
      toast(r.full ? 'Browser storage is full — export your shelf, then delete a few.' : 'Could not save.');
      return;
    }
    state.id = r.poem.id;
    toast('Saved to shelf');
    if (leftPane === 'shelf') renderShelf();
  }
  $('#saveBtn').addEventListener('click', savePoem);

  $('#newBtn').addEventListener('click', function () {
    if ((state.text || '').trim() && !confirm('Start a new poem? Anything unsaved on this card is lost.')) return;
    state.id = null; state.text = ''; ta.value = '';
    clearPhoto(); setPane('write'); ta.focus();
  });

  function loadPoem(p) {
    state.id = p.id; state.text = p.text || '';
    state.attrib = p.attrib || ''; state.handle = p.handle || '';
    state.glyph = p.glyph !== false; state.look = p.look || null;
    state.film = Object.assign({}, Film.DEFAULTS, p.film || {});
    state.focusX = p.focusX == null ? 0.5 : p.focusX;
    state.focusY = p.focusY == null ? 0.5 : p.focusY;
    ta.value = state.text; $('#attrib').value = state.attrib; $('#handle').value = state.handle;
    $('#glyph').checked = state.glyph;
    $$('.look').forEach(function (b) { b.classList.toggle('is-on', b.textContent === (Film.LOOKS[state.look] || {}).label); });
    syncSliders();
    if (p.photoSrc) setPhoto(p.photoSrc, true); else { clearPhoto(); paint(); }
    setPane('write');
  }

  function renderShelf() {
    var list = Store.read(), wrap = $('#shelf');
    $('#shelfCount').textContent = list.length ? list.length + (list.length === 1 ? ' poem' : ' poems') : '';
    if (!list.length) { wrap.innerHTML = '<div class="empty">Nothing here yet. Write one and press Save.</div>'; return; }
    wrap.innerHTML = '';
    list.forEach(function (p) {
      var el = document.createElement('div');
      el.className = 'item' + (p.id === state.id ? ' is-on' : '');
      var cv = document.createElement('canvas');
      var meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = '<b>' + esc(p.title || Store.title(p.text)) + '</b><span>' +
                       new Date(p.updated || Date.now()).toLocaleDateString() + '</span>';
      var del = document.createElement('button');
      del.className = 'del'; del.innerHTML = '&times;'; del.title = 'Delete';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('Delete “' + (p.title || 'this poem') + '”?')) return;
        Store.remove(p.id); if (state.id === p.id) state.id = null; renderShelf();
      });
      el.appendChild(cv); el.appendChild(meta); el.appendChild(del);
      el.addEventListener('click', function () { loadPoem(p); });
      wrap.appendChild(el);
      thumb(cv, p);
    });
  }

  function thumb(cv, p) {
    var c = cv.getContext('2d');
    var draw = function (photo) {
      Card.render(c, THUMB_W, {
        text: p.text, attrib: p.attrib, handle: p.handle, glyph: p.glyph !== false,
        photo: photo, focusX: p.focusX, focusY: p.focusY
      });
    };
    if (!p.photoSrc) { draw(null); return; }
    Film.load(p.photoSrc).then(function (im) {
      var f = frameSize(THUMB_W);
      draw(Film.process(im, f.w, f.h, Object.assign({}, Film.DEFAULTS, p.film || {})));
    }).catch(function () { draw(null); });
  }

  $('#exportAll').addEventListener('click', function () {
    var text = Store.exportAll();
    deliver({ name: 'yumbrr-shelf.json', kind: 'text', text: text,
              blob: new Blob([text], { type: 'application/json' }) });
  });
  $('#importAll').addEventListener('click', function () { $('#importFile').click(); });
  $('#importFile').addEventListener('change', function () {
    var f = $('#importFile').files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var r = Store.importAll(fr.result);
      toast(r.ok ? 'Added ' + r.added + (r.added === 1 ? ' poem' : ' poems') : r.msg);
      if (r.ok) renderShelf();
    };
    fr.readAsText(f); $('#importFile').value = '';
  });

  /* ── craft pane ─────────────────────────────────────────────────────── */

  (function buildCraft() {
    var tools = document.createElement('div');
    tools.innerHTML =
      '<h2>Sparks</h2>' +
      '<p>Half an image each. A cold noun looking for something warm, or the other way round — take one and finish it badly, then fix it.</p>' +
      '<div class="sparks" id="sparkList"></div>' +
      '<button class="btn tiny ghost" id="sparkMore">Again</button>' +
      '<h3>First lines</h3><div class="sparks" id="openerList"></div>' +
      '<h3>A drill for today</h3><div class="rule" id="drill"></div>';
    var body = $('#craftBody');
    body.appendChild(tools);
    var guide = document.createElement('div');
    guide.innerHTML = Craft.HTML;
    body.appendChild(guide);

    function fillSparks() {
      $('#sparkList').innerHTML = Craft.sparks(6).map(function (s) {
        return '<span class="spark">' + esc(s.a) + '<b>' + esc(s.b) + '</b></span>';
      }).join('');
    }
    $('#sparkMore').addEventListener('click', fillSparks);
    fillSparks();

    $('#openerList').innerHTML = Craft.pick(Craft.OPENERS, 4).map(function (o) {
      return '<span class="spark">' + esc(o) + '</span>';
    }).join('');
    $('#drill').innerHTML = Craft.pick(Craft.DRILLS, 1)[0];
  })();

  /* ── boot ───────────────────────────────────────────────────────────── */

  (function boot() {
    var d = Store.lastDraft();
    if (d && typeof d.text === 'string') {
      state.id = d.id || null; state.text = d.text;
      state.attrib = d.attrib == null ? state.attrib : d.attrib;
      state.handle = d.handle || ''; state.glyph = d.glyph !== false;
      state.look = d.look || null;
      state.film = Object.assign({}, Film.DEFAULTS, d.film || {});
      state.focusX = d.focusX == null ? 0.5 : d.focusX;
      state.focusY = d.focusY == null ? 0.5 : d.focusY;
      state.photoSrc = d.photoSrc || null;
    }
    ta.value = state.text;
    $('#attrib').value = state.attrib; $('#handle').value = state.handle;
    $('#glyph').checked = state.glyph;
    $$('.look').forEach(function (b) { b.classList.toggle('is-on', b.textContent === (Film.LOOKS[state.look] || {}).label); });
    syncSliders();
    applyPanes();
    if (state.photoSrc) setPhoto(state.photoSrc, true); else paint();
  })();
})();
