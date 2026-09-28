import { readFileSync, writeFileSync } from "node:fs";

const decode = (value = "") => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const episodesHtml = readFileSync("puntate/index.html", "utf8");
const jsonText = episodesHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
if (!jsonText) throw new Error("Archivio puntate non leggibile.");
const episodeItems = JSON.parse(jsonText).mainEntity.itemListElement.map((entry) => {
  const url = new URL(entry.url).pathname;
  return { type: "episode", id: url.split("-").pop().replace(/\/$/, ""), title: entry.name, url };
});
const musicHtml = readFileSync("index.html", "utf8");
const songs = [...musicHtml.matchAll(/class="release-pick[^>]*data-title="([^"]+)"\s+data-spotify="([^"]+)"[^>]*>/g)].map((match) => ({ type: "song", id: match[2], title: decode(match[1]), url: "/#musica" }));
writeFileSync("data/content-catalog.json", JSON.stringify({ version: 1, items: [...episodeItems, ...songs] }, null, 2) + "\n");
console.log(`Catalogo aggiornato: ${episodeItems.length} puntate, ${songs.length} canzoni.`);
