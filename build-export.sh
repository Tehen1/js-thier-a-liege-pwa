#!/bin/bash
# Régénère src-bundle.js : copie texte de la page, du CSS, des modules et du blason SVG.
# L'aperçu (chrome-untrusted://) n'autorise pas fetch(), donc l'export lit ses sources ici.
# À relancer après chaque modification du site :  bash build-export.sh
cd "$(dirname "$0")"
FILES="index.html style.css app.js theme.js game.js runner.js board.js export.js images/crest.svg build-export.sh"
{
  echo "// Fichier généré par build-export.sh, ne pas modifier à la main."
  echo "export const SRC = {"
  for f in $FILES; do
    printf "  '%s': \`" "$f"
    sed -e 's/\\/\\\\/g' -e 's/`/\\`/g' -e 's/\${/\\${/g' "$f"
    printf "\`,\n"
  done
  echo "};"
} > src-bundle.js
