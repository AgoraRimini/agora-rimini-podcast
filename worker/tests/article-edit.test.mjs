import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { articleEditRoute, sanitizeBody, contentIndex } from "../src/article-edit.js";
import worker from "../src/index.js";
const require = createRequire(process.env.AGORA_TEST_DEPS + "/package.json");
const { JSDOM } = require("jsdom");
globalThis.DOMParser = new JSDOM("").window.DOMParser;
const { parsePublishedArticle, safeEditorBody } = await import("../../admin/article-data.js");
const env = { ALLOWED_ORIGIN: "https://agorariminipodcast.it", GITHUB_REPOSITORY: "test/repo", GITHUB_TOKEN: "test-only", EDITOR_USERNAME: "test", EDITOR_PASSWORD: "test-only" };
const url = "/articoli/esistente/";
const current = { title: "Titolo originale", subtitle: "Sottotitolo", category: "Società", author: "Paolo", date: "20 ottobre 2026", url, image: "/assets/articles/esistente.png" };
const article = { ...current, title: "Titolo modificato", date: "2026-10-21", bodyHtml: "<p>L’autore &amp; l&#39;articolo.</p><p>Secondo paragrafo<br>Seconda riga</p>", highlight: "Frase", linkedEpisode: { type: "episode", id: "123" }, relatedContent: [{ type: "song", id: "old-song" }] };
const items = [{ type: "episode", id: "123", url: "/puntate/test/", title: "Puntata" }, { type: "song", id: "new-song", aliases: ["old-song"], url: "/?song=new-song#musica", title: "Canzone" }];
const helpers = {
  json: (body, status = 200) => Response.json(body, { status }),
  decode: value => Buffer.from(value, "base64").toString("utf8"),
  encode: value => Buffer.from(value).toString("base64"),
  formatDate: value => value === "2026-10-21" ? "21 ottobre 2026" : value,
  readContent: async () => items,
  page: (a, body) => "<html><body><h1>" + a.title + "</h1>" + (a.image || "") + body + "</body></html>"
};
const legacyHTML = readFileSync("articoli/il-potere-di-mantenere-il-potere/index.html", "utf8");
const legacyCard = JSON.parse(readFileSync("data/articles.json", "utf8")).find(a => a.url.includes("il-potere-di-mantenere"));
function githubMock({ conflict = false } = {}) {
  const calls = [], trees = [];
  globalThis.fetch = async (input, options = {}) => {
    const endpoint = String(input).split("/repos/test/repo/")[1];
    const method = options.method || "GET", body = options.body ? JSON.parse(options.body) : null;
    calls.push({ endpoint, method, body });
    if (endpoint === "git/ref/heads/main") return Response.json({ object: { sha: "head-v1" } });
    if (endpoint === "contents/data/articles.json?ref=head-v1") return Response.json({ content: helpers.encode(JSON.stringify([current, { ...current, url: "/articoli/altro/" }])) });
    if (endpoint === "contents/articoli/esistente/index.html?ref=head-v1") return Response.json({ content: helpers.encode(legacyHTML), sha: "article-v1" });
    if (endpoint === "contents/sitemap.xml?ref=head-v1") return Response.json({ content: helpers.encode('<urlset><url><loc>https://agorariminipodcast.it' + url + '</loc><lastmod>2026-10-20</lastmod></url></urlset>') });
    if (endpoint === "git/commits/head-v1") return Response.json({ tree: { sha: "base-tree" } });
    if (endpoint === "git/trees") { trees.push(body); return Response.json({ sha: "new-tree" }); }
    if (endpoint === "git/commits") return Response.json({ sha: "new-commit" });
    if (endpoint === "git/blobs") return Response.json({ sha: "new-image-blob" });
    if (endpoint === "git/refs/heads/main") return Response.json(conflict ? { message: "Conflict" } : { ref: "main" }, { status: conflict ? 422 : 200 });
    throw Error("Unexpected GitHub request: " + endpoint);
  };
  return { calls, trees };
}
const payload = extra => ({ url, revision: "article-v1", article: structuredClone(article), imageAction: "keep", ...extra });
test("carica tutti i campi di un articolo storico, senza perdere paragrafi e apostrofi", () => {
  const parsed = parsePublishedArticle(legacyHTML, legacyCard);
  assert.equal(parsed.title, legacyCard.title); assert.equal(parsed.author, "Paolo");
  assert.equal(parsed.date, "2026-10-20"); assert.equal(parsed.linkedEpisode.id, "70256448");
  assert.match(parsed.bodyHtml, /<p>/); assert.ok(parsed.highlight.length);
  assert.doesNotMatch(parsed.bodyHtml, /<blockquote>/);
  assert.equal(parsed.image, legacyCard.image);
});
test("recupera correlati anche quando si trovano dentro il corpo", () => {
  const html = '<html><body><div class="article-body"><p>Uno</p><section class="article-related-content"><a data-content-type="song" data-content-id="new-song"></a></section><p>Due</p><blockquote>Frase<br>Seconda</blockquote></div></body></html>';
  const parsed = parsePublishedArticle(html, current);
  assert.deepEqual(parsed.relatedContent, [{ type: "song", id: "new-song" }]); assert.equal(parsed.highlight, "Frase\nSeconda");
  assert.doesNotMatch(parsed.bodyHtml, /section/);
});
test("sanitizzazione conserva accenti, entità, paragrafi e link senza codice eseguibile", () => {
  const output = sanitizeBody('<p onclick="evil()">L&#39;articolo &amp; <strong>caffè</strong></p><script>evil()</script><a href="javascript:evil()" onmouseover="evil()">link</a><img src=x onerror=evil()>', contentIndex(items));
  assert.match(output, /L&#39;articolo &amp; <strong>caffè<\/strong>/); assert.doesNotMatch(output, /evil|javascript|onclick|onmouseover|<img|<script/);
  assert.doesNotMatch(safeEditorBody('<p onclick="evil()">Testo<img src=x onerror="evil()"></p><script>evil()</script>'), /evil|onclick|<script|<img/);
});
test("dettaglio autenticato legge da GitHub senza modificare il sito", async () => {
  const mock = githubMock(); const response = await articleEditRoute("/v1/article", { url }, env, helpers);
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.revision, "article-v1"); assert.equal(result.html, legacyHTML); assert.ok(mock.calls.every(c => c.method === "GET"));
});
test("modifica atomica: titolo nuovo, URL stabile, data, correlati, immagine e altri articoli preservati", async () => {
  const mock = githubMock(); const response = await articleEditRoute("/v1/update", payload(), env, helpers);
  assert.equal(response.status, 200); assert.equal((await response.json()).url, url);
  const entries = mock.trees[0].tree, index = JSON.parse(entries.find(e => e.path === "data/articles.json").content);
  assert.equal(index[0].title, "Titolo modificato"); assert.equal(index[0].url, url); assert.equal(index[0].dateISO, "2026-10-21");
  assert.equal(index[0].image, current.image); assert.deepEqual(index[1], { ...current, url: "/articoli/altro/" });
  const html = entries.find(e => e.path === "articoli/esistente/index.html").content;
  const snapshot = JSON.parse(html.match(/<script id="article-editor-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(snapshot.relatedContent[0].id, "new-song"); assert.equal(snapshot.linkedEpisode.id, "123");
  assert.equal((snapshot.bodyHtml.match(/<p>/g) || []).length, 2);
  const roundTrip = parsePublishedArticle(html, index[0]); assert.equal(roundTrip.date, article.date); assert.equal(new DOMParser().parseFromString(roundTrip.bodyHtml, "text/html").body.textContent, new DOMParser().parseFromString(snapshot.bodyHtml, "text/html").body.textContent);
  const patches = mock.calls.filter(c => c.method === "PATCH"); assert.equal(patches.length, 1); assert.equal(patches[0].body.force, false);
});
test("rimuove o sostituisce la copertina senza cancellare file condivisi", async () => {
  let mock = githubMock();
  assert.equal((await articleEditRoute("/v1/update", payload({ imageAction: "remove" }), env, helpers)).status, 200);
  assert.equal(JSON.parse(mock.trees[0].tree.find(e => e.path === "data/articles.json").content)[0].image, undefined);
  mock = githubMock();
  const image = { mimeType: "image/png", base64: Buffer.from([137,80,78,71,13,10,26,10]).toString("base64") };
  assert.equal((await articleEditRoute("/v1/update", payload({ imageAction: "replace", image }), env, helpers)).status, 200);
  const cover = mock.trees[0].tree.find(e => e.path.startsWith("assets/articles/")); assert.equal(cover.sha, "new-image-blob"); assert.notEqual("/" + cover.path, current.image);
  assert.ok(mock.calls.every(c => c.method !== "DELETE"));
});
test("blocca revisioni obsolete, date impossibili e percorsi non validi prima di scrivere", async () => {
  for (const input of [payload({ revision: "old" }), payload({ url: "/articoli/../../secrets/" }), payload({ article: { ...article, date: "2026-02-30" } })]) {
    const mock = githubMock(); const response = await articleEditRoute("/v1/update", input, env, helpers);
    assert.ok(response.status >= 400); assert.ok(mock.calls.every(c => c.method === "GET"));
  }
});
test("conflitto finale non sovrascrive il nuovo ramo", async () => {
  const mock = githubMock({ conflict: true }); const response = await articleEditRoute("/v1/update", payload(), env, helpers);
  assert.equal(response.status, 409); assert.equal(mock.calls.at(-1).body.force, false);
});
test("API nega lettura e aggiornamento senza credenziali", async () => {
  for (const path of ["/v1/article", "/v1/update"]) {
    const mock = githubMock(); const response = await worker.fetch(new Request(env.ALLOWED_ORIGIN + path, { method: "POST", headers: { Origin: env.ALLOWED_ORIGIN, "Content-Type": "application/json" }, body: JSON.stringify({ url }) }), env);
    assert.equal(response.status, 401); assert.equal(mock.calls.length, 0);
  }
});

test("CMS: Edita riapre i campi e Salva modifiche invia un aggiornamento completo", async () => {
  const dom = new JSDOM(readFileSync("admin/index.html", "utf8"), { url: env.ALLOWED_ORIGIN + "/admin/" });
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.Option = dom.window.Option;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}; dom.window.confirm = () => true;
  dom.window.AGORA_EDITOR = { apiBaseUrl: "https://api.example" };
  const sent = [];
  globalThis.fetch = async (input, options) => {
    const path = new URL(input).pathname, data = JSON.parse(options.body); sent.push({ path, data });
    if (path === "/v1/login") return Response.json({ ok: true });
    if (path === "/v1/articles") return Response.json({ articles: [legacyCard] });
    if (path === "/v1/content") return Response.json({ items: [{ type: "episode", id: "70256448", title: "Puntata", url: "/puntate/test/" }] });
    if (path === "/v1/article") return Response.json({ article: legacyCard, html: legacyHTML, revision: "article-v1" });
    if (path === "/v1/update") return Response.json({ ok: true, url: legacyCard.url });
    throw Error("Unexpected request: " + path);
  };
  await import("../../admin/editor.js");
  const $ = selector => document.querySelector(selector);
  const until = async predicate => { for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); } throw Error("Timeout CMS"); };
  $("#access-user").value = "test"; $("#access-password").value = "test-only";
  $("#access-form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  await until(() => $(".article-actions .tool-button"));
  $(".article-actions .tool-button").click();
  await until(() => $("#publish").textContent === "Salva modifiche");
  assert.equal($("#title").value, legacyCard.title); assert.equal($("#author").value, legacyCard.author);
  assert.equal($("#article-date").value, "2026-10-20"); assert.equal($("#linked-episode").value, "episode:70256448");
  assert.ok($("#body").textContent.includes("Platone")); assert.ok($("#highlight").value.length);
  assert.equal(document.querySelector("input[name=has-image]:checked").value, "keep"); assert.equal($("#current-image").hidden, false);
  $("#title").value = "Titolo nuovo"; $("#article-date").value = "2026-10-22";
  $("#article-form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  await until(() => sent.some(item => item.path === "/v1/update"));
  const update = sent.find(item => item.path === "/v1/update").data;
  assert.equal(update.url, legacyCard.url); assert.equal(update.revision, "article-v1"); assert.equal(update.article.title, "Titolo nuovo");
  assert.equal(update.article.date, "2026-10-22"); assert.equal(update.imageAction, "keep"); assert.equal(update.image, null);
  assert.equal(update.article.linkedEpisode.id, "70256448"); assert.ok(update.article.bodyHtml.includes("<p>"));
  await until(() => $("#publish-message").textContent.includes("Modifiche salvate"));
  assert.equal($("#title").value, ""); assert.equal($("#cancel-edit").hidden, true);
  dom.window.close();
});
