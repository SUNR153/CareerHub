# CareerHub

CareerHub — монорепозиторий карьерной платформы с React-клиентом, Django API и отдельным AI-сервисом.

## Структура

- `frontend/` — React + Vite;
- `backend/` — Django REST Framework;
- `ai/` — FastAPI-сервис генерации резюме;
- `scripts/` — общие команды разработки.

Подробное описание границ модулей: [ARCHITECTURE.md](ARCHITECTURE.md).

## Быстрый запуск

```powershell
npm.cmd --prefix frontend ci
pip install -r backend/requirements.txt
pip install -r ai/requirements.txt
Copy-Item .env.example .env
npm.cmd run dev:all
```

После запуска доступны:

- frontend: http://localhost:5173
- backend API: http://127.0.0.1:8000
- Swagger backend: http://127.0.0.1:8000/api/docs/
- AI health-check: http://127.0.0.1:8001/health
- Swagger AI: http://127.0.0.1:8001/docs

Отдельный запуск:

```powershell
npm.cmd --prefix frontend run dev
python backend/manage.py runserver
python -m uvicorn main:app --app-dir ai --port 8001
```

Если команда Python называется иначе, перед общим запуском задайте `CAREERHUB_PYTHON`.
