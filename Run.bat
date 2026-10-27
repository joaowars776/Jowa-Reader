@echo off
title Novel Reader
color 0a
echo ========================================================
echo   Novel Reader - Portable & Offline
echo ========================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH!
    echo Please install Node.js from https://nodejs.org/ and run this script again.
    echo.
    pause
    exit /b 1
)

:: Automatically install dependencies if node_modules does not exist
if not exist "node_modules\" (
    echo [INFO] Dependencies not found. Installing for the first time...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies. Please check your internet connection.
        pause
        exit /b 1
    )
    echo.
    echo [INFO] Installation completed successfully!
    echo.
)

echo Starting server...
echo Access locally at: http://localhost:5173/
echo.

call npm run dev
pause
