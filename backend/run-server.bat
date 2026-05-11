@echo off
REM Usa el venv del proyecto (evita ModuleNotFoundError: jwt si uvicorn corre con Python global).
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Cree el venv: python -m venv .venv
  echo Luego: .venv\Scripts\pip install -r requirements.txt
  exit /b 1
)
".venv\Scripts\python.exe" -m pip install -r requirements.txt -q
".venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 7000
