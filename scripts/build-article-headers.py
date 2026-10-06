"""Add author portraits and sharing tools to article headers at publication time."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def enhance(source, article):
    # The body, player, metadata and main article image remain untouched.
    if 'class="article-heading-layout"' not in source:
        match = re.search(r'(<header\b[^>]*class="article-post-header"[^>]*>)(.*?)(?=<section\b|</header>)', source, re.S)
        if not match:
            raise ValueError(f"Intestazione articolo assente: {article['url']}")
        heading = match[2]
        share = '<nav class="article-share" aria-label="Condividi articolo"><button type="button" data-share="native" hidden>↗ Condividi</button><a data-share="whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a><a data-share="facebook" target="_blank" rel="noopener noreferrer">Facebook</a><a data-share="x" target="_blank" rel="noopener noreferrer" aria-label="Condividi su X">𝕏</a><button type="button" data-share="copy">Copia link</button><span class="article-share-status" role="status" aria-live="polite"></span></nav>'
        heading = re.sub(r'</h1>', lambda m: m[0] + share, heading, count=1)
        author = str(article.get('author', '')).strip()
        key = {'Paolo': 'paolo', 'Fabio': 'fabio', 'Ago': 'ago'}.get(author)
        portrait = f'<div class="article-author-portrait article-author-{key}" role="img" aria-label="Ritratto di {html.escape(author, quote=True)}"></div>' if key else ''
        layout = f'<div class="article-heading-layout"><div class="article-heading-copy">{heading}</div>{portrait}</div>'
        source = source[:match.start()] + match[1] + layout + source[match.end():]
    if 'article-header.css' not in source:
        source = source.replace('</head>', '<link rel="stylesheet" href="/article-header.css?v=1"><script src="/article-share.js?v=1" defer></script></head>', 1)
    return source


def main():
    for article in json.loads((ROOT / 'data/articles.json').read_text()):
        if not re.fullmatch(r'/articoli/[a-z0-9-]+/', article['url']):
            raise ValueError('Indirizzo articolo non valido')
        page = ROOT / article['url'].lstrip('/') / 'index.html'
        source = page.read_text()
        result = enhance(source, article)
        if result != source:
            page.write_text(result)
        print(f"Intestazione pronta: {article['url']}")


if __name__ == '__main__':
    main()
