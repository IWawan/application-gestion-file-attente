#!/bin/bash

# Récupère l'adresse IP locale (hors loopback et docker)
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Lance le serveur Flask en arrière-plan
python3 app.py &

# Attend 4 secondes
sleep 4

# Ouvre l'url de la file d'attente dans le navigateur par défaut
xdg-open "http://$LOCAL_IP:8080/file-d-attente" 2>/dev/null || open "http://$LOCAL_IP:8080/file-d-attente"