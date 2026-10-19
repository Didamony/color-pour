"""Bundle src/ into single-file pages.

dist/color-pour.html  -> the playable web page (published as the shareable link)
dist/www/index.html   -> the same game as a full HTML document, ready to wrap as an Android app
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
JS_ORDER = ["engine", "render", "i18n", "store", "audio", "ads", "game", "duel", "ui", "main"]


def bundle() -> str:
    page = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "css" / "style.css").read_text(encoding="utf-8")
    js = "\n".join((SRC / "js" / f"{name}.js").read_text(encoding="utf-8") for name in JS_ORDER)
    return page.replace("/*@CSS@*/", css).replace("/*@JS@*/", js)


def main() -> None:
    body = bundle()
    DIST.mkdir(exist_ok=True)
    (DIST / "color-pour.html").write_text(body, encoding="utf-8")
    www = DIST / "www"
    www.mkdir(exist_ok=True)
    full = (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
        "</head>\n<body>\n" + body + "\n</body>\n</html>\n"
    )
    (www / "index.html").write_text(full, encoding="utf-8")
    print(f"built {len(body) // 1024} KB")


if __name__ == "__main__":
    main()
