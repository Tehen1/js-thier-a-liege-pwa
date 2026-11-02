'use client';

import { useEffect } from 'react';

// The existing canvas game engines initialize once against the server-rendered markup.
export function LegacyBootstrap() {
  useEffect(() => {
    if (document.querySelector('script[data-club-bootstrap]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/app.js';
    script.dataset.clubBootstrap = 'true';
    script.addEventListener('error', () => {
      console.error('The JS Thier game and PWA modules could not be loaded.');
      script.remove();
      const error = document.createElement('p');
      error.setAttribute('role', 'alert');
      error.textContent = 'Les fonctions interactives n’ont pas pu être chargées. Actualisez la page.';
      error.className = 'form-msg err';
      document.querySelector('#main')?.prepend(error);
    }, { once: true });
    document.body.appendChild(script);
    // Deliberately retain the script during React StrictMode remount in development.
    // A future phase should migrate these imperative modules to disposable React hooks.
  }, []);
  return null;
}
