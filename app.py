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
FILE_NAME = 'Agenda - RDV360.xlsx'
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

usagers_list = []
current_usager = ""
current_bureau = ""
displayed_usagers = set()
selected_usagers = set()
bureaux = {}

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

# Récupère le fichier xlsx "FILE_NAME" et le sauvegarde dans le dossier "RESOURCES_FOLDER"
@app.route('/upload_xlsx', methods=['POST'])
def upload_xlsx():
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400

    if file and allowed_file(file.filename):
        filename = FILE_NAME
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        return jsonify({'message': 'Fichier chargé avec succès'}), 200
    else:
        return jsonify({'error': 'Format de fichier non autorisé'}), 400
    
# Extrait les données du fichier, et les envoie aux clients
@app.route('/load_usagers')
def load_usagers():
    from extract_xlsx import extract_xlsx

    global usagers_list

    file_path = RESOURCES_FOLDER + '/' + FILE_NAME
    extractor = extract_xlsx(file_path)
    usagers_list = extractor.to_array()

    _sync_usagers_list()

    return jsonify({"usagers": usagers_list})

# --- Socket.IO Events ---

# Initialisation à la connexion
@socketio.on('connect')
def on_connect():
    _sync_all()

# Met à jour la liste des usagers
@socketio.on('update_usagers')
def on_update_usagers(data):
    global usagers_list
    usagers_list = data.get('usagers', [])

    _sync_usagers_list()

# Efface un usager de la liste
@socketio.on('remove_usager')
def on_remove_usager(data):
    usager = data.get('usager')
    if usager in usagers_list:
        usagers_list.remove(usager)

        _sync_usagers_list()

# Sélectionne un usager de la liste
@socketio.on('select_usager')
def on_select_usager(data):
    usager = data.get('usager')
    if usager:
        if usager in selected_usagers:
            selected_usagers.discard(usager)
            if usager in displayed_usagers:
                displayed_usagers.add(usager)
        else:
            selected_usagers.add(usager)

        _sync_usager_states()

# Sélectionne un usager et l'envoi à tous les écrans avec le bureau sélectionné
@socketio.on('display_usager')
def on_display_usager(data):
    global current_usager
    usager = data.get('usager')

    if usager :
        displayed_usagers.add(usager)
        selected_usagers.discard(usager)
        current_usager = usager

        _sync_current_bureau()
        _sync_usager_states()
        _sync_display()

# Sélectionne un bureau
@socketio.on('select_bureau')
def on_select_bureau(data):
    global current_bureau
    current_bureau = data.get('bureau')

    _sync_current_bureau()

# Affiche un message sur le bandeau
@socketio.on('bandeau_message')
def on_bandeau_message(data):
    msg = data.get('message')
    if msg:
        socketio.emit('update_bandeau', {'bandeau_message': msg})
        
# Efface la liste des usagers
@socketio.on('clear_usagers')
def on_clear_usagers():
    usagers_list.clear()
    selected_usagers.clear()
    displayed_usagers.clear()   

    _sync_usagers_list()

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
        noms = list(bureaux.values())
        index = list(bureaux.keys()).index(key_to_remove)
        noms.pop(index)

        # Recréer bureaux avec des clés ordonnées
        bureaux = {f"bureau{i+1}": nom for i, nom in enumerate(noms)}

        os.makedirs('data', exist_ok=True)
        with open("data/bureaux.txt", "w") as f:
            f.write("\n".join(bureaux.values()))

        _sync_bureaux()

@socketio.on('save_bureaux')
def on_save_bureaux(data):
    global bureaux

    noms = list(data.get('bureaux', {}).values())
    bureaux = {f"bureau{i+1}": nom for i, nom in enumerate(noms)}

    os.makedirs('data', exist_ok=True)
    with open("data/bureaux.txt", "w") as f:
        f.write("\n".join(bureaux.values()))

    _sync_bureaux()


@socketio.on('reset_all')
def on_reset_all():
    usagers_list = []
    current_usager = ""
    current_bureau = ""
    displayed_usagers = set()
    selected_usagers = set()

    _sync_all()

# --- Persistance des bureaux ---

def load_bureaux():
    global bureaux
    bureaux = {}

    try:
        with open("data/bureaux.txt", "r") as file:
            lines = file.readlines()
            for i, line in enumerate(lines, start=1):
                bureau_id = f"bureau{i}"
                bureaux[bureau_id] = line.strip()

        socketio.emit('update_bureaux', bureaux)

    except FileNotFoundError:
        print("bureaux.txt introuvable, noms par défaut utilisés.")

# --- Sync fonctions --
def _sync_usagers_list():
    socketio.emit('update_usagers', {'usagers': usagers_list})

def _sync_usager_states():
    socketio.emit('update_displayed_usagers', {'displayed_usagers': list(displayed_usagers)})
    socketio.emit('update_selected_usagers', {'selected_usagers': list(selected_usagers)})
    _sync_usagers_list()

def _sync_bureaux():
    socketio.emit('update_bureaux', {'bureaux': bureaux})

def _sync_current_bureau():
    socketio.emit('update_current_bureau', {'current_bureau': current_bureau})

def _sync_display():
    socketio.emit('update_display',
    {
        'usager': current_usager,
        'bureau': current_bureau
    })

def _sync_all():
    _sync_usagers_list()
    _sync_usager_states()
    _sync_bureaux()
    _sync_current_bureau()
    _sync_display()

# --- Application Entry Point ---

if __name__ == '__main__':
    load_bureaux()
    print(f"Serveur lancé sur http://{IP}:{PORT}")
    socketio.run(app, debug=True, host=IP, port=PORT)