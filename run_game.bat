@echo off
setlocal

set PORT=8765
set URL=http://localhost:%PORT%

cd /d "%~dp0"

echo Starting City Heroes server at %URL%
echo Close this window to stop the server.
echo.

:: Launch browser after a short delay so the server is ready.
:: PowerShell sidesteps batch quoting issues with the URL.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%URL%'"

:: Try Python (most common)
where python >nul 2>&1
if %errorlevel% == 0 (
    python server.py %PORT%
    goto :done
)

:: Try py launcher
where py >nul 2>&1
if %errorlevel% == 0 (
    py server.py %PORT%
    goto :done
)

:: Fall back to Node.js
where node >nul 2>&1
if %errorlevel% == 0 (
    node -e "const h=require('http'),fs=require('fs'),p=require('path');const mime={html:'text/html',js:'application/javascript',css:'text/css',png:'image/png',jpg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',json:'application/json',ico:'image/x-icon'};h.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);if(u==='/')u='/index.html';const f=p.join(process.cwd(),u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end('Not found');}else{res.writeHead(200,{'Content-Type':mime[p.extname(f).slice(1).toLowerCase()]||'application/octet-stream'});res.end(d);}});}).listen(%PORT%,()=>console.log('Server running at %URL%'));"
    goto :done
)

echo ERROR: No runtime found. Install Python (python.org) or Node.js (nodejs.org).
pause
exit /b 1

:done
endlocal
