const URL_PATTERN = /^\/articoli\/[a-z0-9-]+\/$/;
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const entities = value => String(value).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, name) => {
  if (name[0] !== "#") return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" })[name.toLowerCase()] ?? whole;
  const n = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
  return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "\ufffd";
});
const attr = (source, name) => entities(source.match(new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\x27([^\x27]*)\x27)', "i"))?.slice(1).find(v => v !== undefined) || "");
export function contentIndex(items) {
  const result = new Map(items.map(item => [item.type + ":" + item.id, item]));
  for (const item of items) if (item.type === "song") for (const alias of item.aliases || []) result.set("song:" + alias, item);
  return result;
}
function reference(ref, index) {
  if (!ref || !/^(episode|article|song)$/.test(ref.type) || !index.has(ref.type + ":" + ref.id)) throw fail("Un contenuto collegato non è più disponibile: rimuovilo o sostituiscilo.");
  const item = index.get(ref.type + ":" + ref.id);
  return { type: item.type, id: item.id };
}
export function sanitizeBody(input, index) {
  let source = String(input || "").replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const blocks = /<(p|div|h[2-4]|ul|ol|li|blockquote)\b/i.test(source);
  const allowed = new Set(["p", "br", "strong", "em", "b", "i", "u", "h2", "h3", "h4", "ul", "ol", "li", "blockquote"]);
  const output = source.split(/(<[^>]*>)/g).map(token => {
    if (!token.startsWith("<")) return escape(entities(token));
    const m = token.match(/^<(\/?)\s*([a-z][a-z0-9]*)\b([^>]*)>/i);
    if (!m) return escape(token);
    let [, closing, tag, attrs] = m; tag = tag.toLowerCase();
    if (tag === "div") tag = "p";
    if (tag === "a") {
      if (closing) return "</a>";
      const type = attr(attrs, "data-content-type"), id = attr(attrs, "data-content-id"), href = attr(attrs, "href").trim();
      if (type && id) {
        const ref = reference({ type, id }, index), item = index.get(ref.type + ":" + ref.id);
        return '<a class="article-inline-link" data-content-type="' + ref.type + '" data-content-id="' + escape(ref.id) + '" href="' + escape(item.url) + '">';
      }
      return /^https?:\/\//i.test(href) ? '<a class="article-inline-link" href="' + escape(href) + '" target="_blank" rel="noopener noreferrer">' : "<a>";
    }
    return allowed.has(tag) ? (tag === "br" ? "<br>" : "<" + closing + tag + ">") : "";
  }).join("");
  if (blocks) return output.trim();
  return output.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => "<p>" + p.replace(/\n/g, "<br>") + "</p>").join("\n");
}
export async function articleEditRoute(path, data, env, helpers) {
  const { json, decode, encode, page, formatDate, readContent } = helpers;
  const origin = env.ALLOWED_ORIGIN;
  const api = async (endpoint, options = {}) => {
    const response = await fetch("https://api.github.com/repos/" + env.GITHUB_REPOSITORY + "/" + endpoint, {
      ...options, headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + env.GITHUB_TOKEN, "User-Agent": "AgoraRimini-Editorial-Worker", "X-GitHub-Api-Version": "2026-03-10", "Content-Type": "application/json" }
    });
    if (!response.ok) throw fail(response.status === 409 || response.status === 422 ? "Il sito è stato aggiornato nel frattempo. Riprova a salvare." : "Impossibile leggere o salvare l’articolo (GitHub " + response.status + ").", response.status === 409 || response.status === 422 ? 409 : 502);
    return response.json();
  };
  try {
    const url = String(data.url || "");
    if (!URL_PATTERN.test(url)) throw fail("Indirizzo articolo non valido.");
    const head = (await api("git/ref/heads/main")).object.sha;
    const get = name => api("contents/" + name + "?ref=" + head);
    const indexFile = await get("data/articles.json");
    const articles = JSON.parse(decode(indexFile.content)), position = articles.findIndex(a => a.url === url);
    if (position < 0) throw fail("Articolo non trovato.", 404);
    const current = articles[position], slug = url.split("/")[2], articlePath = "articoli/" + slug + "/index.html";
    const source = await get(articlePath);
    if (path === "/v1/article") return json({ article: current, html: decode(source.content), revision: source.sha }, 200, origin);
    if (!data.revision || data.revision !== source.sha) throw fail("Questo articolo è stato modificato da un’altra sessione. Riaprilo prima di salvarlo.", 409);
    const input = data.article || {};
    for (const field of ["category", "title", "subtitle", "author", "date", "highlight"]) if (!String(input[field] || "").trim()) throw fail("Completa tutti i campi obbligatori.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date) throw fail("Data non valida.");
    if (!["Paolo", "Fabio", "Ago"].includes(input.author)) throw fail("Autore non valido.");
    const index = contentIndex(await readContent(env));
    const linkedEpisode = input.linkedEpisode ? reference(input.linkedEpisode, index) : null;
    if (linkedEpisode && linkedEpisode.type !== "episode") throw fail("Seleziona una puntata valida.");
    const relatedContent = [...new Map((Array.isArray(input.relatedContent) ? input.relatedContent : []).map(ref => { const clean = reference(ref, index); return [clean.type + ":" + clean.id, clean]; })).values()];
    if (relatedContent.length > 8) throw fail("Puoi inserire al massimo 8 contenuti correlati.");
    const bodyHtml = sanitizeBody(input.bodyHtml, index);
    if (!entities(bodyHtml.replace(/<[^>]*>/g, "")).trim()) throw fail("Inserisci il testo dell’articolo.");
    const article = { ...current, title: String(input.title).trim(), subtitle: String(input.subtitle).trim(), category: String(input.category).trim(), author: input.author, date: formatDate(input.date), dateISO: input.date, highlight: String(input.highlight).trim(), linkedEpisode, relatedContent, url };
    const entries = [];
    const imageAction = data.imageAction || "keep";
    if (!["keep", "remove", "replace"].includes(imageAction)) throw fail("Scelta immagine non valida.");
    if (imageAction === "remove") delete article.image;
    if (imageAction === "replace") {
      const image = data.image, ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[image?.mimeType];
      if (!ext || typeof image.base64 !== "string" || image.base64.length > 7 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64)) throw fail("Immagine non valida o troppo grande.");
      const bytes = Uint8Array.from(atob(image.base64), c => c.charCodeAt(0));
      const valid = ext === "jpg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : ext === "png" ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 : new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
      if (!valid || bytes.length > 5 * 1024 * 1024) throw fail("Formato o dimensione immagine non valido.");
      article.image = "/assets/articles/" + slug + "-" + crypto.randomUUID() + "." + ext;
      const blob = await api("git/blobs", { method: "POST", body: JSON.stringify({ content: image.base64, encoding: "base64" }) });
      entries.push({ path: article.image.slice(1), mode: "100644", type: "blob", sha: blob.sha });
    }
    const snapshot = { ...article, date: input.date, bodyHtml };
    const draft = '<script id="article-editor-data" type="application/json">' + JSON.stringify(snapshot).replace(/</g, "\\u003c") + "</script>";
    const html = page(article, bodyHtml).replace("</body>", draft + "</body>");
    const { highlight, linkedEpisode: episode, relatedContent: related, ...card } = article;
    articles[position] = card;
    entries.push({ path: articlePath, mode: "100644", type: "blob", content: html }, { path: "data/articles.json", mode: "100644", type: "blob", content: JSON.stringify(articles, null, 2) + "\n" });
    const sitemap = await get("sitemap.xml"), sitemapText = decode(sitemap.content);
    const location = "https://agorariminipodcast.it" + url;
    const updatedSitemap = sitemapText.replace(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g, block => {
      if (!block.includes("<loc>" + location + "</loc>")) return block;
      const tag = "<lastmod>" + new Date().toISOString().slice(0, 10) + "</lastmod>";
      return /<lastmod>[^<]*<\/lastmod>/.test(block) ? block.replace(/<lastmod>[^<]*<\/lastmod>/, tag) : block.replace("</url>", tag + "</url>");
    });
    if (updatedSitemap !== sitemapText) entries.push({ path: "sitemap.xml", mode: "100644", type: "blob", content: updatedSitemap });
    const commit = await api("git/commits/" + head);
    const tree = await api("git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }) });
    const saved = await api("git/commits", { method: "POST", body: JSON.stringify({ message: "Modifica articolo: " + article.title, tree: tree.sha, parents: [head] }) });
    await api("git/refs/heads/main", { method: "PATCH", body: JSON.stringify({ sha: saved.sha, force: false }) });
    return json({ ok: true, url }, 200, origin);
  } catch (error) { return json({ error: error.message || "Salvataggio non completato." }, error.status || 400, origin); }
}
