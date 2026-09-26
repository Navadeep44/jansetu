# Contributing

1. Fork, then create a branch.
2. Backend: `cd backend && pip install -r requirements.txt && pytest -q`
3. Frontend: `cd frontend && npm install && npm run build`
4. Adding a language: add keywords to `backend/app/services/ai/lexicon.py`, citizen messages to `backend/app/core/i18n.py`, and UI strings to `frontend/src/i18n/strings.js`.
5. Open a pull request describing the change and how it was tested.
