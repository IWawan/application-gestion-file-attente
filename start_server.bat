@echo off
start "" python app.py
timeout /t 4 >nul
start "" http://192.168.80.117:8080/
start "" http://192.168.80.117:8080/display
exit
