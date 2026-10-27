@echo off
title LibreTranslate Launcher
echo ===================================================
echo   LibreTranslate Custom Launcher
echo ===================================================
echo.

:: Check if libretranslate command exists
where libretranslate >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] LibreTranslate is not installed or not in your PATH.
    echo Please run Install.bat first to install it.
    echo.
    pause
    exit /b 1
)

:: Use arguments passed or default ones
set LOAD_ONLY=en,pt
set THREADS=2

if "%~1" neq "" set LOAD_ONLY=%~1
if "%~2" neq "" (
    set THREADS=%~2
    goto skip_input
)

:: Prompt user for threads count
echo Leave blank and press Enter to use the default value (2).
set /p USER_THREADS="Enter the number of threads: "
if "%USER_THREADS%" neq "" set THREADS=%USER_THREADS%

:skip_input
echo.
echo [INFO] Starting LibreTranslate with parameters:
echo        --load-only: %LOAD_ONLY%
echo        --threads: %THREADS%
echo        Port: 5000
echo.

libretranslate --port 5000 --load-only %LOAD_ONLY% --threads %THREADS%

pause
