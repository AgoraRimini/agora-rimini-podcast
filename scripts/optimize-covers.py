"""Build responsive derivatives without deleting or rewriting source images."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
import json
import re
import time
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/covers'
ORIGIN = 'https://agorariminipodcast.it'
API = 'https://agora-editorial-api.paolo-rocchetti.workers.dev/v1/music'

def download(url):
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'AgoraCoverOptimizer/1.0'}), timeout=40) as response:
                data = response.read(10 * 1024 * 1024 + 1)
            if len(data) > 10 * 1024 * 1024:
                raise ValueError('Copertina troppo grande')
            return data
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)

def variants(data, label, widths, quality=84):
    digest = sha256(data).hexdigest()[:16]
    result = {}
    with Image.open(BytesIO(data)) as original:
        source = ImageOps.exif_transpose(original)
        source = source.convert('RGBA' if 'A' in source.getbands() else 'RGB')
        for name, width in widths.items():
            image = source.copy()
            image.thumbnail((width, width), Image.Resampling.LANCZOS)
            filename = f'{label}-{digest}-{name}.webp'
            destination = OUT / filename
            image.save(destination, 'WEBP', quality=quality, method=6)
            # Verify the file that will actually be published.
            with Image.open(destination) as check:
                assert check.format == 'WEBP' and max(check.size) <= width
                check.verify()
            result[name] = '/assets/covers/' + filename
            print(f'{label} {name}: {len(data)} -> {destination.stat().st_size} bytes')
    return result

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    portraits = {
        '/assets/authors/' + source.name: variants(
            source.read_bytes(), 'author-' + source.stem, {'full': 1536, 'compact': 768}, quality=90
        )
        for source in sorted((ROOT / 'assets/authors').glob('*.png'))
    }
    article_file = ROOT / 'data/articles.json'
    articles = json.loads(article_file.read_text(encoding='utf-8'))
    article_images = {}
    for article in articles:
        original = article.get('image', '')
        if not original.startswith('/assets/articles/'):
            continue
        source = ROOT / original.lstrip('/')
        if not source.is_file():
            raise FileNotFoundError(source)
        slug = article['url'].strip('/').split('/')[-1]
        result = variants(source.read_bytes(), 'article-' + slug, {'image': 1280, 'thumbnail': 640})
        article['image'] = result['image']
        article['imageThumbnail'] = result['thumbnail']
        article_images[original] = result
    article_file.write_text(json.dumps(articles, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # Change image sources only; keep SEO/social metadata, text, CSS and layout.
    home = ROOT / 'index.html'
    pages = sorted(ROOT.rglob('index.html'))
    for page in pages:
        html = page.read_text(encoding='utf-8')
        def replace_tag(match):
            tag = match.group(0)
            tag = re.sub(
                r'(\bsrc=["\'])(?:\.\./|\./|/)*assets/logo\.jpg(?:\?v=\d+)?(["\'])',
                lambda match: match[1] + '/assets/logo-small.webp' + match[2], tag,
            )
            for original, versions in portraits.items():
                tag = tag.replace(
                    f'src="{original}"',
                    f'src="{versions["full"]}" srcset="{versions["compact"]} 512w, {versions["full"]} 1024w" '
                    'sizes="(max-width: 760px) 44vw, (max-width: 1120px) 52vw, 583px"',
                )
            for original, versions in article_images.items():
                optimized = versions['thumbnail' if page == home else 'image']
                filename = re.escape(original.lstrip('/'))
                tag, changed = re.subn(
                    r'(\bsrc=["\'])(?:\.\./|\./|/)*' + filename + r'(["\'])',
                    lambda m: m[1] + optimized + m[2], tag
                )
                if changed and page != home and not re.search(r'\s(?:width|height)\s*=', tag):
                    with Image.open(ROOT / optimized.lstrip('/')) as image:
                        tag = tag[:-1] + f' width="{image.width}" height="{image.height}">'
            return tag
        patched = re.sub(r'<img\b[^>]*>', replace_tag, html, flags=re.I)
        if patched != html:
            page.write_text(patched, encoding='utf-8')
    tracks = json.loads(download(API))['tracks']
    def music(track):
        if not re.fullmatch(r'[0-9a-f-]{36}', track['id']):
            raise ValueError('ID copertina non valido')
        result = variants(download(track['image']), 'music-' + track['id'], {'image': 640, 'thumbnail': 320})
        return track['id'], {**result, 'updatedAt': track['updatedAt']}
    with ThreadPoolExecutor(max_workers=4) as pool:
        manifest = {'version': 1, 'music': dict(pool.map(music, tracks)), 'articles': article_images}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Ottimizzate {len(article_images)} copertine articoli e {len(tracks)} copertine musicali.')

if __name__ == '__main__':
    main()
