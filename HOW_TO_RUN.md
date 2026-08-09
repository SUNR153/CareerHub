# Как запустить CareerHub локально

Проект состоит из Django API и React/Vite frontend. На Windows удобнее запустить оба сервиса одной командой.

## Быстрый запуск

Откройте PowerShell в папке `CareerHub` и выполните:

```powershell
npm.cmd run dev:all
```

После запуска откройте:

- сайт: http://localhost:5173
- API: http://127.0.0.1:8000
- документация API: http://127.0.0.1:8000/api/docs/

Остановить оба процесса можно сочетанием `Ctrl+C`.

Команда учитывает особенность пути Windows с кириллицей и запускает backend через системный Python, используя установленные пакеты из `myvenv`.

## Первый запуск

Если папка `node_modules` отсутствует:

```powershell
npm.cmd ci
```

Убедитесь, что существует файл `.env` и доступен указанный в нём PostgreSQL.

## Запуск по отдельности

Frontend:

```powershell
npm.cmd run dev
```

Backend:

```powershell
$env:PYTHONPATH = "$PWD\myvenv\Lib\site-packages"
py -3.13 manage.py migrate
py -3.13 manage.py runserver
```

Исполняемый файл `myvenv\Scripts\python.exe` в этом расположении использовать не нужно: стандартный launcher Python некорректно обрабатывает текущий путь пользователя с кириллицей.

## Проверка проекта

```powershell
$env:PYTHONPATH = "$PWD\myvenv\Lib\site-packages"
py -3.13 manage.py check
npm.cmd run build
```
