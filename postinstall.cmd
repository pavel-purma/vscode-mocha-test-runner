@echo off
SETLOCAL EnableDelayedExpansion
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do     rem"') do (
  set "DEL=%%a"
)

call :colorEcho 0e "Installing node modules ..."
echo.

call npm install

pushd .vscode-test
for /f "delims=" %%D in ('dir /a:d /b') do (
    call :colorEcho 0e "Installing node modules for %%~nD ..."
    echo.
    pushd %%~fD
    call npm install
    popd
) 
popd

exit
:colorEcho
<nul set /p ".=%DEL%" > "%~2"
findstr /v /a:%1 /R "^$" "%~2" nul
del "%~2" > nul 2>&1i