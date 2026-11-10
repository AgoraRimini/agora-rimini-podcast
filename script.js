const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector(".main-nav");
const trailerButton = document.querySelector("#trailer-toggle");
const trailerFrame = document.querySelector("#trailer-widget");
const trailerStatus = document.querySelector("#trailer-status");
const trailerLabel = trailerButton?.querySelector(".trailer-label");
const trailerIcon = trailerButton?.querySelector(".play-icon");
let trailerController;

const setTrailerStopped = (label = "Ascolta il trailer") => {
  trailerButton?.classList.remove("is-playing");
  trailerButton?.setAttribute("aria-pressed", "false");
  trailerButton?.setAttribute("aria-label", "Riproduci il trailer di Agorà Rimini Podcast");
  if (trailerLabel) trailerLabel.textContent = label;
  if (trailerIcon) trailerIcon.textContent = "▶";
};

trailerButton?.addEventListener("click", () => {
  if (!trailerController) return;
  if (trailerButton.classList.contains("is-playing")) {
    trailerController.pause();
    setTrailerStopped("Riprendi il trailer");
    if (trailerStatus) trailerStatus.textContent = "Trailer in pausa.";
    return;
  }
  document.dispatchEvent(new Event("agora:trailer-play"));
  trailerController.play();
  trailerButton.classList.add("is-playing");
  trailerButton.setAttribute("aria-pressed", "true");
  trailerButton.setAttribute("aria-label", "Interrompi il trailer di Agorà Rimini Podcast");
  if (trailerLabel) trailerLabel.textContent = "Interrompi il trailer";
  if (trailerIcon) trailerIcon.textContent = "■";
  if (trailerStatus) trailerStatus.textContent = "Riproduzione del trailer avviata.";
});

if (trailerFrame && window.playerjs?.Player) {
  trailerController = new window.playerjs.Player(trailerFrame);
  trailerController.on("ready", () => trailerButton?.removeAttribute("disabled"));
  trailerController.on("play", () => {
    document.dispatchEvent(new Event("agora:trailer-play"));
    trailerButton?.classList.add("is-playing");
  });
  trailerController.on("pause", () => setTrailerStopped("Riprendi il trailer"));
  trailerController.on("ended", () => {
    setTrailerStopped("Riascolta il trailer");
    if (trailerStatus) trailerStatus.textContent = "Trailer terminato.";
  });
}

menuButton?.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

menu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menu.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    menu?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  }
});

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const escapeHtml = (value = "") => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
}[character]));

const articleList = document.querySelector("[data-articles-list]");
if (articleList) {
  fetch("/data/articles.json", { cache: "no-cache" })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((articles) => {
      if (!Array.isArray(articles) || !articles.length) return;
      articleList.innerHTML = articles.map((article) => `
        <article class="article-card article-card-featured article-card-live">
          <a class="article-card-link" href="${escapeHtml(article.url)}" aria-label="Leggi l'articolo ${escapeHtml(article.title)}">
            ${article.image ? `<figure class="article-image"><img src="${escapeHtml(article.imageThumbnail || article.image)}" loading="lazy" decoding="async" alt="${escapeHtml(article.imageAlt || article.title)}"></figure>` : ""}
            <div class="card-copy"><span class="tag">${escapeHtml(article.category)} · Editoriale</span><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.subtitle)}</p><small>di ${escapeHtml(article.author)} · ${escapeHtml(article.date)}</small><span class="article-read">Leggi l’articolo <b aria-hidden="true">→</b></span></div>
          </a>
        </article>`).join("");
    })
    .catch(() => {});
}


// Prevent the trailer and latest episode from playing over each other.
document.addEventListener("agora:episode-play", () => {
  trailerController?.pause();
  setTrailerStopped("Riprendi il trailer");
});


// Original songs share the page with the trailer and latest episode.
document.addEventListener('agora:music-play', () => { trailerController?.pause(); setTrailerStopped('Riprendi il trailer'); });
