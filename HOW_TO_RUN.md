# Локальный запуск CareerHub

Все команды выполняются из корня репозитория.

## Установка

```powershell
npm.cmd --prefix frontend ci
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
pip install -r ai/requirements.txt
Copy-Item .env.example .env
```

Заполните `.env` и убедитесь, что PostgreSQL доступен.

## Запуск всех сервисов

```powershell
npm.cmd run dev:all
```

Команда запускает frontend на `5173`, Django на `8000` и AI-сервис на `8001`. Для остановки нажмите `Ctrl+C`.

Если Python доступен не как `python.exe`, задайте полный путь:

```powershell
$env:CAREERHUB_PYTHON = "C:\path\to\python.exe"
npm.cmd run dev:all
```

## Проверки

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run test:backend
npm.cmd run test:ai
```
