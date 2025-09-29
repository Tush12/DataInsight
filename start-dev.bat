@echo off
echo Starting Data Compare & Visualize Development Environment...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "npm run server:dev"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Development Server...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers are starting up...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:8080
echo.
echo Press any key to close this window...
pause > nul
