import { parsePublishedArticle } from "./article-data.js?v=1";
const editorConfig = window.AGORA_EDITOR || {};
const $ = (s) => document.querySelector(s);
const accessForm = $("#access-form"), articleForm = $("#article-form"), bodyEditor = $("#body");
const accessMessage = $("#access-message"), publishMessage = $("#publish-message"), imageUpload = $("#image-upload"), imageInput = $("#image"), imageName = $("#image-name"), dateInput = $("#article-date"), articlesList = $("#articles-list"), articlesMessage = $("#articles-message");
let editorCredentials = null, contentItems = [], relatedItems = [], relatedType = "all", linkType = "episode", savedRange = null, editingArticle = null, editorDirty = false, loadingArticle = false;
dateInput.value = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
const setMessage = (el, text, state = "") => { el.textContent = text; el.className = `form-message${state ? ` is-${state}` : ""}`; };
const typeName = (type) => ({ episode: "Puntata", article: "Articolo", song: "Canzone" }[type] || "Contenuto");
const contentKey = (item) => `${item.type}:${item.id}`;
const fileToBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(",")[1]); reader.onerror = reject; reader.readAsDataURL(file); });
async function api(path, payload) { if (!editorConfig.apiBaseUrl) throw new Error("Area editoriale in fase di attivazione. Riprova tra poco."); const response = await fetch(`${editorConfig.apiBaseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || "Operazione non completata."); return result; }
function findItem(value) { return contentItems.find((item) => contentKey(item) === value); }
function filterItems(type, search) { const query = search.trim().toLocaleLowerCase("it"); return contentItems.filter((item) => (type === "all" || item.type === type) && (!query || item.title.toLocaleLowerCase("it").includes(query))); }
function fillSelect(select, items, label) { const current = select.value; select.replaceChildren(new Option(label, "")); items.forEach((item) => select.add(new Option(`${typeName(item.type)} · ${item.title}`, contentKey(item)))); if ([...select.options].some((option) => option.value === current)) select.value = current; }
function updatePreview(select, preview) { const item = findItem(select.value); preview.hidden = !item; preview.textContent = item ? `${typeName(item.type)} selezionata: ${item.title}` : ""; }
function updateEpisode() { fillSelect($("#linked-episode"), filterItems("episode", $("#episode-search").value), "Nessuna puntata collegata"); updatePreview($("#linked-episode"), $("#episode-preview")); }
function updateRelated() { fillSelect($("#related-content"), filterItems(relatedType, $("#related-search").value).filter((item) => !relatedItems.some((selected) => contentKey(selected) === contentKey(item))), "Scegli un contenuto"); }
function renderRelated() { const list = $("#related-list"); list.replaceChildren(); relatedItems.forEach((item) => { const row = document.createElement("div"); row.className = "selected-item"; const detail = document.createElement("div"), type = document.createElement("span"), title = document.createElement("strong"), remove = document.createElement("button"); type.textContent = typeName(item.type); title.textContent = item.title; remove.type = "button"; remove.textContent = "Rimuovi"; remove.addEventListener("click", () => { editorDirty = true; relatedItems = relatedItems.filter((selected) => contentKey(selected) !== contentKey(item)); renderRelated(); updateRelated(); }); detail.append(type, title); row.append(detail, remove); list.append(row); }); }
function resetEditor() {
  articleForm.reset(); bodyEditor.replaceChildren(); editingArticle = null; relatedItems = []; editorDirty = false;
  dateInput.value = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
  imageUpload.hidden = true; $("#current-image").hidden = true; $("#current-image").removeAttribute("src");
  $("#keep-image-option").hidden = true; $("#cancel-edit").hidden = true;
  $(".editor-head h2").textContent = "Componi l’articolo"; $("#publish").textContent = "Pubblica articolo";
  $("#episode-search").value = ""; $("#related-search").value = ""; savedRange = null;
  renderRelated(); updateEpisode(); updateRelated();
}
function selectOption(selector, value) {
  const select = $(selector);
  if (value && ![...select.options].some(option => option.value === value)) select.add(new Option(value, value));
  select.value = value || "";
}
async function editArticle(article, button) {
  if (loadingArticle) return;
  if (editorDirty && !window.confirm("Abbandonare le modifiche non salvate e aprire questo articolo?")) return;
  loadingArticle = true; button.disabled = true; $("#publish").disabled = true;
  setMessage(articlesMessage, "Caricamento articolo…");
  try {
    const result = await api("/v1/article", { ...editorCredentials, url: article.url });
    const draft = parsePublishedArticle(result.html, result.article);
    await loadContent();
    resetEditor();
    editingArticle = { url: article.url, revision: result.revision, image: draft.image || "" };
    for (const field of ["title", "subtitle", "highlight"]) $("#" + field).value = draft[field] || "";
    selectOption("#category", draft.category); selectOption("#author", draft.author);
    dateInput.value = draft.date; bodyEditor.innerHTML = draft.bodyHtml;
    const resolve = ref => contentItems.find(item => item.type === ref.type && (item.id === ref.id || (item.aliases || []).includes(ref.id))) || { ...ref, title: "Contenuto non disponibile (" + ref.id + ")" };
    relatedItems = (draft.relatedContent || []).map(resolve);
    if (draft.linkedEpisode) {
      const episode = resolve(draft.linkedEpisode);
      if (!findItem(contentKey(episode))) contentItems.push(episode);
      updateEpisode(); $("#linked-episode").value = contentKey(episode);
    }
    renderRelated(); updateRelated(); updatePreview($("#linked-episode"), $("#episode-preview"));
    $("#keep-image-option").hidden = !draft.image;
    document.querySelector('input[name=has-image][value="' + (draft.image ? "keep" : "no") + '"]').checked = true;
    if (draft.image) { $("#current-image").src = draft.image; $("#current-image").hidden = false; }
    $(".editor-head h2").textContent = "Modifica l’articolo";
    $("#publish").textContent = "Salva modifiche"; $("#cancel-edit").hidden = false;
    setMessage(publishMessage, "Stai modificando un articolo pubblicato. Il suo indirizzo rimarrà invariato.");
    setMessage(articlesMessage, "Articolo caricato.", "success");
    editorDirty = false; $("#title").focus(); articleForm.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { setMessage(articlesMessage, error.message, "error"); }
  finally { loadingArticle = false; button.disabled = false; $("#publish").disabled = false; }
}
function renderArticles(articles) {
  articlesList.replaceChildren();
  if (!articles.length) { articlesList.textContent = "Non ci sono ancora articoli pubblicati."; return; }
  for (const article of articles) {
    const item = document.createElement("article"), info = document.createElement("div"), title = document.createElement("strong"), meta = document.createElement("span"), link = document.createElement("a"), actions = document.createElement("div"), edit = document.createElement("button"), remove = document.createElement("button");
    item.className = "article-item"; actions.className = "article-actions";
    title.textContent = article.title; meta.textContent = article.author + " · " + article.date;
    link.href = article.url; link.target = "_blank"; link.rel = "noopener"; link.textContent = "Apri ↗";
    edit.type = "button"; edit.className = "tool-button"; edit.textContent = "Edita";
    edit.addEventListener("click", () => editArticle(article, edit));
    remove.type = "button"; remove.className = "delete-button"; remove.textContent = "Cancella";
    remove.addEventListener("click", async () => {
      if (loadingArticle || !window.confirm("Cancellare definitivamente “" + article.title + "”?")) return;
      remove.disabled = true; setMessage(articlesMessage, "Cancellazione in corso…");
      try {
        await api("/v1/delete", { ...editorCredentials, url: article.url });
        if (editingArticle?.url === article.url) resetEditor();
        setMessage(articlesMessage, "Articolo cancellato.", "success"); await loadArticles();
      } catch (error) { setMessage(articlesMessage, error.message, "error"); remove.disabled = false; }
    });
    info.append(title, meta, link); actions.append(edit, remove); item.append(info, actions); articlesList.append(item);
  }
}
async function loadArticles() { if (!editorCredentials) return; try { renderArticles((await api("/v1/articles", editorCredentials)).articles || []); } catch (error) { setMessage(articlesMessage, error.message, "error"); } }
async function loadContent() { contentItems = (await api("/v1/content", editorCredentials)).items || []; updateEpisode(); updateRelated(); }
function updateLinkFields() { const external = linkType === "external"; $("#internal-link-fields").hidden = external; $("#external-link-fields").hidden = !external; document.querySelectorAll("[data-link-type]").forEach((button) => button.classList.toggle("is-active", button.dataset.linkType === linkType)); if (!external) { fillSelect($("#link-content"), filterItems(linkType, $("#link-search").value), "Scegli un contenuto"); updatePreview($("#link-content"), $("#link-preview")); } }
$("#insert-link").addEventListener("click", () => { const selection = window.getSelection(); if (!selection.rangeCount || !bodyEditor.contains(selection.anchorNode) || !selection.toString().trim()) { setMessage(publishMessage, "Seleziona prima una parola o una frase nell’articolo.", "error"); return; } savedRange = selection.getRangeAt(0).cloneRange(); $("#link-selection").textContent = `Testo selezionato: “${selection.toString().trim()}”`; $("#link-message").textContent = ""; $("#link-dialog").showModal(); updateLinkFields(); });
document.querySelectorAll("[data-link-type]").forEach((button) => button.addEventListener("click", () => { linkType = button.dataset.linkType; updateLinkFields(); }));
$("#link-search").addEventListener("input", updateLinkFields); $("#link-content").addEventListener("change", () => updatePreview($("#link-content"), $("#link-preview")));
$("#confirm-link").addEventListener("click", () => { const external = linkType === "external", item = external ? null : findItem($("#link-content").value), url = $("#external-url").value.trim(); if ((!external && !item) || (external && !/^https?:\/\//i.test(url))) { setMessage($("#link-message"), external ? "Inserisci un indirizzo che inizi con https:// o http://." : "Scegli un contenuto.", "error"); return; } if (!savedRange) return; const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(savedRange); const anchor = document.createElement("a"); if (item) { anchor.dataset.contentType = item.type; anchor.dataset.contentId = item.id; anchor.href = item.url; } else { anchor.href = url; anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; } const range = selection.getRangeAt(0); anchor.append(range.extractContents()); range.insertNode(anchor); editorDirty = true; $("#link-dialog").close(); bodyEditor.focus(); });
$("#episode-search").addEventListener("input", updateEpisode); $("#linked-episode").addEventListener("change", () => updatePreview($("#linked-episode"), $("#episode-preview")));
document.querySelectorAll("[data-type]").forEach((button) => button.addEventListener("click", () => { relatedType = button.dataset.type; document.querySelectorAll("[data-type]").forEach((tab) => tab.classList.toggle("is-active", tab === button)); updateRelated(); }));
$("#related-search").addEventListener("input", updateRelated); $("#add-related").addEventListener("click", () => { const item = findItem($("#related-content").value); if (!item) return; editorDirty = true; relatedItems.push(item); renderRelated(); updateRelated(); });
accessForm.addEventListener("submit", async (event) => { event.preventDefault(); const username = $("#access-user").value.trim(), password = $("#access-password").value; setMessage(accessMessage, "Verifica accesso…"); try { await api("/v1/login", { username, password }); editorCredentials = { username, password }; accessForm.hidden = true; articleForm.hidden = false; await Promise.all([loadArticles(), loadContent()]); $("#title").focus(); } catch (error) { setMessage(accessMessage, error.message, "error"); } });
$("#logout").addEventListener("click", () => { if (editorDirty && !window.confirm("Uscire senza salvare le modifiche?")) return; resetEditor(); editorCredentials = null; articleForm.hidden = true; accessForm.hidden = false; accessForm.reset(); });
document.querySelectorAll("input[name=has-image]").forEach((input) => input.addEventListener("change", () => { imageUpload.hidden = document.querySelector("input[name=has-image]:checked").value !== "yes"; if (imageUpload.hidden) imageInput.value = ""; $("#current-image").hidden = document.querySelector("input[name=has-image]:checked").value !== "keep"; }));
imageInput.addEventListener("change", () => { const file = imageInput.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { imageInput.value = ""; setMessage(imageName, "L’immagine supera 5 MB.", "error"); return; } setMessage(imageName, `${file.name} - pronta per la pubblicazione.`, "success"); });
articleForm.addEventListener("input", () => { editorDirty = true; });
articleForm.addEventListener("change", () => { editorDirty = true; });
$("#cancel-edit").addEventListener("click", () => {
  if (editorDirty && !window.confirm("Abbandonare le modifiche non salvate?")) return;
  resetEditor(); setMessage(publishMessage, "");
});
window.addEventListener("beforeunload", event => { if (editorDirty) { event.preventDefault(); event.returnValue = ""; } });
articleForm.addEventListener("submit", async event => {
  event.preventDefault(); if (loadingArticle) return;
  const file = imageInput.files[0], imageChoice = document.querySelector("input[name=has-image]:checked").value;
  if (imageChoice === "yes" && !file) { setMessage(publishMessage, "Carica l’immagine oppure scegli un’altra opzione.", "error"); return; }
  const publish = $("#publish"); publish.disabled = true;
  const editing = editingArticle;
  setMessage(publishMessage, editing ? "Salvataggio modifiche…" : "Pubblicazione in corso…");
  try {
    const episode = findItem($("#linked-episode").value);
    const article = {
      category: $("#category").value, author: $("#author").value, title: $("#title").value.trim(), subtitle: $("#subtitle").value.trim(), date: dateInput.value,
      bodyHtml: bodyEditor.innerHTML.trim(), highlight: $("#highlight").value.trim(),
      linkedEpisode: episode ? { type: episode.type, id: episode.id } : null,
      relatedContent: relatedItems.map(({ type, id }) => ({ type, id }))
    };
    if (!article.title || !article.subtitle || !article.date || !bodyEditor.textContent.trim() || !article.highlight) throw Error("Completa tutti i campi obbligatori.");
    const image = imageChoice === "yes" && file ? { base64: await fileToBase64(file), mimeType: file.type } : null;
    if (editing) await api("/v1/update", { ...editorCredentials, url: editing.url, revision: editing.revision, article, image, imageAction: imageChoice === "keep" ? "keep" : imageChoice === "yes" ? "replace" : "remove" });
    else await api("/v1/publish", { ...editorCredentials, article, image });
    resetEditor();
    setMessage(publishMessage, editing ? "Modifiche salvate. Saranno online entro pochi minuti." : "Articolo pubblicato. Sarà online entro pochi minuti.", "success");
    await Promise.all([loadArticles(), loadContent()]);
  } catch (error) { setMessage(publishMessage, error.message, "error"); }
  finally { publish.disabled = false; }
});
