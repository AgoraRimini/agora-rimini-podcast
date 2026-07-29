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
  trailerController.on("play", () => trailerButton?.classList.add("is-playing"));
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

const quotesScript = document.createElement("script");
quotesScript.src = "quotes.js";
quotesScript.defer = true;
document.body.appendChild(quotesScript);
