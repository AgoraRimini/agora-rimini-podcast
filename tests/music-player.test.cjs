const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element extends EventTarget {
  constructor() {
    super();
    this.attributes = new Map();
    this.dataset = {};
    this.classList = { toggle() {} };
    this.style = { setProperty() {} };
    this.paused = true;
    this.duration = NaN;
    this.currentTime = 0;
  }
  set src(value) { this.setAttribute('src', value); }
  get src() { return this.attributes.get('src') || ''; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll() { return []; }
  append() {}
  replaceChildren() {}
  load() { this.currentTime = 0; }
  async play() {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
}

async function setup() {
  const nodes = new Map();
  const document = new EventTarget();
  document.visibilityState = 'visible';
  document.getElementById = (id) => {
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  };
  document.createElement = () => new Element();
  document.querySelectorAll = () => [document.getElementById('music-direct-audio')];
  const tracks = ['first', 'second'].map((id) => ({
    id, title: id, artist: 'Agorà', description: 'Test',
    image: 'https://example.com/' + id + '.webp',
    audio: 'https://example.com/' + id + '.mp3',
  }));
  vm.runInNewContext(fs.readFileSync('music-player.js', 'utf8'), {
    document,
    window: { AgoraMusic: { list: async () => tracks } },
    location: { search: '' },
    navigator: {},
    URLSearchParams,
    Event,
    setInterval() {},
  });
  await new Promise(setImmediate);
  return { document, get: (id) => document.getElementById(id), tracks };
}

test('catalogue selection leaves audio unset until the user presses Play', async () => {
  const { get, tracks } = await setup();
  const audio = get('music-direct-audio');
  assert.equal(get('music-current-title').textContent, tracks[0].title);
  assert.equal(audio.hasAttribute('src'), false);
  get('music-toggle').onclick();
  await new Promise(setImmediate);
  assert.equal(audio.src, tracks[0].audio);
  assert.equal(audio.paused, false);
  get('music-toggle').onclick();
  assert.equal(audio.paused, true);
});

test('end of track selects and plays the next song, and episode playback pauses it', async () => {
  const { document, get, tracks } = await setup();
  const audio = get('music-direct-audio');
  get('music-toggle').onclick();
  await new Promise(setImmediate);
  audio.dispatchEvent(new Event('ended'));
  await new Promise(setImmediate);
  assert.equal(audio.src, tracks[1].audio);
  assert.equal(get('music-current-title').textContent, tracks[1].title);
  assert.equal(audio.paused, false);
  document.dispatchEvent(new Event('agora:episode-play'));
  assert.equal(audio.paused, true);
});
