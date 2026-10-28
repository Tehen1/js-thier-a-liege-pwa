// Classement top 3 par mode, enregistré sur l'appareil (localStorage)
const memory = {};

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return memory[key] || []; }
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
        <span class="pod-name">${e ? escape(e.name) : '—'}</span>
        <span class="pod-score">${e ? `${e.score}<small>&nbsp;${unit}</small>` : ''}</span>
      </li>`;
    }).join('');
    onRender?.(list);
  }

  // true si le score entre dans le top 3
  const qualifies = (score) => score > 0 && (top().length < 3 || score > top()[2].score);

  function add(name, score) {
    const list = top();
    const entry = { name: name.trim().slice(0, 12) || 'Anonyme', score, t: Date.now() };
    list.push(entry);
    list.sort((a, b) => b.score - a.score || a.t - b.t);
    const kept = list.slice(0, 3);
    save(key, kept);
    render(kept.indexOf(entry));
  }

  render();
  return { qualifies, add, render };
}

function escape(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": ''' }[c]));
}
