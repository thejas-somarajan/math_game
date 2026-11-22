#!/bin/zsh -l
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null; then
  echo 'Sky Numeracy needs Node.js. Install Node.js 22 or newer, then open this launcher again.'
  read '?Press Return to close.'
  exit 1
fi
if [ ! -f dist/index.html ]; then
  npm run build || { read '?Build failed. Press Return to close.'; exit 1; }
fi
node scripts/serve.mjs --open
