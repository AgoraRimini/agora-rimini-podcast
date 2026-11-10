(() => {
  const section = document.querySelector('#pensieri');
  const randomButton = section?.querySelector('#quote-random');
  const stage = section?.querySelector('.quote-stage');

  if (!section || !randomButton || typeof showQuote !== 'function' || !Array.isArray(quotes) || quotes.length < 2) return;

  randomButton.type = 'button';

  randomButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const offset = 1 + Math.floor(Math.random() * (quotes.length - 1));
    const nextIndex = (currentQuote + offset) % quotes.length;

    stage?.classList.remove('is-randomizing');
    void stage?.offsetWidth;
    showQuote(nextIndex);
    stage?.classList.add('is-randomizing');

    window.setTimeout(() => stage?.classList.remove('is-randomizing'), 360);
  }, true);

  const fixStyle = document.createElement('link');
  fixStyle.rel = 'stylesheet';
  fixStyle.href = 'quotes-fix.css?v=2';
  document.head.appendChild(fixStyle);
})();
