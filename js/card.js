/* card.js — the format.
   Every number below was measured off the reference cards, then expressed as a
   fraction of card width so the layout is resolution-independent: the preview
   and the exported PNG run through this same function. */
(function (root) {
  'use strict';

  var SPEC = {
    ratio:        1.562,    // card height / card width
    gutter:       0.0080,   // photo + text inset from the card edge
    photoAspect:  0.669,    // photo height / photo width
    fontSize:     0.0469,
    lineHeight:   0.0939,   // exactly 2.0x the type size — the air is the point
    stanzaExtra:  0.0422,   // a blank line adds this, not a whole line
    firstBaseline:0.1026,   // photo bottom -> first baseline
    glyph:  { top:0.0127, w:0.0247, h:0.0191, right:0.0255 },
    attrib: { size:0.0366, bottom:0.0262, right:0.0143 },
    mark:   { size:0.0243, bottom:0.0262, right:0.0143 },
    bg:'#f8fafb', border:'#cdcdcd', ink:'#101112', blue:'#3a66bd', glyphInk:'#a8adb2',
    font:'"Helvetica Neue",Helvetica,-apple-system,BlinkMacSystemFont,Arial,sans-serif'
  };

  var OPEN_P = '“‘"\'([{', CLOSE_P = '.,!?;:—…”’"\')]}';

  /* ── source text -> segments ─────────────────────────────────────────────
     A segment is a run of characters that share one colour. Punctuation that
     sits outside the brackets becomes its own segment, so `[human].` renders
     as a blue "human" followed by a black stop, with no space between them. */

  function findMarks(src) {
    var marks = [], i = 0;
    while (i < src.length) {
      if (src[i] === '[') {
        var close = src.indexOf(']', i + 1), nextOpen = src.indexOf('[', i + 1);
        if (close > -1 && (nextOpen === -1 || close < nextOpen)) {
          marks.push({ s: i, e: close }); i = close + 1; continue;
        }
      }
      i++;
    }
    return marks;
  }

  function tokenize(src) {
    var marks = findMarks(src), segs = [], lines = [[]];
    var cur = null, space = false, m, i, c, k, isBracket;

    function markAt(idx) {
      for (var j = 0; j < marks.length; j++) if (idx > marks[j].s && idx < marks[j].e) return marks[j];
      return null;
    }

    for (i = 0; i < src.length; i++) {
      c = src[i];
      isBracket = false;
      for (k = 0; k < marks.length; k++) if (marks[k].s === i || marks[k].e === i) { isBracket = true; break; }
      if (isBracket) { cur = null; continue; }          // brackets never render
      if (c === '\n') { cur = null; space = false; lines.push([]); continue; }
      if (c === ' ' || c === '\t') { cur = null; space = true; continue; }

      m = markAt(i);
      if (cur && cur.mark !== m) cur = null;             // colour changed mid-word
      if (!cur) {
        cur = { text:'', blue:!!m, mark:m, s:i, e:i, spaceBefore:space && lines[lines.length-1].length > 0, i:segs.length };
        segs.push(cur); lines[lines.length - 1].push(cur); space = false;
      }
      cur.text += c; cur.e = i;
    }
    return { segs: segs, lines: lines };
  }

  /* Clicking a word rewrites the source. Turning a word blue skips the
     punctuation glued to it; turning one off releases its whole bracket. */
  function toggle(src, seg) {
    if (seg.blue && seg.mark) {
      return src.slice(0, seg.mark.s) + src.slice(seg.mark.s + 1, seg.mark.e) + src.slice(seg.mark.e + 1);
    }
    var s = seg.s, e = seg.e;
    while (s < e && OPEN_P.indexOf(src[s]) > -1) s++;
    while (e > s && CLOSE_P.indexOf(src[e]) > -1) e--;
    return src.slice(0, s) + '[' + src.slice(s, e + 1) + ']' + src.slice(e + 1);
  }

  /* Wrap a text selection (the ⌘K path — handles multi-word phrases). */
  function wrapRange(src, a, b) {
    if (a === b) {                                       // no selection: take the word under the caret
      var w = /[^\s\[\]]/;
      while (a > 0 && w.test(src[a - 1])) a--;
      while (b < src.length && w.test(src[b])) b++;
    }
    while (a < b && /\s/.test(src[a])) a++;
    while (b > a && /\s/.test(src[b - 1])) b--;
    if (a >= b) return null;

    var marks = findMarks(src), i;
    for (i = 0; i < marks.length; i++) {                 // already blue -> unwrap
      if (a > marks[i].s && b <= marks[i].e) {
        return { text: src.slice(0, marks[i].s) + src.slice(marks[i].s + 1, marks[i].e) + src.slice(marks[i].e + 1),
                 caret: b - 1 };
      }
    }
    var inner = src.slice(a, b).replace(/[\[\]]/g, '');
    return { text: src.slice(0, a) + '[' + inner + ']' + src.slice(b), caret: a + inner.length + 2 };
  }

  /* ── layout + paint ──────────────────────────────────────────────────── */

  function scale(W) {
    var s = {}, k;
    for (k in SPEC) if (typeof SPEC[k] === 'number') s[k] = SPEC[k] * W;
    s.glyph  = { top:SPEC.glyph.top*W,  w:SPEC.glyph.w*W,  h:SPEC.glyph.h*W,  right:SPEC.glyph.right*W };
    s.attrib = { size:SPEC.attrib.size*W, bottom:SPEC.attrib.bottom*W, right:SPEC.attrib.right*W };
    s.mark   = { size:SPEC.mark.size*W,   bottom:SPEC.mark.bottom*W,   right:SPEC.mark.right*W };
    return s;
  }

  // Break each source line into rows that fit the column.
  function flow(ctx, lines, maxW, spaceW) {
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
      var segs = lines[i];
      if (!segs.length) { rows.push(null); continue; }   // blank line -> stanza break

      var clusters = [], j;                              // a cluster never splits
      for (j = 0; j < segs.length; j++) {
        if (!clusters.length || segs[j].spaceBefore) clusters.push([segs[j]]);
        else clusters[clusters.length - 1].push(segs[j]);
      }

      var row = [], w = 0;
      for (j = 0; j < clusters.length; j++) {
        var cw = 0, k;
        for (k = 0; k < clusters[j].length; k++) cw += ctx.measureText(clusters[j][k].text).width;
        var add = row.length ? spaceW + cw : cw;
        if (row.length && w + add > maxW) { rows.push(row); row = [clusters[j]]; w = cw; }
        else { row.push(clusters[j]); w += add; }
      }
      if (row.length) rows.push(row);
    }
    while (rows.length && rows[rows.length - 1] === null) rows.pop();
    return rows;
  }

  function coverRect(iw, ih, w, h, fx, fy) {
    var s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
    return { dw: dw, dh: dh, dx: (w - dw) * fx, dy: (h - dh) * fy };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /**
   * Draw a card. Returns { w, h, boxes } where boxes are the on-canvas
   * rectangles of every segment, used for tap-to-toggle in the preview.
   */
  function render(ctx, W, state) {
    var S = scale(W), g = S.gutter, cw = W - g * 2;      // content column
    var photoH = cw * SPEC.photoAspect;
    var photoBottom = g + (state.photo ? photoH : 0);

    ctx.font = S.fontSize + 'px ' + SPEC.font;
    ctx.textBaseline = 'alphabetic';
    var spaceW = ctx.measureText(' ').width;

    var tok = tokenize(state.text || '');
    var rows = flow(ctx, tok.lines, cw, spaceW);

    // Vertical rhythm: measure first so the card can grow if a poem runs long.
    var top = state.photo ? photoBottom + S.firstBaseline
                          : g + S.fontSize * 0.73 + S.lineHeight * 0.55;
    var y = top, first = true, pending = 0, i;
    var ys = [];
    for (i = 0; i < rows.length; i++) {
      if (rows[i] === null) { if (!first) pending += S.stanzaExtra; ys.push(null); continue; }
      if (first) first = false; else y += S.lineHeight;
      y += pending; pending = 0;
      ys.push(y);
    }

    var tail = state.attrib || state.handle
      ? S.fontSize * 0.21 + S.lineHeight * 0.20 + S.attrib.size * 0.94 + S.attrib.bottom
      : S.fontSize * 0.21 + S.lineHeight * 0.35;
    var H = Math.max(Math.round(W * SPEC.ratio), Math.round(y + tail));

    ctx.canvas.width = W; ctx.canvas.height = H;
    ctx.font = S.fontSize + 'px ' + SPEC.font;           // resizing clears state
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = SPEC.bg; ctx.fillRect(0, 0, W, H);

    // photo
    if (state.photo && state.photo.width) {
      ctx.save();
      ctx.beginPath(); ctx.rect(g, g, cw, photoH); ctx.clip();
      var c = coverRect(state.photo.width, state.photo.height, cw, photoH,
                        state.focusX == null ? 0.5 : state.focusX,
                        state.focusY == null ? 0.5 : state.focusY);
      ctx.drawImage(state.photo, g + c.dx, g + c.dy, c.dw, c.dh);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = Math.max(1, W * 0.0011);
      ctx.strokeRect(g + ctx.lineWidth / 2, g + ctx.lineWidth / 2, cw - ctx.lineWidth, photoH - ctx.lineWidth);
    }

    // the little folded-page mark under the photo, right side
    if (state.glyph !== false && state.photo) {
      var gw = S.glyph.w, gh = S.glyph.h, fold = gw * 0.34;
      var gx = W - S.glyph.right - gw, gy = photoBottom + S.glyph.top;
      ctx.strokeStyle = SPEC.glyphInk;
      ctx.lineWidth = Math.max(1, W * 0.0018);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(gx, gy); ctx.lineTo(gx + gw - fold, gy); ctx.lineTo(gx + gw, gy + fold);
      ctx.lineTo(gx + gw, gy + gh); ctx.lineTo(gx, gy + gh); ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx + gw - fold, gy); ctx.lineTo(gx + gw - fold, gy + fold); ctx.lineTo(gx + gw, gy + fold);
      ctx.stroke();
    }

    // the poem
    var boxes = [], asc = S.fontSize * 0.73, desc = S.fontSize * 0.21;
    for (i = 0; i < rows.length; i++) {
      if (rows[i] === null) continue;
      var x = g, cl, j, k, seg, sw;
      for (j = 0; j < rows[i].length; j++) {
        cl = rows[i][j];
        if (j) x += spaceW;
        for (k = 0; k < cl.length; k++) {
          seg = cl[k];
          sw = ctx.measureText(seg.text).width;
          ctx.fillStyle = seg.blue ? SPEC.blue : SPEC.ink;
          ctx.fillText(seg.text, x, ys[i]);
          boxes.push({ x: x, y: ys[i] - asc, w: sw, h: asc + desc, seg: seg });
          x += sw;
        }
      }
    }

    // signature, pinned to the bottom edge
    if (state.attrib) {
      ctx.font = S.attrib.size + 'px ' + SPEC.font;
      ctx.fillStyle = SPEC.ink; ctx.textAlign = 'right';
      ctx.fillText(state.attrib, W - S.attrib.right, H - S.attrib.bottom);
      ctx.textAlign = 'left';
    }
    if (state.handle) {
      ctx.font = S.mark.size + 'px ' + SPEC.font;
      ctx.fillStyle = 'rgba(16,17,18,.20)'; ctx.textAlign = 'left';
      ctx.fillText(state.handle, S.mark.right + S.gutter, H - S.mark.bottom);
    }

    // card edge
    ctx.strokeStyle = SPEC.border; ctx.lineWidth = Math.max(1, W * 0.0013);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);

    return { w: W, h: H, boxes: boxes, photo: { x: g, y: g, w: cw, h: photoH } };
  }

  root.Card = {
    SPEC: SPEC, render: render, tokenize: tokenize,
    toggle: toggle, wrapRange: wrapRange, roundRect: roundRect
  };
})(window);
