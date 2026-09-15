# yumbrr

## Fish Counter Notebook

A personal training notebook for working a supermarket seafood counter. It is a
notebook, not a manual: it ships with the questions, and you fill in the answers
from your own trainer and your own store.

**Source:** [`seafood-notebook.html`](seafood-notebook.html)

### What it does

- **53 tasks across 8 stations** — starting with "when nobody's told me what to
  do," then the counter, wrapping, date codes, cleaning and sanitizer, the back
  room, the other kitchen, and knives.
- **A three-way status on every task** — *not shown yet* / *with help* / *on my
  own* — so the header meter always answers "what can I actually do alone?"
- **Tap-to-ask** — every task carries the specific questions worth asking. Tap
  one and it lands in the "Ask my trainer" queue at the top; check it off when
  you get the answer.
- **Notes on every task**, plus room to add your own tasks per station.
- **A day-of-year code decoder** for the three-digit codes stamped on seafood
  cases (`142` → May 22, and how many days ago that was).
- **Search** across every task, question and note.

### Deliberately blank

Every store-specific number — sanitizer ratios, ppm targets, hold times, how
many days each item gets — is left empty on purpose. Those come from a trainer,
a label, or a test strip, never from this file. The blue notes in the app are
general food-handling rules only; the red ones are safety rules.

### Notes on the source

This file is an Artifact page: it is published wrapped in a host-provided
`<!doctype html><head>…<body>` skeleton, so it deliberately has no `<html>`,
`<head>` or `<body>` tags of its own.

Notes persist to the artifact's `db` capability when it is available, so they
follow you between phone and computer, and fall back to `localStorage`
otherwise. No build step, no dependencies.
