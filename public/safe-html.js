// Trusted Types : seul ce module a le droit d'écrire du HTML dans la page.
// La CSP (require-trusted-types-for 'script') bloque toute autre écriture via innerHTML,
// ce qui ferme la porte aux injections de code (XSS) venues d'un autre endroit.
// Règle : les gabarits passés ici sont construits par le site ; tout texte saisi par
// un visiteur (pseudo, formulaire) doit passer par escapeHTML avant.
const policy = (typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy)
  ? trustedTypes.createPolicy('jsthier', { createHTML: (s) => s })
  : null;

export function setHTML(el, html) {
  el.innerHTML = policy ? policy.createHTML(html) : html;
}

const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => MAP[c]);
