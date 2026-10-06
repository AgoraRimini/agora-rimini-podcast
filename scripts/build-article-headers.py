"""Add author portraits and sharing tools to article headers at publication time."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


AUTHOR_IMAGES = {'Paolo': 'paolo', 'Fabio': 'fabio', 'Ago': 'ago'}


def author_portrait(article):
    author = str(article.get('author', '')).strip()
    key = AUTHOR_IMAGES.get(author)
    if not key:
        return ''
    return (f'<img class="article-author-portrait article-author-{key}" '
            f'src="/assets/authors/{key}.png" alt="Ritratto di {html.escape(author, quote=True)}" '
            'width="1024" height="1536" decoding="async">')


def enhance(source, article):
    # The body, player, metadata and main article image remain untouched.
    if 'class="article-heading-layout"' not in source:
        match = re.search(r'(<header\b[^>]*class="article-post-header"[^>]*>)(.*?)(?=<section\b|</header>)', source, re.S)
        if not match:
            raise ValueError(f"Intestazione articolo assente: {article['url']}")
        heading = match[2]
        share = '<nav class="article-share" aria-label="Condividi articolo"><button type="button" data-share="native" hidden>↗ Condividi</button><a data-share="whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a><a data-share="facebook" target="_blank" rel="noopener noreferrer">Facebook</a><a data-share="x" target="_blank" rel="noopener noreferrer" aria-label="Condividi su X">𝕏</a><button type="button" data-share="copy">Copia link</button><span class="article-share-status" role="status" aria-live="polite"></span></nav>'
        heading = re.sub(r'</h1>', lambda m: m[0] + share, heading, count=1)
        portrait = author_portrait(article)
        layout = f'<div class="article-heading-layout"><div class="article-heading-copy">{heading}</div>{portrait}</div>'
        source = source[:match.start()] + match[1] + layout + source[match.end():]
    else:
        # Update legacy markup and association if the article author changes.
        source = re.sub(r'<div class="article-author-portrait[^"]*"[^>]*></div>|<img class="article-author-portrait[^"]*"[^>]*>',
                        lambda _: author_portrait(article), source)
    def title_size(match):
        title = html.unescape(re.sub(r'<[^>]+>', ' ', match[2]))
        attrs = re.sub(r' class="article-title-long"', '', match[1])
        if len(title.strip()) > 26:
            attrs += ' class="article-title-long"'
        return '<h1' + attrs + '>' + match[2] + '</h1>'
    source = re.sub(r'<h1([^>]*)>(.*?)</h1>', title_size, source, flags=re.S)
    source = source.replace('article-header.css?v=1', 'article-header.css?v=2')
    if 'article-header.css' not in source:
        source = source.replace('</head>', '<link rel="stylesheet" href="/article-header.css?v=2"><script src="/article-share.js?v=1" defer></script></head>', 1)
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
