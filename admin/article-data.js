const site = "https://agorariminipodcast.it";
export function editorDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value;
  const months = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
  const match = String(value || "").toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (!match || !months.includes(match[2])) throw Error("Data originale non riconosciuta.");
  return match[3] + "-" + String(months.indexOf(match[2]) + 1).padStart(2, "0") + "-" + match[1].padStart(2, "0");
}
export function safeEditorBody(html) {
  const document = new DOMParser().parseFromString("<!doctype html><html><body>" + (html || "") + "</body></html>", "text/html");
  const allowed = new Set(["P","DIV","BR","STRONG","EM","B","I","U","H2","H3","H4","UL","OL","LI","BLOCKQUOTE","A"]);
  const clean = node => {
    if (node.nodeType === 3) return document.createTextNode(node.textContent);
    const fragment = document.createDocumentFragment();
    if (node.nodeType !== 1 || ["SCRIPT","STYLE","IFRAME","OBJECT","SVG","MATH"].includes(node.tagName)) return fragment;
    const output = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : fragment;
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      const type = node.getAttribute("data-content-type"), id = node.getAttribute("data-content-id");
      if (type && id && /^(episode|article|song)$/.test(type)) { output.dataset.contentType = type; output.dataset.contentId = id; }
      if (/^https?:\/\//i.test(href) || /^\/(?!\/)/.test(href) || href === "#") output.setAttribute("href", href);
    }
    for (const child of Array.from(node.childNodes)) output.append(clean(child));
    return output;
  };
  const result = document.createElement("div");
  for (const node of Array.from(document.body.childNodes)) result.append(clean(node));
  return result.innerHTML;
}
function textWithBreaks(element) {
  if (!element) return "";
  const copy = element.cloneNode(true);
  copy.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  return copy.textContent.trim();
}
export function parsePublishedArticle(html, card) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const saved = document.querySelector("#article-editor-data");
  if (saved) {
    const draft = JSON.parse(saved.textContent);
    return { ...draft, ...card, date: editorDate(draft.date), bodyHtml: safeEditorBody(draft.bodyHtml) };
  }
  const body = document.querySelector(".article-body");
  if (!body) throw Error("Il testo dell’articolo non è leggibile.");
  const relatedContent = [...document.querySelectorAll(".article-related-content [data-content-type][data-content-id]")].map(element => ({ type: element.dataset.contentType, id: element.dataset.contentId }));
  body.querySelectorAll(".article-related-content, script, style").forEach(element => element.remove());
  const highlight = [...body.children].reverse().find(element => element.tagName === "BLOCKQUOTE");
  const highlightText = textWithBreaks(highlight);
  if (highlight) highlight.remove();
  const ref = element => element ? { type: element.dataset.contentType, id: element.dataset.contentId } : null;
  const image = document.querySelector(".article-hero-image img");
  return {
    ...card,
    title: document.querySelector("h1")?.textContent.trim() || card.title,
    subtitle: document.querySelector(".article-deck")?.textContent.trim() || card.subtitle || "",
    date: editorDate(card.dateISO || card.date),
    bodyHtml: safeEditorBody(body.innerHTML),
    highlight: highlightText,
    image: card.image || (image ? new URL(image.getAttribute("src"), site + card.url).pathname : ""),
    linkedEpisode: ref(document.querySelector(".article-episode-player [data-content-type='episode'][data-content-id]")),
    relatedContent
  };
}
