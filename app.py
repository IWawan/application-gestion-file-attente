import sys
from flask import Flask, render_template, jsonify, request
from flask_session import Session
from flask_socketio import SocketIO
import socket
import os
import redis

# --- Configuration ---

app = Flask(__name__)
app.config.update(
    SESSION_TYPE='redis',
    SESSION_PERMANENT=False,
    SESSION_USE_SIGNER=True,
    SESSION_KEY_PREFIX='session:',
    SESSION_REDIS=redis.StrictRedis(host=os.getenv('REDIS_HOST', 'localhost'), port=int(os.getenv('REDIS_PORT', 6379)), db=0),
    UPLOAD_FOLDER=os.getenv('RESOURCES_FOLDER', 'resources'),
    ALLOWED_EXTENSIONS={'xlsx'},
)

RESOURCES_FOLDER = 'resources'
app.config['ALLOWED_EXTENSIONS'] = {'xlsx'}
app.config['UPLOAD_FOLDER'] = RESOURCES_FOLDER

Session(app)
socketio = SocketIO(app, manage_session=False)

# --- Helper Functions ---

def get_ip_address():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(0)
    try:
        s.connect(('10.254.254.254', 1))  # N'importe quelle adresse IP
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'  # Par défaut, l'adresse localhost
    finally:
        s.close()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# --- Global state ---

IP = get_ip_address()
PORT = 8080

usagers_list_1 = []
usagers_list_2 = []
displayed_usagers_1 = set()
displayed_usagers_2 = set()
selected_usagers_1 = set()
selected_usagers_2 = set()
current_usager = ""
current_bureau = ""

bureaux = {}
double_liste_mode = False
MARQUEE_MSG_DEFAULT = "Bienvenue dans notre espace d'accueil – Nous vous souhaitons une excellente journée !"

# --- Routes HTTP ---

@app.route('/')
def home():
    return render_template('home.html', ip=IP, port=PORT)

@app.route('/tableau-de-bord')
def index():
    return render_template('tableau_de_bord.html', ip=IP, port=PORT)

@app.route('/file-d-attente')
def display():
    return render_template('file_d_attente.html')

# Récupère le fichier xlsx et le sauvegarde dans le dossier "RESOURCES_FOLDER" sous "usagers_list_1.xlsx"
@app.route('/upload_xlsx_1', methods=['POST'])
def upload_xlsx_1():
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400

    if file and allowed_file(file.filename):
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], "usagers_list_1.xlsx")
        file.save(file_path)
        return jsonify({'message': 'Fichier chargé avec succès'}), 200
    else:
        return jsonify({'error': 'Format de fichier non autorisé'}), 400
    
# Récupère le fichier xlsx et le sauvegarde dans le dossier "RESOURCES_FOLDER" sous "usagers_list_2.xlsx"
@app.route('/upload_xlsx_2', methods=['POST'])
def upload_xlsx_2():
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400

    if file and allowed_file(file.filename):
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], "usagers_list_2.xlsx")
        file.save(file_path)
        return jsonify({'message': 'Fichier chargé avec succès'}), 200
    else:
        return jsonify({'error': 'Format de fichier non autorisé'}), 400
    
# Extrait les données du fichier vers la liste 1, et les envoie aux clients
@app.route('/load_usagers_list_1')
def load_usagers_list_1():
    from extract_xlsx import extract_xlsx

    global usagers_list_1

    file_path = RESOURCES_FOLDER + '/' + "usagers_list_1.xlsx"
    extractor = extract_xlsx(file_path)
    extracted = extractor.to_array()
    usagers_list_1.extend([usager for usager in extracted if usager not in usagers_list_1])

    _sync_usagers_list_1()

    return jsonify({"usagers": usagers_list_1})

# Extrait les données du fichier vers la liste 2, et les envoie aux clients
@app.route('/load_usagers_list_2')
def load_usagers_list_2():
    from extract_xlsx import extract_xlsx

    global usagers_list_2

    file_path = RESOURCES_FOLDER + '/' + "usagers_list_2.xlsx"
    extractor = extract_xlsx(file_path)
    extracted = extractor.to_array()
    usagers_list_2.extend([usager for usager in extracted if usager not in usagers_list_2])

    _sync_usagers_list_2()

    return jsonify({"usagers": usagers_list_2})

# --- Socket.IO Events ---

# Initialisation à la connexion
@socketio.on('connect')
def on_connect():
    _sync_all()

# Met à jour la liste des usagers 1
@socketio.on('update_usagers_list_1')
def on_update_usagers_list_1(data):
    global usagers_list_1
    usagers_list_1 = data.get('usagers', [])

    _sync_usagers_list_1()

# Met à jour la liste des usagers 2
@socketio.on('update_usagers_list_2')
def on_update_usagers_list_2(data):
    global usagers_list_2
    usagers_list_2 = data.get('usagers', [])

    _sync_usagers_list_2()

# Efface un usager de la liste 2
@socketio.on('remove_usager_1')
def on_remove_usager_1(data):
    usager = data.get('usager')
    if usager in usagers_list_1:
        usagers_list_1.remove(usager)

        _sync_usagers_list_1()

# Efface un usager de la liste 2
@socketio.on('remove_usager_2')
def on_remove_usager_2(data):
    usager = data.get('usager')
    if usager in usagers_list_2:
        usagers_list_2.remove(usager)

        _sync_usagers_list_2()

# Ajoute un usager à la liste 1
@socketio.on('add_usager_1')
def on_add_usager_1(data):
    usager = data.get('usager')
    if usager:
        usagers_list_1.insert(0, usager)

        _sync_usagers_list_1()

# Ajoute un usager à la liste 2
@socketio.on('add_usager_2')
def on_add_usager_2(data):
    usager = data.get('usager')
    if usager:
        usagers_list_2.insert(0, usager)

        _sync_usagers_list_2()

# Sélectionne un usager de la liste 1
@socketio.on('select_usager_1')
def on_select_usager_1(data):
    usager = data.get('usager')
    if usager:
        if usager in selected_usagers_1:
            selected_usagers_1.discard(usager)
            if usager in displayed_usagers_1:
                displayed_usagers_1.add(usager)
        else:
            selected_usagers_1.add(usager)

        _sync_usagers_states()
    
# Sélectionne un usager de la liste 2
@socketio.on('select_usager_2')
def on_select_usager_2(data):
    usager = data.get('usager')
    if usager:
        if usager in selected_usagers_2:
            selected_usagers_2.discard(usager)
            if usager in displayed_usagers_2:
                displayed_usagers_2.add(usager)
        else:
            selected_usagers_2.add(usager)

        _sync_usagers_states()

# Sélectionne un usager de la liste 1 et l'envoi à tous les écrans avec le bureau sélectionné
@socketio.on('display_usager_1')
def on_display_usager_1(data):
    global current_usager
    usager = data.get('usager')

    if usager :
        displayed_usagers_1.add(usager)
        selected_usagers_1.discard(usager)
        current_usager = usager

        _sync_current_bureau()
        _sync_usagers_states()
        _sync_display()

# Sélectionne un usager de la liste 2 et l'envoi à tous les écrans avec le bureau sélectionné
@socketio.on('display_usager_2')
def on_display_usager_2(data):
    global current_usager
    usager = data.get('usager')

    if usager :
        displayed_usagers_2.add(usager)
        selected_usagers_2.discard(usager)
        current_usager = usager

        _sync_current_bureau()
        _sync_usagers_states()
        _sync_display()

# Sélectionne un bureau
@socketio.on('select_bureau')
def on_select_bureau(data):
    global current_bureau
    current_bureau = data.get('bureau')

    _sync_current_bureau()

# Affiche un message sur le bandeau
@socketio.on('marquee_message')
def on_marquee_message(data):
    global marquee_msg
    msg = data.get('message')
    if msg:
        marquee_msg = msg
        save_marquee_msg()      
        _sync_marquee_msg()
        
# Efface la liste des usagers 1
@socketio.on('clear_usagers_1')
def on_clear_usagers_1():
    usagers_list_1.clear()
    selected_usagers_1.clear()
    displayed_usagers_1.clear()   

    _sync_usagers_states()

# Efface la liste des usagers 2
@socketio.on('clear_usagers_2')
def on_clear_usagers_2():
    usagers_list_2.clear()
    selected_usagers_2.clear()
    displayed_usagers_2.clear()   

    _sync_usagers_states()

# Efface l'affichage de l'usager
@socketio.on('clear_display')
def on_clear_display():
    global current_usager
    current_usager = ""  # Efface l'usager affiché

    _sync_display()

# Supprime un bureau
@socketio.on('remove_bureau')
def on_remove_bureau(data):
    global bureaux

    key_to_remove = data.get('key')
    if key_to_remove in bureaux:
        bureau_items = list(bureaux.items())
        index = list(bureaux.keys()).index(key_to_remove)
        bureau_items.pop(index)

        # Recréer bureaux avec des clés ordonnées
        bureaux = {f"bureau{i+1}": val for i, (_, val) in enumerate(bureau_items)}

        os.makedirs('data', exist_ok=True)
        with open("data/bureaux.txt", "w", encoding="utf-8") as f:
            for val in bureaux.values():
                f.write(f"{val['nom']}|{val['message']}\n")

        _sync_bureaux()

@socketio.on('save_bureaux')
def on_save_bureaux(data):
    global bureaux
    bureaux_data = data.get('bureaux', {})  # format : {"bureau1": {"nom": "...", "message": "..."}, ...}

    bureaux = {}
    for i, (key, val) in enumerate(bureaux_data.items()):
        bureaux[f"bureau{i+1}"] = {
            "nom": val.get("nom", f"Bureau {i+1}"),
            "message": val.get("message", "")
        }

    os.makedirs('data', exist_ok=True)
    with open("data/bureaux.txt", "w", encoding="utf-8") as f:
        for val in bureaux.values():
            f.write(f"{val['nom']}|{val['message']}\n")

    _sync_bureaux()

@socketio.on('set_double_liste_mode')
def on_set_double_liste_mode(data):
    global double_liste_mode
    double_liste_mode = data.get('enabled', False)
    save_double_liste_mode()      
    _sync_double_liste_mode_state()

# --- Persistance ---

# Charge les données des bureaux
def load_bureaux():
    global bureaux
    bureaux = {}

    try:
        with open("data/bureaux.txt", "r", encoding="utf-8") as file:
            lines = file.readlines()
            for i, line in enumerate(lines, start=1):
                parts = line.strip().split("|", 1)
                nom = parts[0]
                message = parts[1] if len(parts) > 1 else ""
                bureaux[f"bureau{i}"] = {"nom": nom, "message": message}

        socketio.emit('update_bureaux', bureaux)

    except FileNotFoundError:
        print("bureaux.txt introuvable, noms par défaut utilisés.")

# Sauvegarde l'état simple liste / double liste
def save_double_liste_mode():
    os.makedirs('data', exist_ok=True)
    with open('data/double_liste_mode_state.txt', 'w') as f:
        f.write('1' if double_liste_mode else '0')

# Charge l'état simple liste / double liste
def load_double_liste_mode():
    global double_liste_mode
    try:
        with open('data/double_liste_mode_state.txt', 'r') as f:
            double_liste_mode = f.read().strip() == '1'
    except FileNotFoundError:
        double_liste_mode = False

# Sauvegarde le message du bandeau
def save_marquee_msg():
    os.makedirs('data', exist_ok=True)
    with open('data/marquee_msg.txt', 'w') as f:
        f.write(marquee_msg)

# Charge le message du bandeau
def load_marquee_msg():
    global marquee_msg
    try:
        with open('data/marquee_msg.txt', 'r') as f:
            marquee_msg = f.read()
    except FileNotFoundError:
        marquee_msg = MARQUEE_MSG_DEFAULT

    if marquee_msg == "":
        marquee_msg = MARQUEE_MSG_DEFAULT

# --- Sync fonctions --

def _sync_double_liste_mode_state():
    socketio.emit('set_initial_double_liste', {'enabled': double_liste_mode})

def _sync_marquee_msg():
    socketio.emit('update_marquee', {'marquee_message': marquee_msg})

def _sync_usagers_list_1():
    socketio.emit('update_usagers_list_1', {'usagers': usagers_list_1})

def _sync_usagers_list_2():
    socketio.emit('update_usagers_list_2', {'usagers': usagers_list_2})

def _sync_usagers_states():
    socketio.emit('update_displayed_usagers_1', {'displayed_usagers': list(displayed_usagers_1)})
    socketio.emit('update_displayed_usagers_2', {'displayed_usagers': list(displayed_usagers_2)})
    socketio.emit('update_selected_usagers_1', {'selected_usagers': list(selected_usagers_1)})
    socketio.emit('update_selected_usagers_2', {'selected_usagers': list(selected_usagers_2)})
    _sync_usagers_list_1()
    _sync_usagers_list_2()

def _sync_bureaux():
    socketio.emit('update_bureaux', {'bureaux': bureaux})

def _sync_current_bureau():
    socketio.emit('update_current_bureau', {'current_bureau': current_bureau})

def _sync_display():
    msg = ""
    for bureau_key, bureau_data in bureaux.items():
        if bureau_data.get("nom") == current_bureau:
            if bureau_data.get("message", current_bureau):
                msg = bureau_data.get("message", current_bureau) # Message personalisé
            else:
                msg = "Est attendu au " + current_bureau # Message pas défaut
            break 

    socketio.emit('update_display',
    {
        'usager': current_usager,
        'msg': msg
    })

def _sync_all():
    _sync_usagers_list_1()
    _sync_usagers_list_2()
    _sync_usagers_states()
    _sync_bureaux()
    _sync_current_bureau()
    _sync_display()
    _sync_marquee_msg()
    _sync_double_liste_mode_state()

# --- Application Entry Point ---
if __name__ == '__main__':
    load_bureaux()
    load_double_liste_mode()
    load_marquee_msg()
    print(f"Serveur lancé sur http://{IP}:{8080}")   
    socketio.run(app, debug=False, host=IP, port=8080)
