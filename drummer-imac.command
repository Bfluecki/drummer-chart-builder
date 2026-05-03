#!/bin/bash
# ═══════════════════════════════════════════════
#  DRUMMER CHART BUILDER — iMac Sync & Open
#  Doppelklick → Terminal öffnet, Status zeigen
# ═══════════════════════════════════════════════

cd ~/Documents/drummer-chart-builder

echo ""
echo "🥁  DRUMMER CHART BUILDER — iMac"
echo "────────────────────────────────────"

# Git Status prüfen
STATUS=$(git status --short)
BRANCH=$(git branch --show-current)
LAST=$(git log -1 --format="%cr · %s")

echo "📁  Branch : $BRANCH"
echo "🕐  Letzter Commit: $LAST"
echo ""

if [ -n "$STATUS" ]; then
  echo "⚠️  Lokale Änderungen (noch nicht gepusht):"
  echo "$STATUS"
else
  echo "✅  Alles synchronisiert mit GitHub"
fi

echo ""

# GitHub Pages öffnen
echo "🌐  Öffne App im Browser..."
open "https://bfluecki.github.io/drummer-chart-builder/"

echo ""
echo "✨  Bereit. Dieses Fenster kann geschlossen werden."
echo ""
