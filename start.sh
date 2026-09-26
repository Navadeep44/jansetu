#!/usr/bin/env bash
# One-command local start (macOS / Linux): backend on :8000, frontend on :5173
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/backend"
if [ ! -d .venv ]; then python3 -m venv .venv; fi
source .venv/bin/activate
pip install -q -r requirements.txt
[ -f .env ] || cp .env.example .env
uvicorn app.main:app --port 8000 &
BACK=$!
cd "$ROOT/frontend"
[ -d node_modules ] || npm install
trap "kill $BACK" EXIT
npm run dev
