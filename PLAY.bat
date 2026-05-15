@echo off
setlocal
cd /d "%~dp0"

set PORT=8000
set URL=http://localhost:%PORT%/

echo.
echo  ===========================================
echo   City Heroes - launching local server...
echo  ===========================================
echo.
echo  Serving folder: %CD%
echo  URL:            %URL%
echo.
echo  Leave this window open while you play.
echo  Close it (or press Ctrl+C) to stop the server.
echo.

REM Open the browser ~2s after the server starts. Uses a hidden PowerShell
REM child so we avoid fragile nested-quote tricks with cmd /c "start "" url".
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%URL%'"

REM 1) Prefer Python 3 (python).
where python >nul 2>nul
if %ERRORLEVEL%==0 (
    python -m http.server %PORT%
    goto :done
)

REM 2) Fall back to the Python launcher (py).
where py >nul 2>nul
if %ERRORLEVEL%==0 (
    py -3 -m http.server %PORT%
    goto :done
)

REM 3) Final fallback: a tiny PowerShell HTTP server. No install required,
REM    but binding http://localhost may fail with "Access is denied" on some
REM    Windows accounts that lack a urlacl reservation. We catch that and
REM    print a friendly message instead of a raw .NET stack trace.
echo  Python not found - using built-in PowerShell server.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$root=(Get-Location).Path;" ^
  "$rootPrefix=$root.TrimEnd('\\') + '\\';" ^
  "$listener=New-Object System.Net.HttpListener;" ^
  "$listener.Prefixes.Add('http://localhost:%PORT%/');" ^
  "try { $listener.Start() } catch {" ^
  "  Write-Host '';" ^
  "  Write-Host '  ERROR: Could not start the built-in PowerShell server.' -ForegroundColor Red;" ^
  "  Write-Host ('  Reason: ' + $_.Exception.Message);" ^
  "  Write-Host '';" ^
  "  Write-Host '  This usually means the port is busy, or Windows requires a';" ^
  "  Write-Host '  one-time URL reservation for http://localhost:%PORT%/.';" ^
  "  Write-Host '';" ^
  "  Write-Host '  Easiest fix: install Python from https://python.org and rerun PLAY.bat.';" ^
  "  Write-Host '  (No need to be admin once Python is installed.)';" ^
  "  exit 1" ^
  "};" ^
  "Write-Host ('Serving ' + $root + ' on http://localhost:%PORT%/');" ^
  "$mime=@{'.html'='text/html';'.htm'='text/html';'.js'='application/javascript';'.mjs'='application/javascript';'.css'='text/css';'.json'='application/json';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.gif'='image/gif';'.svg'='image/svg+xml';'.ico'='image/x-icon';'.wav'='audio/wav';'.mp3'='audio/mpeg';'.ogg'='audio/ogg';'.woff'='font/woff';'.woff2'='font/woff2';'.ttf'='font/ttf';'.map'='application/json';'.txt'='text/plain';'.md'='text/markdown'};" ^
  "while($listener.IsListening){" ^
  "  try{" ^
  "    $ctx=$listener.GetContext();" ^
  "    $req=$ctx.Request; $res=$ctx.Response;" ^
  "    $rel=[System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/');" ^
  "    if([string]::IsNullOrEmpty($rel)){ $rel='index.html' }" ^
  "    $path=Join-Path $root $rel;" ^
  "    $full=[System.IO.Path]::GetFullPath($path);" ^
  "    if(-not ($full.StartsWith($rootPrefix,[StringComparison]::OrdinalIgnoreCase) -or $full -ieq $root)){ $res.StatusCode=403; $res.Close(); continue }" ^
  "    if((Test-Path $full) -and (Get-Item $full).PSIsContainer){ $full=Join-Path $full 'index.html' }" ^
  "    if(Test-Path $full -PathType Leaf){" ^
  "      $ext=[System.IO.Path]::GetExtension($full).ToLower();" ^
  "      $ct=$mime[$ext]; if(-not $ct){ $ct='application/octet-stream' }" ^
  "      $bytes=[System.IO.File]::ReadAllBytes($full);" ^
  "      $res.ContentType=$ct; $res.ContentLength64=$bytes.Length;" ^
  "      $res.OutputStream.Write($bytes,0,$bytes.Length);" ^
  "      Write-Host ('200 ' + $req.Url.AbsolutePath)" ^
  "    } else {" ^
  "      $res.StatusCode=404;" ^
  "      $msg=[System.Text.Encoding]::UTF8.GetBytes('404 Not Found: ' + $rel);" ^
  "      $res.OutputStream.Write($msg,0,$msg.Length);" ^
  "      Write-Host ('404 ' + $req.Url.AbsolutePath)" ^
  "    }" ^
  "    $res.Close()" ^
  "  } catch { Write-Host ('Error: ' + $_.Exception.Message) }" ^
  "}"
goto :done

:done
echo.
echo  Server stopped.
pause
endlocal
