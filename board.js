// Classement top 3 par mode, enregistré sur l'appareil (localStorage)
const memory = {};

function clean(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e === 'object')
    .map((e) => ({
      name: String(e.name ?? '').slice(0, 12) || 'Anonyme',
      score: Math.max(0, Math.floor(Number(e.score) || 0)),
      t: Number(e.t) || 0,
    }))
    .slice(0, 3);
}

function load(key) {
  try { return clean(JSON.parse(localStorage.getItem(key))); }
  catch { return clean(memory[key]); }
}

function save(key, list) {
  memory[key] = list;
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

export function createBoard({ key, listEl, unit = 'pts', onRender }) {
  const top = () => load(key);

  function render(highlight = -1) {
    const list = top();
    const medals = ['or', 'argent', 'bronze'];
    listEl.innerHTML = [0, 1, 2].map(i => {
      const e = list[i];
      return `<li class="pod pod-${medals[i]}${i === highlight ? ' new' : ''}">
        <span class="pod-rank">${i + 1}</span>
        <span class="pod-name">${e ? escapeHTML(e.name) : '—'}</span>
        <span class="pod-score">${e ? `${e.score}<small>&nbsp;${escapeHTML(unit)}</small>` : ''}</span>
      </li>`;
    }).join('');
    onRender?.(list);
  }

  // true si le score entre dans le top 3
  const qualifies = (score) => score > 0 && (top().length < 3 || score > top()[2].score);

  function add(name, score) {
    const list = top();
    const safe = String(name).normalize('NFC').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 12);
    const entry = {
      name: safe || 'Anonyme',
      score: Math.max(0, Math.floor(Number(score) || 0)),
      t: Date.now(),
    };
    list.push(entry);
    list.sort((a, b) => b.score - a.score || a.t - b.t);
    const kept = list.slice(0, 3);
    save(key, kept);
    render(kept.indexOf(entry));
  }

  render();
  return { qualifies, add, render };
}

function escapeHTML(value) {
  const entities = new Map([
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ["'", '&#39;'],
  ]);
  return String(value).replace(/[&<>"']/g, (char) => entities.get(char));
}
