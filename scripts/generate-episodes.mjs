import { mkdirSync, readdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const FEED_URL = "https://www.spreaker.com/show/5748998/episodes/feed";
const SITE_URL = "https://agorariminipodcast.it";
const OUTPUT_DIR = "puntate";
const ARCHIVE_FILE = "data/episodes.json";

const specials = new Set(["73400955","70256448","67090518","66749489","66192868","63768712","53271819"]);
const interviews = new Set([
  "52509702","52641150","53551154","53943457","54091965","54252867","54500475",
  "55805524","58479511","58678086","60256336","64286783","70798189"
]);

const decode = (value = "") => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const stripHtml = (value = "") => decode(value)
  .replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ").trim();

const readTag = (xml, name) => {
  const match = xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + name + ">", "i"));
  return match ? decode(match[1]).trim() : "";
};

const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 78);

const isoDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
};

const humanDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : new Intl.DateTimeFormat("it-IT", {
    day: "numeric", month: "long", year: "numeric"
  }).format(date);
};

const durationIso = (value) => {
  if (!value) return "";
  if (/^P/.test(value)) return value;
  const parts = value.split(":").map(Number);
  if (parts.some(Number.isNaN)) return "";
  let seconds = 0;
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  else seconds = parts[0];
  return "PT" + Math.max(0, seconds) + "S";
};

const response = await fetch(FEED_URL, { headers: { "user-agent": "AgoraRiminiPodcastSite/1.0" } });
if (!response.ok) throw new Error("Feed Spreaker non disponibile: HTTP " + response.status);
const xml = await response.text();
const rawItems = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);

const allEpisodes = rawItems.map((item) => {
  const link = readTag(item, "link");
  const guid = readTag(item, "guid");
  // The RSS link becomes our website URL after a custom page is set in Spreaker.
  const id = (guid.match(/episode\/(\d+)(?:\D|$)/i)
    || item.match(/<enclosure\b[^>]*\burl=["'][^"']*\/episode\/(\d+)\//i)
    || link.match(/--(\d+)(?:\D|$)/))?.[1] || "";
  const title = stripHtml(readTag(item, "title"));
  const rawDescription = readTag(item, "description");
  const image = item.match(/<itunes:image[^>]+href=["']([^"']+)["']/i)?.[1] || "";
  return {
    id, title, link: "https://www.spreaker.com/episode/" + id, description: stripHtml(rawDescription), pubDate: readTag(item, "pubDate"),
    duration: readTag(item, "itunes:duration"), image
  };
}).filter((episode) => episode.id && episode.title);

if (!allEpisodes.length) throw new Error("Il feed non contiene puntate utilizzabili.");
const archive = new Map();
// Recover previously published pages before importing the feed. Never remove them.
if (existsSync(OUTPUT_DIR)) {
  for (const entry of readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-z0-9-]+-\d+$/.test(entry.name)) continue;
    const file = join(OUTPUT_DIR, entry.name, "index.html");
    if (!existsSync(file)) continue;
    const html = readFileSync(file, "utf8");
    const source = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    if (!source) continue;
    const ld = JSON.parse(source);
    if (ld["@type"] !== "PodcastEpisode") continue;
    const id = entry.name.match(/-(\d+)$/)[1];
    archive.set(id, {
      id, slug: entry.name, title: ld.name, description: ld.description || "",
      pubDate: ld.datePublished || "", duration: ld.duration || "", image: ld.image || "",
      link: "https://www.spreaker.com/episode/" + id
    });
  }
}
if (existsSync(ARCHIVE_FILE)) {
  for (const episode of JSON.parse(readFileSync(ARCHIVE_FILE, "utf8"))) {
    if (!/^\d+$/.test(episode.id) || !/^[a-z0-9-]+$/.test(episode.slug) || !episode.slug.endsWith("-" + episode.id)) {
      throw new Error("Voce non valida nell'archivio permanente delle puntate.");
    }
    archive.set(episode.id, episode);
  }
}
for (const episode of allEpisodes) {
  const existing = archive.get(episode.id);
  archive.set(episode.id, {
    ...episode, slug: existing?.slug || slugify(episode.title) + "-" + episode.id
  });
}
const episodes = [...archive.values()].sort((a, b) => (new Date(b.pubDate) - new Date(a.pubDate)) || Number(b.id) - Number(a.id));

const category = (episode) => specials.has(episode.id) ? "Puntata speciale" : interviews.has(episode.id) ? "Intervista" : "Puntata";
const pageSlug = (episode) => episode.slug;
const legacySlug = (episode) => slugify(episode.title);
const aliasCounts = new Map();
for (const episode of episodes) {
  const alias = legacySlug(episode);
  aliasCounts.set(alias, (aliasCounts.get(alias) || 0) + 1);
}
const legacyRedirectHtml = (canonical) => `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow">
<link rel="canonical" href="${canonical}"><meta http-equiv="refresh" content="0;url=${canonical}">
<title>Puntata spostata | Agorà Rimini Podcast</title></head>
<body><p>La puntata è disponibile all'indirizzo aggiornato:
<a href="${canonical}">Apri la puntata</a>.</p>
<script>location.replace(${JSON.stringify(canonical)})</script></body></html>`;

// Temi editoriali verificati sulle descrizioni delle puntate pubblicate.
// Non sono dichiarati come tag importati da Spreaker.
const editorialTopics = new Map(Object.entries({
  "75793653": ["Raccolta differenziata", "Hera e gestione rifiuti", "Politica ambientale", "Proteste in Francia"],
  "75552602": ["DDL antisemitismo", "Libertà di critica", "Dibattito politico"],
  "75265070": ["Cambiamento climatico", "Etichette politiche", "Patriottismo", "Attualità italiana"],
  "73400955": ["Finale di stagione", "Bilancio del podcast", "Attualità e società"],
  "73164640": ["Fatti di Bologna", "Ipocrisia politica", "Dibattito pubblico"],
  "72999361": ["Podcast indipendente", "Libertà di opinione", "Confronto con gli ascoltatori"],
  "72874416": ["Cambiamento climatico", "Dissenso e confronto", "Comunicazione pubblica"],
  "72729986": ["Informazione sul clima", "Media mainstream", "Comunicazione ambientale"],
  "72637953": ["Regno Unito", "Grooming gangs", "Informazione e censura"],
  "72525096": ["Caso Henry Nowak", "Cronaca e informazione", "Indignazione pubblica"]
}));
const editorialRelated = new Map(Object.entries({
  "75552602": [{ title: "Antisemitismo o anti-critica?", url: "/articoli/antisemitismo-o-anti-critica/" }],
  "75265070": [{ title: "Ultrastupidità", url: "/articoli/ultra-stupidita/" }],
  "72874416": [{ title: "La Distopia Europea", url: "/articoli/la-distopia-europea/" }]
}));
const episodeTopics = (episode, index) => {
  // Published editorial topic mapping; only the ten newest entries get topic blocks.
  if (index >= 10) return [];
  return editorialTopics.get(episode.id) || [];
};
const relatedToEpisode = (episode) => (editorialRelated.get(episode.id) || [])
  .filter((item) => existsSync(join(item.url.slice(1), "index.html")));
const topicBlock = (topics, related) => !topics.length ? "" : `
<section class="episode-topics" aria-label="Argomenti trattati">
  <h2>Argomenti trattati</h2>
  <ul class="topic-list">${topics.map((topic) => `<li>${escapeHtml(topic)}</li>`).join("")}</ul>
  ${related.length ? `<p class="related-reading">Approfondisci: ${related.map((item) => `<a href="${item.url}">${escapeHtml(item.title)}</a>`).join(" · ")}</p>` : ""}
</section>`;
const shortDescription = (episode) => (episode.description || "Ascolta questa puntata di Agorà Rimini Podcast.").slice(0, 260);
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

const sharedStyle = `
:root{--blue:#0b57a3;--ink:#071421;--paper:#f8f7f3;--line:rgba(7,20,33,.14)}
*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--paper);font-family:Inter,Arial,sans-serif}
a{color:inherit}.top{min-height:74px;padding:12px clamp(20px,5vw,72px);display:flex;align-items:center;justify-content:space-between;gap:24px;background:#fff;border-bottom:1px solid var(--line)}
.top img{width:142px;height:52px;object-fit:contain}.top a{text-decoration:none;font-weight:800}.wrap{width:min(1040px,calc(100% - 40px));margin:0 auto;padding:64px 0 90px}
.kicker{color:var(--blue);font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
h1{max-width:900px;margin:10px 0 22px;font-size:clamp(42px,7vw,82px);line-height:.91;letter-spacing:-.045em}
.meta{display:flex;flex-wrap:wrap;gap:8px 22px;color:#52616e;font-size:14px}.lead{max-width:780px;margin:28px 0;color:#344653;font-size:17px;line-height:1.75}
.player{margin:38px 0 30px;padding:16px;background:#fff;border:1px solid var(--line);box-shadow:0 24px 65px rgba(3,27,53,.12)}
.player iframe{display:block;width:100%;height:200px;border:0}.actions{display:flex;flex-wrap:wrap;gap:12px}
.button{padding:14px 20px;color:#fff;background:var(--blue);border-radius:3px;text-decoration:none;font-size:13px;font-weight:800}
.button.alt{color:var(--blue);background:#fff;border:1px solid var(--blue)}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:40px}.card{padding:24px;background:#fff;border:1px solid var(--line);text-decoration:none}
.card small{color:var(--blue);font-weight:900;text-transform:uppercase}.card h2{margin:10px 0 12px;font-size:25px;line-height:1}.card p{margin:0;color:#52616e;font-size:14px;line-height:1.55}
.episode-topics{margin:26px 0;padding:20px 24px;border-left:4px solid var(--blue);background:#e9eef2}
.episode-topics h2{margin:0 0 12px;font-size:22px}.topic-list{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0}
.topic-list li{padding:7px 11px;border:1px solid rgba(11,87,163,.25);border-radius:4px;background:white;font-size:13px}
.related-reading{margin:14px 0 0;font-size:14px;line-height:1.6}.related-reading a{font-weight:700;color:var(--blue)}
footer{padding:32px 20px;text-align:center;color:#60717f;background:#e9eef2;font-size:12px}
@media(max-width:680px){.wrap{padding-top:42px}.grid{grid-template-columns:1fr}.top span{display:none}.player iframe{height:180px}}
`;

const head = ({ title, description, canonical, image, type = "article", ld }) => `<!doctype html>
<html lang="it"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0b57a3"><meta name="robots" content="index, follow, max-image-preview:large">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}"><link rel="alternate" type="application/rss+xml" title="Agorà Rimini Podcast" href="${FEED_URL}">
<meta property="og:locale" content="it_IT"><meta property="og:site_name" content="Agorà Rimini Podcast"><meta property="og:type" content="${type}">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}"><meta property="og:image" content="${image || SITE_URL + "/assets/hero-hosts.webp"}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@AgoraRiminiPod">
<meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image || SITE_URL + "/assets/hero-hosts.webp"}">
<script type="application/ld+json">${json(ld)}</script><style>${sharedStyle}</style></head>`;

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const [index, episode] of episodes.entries()) {
  const slug = pageSlug(episode);
  const topics = episodeTopics(episode, index);
  const related = relatedToEpisode(episode);
  const canonical = SITE_URL + "/puntate/" + slug + "/";
  const description = shortDescription(episode);
  const published = isoDate(episode.pubDate);
  const ld = {
    "@context": "https://schema.org", "@type": "PodcastEpisode", name: episode.title,
    description, url: canonical, keywords: topics.length ? topics.join(", ") : undefined, datePublished: published || undefined,
    duration: durationIso(episode.duration) || undefined,
    image: episode.image || SITE_URL + "/assets/logo.jpg",
    partOfSeries: { "@type": "PodcastSeries", name: "Agorà Rimini Podcast", url: SITE_URL + "/" },
    associatedMedia: { "@type": "MediaObject", embedUrl: "https://widget.spreaker.com/player?episode_id=" + episode.id },
    sameAs: episode.link
  };
  const html = head({
    title: episode.title + " | Agorà Rimini Podcast", description, canonical, image: episode.image, ld
  }) + `<body><header class="top"><a href="/"><img src="/assets/logo.jpg" alt="Agorà Rimini Podcast"></a><span>I Tre Folli Idealisti</span></header>
<main class="wrap"><p class="kicker">${category(episode)}</p><h1>${escapeHtml(episode.title)}</h1>
<div class="meta"><span>${escapeHtml(humanDate(episode.pubDate))}</span>${episode.duration ? `<span>Durata: ${escapeHtml(episode.duration)}</span>` : ""}</div>
${description ? `<p class="lead">${escapeHtml(description)}</p>` : ""}
${topicBlock(topics, related)}
<div class="player"><iframe title="${escapeHtml(episode.title)}" src="https://widget.spreaker.com/player?episode_id=${episode.id}&theme=light&autoplay=false&playlist=false" allow="autoplay" loading="lazy"></iframe></div>
<div class="actions"><a class="button" href="${escapeHtml(episode.link)}" target="_blank" rel="noopener noreferrer">Ascolta su Spreaker ↗</a><a class="button alt" href="/puntate/">Tutte le puntate</a></div></main>
<footer>© Agorà Rimini Podcast · Rimini, Italia</footer></body></html>`;
  const file = join(OUTPUT_DIR, slug, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  // Existing episode content is preserved byte for byte.
  if (!existsSync(file)) writeFileSync(file, html);
  // Preserve historical title-only URLs without duplicating indexable episode pages.
  const alias = legacySlug(episode);
  if (alias && alias !== slug && aliasCounts.get(alias) === 1) {
    const aliasFile = join(OUTPUT_DIR, alias, "index.html");
    mkdirSync(dirname(aliasFile), { recursive: true });
    if (!existsSync(aliasFile)) writeFileSync(aliasFile, legacyRedirectHtml(canonical));
  }

}

const cards = episodes.map((episode) => `<a class="card" href="/puntate/${pageSlug(episode)}/"><small>${category(episode)} · ${escapeHtml(humanDate(episode.pubDate))}</small><h2>${escapeHtml(episode.title)}</h2><p>${escapeHtml(shortDescription(episode).slice(0, 150))}</p></a>`).join("");
const listCanonical = SITE_URL + "/puntate/";
const listLd = {
  "@context": "https://schema.org", "@type": "CollectionPage", name: "Puntate di Agorà Rimini Podcast",
  url: listCanonical, mainEntity: { "@type": "ItemList", numberOfItems: episodes.length,
    itemListElement: episodes.map((episode, index) => ({
      "@type": "ListItem", position: index + 1, name: episode.title,
      url: SITE_URL + "/puntate/" + pageSlug(episode) + "/"
    }))
  }
};
const listHtml = head({
  title: "Puntate | Agorà Rimini Podcast",
  description: "Ascolta tutte le puntate, gli speciali e le interviste di Agorà Rimini Podcast.",
  canonical: listCanonical, type: "website", ld: listLd
}) + `<body><header class="top"><a href="/"><img src="/assets/logo.jpg" alt="Agorà Rimini Podcast"></a><span>I Tre Folli Idealisti</span></header>
<main class="wrap"><p class="kicker">Archivio audio</p><h1>Tutte le puntate</h1><p class="lead">Tutte le uscite, le puntate speciali e le nostre interviste. L’archivio si aggiorna automaticamente dal feed ufficiale.</p><div class="grid">${cards}</div></main>
<footer>© Agorà Rimini Podcast · Rimini, Italia</footer></body></html>`;
writeFileSync(join(OUTPUT_DIR, "index.html"), listHtml);
await import("./build-content-catalog.mjs");

const articles = JSON.parse(readFileSync("data/articles.json", "utf8"));
const articleUrls = articles.filter((article) =>
  /^\/articoli\/[a-z0-9-]+\/$/.test(article.url) &&
  existsSync(join(article.url.slice(1), "index.html"))
).map((article) => ({
  loc: SITE_URL + article.url,
  lastmod: /^\d{4}-\d{2}-\d{2}$/.test(article.dateISO || "") ? article.dateISO : undefined,
  priority: "0.8", changefreq: "monthly"
}));
const now = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: SITE_URL + "/", priority: "1.0", changefreq: "weekly" },
  { loc: listCanonical, priority: "0.9", changefreq: "weekly" },
  ...articleUrls,
  ...episodes.map((episode) => ({
    loc: SITE_URL + "/puntate/" + pageSlug(episode) + "/",
    lastmod: isoDate(episode.pubDate).slice(0, 10), priority: "0.7", changefreq: "monthly"
  }))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `  <url>
    <loc>${escapeHtml(entry.loc)}</loc>
    <lastmod>${entry.lastmod || now}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
writeFileSync("sitemap.xml", sitemap);
mkdirSync(dirname(ARCHIVE_FILE), { recursive: true });
writeFileSync(ARCHIVE_FILE, JSON.stringify(episodes, null, 2) + "\n");
console.log("Generate " + episodes.length + " pagine puntata e sitemap.xml");
