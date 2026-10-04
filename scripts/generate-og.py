"""Generate article sharing cards and patch only social tags before Pages deploy."""
import html
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SIZE = (1200, 630)
FONT = ROOT / 'assets/fonts/BarlowCondensed-ExtraBold.ttf'
SITE = 'https://agorariminipodcast.it'


def wrap(text, font, width):
    """Wrap words, splitting an unusually long single word when needed."""
    draw = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    lines, line = [], ''
    for word in str(text).split():
        candidate = (line + ' ' + word).strip()
        if draw.textbbox((0, 0), candidate, font=font)[2] <= width:
            line = candidate
            continue
        if line:
            lines.append(line)
            line = ''
        if draw.textbbox((0, 0), word, font=font)[2] <= width:
            line = word
            continue
        for char in word:
            candidate = line + char
            if line and draw.textbbox((0, 0), candidate, font=font)[2] > width:
                lines.append(line)
                line = char
            else:
                line = candidate
    if line:
        lines.append(line)
    return lines


def fitted_title(text):
    # Binary search keeps even exceptionally long titles inexpensive to measure.
    low, high, best = 1, 88, None
    while low <= high:
        size = (low + high) // 2
        font = ImageFont.truetype(str(FONT), size)
        lines = wrap(text.upper(), font, 1064)
        if len(lines) <= 3:
            best = (font, lines, size + 9)
            low = size + 1
        else:
            high = size - 1
    if best is None:
        raise ValueError('Titolo troppo lungo per la card')
    return best


def local_path(url):
    path = (ROOT / str(url).lstrip('/')).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError('Percorso fuori dal sito')
    return path


def render(article, output):
    image = local_path(article['image']) if article.get('image') else None
    if image and image.is_file():
        with Image.open(image) as source:
            card = ImageOps.fit(ImageOps.exif_transpose(source).convert('RGB'), SIZE,
                                method=Image.Resampling.LANCZOS).convert('RGBA')
    else:
        card = Image.new('RGBA', SIZE, '#071421')
        decor = ImageDraw.Draw(card)
        decor.polygon([(650, 0), (1200, 0), (1200, 630), (960, 630)], fill='#0b57a3')
        for x in range(-630, 1200, 100):
            decor.line([(x, 630), (x + 630, 0)], fill='#17344e', width=2)
    overlay = Image.new('RGBA', SIZE)
    shade = ImageDraw.Draw(overlay)
    for y in range(630):
        shade.line([(0, y), (1200, y)], fill=(4, 12, 22, int(155 + 55 * y / 630)))
    card = Image.alpha_composite(card, overlay)
    draw = ImageDraw.Draw(card)
    draw.rectangle((0, 0, 15, 630), fill='#0b57a3')
    small = ImageFont.truetype(str(FONT), 29)
    category = 'EDITORIALE · ' + str(article.get('category') or 'Agorà').upper()
    draw.text((68, 68), category, font=small, fill='#a7d6ff', anchor='lt')
    font, lines, spacing = fitted_title(article['title'])
    top = 153
    for i, line in enumerate(lines):
        draw.text((68, top + i * spacing), line, font=font, fill='white', anchor='lt')
    subtitle = article.get('subtitle') or ''
    if subtitle:
        subfont = ImageFont.truetype(str(FONT), 30)
        sublines = wrap(subtitle, subfont, 1064)
        if len(sublines) > 2:
            sublines = sublines[:2]
            sublines[-1] = sublines[-1].rstrip('.,;:') + '…'
            while draw.textbbox((0, 0), sublines[-1], font=subfont)[2] > 1064:
                sublines[-1] = sublines[-1][:-2] + '…'
        for i, line in enumerate(sublines):
            draw.text((68, 449 + 37 * i), line, font=subfont, fill='#d5e7f6', anchor='lt')
    with Image.open(ROOT / 'assets/logo.jpg') as source:
        logo = ImageOps.contain(source.convert('RGB'), (155, 65), Image.Resampling.LANCZOS)
        draw.rounded_rectangle((68, 543, 231, 614), radius=5, fill='white')
        card.paste(logo, (72 + (155 - logo.width) // 2, 546 + (65 - logo.height) // 2))
    draw.text((258, 562), 'AGORÀ RIMINI PODCAST', font=small, fill='white', anchor='lt')
    draw.text((870, 566), 'agorariminipodcast.it', font=ImageFont.truetype(str(FONT), 24),
              fill='#a7d6ff', anchor='lt')
    output.parent.mkdir(parents=True, exist_ok=True)
    card.convert('RGB').save(output, 'JPEG', quality=92, optimize=True, subsampling=0)


def patch_meta(source, slug, title):
    # Remove only tags managed here. Keep descriptions, player and article markup intact.
    managed = {'og:image', 'og:image:width', 'og:image:height', 'og:image:alt',
               'og:image:type', 'twitter:card', 'twitter:image'}
    def keep(match):
        attrs = dict((key.lower(), value) for key, _, value in
                     re.findall(r'([\w:-]+)\s*=\s*([\"\'])(.*?)\2', match.group(), re.S))
        return '' if attrs.get('property', attrs.get('name', '')).lower() in managed else match.group()
    source = re.sub(r'\s*<meta\b[^>]*>', keep, source, flags=re.I)
    head, tail = re.split(r'(?i)(?=</head\s*>)', source, maxsplit=1)
    source = re.sub(r'(?m)^[ \t]+$', '', head) + tail
    url = f'{SITE}/assets/og/{slug}.jpg'
    tags = '\n'.join([
        f'<meta property="og:image" content="{url}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:type" content="image/jpeg">',
        f'<meta property="og:image:alt" content="{html.escape(title, quote=True)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:image" content="{url}">',
    ])
    if not re.search(r'</head\s*>', source, re.I):
        raise ValueError('Intestazione HTML assente')
    return re.sub(r'\s*</head\s*>', lambda _: '\n' + tags + '\n</head>', source, count=1, flags=re.I)


def main():
    articles = json.loads((ROOT / 'data/articles.json').read_text())
    for article in articles:
        match = re.fullmatch(r'/articoli/([a-z0-9-]+)/', article['url'])
        if not match:
            raise ValueError('Indirizzo articolo non valido')
        slug = match[1]
        page = ROOT / 'articoli' / slug / 'index.html'
        # Worker commits the HTML before updating the article index.
        # Only entries already present in the index are deployed as complete articles.
        render(article, ROOT / 'assets/og' / f'{slug}.jpg')
        page.write_text(patch_meta(page.read_text(), slug, article['title']))
        print(f'Card pronta: {slug} (1200×630)')


if __name__ == '__main__':
    main()
