# yumbrr

## Fish Counter Notebook

A notes app for a supermarket seafood counter job. Ten topics, one note each.
Tap a topic, write what you learned, it saves as you type.

**Source:** [`seafood-notebook.html`](seafood-notebook.html)

### Topics

Handing out food · Wrapping food · Reading dates on food · Cleaning tables ·
Filling the bleach · Where supplies are in the back · The other kitchen ·
Using a knife · Stuff to ask about · Everything else

You can add your own topics. **Edit** turns on reordering (up/down per row) and
delete on every row, built-in ones included.

Order and deletions are stored as `order` and `removed` id lists rather than by
rewriting the topic list, so notes stay keyed to stable topic ids and a topic
added on another device is appended rather than dropped.

### Deploying it

`index.html`, `manifest.webmanifest`, `sw.js` and `assets/` are a complete
static site — publish the repo root with GitHub Pages and the result installs
to a phone home screen as **Fish Notes**, with an offline cache so it opens
without signal.

`index.html` is generated, not hand-edited. Edit `seafood-notebook.html` and
regenerate:

    python3 tools/build.py      # wraps the fragment into a standalone page
    python3 tools/make_icon.py  # regenerates assets/icon-*.png

No personal notes are stored in this repo. To move notes from another copy of
the app onto a device, open the site once with a
`#import=<base64url json>` fragment; the fragment is read in the browser and
never sent anywhere.

### Notes on the source

This file is an Artifact page: it is published wrapped in a host-provided
`<!doctype html><head>…<body>` skeleton, so it deliberately has no `<html>`,
`<head>` or `<body>` tags of its own.

Notes persist to the artifact's `db` capability when it is available, so they
follow you between phone and computer, and fall back to `localStorage`
otherwise — which is what the GitHub Pages build uses, since `window.claude`
only exists inside the artifact viewer. No dependencies either way.
