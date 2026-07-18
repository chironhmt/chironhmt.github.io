@echo off
cd /d "%~dp0"
chcp 65001 >nul
start "" "http://localhost:8000/WebApp/Mutple myeloma_Chemotherapy.html"
python -m http.server 8000
pause
