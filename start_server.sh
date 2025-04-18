#!/bin/bash

# Récupère l'adresse IP locale (hors loopback et docker)
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Lance le serveur Flask en arrière-plan
python3 app.py &

# Attend 4 secondes
sleep 4

# Ouvre les URLs dans le navigateur par défaut
xdg-open "http://$LOCAL_IP:8080/" 2>/dev/null || open "http://$LOCAL_IP:8080/"
xdg-open "http://$LOCAL_IP:8080/display" 2>/dev/null || open "http://$LOCAL_IP:8080/display"