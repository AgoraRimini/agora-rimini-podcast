const json = (data, status = 200, origin = "") => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin, Vary: "Origin" } });
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const encode = (text) => { const bytes = new TextEncoder().encode(text); let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); };
const decode = (base64) => new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\n/g, "")), (item) => item.charCodeAt(0)));
const formatDate = (value) => new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" }).format(new Date(`${value}T12:00:00Z`));

async function valid(data, env) { return data && data.username === env.EDITOR_USERNAME && data.password === env.EDITOR_PASSWORD; }
async function github(path, env, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/contents/${path}`, { ...options, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "AgoraRimini-Editorial-Worker", "X-GitHub-Api-Version": "2026-03-10", ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`GitHub: ${response.status}`);
  return response.json();
}
async function put(path, content, message, env, sha) { const body = { message, content, branch: "main" }; if (sha) body.sha = sha; return github(path, env, { method: "PUT", body: JSON.stringify(body) }); }
async function remove(path, message, env) { const file = await github(path, env); return github(path, env, { method: "DELETE", body: JSON.stringify({ message, sha: file.sha, branch: "main" }) }); }
async function readArticles(env) { const index = await github("data/articles.json", env); return { index, articles: JSON.parse(decode(index.content)) }; }
function page(article) {
  const paragraphs = article.body.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("\n");
  const image = article.image ? `<figure class="article-hero-image"><img src="../../${article.image.slice(1)}" alt="${escapeHtml(article.title)}"></figure>` : "";
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0b57a3"><title>${escapeHtml(article.title)} | Agorà Rimini Podcast</title><meta name="description" content="${escapeHtml(article.subtitle)}"><link rel="canonical" href="https://agorariminipodcast.it${article.url}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="../../styles.css?v=19"></head><body class="article-page"><header class="site-header"><a class="brand" href="/"><img src="../../assets/logo.jpg" alt="Agorà Rimini Podcast"></a><a class="article-back" href="/#articoli">← Torna agli articoli</a></header><main><article class="article-post"><header class="article-post-header"><p class="kicker">Editoriale · ${escapeHtml(article.category)}</p><h1>${escapeHtml(article.title)}</h1><p class="article-deck">${escapeHtml(article.subtitle)}</p><p class="article-byline">di ${escapeHtml(article.author)} <span>·</span> ${escapeHtml(article.date)}</p></header>${image}<div class="article-body">${paragraphs}<blockquote>${escapeHtml(article.highlight).replace(/\n/g, "<br>")}</blockquote></div></article></main><footer class="article-footer"><a href="/">Agorà Rimini Podcast</a> <span>·</span> Parole senza filtri</footer></body></html>`;
}
async function updateSitemap(url, date, env, removeEntry = false) {
  const sitemap = await github("sitemap.xml", env); const text = decode(sitemap.content); const location = `https://agorariminipodcast.it${url}`;
  let next = text;
  if (removeEntry) next = text.replace(new RegExp(`<url>\\s*<loc>${escapeRegExp(location)}</loc>[\\s\\S]*?</url>\\s*`, "g"), "");
  else if (!text.includes(`<loc>${location}</loc>`)) { const entry = `<url>\n  <loc>${location}</loc>\n  <lastmod>${date}</lastmod>\n  <changefreq>monthly</changefreq>\n  <priority>0.8</priority>\n</url>\n`; next = text.replace("</urlset>", `${entry}</urlset>`); }
  if (next !== text) await put("sitemap.xml", encode(next), `${removeEntry ? "Rimuove" : "Aggiunge"} articolo dalla sitemap: ${url}`, env, sitemap.sha);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") === env.ALLOWED_ORIGIN ? env.ALLOWED_ORIGIN : "";
    if (request.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    if (!origin) return json({ error: "Origine non autorizzata." }, 403);
    if (request.method !== "POST") return json({ error: "Metodo non consentito." }, 405, origin);
    let data; try { data = await request.json(); } catch { return json({ error: "Richiesta non valida." }, 400, origin); }
    if (!(await valid(data, env))) return json({ error: "Credenziali non riconosciute." }, 401, origin);
    const path = new URL(request.url).pathname;
    if (path === "/v1/login") return json({ ok: true }, 200, origin);
    try {
      if (path === "/v1/articles") { const { articles } = await readArticles(env); return json({ articles: articles.map(({ title, url, date, author, category }) => ({ title, url, date, author, category })) }, 200, origin); }
      if (path === "/v1/delete") {
        const url = String(data.url || ""); const { index, articles } = await readArticles(env); const article = articles.find((item) => item.url === url);
        if (!article || !/^\/articoli\/[a-z0-9-]+\/$/.test(url)) throw new Error("Articolo non trovato.");
        const remaining = articles.filter((item) => item.url !== url);
        await remove(`articoli/${url.split("/")[2]}/index.html`, `Cancella articolo: ${article.title}`, env);
        if (article.image && !remaining.some((item) => item.image === article.image)) await remove(article.image.slice(1), `Cancella immagine articolo: ${article.title}`, env);
        await put("data/articles.json", encode(JSON.stringify(remaining, null, 2) + "\n"), `Aggiorna elenco articoli: ${article.title}`, env, index.sha);
        await updateSitemap(url, "", env, true);
        return json({ ok: true }, 200, origin);
      }
      if (path !== "/v1/publish") return json({ error: "Indirizzo non trovato." }, 404, origin);
      const article = data.article || {};
      if (["category", "author", "title", "subtitle", "date", "body", "highlight"].some((key) => !String(article[key] || "").trim())) throw new Error("Completa tutti i campi obbligatori.");
      const slug = slugify(article.title); if (!slug) throw new Error("Titolo non valido.");
      article.url = `/articoli/${slug}/`; const { index, articles } = await readArticles(env);
      if (articles.some((item) => item.url === article.url)) throw new Error("Esiste già un articolo con questo titolo.");
      const sitemapDate = article.date; article.date = formatDate(article.date);
      if (data.image) { if (!/^image\/(jpeg|png|webp)$/.test(data.image.mimeType || "") || data.image.base64.length > 7 * 1024 * 1024) throw new Error("Immagine non valida o troppo grande."); const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[data.image.mimeType]; article.image = `/assets/articles/${slug}.${ext}`; await put(article.image.slice(1), data.image.base64, `Aggiunge immagine articolo: ${article.title}`, env); }
      await put(`articoli/${slug}/index.html`, encode(page(article)), `Pubblica articolo: ${article.title}`, env);
      const { body, highlight, ...card } = article; articles.unshift(card);
      await put("data/articles.json", encode(JSON.stringify(articles, null, 2) + "\n"), `Aggiorna elenco articoli: ${article.title}`, env, index.sha);
      await updateSitemap(article.url, sitemapDate, env);
      return json({ ok: true, url: article.url }, 201, origin);
    } catch (error) { return json({ error: error.message || "Operazione non completata." }, 400, origin); }
  }
};
