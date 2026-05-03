#!/bin/bash
# ═══════════════════════════════════════════════
#  DRUMMER CHART BUILDER — MacBook Sync & Open
#  Doppelklick → git pull + App öffnen
# ═══════════════════════════════════════════════

cd ~/Documents/drummer-chart-builder 2>/dev/null || {
  echo ""
  echo "❌  Ordner nicht gefunden: ~/Documents/drummer-chart-builder"
  echo ""
  echo "    Einmalig einrichten:"
  echo "    git clone https://github.com/Bfluecki/drummer-chart-builder.git ~/Documents/drummer-chart-builder"
  echo ""
  read -p "Drücke Enter zum Schließen..."
  exit 1
}

echo ""
echo "🥁  DRUMMER CHART BUILDER — MacBook Sync"
echo "────────────────────────────────────────────"
echo ""
echo "📡  Hole neueste Version von GitHub..."
echo ""

# Git Pull
RESULT=$(git pull origin main 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  if echo "$RESULT" | grep -q "Already up to date"; then
    echo "✅  Bereits aktuell — keine Änderungen"
  else
    echo "✅  Aktualisiert!"
    echo ""
    echo "$RESULT" | grep -E "^\s+index\.html|files? changed|insertion|deletion" | head -5
  fi
else
  echo "⚠️  Git Pull Fehler:"
  echo "$RESULT"
  echo ""
  echo "    Tipp: GitHub-Token evtl. abgelaufen."
fi

echo ""
LAST=$(git log -1 --format="%cr · %s")
echo "🕐  Stand: $LAST"
echo ""

# GitHub Pages öffnen
echo "🌐  Öffne App im Browser..."
open "https://bfluecki.github.io/drummer-chart-builder/"

echo ""
echo "✨  Bereit. Dieses Fenster kann geschlossen werden."
echo ""
