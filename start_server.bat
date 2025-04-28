@echo off
REM Récupère l'adresse IP locale avec PowerShell
for /f "tokens=* USEBACKQ" %%f in (`powershell -command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike 'Loopback*' -and $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' }).IPAddress"`) do set LOCAL_IP=%%f

REM Démarre le serveur Flask
start "" python app.py
timeout /t 4 >nul

REM Ouvre les navigateurs avec l'IP locale récupérée
start "" http://%LOCAL_IP%:8080/tableau-de-bord
start "" http://%LOCAL_IP%:8080/file-d-attente

exit
