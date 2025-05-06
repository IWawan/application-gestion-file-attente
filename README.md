# application-gestion-file-attente
Application de gestion de file d'attente permettant d'assigner les usagers à des bureaux de manière dynamique.

# Installer les dépendances
Pour installer les dépendances, exécuter la commande suivante dans la racine de l'application :
```bash
pip install --break-system-packages -r requirements.txt
```

# Utiliser le raccourci de démarrage du serveur sur le Raspberry Pi
- Renommer le dossier de l'application en "app_file".
- Le déplacer dans "/home/pi/".
- Déplacer le fichier "start_server.desktop" a l'endroit voulu, et démarrer le serveur en cliquant dessus.

# Démarrer le serveur au boot du Raspberry Pi sur LXDE-pi-labwc
- Renommer le dossier de l'application en "app_file".
- Le déplacer dans "/home/pi/".
- Créer le répertoire "labxc" dans "/home/pi".
- Déplacer le fichier "autostart" dans "/home/pi/labwc.