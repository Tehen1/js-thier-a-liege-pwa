import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function setupGames(');
const end = source.indexOf('/* ---------- Démarrage ---------- */', start);
assert.ok(start >= 0 && end > start, 'Game setup function must exist');
const setupSource = source.slice(start, end);

function fixture(code = setupSource) {
  const elements = new Map();
  function element(id) {
    return {
      id, dataset: {}, attributes: {}, hidden: false, value: '', listeners: {},
      addEventListener(type, handler) { this.listeners[type] = handler; },
      setAttribute(name, value) { this.attributes[name] = value; },
      querySelector() { return null; },
      focus() { this.focused = true; },
    };
  }
  const get = (id) => {
    if (id.includes('[')) return null;
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id);
  };
  const tabs = ['runner', 'penalty'].map((mode) => {
    const tab = element(mode); tab.dataset.mode = mode; return tab;
  });
  const panes = ['runner', 'penalty'].map((mode) => {
    const pane = element(mode); pane.dataset.pane = mode; return pane;
  });
  const skips = ['r', 'p'].map((skip) => {
    const button = element(skip); button.dataset.skip = skip; return button;
  });
  let pauses = 0;
  const setup = runInNewContext(`${code}; setupGames`, {
    $: get,
    $$: (selector) => ({ 'button[data-skip]': skips, '.gtab': tabs, '.game-pane': panes })[selector] || [],
    localStorage: { getItem: () => null, setItem() {} },
    setHTML: (node, html) => { node.innerHTML = html; },
    requestAnimationFrame: (callback) => callback(),
  });
  setup(
    { LEVELS: { normal: { label: 'Normal' } }, createGame: () => ({ level: 'normal', setLevel() {} }) },
    { createRunner: () => ({ pause() { pauses++; } }) },
    { createBoard: () => ({ qualifies: () => false, add() {}, render() {} }) },
  );
  return { get, tabs, panes, skips, pauseCount: () => pauses };
}

test('game setup installs penalty tabs and pauses Runner when switching games', () => {
  const f = fixture();
  assert.equal(f.panes[0].hidden, false);
  assert.equal(f.panes[1].hidden, true);
  f.tabs[1].listeners.click();
  assert.equal(f.panes[0].hidden, true);
  assert.equal(f.panes[1].hidden, false);
  assert.equal(f.tabs[1].attributes['aria-selected'], 'true');
  assert.equal(f.pauseCount(), 1);
  f.tabs[0].listeners.click();
  assert.equal(f.panes[0].hidden, false);
  assert.equal(f.panes[1].hidden, true);
});

test('both skip buttons restore replay controls', () => {
  const f = fixture();
  for (const [index, formId, buttonId] of [[0, 'rForm', 'rStart'], [1, 'pForm', 'startBtn']]) {
    f.get(formId).hidden = false;
    f.get(buttonId).hidden = true;
    f.get('pLevel').hidden = true;
    f.skips[index].listeners.click();
    assert.equal(f.get(formId).hidden, true);
    assert.equal(f.get(buttonId).hidden, false);
  }
  assert.equal(f.get('pLevel').hidden, false);
});

test('regression fixture reproduces the previous invalid ID selector failure', () => {
  const previous = setupSource.replace("$$('button[data-skip]')", "$('button[data-skip]')");
  assert.notEqual(previous, setupSource);
  assert.throws(() => fixture(previous), /forEach/);
});
