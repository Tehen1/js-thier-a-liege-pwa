// Dessine les icônes PNG de l'application à partir des SVG du site, puis les télécharge.
const OUT = [
  { name: 'icon-192.png', size: 192, src: '../images/crest.svg', pad: 0.06, bg: null },
  { name: 'icon-512.png', size: 512, src: '../images/crest.svg', pad: 0.06, bg: null },
  { name: 'maskable-512.png', size: 512, src: '../icons/maskable.svg', pad: 0, bg: null },
  // iOS n'accepte pas la transparence : fond plein aux couleurs du club
  { name: 'apple-touch-icon.png', size: 180, src: '../images/crest.svg', pad: 0.12, bg: '#1a2a5e' },
];

const loadImg = (src) => new Promise((ok, ko) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => ko(new Error(src));
  img.src = src;
});

async function render({ size, src, pad, bg }) {
  const img = await loadImg(src);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
  const box = size * (1 - pad * 2);
  const ratio = (img.naturalWidth || 300) / (img.naturalHeight || 350);
  const h = ratio < 1 ? box : box / ratio;
  const w = h * ratio;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return c;
}

const toBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'));

document.getElementById('gen').addEventListener('click', async () => {
  const preview = document.getElementById('preview');
  preview.replaceChildren();
  for (const o of OUT) {
    try {
      const canvas = await render(o);
      const blob = await toBlob(canvas);
      const url = URL.createObjectURL(blob);
      const fig = document.createElement('figure');
      const im = new Image(); im.src = url; im.alt = o.name; im.width = 96; im.height = 96;
      const cap = document.createElement('figcaption'); cap.textContent = `${o.name} · ${o.size} px`;
      fig.append(im, cap); preview.append(fig);
      const a = Object.assign(document.createElement('a'), { href: url, download: o.name });
      document.body.append(a); a.click(); a.remove();
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      const p = document.createElement('p'); p.textContent = `Échec : ${o.name}`; preview.append(p);
      console.error(err);
    }
  }
});
