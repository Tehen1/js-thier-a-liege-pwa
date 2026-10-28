// CSR entry point for standalone PWA HTML
// Import essential modules

import { initTheme } from './theme.js';
import { initExport } from './export.js';

// Initialize all modules
initTheme(document.getElementById('themeBtn'));
initExport($('[data-export]'));
