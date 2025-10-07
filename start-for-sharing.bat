@echo off
echo ==========================================
echo  Starting Backend and ngrok for Sharing
echo ==========================================
echo.

REM Check if ngrok is installed (local or in PATH)
if exist "ngrok.exe" (
    set NGROK_CMD=ngrok.exe
) else (
    where ngrok >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] ngrok is not installed or not in PATH
        echo.
        echo Please install ngrok:
        echo 1. Go to https://ngrok.com/download
        echo 2. Download and extract ngrok.exe
        echo 3. Place in this directory or add to PATH
        echo.
        pause
        exit /b 1
    )
    set NGROK_CMD=ngrok
)

echo [1/3] Checking backend...
if not exist "backend\server.js" (
    echo [ERROR] Backend not found at backend\server.js
    pause
    exit /b 1
)

echo [2/3] Starting backend server...
start "Field Service Backend" cmd /k "cd backend && npm start"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo [3/3] Starting ngrok tunnel...
echo.
echo ==========================================
echo  IMPORTANT: Copy the HTTPS URL below
echo ==========================================
echo.
start "ngrok Tunnel" cmd /k "%NGROK_CMD% http 3001"

echo.
echo ==========================================
echo  Both services are starting!
echo ==========================================
echo.
echo Two terminal windows should have opened:
echo 1. Backend Server (port 3001)
echo 2. ngrok Tunnel (exposes backend to internet)
echo.
echo NEXT STEPS:
echo 1. Look at the ngrok window
echo 2. Copy the HTTPS URL (e.g., https://abc123xyz.ngrok.io)
echo 3. Run: npm run build:share
echo 4. Paste the ngrok URL when prompted
echo 5. Build and share APKs!
echo.
echo KEEP BOTH WINDOWS OPEN while your friend uses the app!
echo.
echo Press any key to open the build script...
pause >nul

npm run build:share

