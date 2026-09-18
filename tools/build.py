"""Wrap the artifact page (a bare fragment) into a standalone, installable index.html.

The artifact host supplies a <!doctype>/<head>/<body> skeleton at publish time, so
seafood-notebook.html has none of its own. GitHub Pages serves a plain file, so this
adds that skeleton back plus the bits that make "Add to Home Screen" behave like an app.
"""
import pathlib, re

SRC = pathlib.Path("seafood-notebook.html")
OUT = pathlib.Path("index.html")

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Notes for working the seafood counter.">
<meta name="theme-color" content="#E9EEEF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E181C" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Fish Notes">
<link rel="apple-touch-icon" href="assets/icon-180.png">
<link rel="icon" type="image/png" sizes="512x512" href="assets/icon-512.png">
<link rel="manifest" href="manifest.webmanifest">
<style>
  /* the reset the artifact host normally provides */
  :root{
    color-scheme: light dark;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  body{margin:0}
  img{max-width:100%}
  [hidden]{display:none!important}
</style>
</head>
<body>
"""

FOOT = """
<script>
  if("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){ /* offline cache is optional */ });
    });
  }
</script>
</body>
</html>
"""

def main():
    body = SRC.read_text(encoding="utf-8")
    assert "<!doctype" not in body.lower(), "source should be a fragment"
    OUT.write_text(HEAD + body.strip() + "\n" + FOOT, encoding="utf-8")
    print("wrote %s (%d bytes)" % (OUT, OUT.stat().st_size))

if __name__ == "__main__":
    main()
