const editorConfig = window.AGORA_EDITOR || {};
const accessForm = document.querySelector("#access-form");
const articleForm = document.querySelector("#article-form");
const accessMessage = document.querySelector("#access-message");
const publishMessage = document.querySelector("#publish-message");
const imageUpload = document.querySelector("#image-upload");
const imageInput = document.querySelector("#image");
const imageName = document.querySelector("#image-name");
const dateInput = document.querySelector("#article-date");
const articlesList = document.querySelector("#articles-list");
const articlesMessage = document.querySelector("#articles-message");
let editorCredentials = null;

dateInput.value = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
const setMessage = (element, message, state = "") => { element.textContent = message; element.className = `form-message${state ? ` is-${state}` : ""}`; };
const fileToBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(",")[1]); reader.onerror = reject; reader.readAsDataURL(file); });
async function api(path, payload) {
  if (!editorConfig.apiBaseUrl) throw new Error("Area editoriale in fase di attivazione. Riprova tra poco.");
  const response = await fetch(`${editorConfig.apiBaseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Operazione non completata.");
  return result;
}
function renderArticles(articles) {
  articlesList.replaceChildren();
  if (!articles.length) { articlesList.textContent = "Non ci sono ancora articoli pubblicati."; return; }
  articles.forEach((article) => {
    const item = document.createElement("article"); item.className = "article-item";
    const info = document.createElement("div"); const title = document.createElement("strong"); const meta = document.createElement("span"); const link = document.createElement("a");
    title.textContent = article.title; meta.textContent = `${article.author} · ${article.date}`; link.href = article.url; link.target = "_blank"; link.rel = "noopener"; link.textContent = "Apri ↗";
    info.append(title, meta, link);
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "delete-button"; remove.textContent = "Cancella";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Cancellare definitivamente “${article.title}”?`)) return;
      remove.disabled = true; setMessage(articlesMessage, "Cancellazione in corso…");
      try { await api("/v1/delete", { ...editorCredentials, url: article.url }); setMessage(articlesMessage, "Articolo cancellato.", "success"); await loadArticles(); }
      catch (error) { setMessage(articlesMessage, error.message, "error"); remove.disabled = false; }
    });
    item.append(info, remove); articlesList.append(item);
  });
}
async function loadArticles() {
  if (!editorCredentials) return;
  try { const result = await api("/v1/articles", editorCredentials); renderArticles(result.articles || []); }
  catch (error) { setMessage(articlesMessage, error.message, "error"); }
}
accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.querySelector("#access-user").value.trim();
  const password = document.querySelector("#access-password").value;
  setMessage(accessMessage, "Verifica accesso…");
  try { await api("/v1/login", { username, password }); editorCredentials = { username, password }; accessForm.hidden = true; articleForm.hidden = false; document.querySelector("#title").focus(); await loadArticles(); }
  catch (error) { setMessage(accessMessage, error.message, "error"); }
});
document.querySelector("#logout").addEventListener("click", () => { editorCredentials = null; articleForm.hidden = true; accessForm.hidden = false; accessForm.reset(); });
document.querySelectorAll("input[name=has-image]").forEach((input) => input.addEventListener("change", () => { imageUpload.hidden = document.querySelector("input[name=has-image]:checked").value !== "yes"; if (imageUpload.hidden) imageInput.value = ""; }));
imageInput.addEventListener("change", () => { const file = imageInput.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { imageInput.value = ""; setMessage(imageName, "L’immagine supera 5 MB.", "error"); return; } setMessage(imageName, `${file.name} - pronta per la pubblicazione.`, "success"); });
articleForm.addEventListener("submit", async (event) => {
  event.preventDefault(); const file = imageInput.files[0];
  if (document.querySelector("input[name=has-image]:checked").value === "yes" && !file) { setMessage(publishMessage, "Carica l’immagine oppure seleziona “No”.", "error"); return; }
  const publish = document.querySelector("#publish"); publish.disabled = true; setMessage(publishMessage, "Pubblicazione in corso…");
  try {
    const article = { category: document.querySelector("#category").value, author: document.querySelector("#author").value, title: document.querySelector("#title").value.trim(), subtitle: document.querySelector("#subtitle").value.trim(), date: dateInput.value, body: document.querySelector("#body").value.trim(), highlight: document.querySelector("#highlight").value.trim() };
    if (!article.title || !article.subtitle || !article.body || !article.highlight) throw new Error("Completa tutti i campi obbligatori.");
    const image = file ? { base64: await fileToBase64(file), mimeType: file.type } : null;
    await api("/v1/publish", { ...editorCredentials, article, image });
    setMessage(publishMessage, "Articolo pubblicato. Sarà online entro pochi minuti.", "success"); articleForm.reset(); dateInput.value = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" }); imageUpload.hidden = true; await loadArticles();
  } catch (error) { setMessage(publishMessage, error.message, "error"); } finally { publish.disabled = false; }
});
