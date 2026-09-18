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

### Notes on the source

This file is an Artifact page: it is published wrapped in a host-provided
`<!doctype html><head>…<body>` skeleton, so it deliberately has no `<html>`,
`<head>` or `<body>` tags of its own.

Notes persist to the artifact's `db` capability when it is available, so they
follow you between phone and computer, and fall back to `localStorage`
otherwise. No build step, no dependencies.
