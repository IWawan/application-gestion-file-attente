#!/bin/bash

# Dossier du script
cd "$(dirname "$0")"

# Lance le serveur
echo "Lancement du serveur..."
/usr/bin/python3 /home/pi/app_file/app.py &

# Attend que le serveur démarre
echo "Lancement du navigateur..."
sleep 10

# Récupère l'adresse IP locale
until LOCAL_IP=$(hostname -I | awk '{print $1}'); [ -n "$LOCAL_IP" ]; do
  sleep 1
done

# Ouvre l url de la file d attente dans le navigateur par défaut
/usr/bin/chromium-browser --noerrdialogs --kiosk --incognito "http://$LOCAL_IP:8080/file-d-attente" 2>/dev/null
