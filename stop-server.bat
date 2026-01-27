@echo off
echo ==========================================
echo   Deteniendo servidor...
echo ==========================================
echo.
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Servidor detenido exitosamente.
) else (
    echo No se encontro ningun servidor en ejecucion.
)
echo.
pause
