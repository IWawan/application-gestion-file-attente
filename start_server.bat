@echo off
start "" python app.py
timeout /t 4 >nul
start "" http://255.255.255.255:8080/
start "" http://255.255.255.255:8080/display
exit
