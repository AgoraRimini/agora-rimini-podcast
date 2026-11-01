import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const episodes = JSON.parse(readFileSync('data/episodes.json', 'utf8'));
const catalog = JSON.parse(readFileSync('data/content-catalog.json', 'utf8'));
const sitemap = readFileSync('sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.equal(new Set(urls).size, urls.length, 'URL duplicati nella sitemap');
assert.ok(episodes.length >= 127, 'Archivio storico incompleto');
assert.equal(new Set(episodes.map(e => e.id)).size, episodes.length, 'ID duplicati');
const episodeCatalog = catalog.items.filter(e => e.type === 'episode');
assert.equal(episodeCatalog.length, episodes.length, 'Catalogo puntate incompleto');
for (const episode of episodes) {
  const pathname = '/puntate/' + episode.slug + '/';
  const url = 'https://agorariminipodcast.it' + pathname;
  assert.ok(urls.includes(url), 'Puntata assente nella sitemap: ' + url);
  assert.ok(episodeCatalog.some(e => e.id === episode.id && e.url === pathname), 'Puntata assente nel catalogo');
  const html = readFileSync('.' + pathname + 'index.html', 'utf8');
  assert.ok(html.includes('<link rel="canonical" href="' + url + '">'), 'Canonical errato: ' + url);
  assert.ok(html.includes('<meta property="og:url" content="' + url + '">'), 'Open Graph errato');
  assert.ok(/<meta name="description" content="[^"]+"/.test(html), 'Descrizione SEO mancante');
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || 'null');
  assert.equal(ld?.['@type'], 'PodcastEpisode');
  assert.equal(ld.url, url);
  assert.ok(ld.name && ld.datePublished && ld.associatedMedia?.embedUrl, 'Dati strutturati incompleti');
}
const articles = JSON.parse(readFileSync('data/articles.json', 'utf8'));
for (const article of articles) {
  if (/^\/articoli\/[a-z0-9-]+\/$/.test(article.url) && existsSync('.' + article.url + 'index.html')) {
    assert.ok(urls.includes('https://agorariminipodcast.it' + article.url), 'Articolo assente nella sitemap');
  }
}
// In CI, ensure every tracked historical permalink still exists, including aliases.
if (existsSync('.git')) {
  const tracked = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', 'puntate'], { encoding: 'utf8' });
  for (const file of tracked.trim().split('\n').filter(Boolean)) assert.ok(existsSync(file), 'Permalink storico rimosso: ' + file);
}
console.log(`Verificate ${episodes.length} puntate: permalink, catalogo, sitemap, canonical, Open Graph e JSON-LD.`);
