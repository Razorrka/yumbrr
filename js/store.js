/* store.js — the shelf. Everything lives in this browser and nowhere else,
   which means a cleared cache is a house fire; hence export/import. */
(function (root) {
  'use strict';

  var KEY = 'yumbrr.v1', DRAFT = 'yumbrr.draft.v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return { ok: true }; }
    catch (e) {
      return { ok: false, full: /quota|exceeded/i.test(e.name + ' ' + e.message) };
    }
  }

  function title(text) {
    var l = (text || '').split('\n').map(function (s) { return s.replace(/[\[\]]/g, '').trim(); })
                        .filter(Boolean)[0] || 'untitled';
    return l.length > 42 ? l.slice(0, 41) + '…' : l;
  }

  function save(poem) {
    var list = read(), i;
    poem.updated = Date.now();
    if (!poem.id) { poem.id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); poem.created = poem.updated; }
    poem.title = title(poem.text);
    for (i = 0; i < list.length; i++) if (list[i].id === poem.id) { list[i] = poem; break; }
    if (i === list.length) list.unshift(poem);
    var r = write(list);
    return { ok: r.ok, full: r.full, poem: poem };
  }

  function remove(id) {
    write(read().filter(function (p) { return p.id !== id; }));
  }

  function draft(poem) {
    try { localStorage.setItem(DRAFT, JSON.stringify(poem)); } catch (e) {}
  }
  function lastDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT)); } catch (e) { return null; }
  }

  function exportAll() {
    return JSON.stringify({ app: 'yumbrr', version: 1, exported: new Date().toISOString(), poems: read() }, null, 2);
  }

  function importAll(json) {
    var incoming;
    try { incoming = JSON.parse(json); } catch (e) { return { ok: false, msg: 'That file is not valid JSON.' }; }
    var poems = Array.isArray(incoming) ? incoming : incoming && incoming.poems;
    if (!Array.isArray(poems)) return { ok: false, msg: 'No poems found in that file.' };

    var list = read(), have = {}, added = 0, i;
    for (i = 0; i < list.length; i++) have[list[i].id] = 1;
    for (i = 0; i < poems.length; i++) {
      if (!poems[i] || typeof poems[i].text !== 'string') continue;
      if (poems[i].id && have[poems[i].id]) continue;
      if (!poems[i].id) poems[i].id = 'p' + Date.now().toString(36) + i;
      list.unshift(poems[i]); added++;
    }
    var r = write(list);
    if (!r.ok) return { ok: false, msg: r.full ? 'Not enough browser storage for that import.' : 'Could not write to storage.' };
    return { ok: true, added: added };
  }

  root.Store = { read: read, save: save, remove: remove, draft: draft, lastDraft: lastDraft,
                 exportAll: exportAll, importAll: importAll, title: title };
})(window);
