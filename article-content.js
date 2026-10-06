(() => {
  // Apply the same placement to existing articles and pages published by the CMS.
  document.querySelectorAll(".article-post").forEach((article) => {
    const body = article.querySelector(".article-body");
    const related = article.querySelector(".article-related-content");
    if (!body || !related) return;
    const firstParagraph = Array.from(body.children).find((element) =>
      element.tagName === "P" && element.textContent.trim()
    );
    if (firstParagraph) firstParagraph.after(related);
    else body.prepend(related);
    related.style.marginBottom = "1.55em";
  });
  const contentKey = (item) => `${item.type}:${item.id}`;
  const typeName = (type) => ({ episode: "Puntata", article: "Articolo", song: "Canzone" }[type] || "Contenuto");
  Promise.all([fetch("/data/content-catalog.json").then((r) => r.ok ? r.json() : { items: [] }), fetch("/data/articles.json").then((r) => r.ok ? r.json() : [])]).then(([catalog, articles]) => {
    const items = [...(catalog.items || []), ...articles.map((article) => ({ type: "article", id: article.url.split("/")[2], title: article.title, url: article.url }))];
    const index = new Map(items.map((item) => [contentKey(item), item]));
    document.querySelectorAll("[data-content-type][data-content-id]").forEach((element) => {
      const item = index.get(`${element.dataset.contentType}:${element.dataset.contentId}`);
      if (!item) { element.hidden = true; return; }
      if (element.matches("a")) element.href = item.url;
      const title = element.querySelector("[data-content-title]");
      if (title) title.textContent = item.title;
      const label = element.querySelector("small");
      if (label) label.textContent = typeName(item.type);
    });
  }).catch(() => {});
})();
