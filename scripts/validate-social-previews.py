"""Fail deployment if an article cannot expose a valid static social image."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            key = attrs.get('property') or attrs.get('name')
            if key:
                self.meta.setdefault(key, []).append(attrs.get('content', ''))

for article in json.loads((ROOT / 'data/articles.json').read_text()):
    source = (ROOT / article['url'].lstrip('/') / 'index.html').read_text()
    head = Head()
    head.feed(source.split('</head>')[0])
    meta = head.meta
    for key in ('og:title', 'og:description', 'og:url', 'og:image', 'og:image:secure_url', 'twitter:card', 'twitter:image'):
        assert len(meta.get(key, [])) == 1 and meta[key][0], (article['url'], key)
    image = meta['og:image'][0]
    assert image == meta['twitter:image'][0] == meta['og:image:secure_url'][0]
    parsed = urlparse(image)
    assert parsed.scheme == 'https' and parsed.netloc == 'agorariminipodcast.it'
    path = ROOT / parsed.path.lstrip('/')
    with Image.open(path) as pic:
        assert pic.size == (1200, 630) and pic.format == 'JPEG'
        pic.verify()
    assert path.stat().st_size < 1_000_000
    assert meta['twitter:card'] == ['summary_large_image']
    assert source.index('og:image') < source.index('<script')
    print('Anteprima verificata:', article['url'])
