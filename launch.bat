@echo off

echo ==========================================
echo   VIT Command Center - Starting Servers
echo ==========================================
echo.

echo [1/2] Starting FastAPI Backend...

start "VIT Backend" /min cmd /c "cd /d "%~dp0backend" && "%~dp0.venv\Scripts\python.exe" -m uvicorn main:app --reload"

timeout /t 3 /nobreak > NUL

echo [2/2] Starting React Frontend...

start "VIT Frontend" /min cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ==========================================
echo   Backend:  http://127.0.0.1:8000
echo   API Docs: http://127.0.0.1:8000/docs
echo ==========================================
echo.
echo Servers are starting in the background...
echo.

timeout /t 3 /nobreak > NUL
exit