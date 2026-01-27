@echo off
echo ==========================================
echo   Generador de Contratos - Iniciando...
echo ==========================================
echo.
echo El servidor se iniciara en http://localhost:3000
echo Presione Ctrl+C para detener el servidor
echo.
start http://localhost:3000
npx -y serve .
