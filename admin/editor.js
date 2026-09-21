const editorConfig = window.AGORA_EDITOR || {};
const accessForm = document.querySelector("#access-form");
const articleForm = document.querySelector("#article-form");
const accessMessage = document.querySelector("#access-message");
const publishMessage = document.querySelector("#publish-message");
const imageUpload = document.querySelector("#image-upload");
const imageInput = document.querySelector("#image");
const imageName = document.querySelector("#image-name");
const dateInput = document.querySelector("#article-date");
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
accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.querySelector("#access-user").value.trim();
  const password = document.querySelector("#access-password").value;
  setMessage(accessMessage, "Verifica accesso…");
  try { await api("/v1/login", { username, password }); editorCredentials = { username, password }; accessForm.hidden = true; articleForm.hidden = false; document.querySelector("#title").focus(); }
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
    setMessage(publishMessage, "Articolo pubblicato. Sarà online entro pochi minuti.", "success"); articleForm.reset(); dateInput.value = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" }); imageUpload.hidden = true;
  } catch (error) { setMessage(publishMessage, error.message, "error"); } finally { publish.disabled = false; }
});
