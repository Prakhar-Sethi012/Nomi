@echo off
echo 🔥 Starting VIT Command Center Servers...

:: Start the FastAPI Backend in a new minimized window
echo Booting Backend Database...
:: 🔥 THE FIX: We added 'call .\venv\Scripts\activate &&' right before uvicorn
start /min cmd /c "cd backend && call .\venv\Scripts\activate && uvicorn main:app --reload"

:: Wait 2 seconds to let the backend start up
timeout /t 2 /nobreak > NUL

:: Start the Vite Frontend in a new minimized window
echo Booting React Environment...
start /min cmd /c "cd frontend && npm run dev"

echo Servers are running in the background! You can now open your PWA.
:: Closes this temporary setup window automatically after 3 seconds
timeout /t 3 /nobreak > NUL
exit