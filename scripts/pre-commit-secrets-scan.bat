@echo off
REM Pre-commit hook for Windows: Prevent API keys from being committed
REM Run via: git config core.hooksPath scripts/hooks

echo Scanning for exposed secrets...

git diff --cached -U0 | findstr /R "AIzaSy[A-Za-z0-9_-]" >nul
if %errorlevel%==0 (
    echo BLOCKED: Potential Google API key found in staged files!
    echo Commit blocked. Remove secrets and use .env.local instead.
    exit /b 1
)

echo No secrets detected.
exit /b 0
