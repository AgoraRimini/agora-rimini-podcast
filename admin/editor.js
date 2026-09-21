const config = window.AGORA_EDITOR_ACCESS || {};
const accessForm = document.querySelector("#access-form");
const articleForm = document.querySelector("#article-form");
const accessMessage = document.querySelector("#access-message");
const tokenInput = document.querySelector("#github-token");
const tokenMessage = document.querySelector("#token-message");
const publishMessage = document.querySelector("#publish-message");
const imageUpload = document.querySelector("#image-upload");
const imageInput = document.querySelector("#image");
const imageName = document.querySelector("#image-name");
const repo = "AgoraRimini/agora-rimini-podcast";
let githubToken = "";

const dateInput = document.querySelector("#article-date");
dateInput.value = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });

const setMessage = (element, message, state = "") => {
  element.textContent = message;
  element.className = `form-message${state ? ` is-${state}` : ""}`;
};
const digest = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const escapeHtml = (value = "") => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character]));
const formatDate = (value) => new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const toBase64 = (text) => btoa(unescape(encodeURIComponent(text)));
const fileToBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(",")[1]); reader.onerror = reject; reader.readAsDataURL(file); });
const imageExtension = (file) => ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type] || "jpg");

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    ...options,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${githubToken}`, "X-GitHub-Api-Version": "2026-03-10", ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(response.status === 401 ? "Token non valido o scaduto." : response.status === 403 ? "Il token non ha il permesso necessario." : "GitHub non ha completato l’operazione.");
  return response.json();
}

accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!config.enabled || !config.usernameHash || !config.passwordHash) {
    setMessage(accessMessage, "Accesso in attesa di configurazione da parte dell’amministratore.", "error");
    return;
  }
  const [username, password] = [document.querySelector("#access-user").value.trim(), document.querySelector("#access-password").value];
  if (await digest(username) !== config.usernameHash || await digest(password) !== config.passwordHash) {
    setMessage(accessMessage, "Credenziali non riconosciute.", "error");
    return;
  }
  sessionStorage.setItem("agora-editor-access", "yes");
  accessForm.hidden = true;
  articleForm.hidden = false;
  document.querySelector("#title").focus();
});

if (sessionStorage.getItem("agora-editor-access") === "yes" && config.enabled) {
  accessForm.hidden = true;
  articleForm.hidden = false;
}
document.querySelector("#logout").addEventListener("click", () => { sessionStorage.clear(); location.reload(); });

document.querySelectorAll("input[name=has-image]").forEach((input) => input.addEventListener("change", () => {
  imageUpload.hidden = document.querySelector("input[name=has-image]:checked").value !== "yes";
  if (imageUpload.hidden) imageInput.value = "";
}));
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { imageInput.value = ""; setMessage(imageName, "L’immagine supera 5 MB.", "error"); return; }
  setMessage(imageName, `${file.name} - pronta per la pubblicazione.`, "success");
});

document.querySelector("#check-token").addEventListener("click", async () => {
  githubToken = tokenInput.value.trim();
  if (!githubToken) { setMessage(tokenMessage, "Incolla il token personale GitHub.", "error"); return; }
  try {
    await github("");
    setMessage(tokenMessage, "Token verificato. Puoi pubblicare l’articolo.", "success");
  } catch (error) { githubToken = ""; setMessage(tokenMessage, error.message, "error"); }
});

function makeArticleHtml(article) {
  const paragraphs = article.body.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("\n        ");
  const imageMeta = article.image ? `<meta property="og:image" content="https://agorariminipodcast.it${article.image}">` : "";
  const imageFigure = article.image ? `<figure class="article-hero-image"><img src="../../${article.image.replace(/^\//, "")}" alt="${escapeHtml(article.imageAlt || article.title)}"></figure>` : "";
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0b57a3"><title>${escapeHtml(article.title)} | Agorà Rimini Podcast</title><meta name="description" content="${escapeHtml(article.subtitle)}"><link rel="canonical" href="https://agorariminipodcast.it${article.url}"><meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(article.title)} | Agorà Rimini Podcast"><meta property="og:description" content="${escapeHtml(article.subtitle)}">${imageMeta}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="../../styles.css?v=19"></head><body class="article-page"><header class="site-header"><a class="brand" href="/" aria-label="Torna alla home di Agorà Rimini Podcast"><img src="../../assets/logo.jpg" alt="Agorà Rimini Podcast"></a><a class="article-back" href="/#articoli">← Torna agli articoli</a></header><main><article class="article-post"><header class="article-post-header"><p class="kicker">Editoriale · ${escapeHtml(article.category)}</p><h1>${escapeHtml(article.title)}</h1><p class="article-deck">${escapeHtml(article.subtitle)}</p><p class="article-byline">di ${escapeHtml(article.author)} <span>·</span> ${escapeHtml(article.date)}</p></header>${imageFigure}<div class="article-body">${paragraphs}<blockquote>${escapeHtml(article.highlight).replace(/\n/g, "<br>")}</blockquote></div></article></main><footer class="article-footer"><a href="/">Agorà Rimini Podcast</a> <span>·</span> Parole senza filtri</footer></body></html>`;
}

articleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!githubToken) { setMessage(publishMessage, "Prima verifica il token personale GitHub.", "error"); return; }
  const formData = {
    category: document.querySelector("#category").value,
    author: document.querySelector("#author").value,
    title: document.querySelector("#title").value.trim(),
    subtitle: document.querySelector("#subtitle").value.trim(),
    date: formatDate(dateInput.value),
    body: document.querySelector("#body").value.trim(),
    highlight: document.querySelector("#highlight").value.trim()
  };
  const slug = slugify(formData.title);
  if (!slug || !formData.body) { setMessage(publishMessage, "Completa tutti i campi obbligatori.", "error"); return; }
  const file = imageInput.files[0];
  if (document.querySelector("input[name=has-image]:checked").value === "yes" && !file) { setMessage(publishMessage, "Carica l’immagine oppure seleziona “No”.", "error"); return; }
  const publish = document.querySelector("#publish"); publish.disabled = true; setMessage(publishMessage, "Pubblicazione in corso…");
  try {
    if (file) {
      const extension = imageExtension(file);
      formData.image = `/assets/articles/${slug}.${extension}`;
      formData.imageAlt = formData.title;
      await github(`assets/articles/${slug}.${extension}`, { method: "PUT", body: JSON.stringify({ message: `Aggiunge immagine articolo: ${formData.title}`, content: await fileToBase64(file), branch: "main" }) });
    }
    formData.url = `/articoli/${slug}/`;
    await github(`articoli/${slug}/index.html`, { method: "PUT", body: JSON.stringify({ message: `Pubblica articolo: ${formData.title}`, content: toBase64(makeArticleHtml(formData)), branch: "main" }) });
    const current = await github("data/articles.json");
    const articles = JSON.parse(decodeURIComponent(escape(atob(current.content.replace(/\n/g, "")))));
    if (articles.some((article) => article.url === formData.url)) throw new Error("Esiste già un articolo con questo titolo. Modifica il titolo e riprova.");
    const record = (({ body, highlight, ...card }) => card)(formData);
    articles.unshift(record);
    await github("data/articles.json", { method: "PUT", body: JSON.stringify({ message: `Aggiorna elenco articoli: ${formData.title}`, content: toBase64(JSON.stringify(articles, null, 2) + "\n"), sha: current.sha, branch: "main" }) });
    const sitemap = await github("sitemap.xml");
    const sitemapText = decodeURIComponent(escape(atob(sitemap.content.replace(/\n/g, ""))));
    const sitemapEntry = `<url>\n  <loc>https://agorariminipodcast.it${formData.url}</loc>\n  <lastmod>${dateInput.value}</lastmod>\n  <changefreq>monthly</changefreq>\n  <priority>0.8</priority>\n</url>\n`;
    if (!sitemapText.includes(`<loc>https://agorariminipodcast.it${formData.url}</loc>`)) {
      await github("sitemap.xml", { method: "PUT", body: JSON.stringify({ message: `Aggiunge articolo alla sitemap: ${formData.title}`, content: toBase64(sitemapText.replace("</urlset>", `${sitemapEntry}</urlset>`)), sha: sitemap.sha, branch: "main" }) });
    }
    setMessage(publishMessage, "Articolo pubblicato. Sarà online entro pochi minuti.", "success");
    articleForm.reset(); dateInput.value = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" }); imageUpload.hidden = true;
  } catch (error) { setMessage(publishMessage, error.message, "error"); }
  finally { publish.disabled = false; }
});
