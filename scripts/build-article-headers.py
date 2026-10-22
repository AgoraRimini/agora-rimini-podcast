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
    # Search snippet: keep editorial headline and subtitle unchanged.
    seo_description = str(article.get("seoDescription") or article.get("subtitle") or "").strip()
    if seo_description:
        escaped = html.escape(seo_description, quote=True)
        for key in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
            tag = re.compile(r'(<meta\s+' + re.escape(key) + r'\s+content=")[^"]*(")', re.I)
            source = tag.sub(lambda match: match[1] + escaped + match[2], source, count=1)
    # Structured data is derived from the published CMS record, not authored text.
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article["title"],
        "description": seo_description,
        "mainEntityOfPage": "https://agorariminipodcast.it" + article["url"],
        "url": "https://agorariminipodcast.it" + article["url"],
        "inLanguage": "it-IT",
        "author": {"@type": "Person", "name": article.get("author", "")},
        "publisher": {"@type": "Organization", "name": "Agorà Rimini Podcast",
                      "logo": {"@type": "ImageObject", "url": "https://agorariminipodcast.it/assets/logo.jpg"}},
    }
    if article.get("image"):
        schema["image"] = "https://agorariminipodcast.it" + article["image"]
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", article.get("dateISO", "")):
        schema["datePublished"] = article["dateISO"]
    block = '<script id="agora-article-schema" type="application/ld+json">' + json.dumps(schema, ensure_ascii=False).replace("<", "\\u003c") + '</script>'
    source = re.sub(r'<script id="agora-article-schema" type="application/ld\\+json">.*?</script>', '', source, flags=re.S)
    source = source.replace('</head>', block + '</head>', 1)
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
