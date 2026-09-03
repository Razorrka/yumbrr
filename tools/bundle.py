#!/usr/bin/env python3
"""Inline css/ and js/ into index.html to produce single-file builds.

  dist/yumbrr.html   standalone — open it from disk, nothing else needed
  dist/embed.html    body-only, for hosts that supply their own document shell
"""
import re, pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()

css = (root / 'css/app.css').read_text()
html = re.sub(r'\s*<link rel="stylesheet" href="css/app\.css">',
              '\n<style>\n' + css + '\n</style>', html)

def inline(m):
    src = m.group(1)
    return '<script>\n' + (root / src).read_text() + '</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

if '<script src=' in html or '<link rel="stylesheet"' in html:
    sys.exit('bundle: an external reference survived')

(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/yumbrr.html').write_text(html)

# Body-only: strip the document shell, keep <title> and <style> at the top.
body = html.split('<body>', 1)[1].rsplit('</body>', 1)[0]
head = re.search(r'<title>.*?</title>', html, re.S).group(0)
style = re.search(r'<style>.*?</style>', html, re.S).group(0)
(root / 'dist/embed.html').write_text(head + '\n' + style + '\n' + body.strip() + '\n')

for f in ('dist/yumbrr.html', 'dist/embed.html'):
    print(f, f'{(root / f).stat().st_size / 1024:.0f} KB')
