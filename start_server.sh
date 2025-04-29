#!/bin/bash

# Dossier du script
cd "$(dirname "$0")"

# Récupère l'adresse IP locale
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Lance le serveur s'il ne tourne pas déjà
if pgrep -f "python3 app.py" > /dev/null;
then
  echo "Le serveur est déjà en cours d'exécution."
else
  echo "Lancement du serveur Flask..."
  python3 app.py &
  sleep 8 # Attendre que le serveur démarre
fi

# Ouvre l'url de la file d'attente dans le navigateur par défaut
xdg-open "http://$LOCAL_IP:8080/file-d-attente" 2>/dev/null || open "http://$LOCAL_IP:8080/file-d-attente"