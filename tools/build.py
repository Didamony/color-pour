"""Bundle src/ into single-file pages.

dist/color-pour.html  -> the playable web page (published as the shareable link)
dist/www/index.html   -> the same game as a full HTML document, ready to wrap as an Android app
"""
import base64
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
SITE_URL = "https://didamony.github.io/color-pour/"
TITLE = "صبّ الألوان · Color Pour"
DESCRIPTION = "لعبة ترتيب ألوان ممتعة: اسكب الألوان ورتّب كل لون في أنبوب. مستويات لا تنتهي، ومتجر، وهدية يومية، واللعب مع الأصدقاء."

HEAD = f"""<title>{TITLE}</title>
<meta name="description" content="{DESCRIPTION}">
<meta name="theme-color" content="#B05CFF">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<link rel="icon" type="image/png" sizes="64x64" href="favicon-64.png">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="صبّ الألوان">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE_URL}">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESCRIPTION}">
<meta property="og:image" content="{SITE_URL}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE_URL}og-image.png">
<script>
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {{
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {{}}));
}}
</script>
"""

MANIFEST = {
    "id": "./",
    "name": TITLE,
    "short_name": "صبّ الألوان",
    "description": DESCRIPTION,
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#1D1536",
    "theme_color": "#B05CFF",
    "lang": "ar",
    "dir": "rtl",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}

JS_ORDER = ["engine", "render", "i18n", "store", "audio", "ads", "game", "scene", "duel", "ui", "main"]


def bundle() -> str:
    page = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "css" / "style.css").read_text(encoding="utf-8")
    js = "\n".join((SRC / "js" / f"{name}.js").read_text(encoding="utf-8") for name in JS_ORDER)
    bg = base64.b64encode((SRC / "art" / "home-bg.jpg").read_bytes()).decode()
    css = css.replace("/*@HOMEBG@*/", f'url("data:image/jpeg;base64,{bg}")')
    return page.replace("/*@CSS@*/", css).replace("/*@JS@*/", js)


def main() -> None:
    body = bundle()
    DIST.mkdir(exist_ok=True)
    (DIST / "color-pour.html").write_text(body, encoding="utf-8")
    www = DIST / "www"
    www.mkdir(exist_ok=True)
    for f in (SRC / "assets").glob("*"):
        shutil.copy2(f, www / f.name)
    shutil.copy2(SRC / "sw.js", www / "sw.js")
    (www / "manifest.webmanifest").write_text(json.dumps(MANIFEST, ensure_ascii=False, indent=2), encoding="utf-8")
    full = (
        '<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
        + HEAD + "</head>\n<body>\n" + body + "\n</body>\n</html>\n"
    )
    (www / "index.html").write_text(full, encoding="utf-8")
    print(f"built {len(body) // 1024} KB")


if __name__ == "__main__":
    main()
