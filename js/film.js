/* film.js — makes any photo look like it was taken on a disposable camera in
   1999 and scanned badly. The grain is baked into the bitmap rather than laid
   over the card in CSS, so the exported PNG is identical to the preview. */
(function (root) {
  'use strict';

  var LOOKS = {
    flash:  { label:'Flash',  grain:52, fade:16, warmth:20, exposure:-4, vignette:44 },
    faded:  { label:'Faded',  grain:38, fade:40, warmth:12, exposure:6,  vignette:20 },
    dusk:   { label:'Dusk',   grain:46, fade:24, warmth:-16,exposure:-6, vignette:54 },
    kitchen:{ label:'Kitchen',grain:34, fade:10, warmth:30, exposure:10, vignette:26 },
    clean:  { label:'Clean',  grain:8,  fade:4,  warmth:4,  exposure:0,  vignette:8  }
  };

  var DEFAULTS = { grain:46, fade:22, warmth:14, exposure:0, vignette:34 };

  function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  /**
   * @param {HTMLImageElement} img  the untouched original
   * @param {number} frameW,frameH  the card's photo frame, in export pixels
   * @param {object} o              grain/fade/warmth/exposure/vignette, 0..100
   * @returns {HTMLCanvasElement}   ready to hand straight to Card.render
   */
  function process(img, frameW, frameH, o) {
    o = o || DEFAULTS;
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;

    // Render at exactly the resolution the frame needs — never upscale here,
    // the card can do that once at draw time.
    var s = Math.min(Math.max(frameW / iw, frameH / ih), 1);
    var w = Math.max(2, Math.round(iw * s)), h = Math.max(2, Math.round(ih * s));

    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    var img2 = ctx.getImageData(0, 0, w, h), d = img2.data;

    var grain    = (o.grain    || 0) / 100;
    var fade     = (o.fade     || 0) / 100;
    var warmth   = (o.warmth   || 0) / 100;
    var exposure = (o.exposure || 0) / 100;
    var vig      = (o.vignette || 0) / 100;

    var lift = fade * 34;                 // matte black point
    var comp = 1 - fade * 0.20;           // fade eats a little contrast
    var gain = Math.pow(2, exposure * 0.9);
    var wr = warmth * 26, wb = -warmth * 22;
    var amp = grain * 62;

    // Grain clumps rather than single pixels, scaled so it reads the same at
    // any export size.
    var cell = Math.max(1, Math.round(w / 900));
    var nw = Math.ceil(w / cell), nh = Math.ceil(h / cell), noise = new Float32Array(nw * nh);
    for (var n = 0; n < noise.length; n++) noise[n] = (Math.random() + Math.random() - 1);

    var cx = w / 2, cy = h / 2, maxD = Math.sqrt(cx * cx + cy * cy);

    for (var y = 0; y < h; y++) {
      var ny = ((y / cell) | 0) * nw;
      var dy = (y - cy) / maxD;
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var r = d[i], g = d[i + 1], b = d[i + 2];

        r *= gain; g *= gain; b *= gain;
        r += wr;   b += wb;
        r = lift + r * comp * (1 - lift / 255);
        g = lift + g * comp * (1 - lift / 255);
        b = lift + b * comp * (1 - lift / 255);

        if (amp) {
          var L = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          var wgt = 0.30 + 2.8 * L * (1 - L);       // grain lives in the midtones
          var nz = noise[ny + ((x / cell) | 0)] * amp * wgt;
          r += nz; g += nz; b += nz;
        }

        if (vig) {
          var dx = (x - cx) / maxD, dist = Math.sqrt(dx * dx + dy * dy) / 0.7071;
          var v = 1 - vig * 0.85 * Math.pow(dist > 1 ? 1 : dist, 2.4);
          r *= v; g *= v; b *= v;
        }

        d[i] = clamp(r); d[i + 1] = clamp(g); d[i + 2] = clamp(b);
      }
    }
    ctx.putImageData(img2, 0, 0);
    return cv;
  }

  /* Re-encode an original down to something localStorage can actually hold. */
  function shrink(img, maxW, quality) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var s = Math.min(maxW / iw, 1);
    var cv = document.createElement('canvas');
    cv.width = Math.round(iw * s); cv.height = Math.round(ih * s);
    var c = cv.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', quality || 0.78);
  }

  function load(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error('That file would not open as an image.')); };
      im.src = src;
    });
  }

  function readFile(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(new Error('Could not read that file.')); };
      fr.readAsDataURL(file);
    });
  }

  root.Film = { LOOKS: LOOKS, DEFAULTS: DEFAULTS, process: process, shrink: shrink, load: load, readFile: readFile };
})(window);
