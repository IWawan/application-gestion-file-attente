from flask import Flask, render_template, request, jsonify
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
Session(app)
socketio = SocketIO(app, manage_session=False)

# --- Helper Functions ---
def get_ip_address() -> str:
    """Détermine l'adresse IP locale de la machine."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(0)
    try:
        s.connect(('10.254.254.254', 1))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# --- Global State ---
IP = get_ip_address()
PORT = int(os.getenv('PORT', 8080))

usagers_list = []
current_usager = ''
current_bureau = ''
displayed_usagers = set()
selected_usagers = set()
bureau_names = { 'bureau1': 'Bureau 1', 'bureau2': 'Bureau 2', 'bureau3': 'Bureau 3' }

# --- Routes HTTP ---
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload_xlsx', methods=['POST'])
def upload_xlsx():
    file = request.files.get('file')
    if not file or file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400

    if allowed_file(file.filename):
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], 'Agenda - RDV360.xlsx')
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file.save(save_path)
        return jsonify({'message': 'Fichier chargé avec succès'}), 200
    return jsonify({'error': 'Format de fichier non autorisé'}), 400


@app.route('/load_usagers')
def load_usagers():
    from extract_xlsx import extract_xlsx
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], 'Agenda - RDV360.xlsx')
    extractor = extract_xlsx(file_path)
    global usagers_list
    usagers_list = extractor.to_array()
    socketio.emit('update_usagers', {'usagers': usagers_list})
    return jsonify({'usagers': usagers_list})


@app.route('/display')
def display():
    return render_template('display.html')

# --- Socket.IO Events ---
@socketio.on('connect')
def on_connect():
    load_saved_bureaux()
    _sync_all()


@socketio.on('update_usagers')
def on_update_usagers(data):
    global usagers_list
    usagers_list = data.get('usagers', [])
    socketio.emit('update_usagers', {'usagers': usagers_list})


@socketio.on('remove_usager')
def on_remove_usager(data):
    usager = data.get('usager')
    if usager in usagers_list:
        usagers_list.remove(usager)
    socketio.emit('update_usagers', {'usagers': usagers_list})


@socketio.on('select_usager')
def on_select_usager(data):
    usager = data.get('usager')
    if usager:
        if usager in selected_usagers:
            displayed_usagers.add(usager)
            selected_usagers.discard(usager)
        else:
            selected_usagers.add(usager)
            displayed_usagers.discard(usager)
        _sync_usager_states()


@socketio.on('display_usager')
def on_display_usager(data):
    global current_usager
    usager = data.get('usager')
    if usager:
        displayed_usagers.add(usager)
        selected_usagers.discard(usager)
        current_usager = usager
        socketio.emit('update_display', {'usager': usager, 'bureau': current_bureau})
        _sync_usager_states()


@socketio.on('select_bureau')
def on_select_bureau(data):
    global current_bureau
    current_bureau = data.get('bureau', '')
    socketio.emit('update_current_bureau', {'current_bureau': current_bureau})


@socketio.on('bandeau_message')
def on_bandeau_message(data):
    msg = data.get('message', '')
    if msg:
        socketio.emit('update_bandeau', {'bandeau_message': msg})


@socketio.on('clear_usagers')
def on_clear_usagers():
    usagers_list.clear()
    _sync_usagers_list()


@socketio.on('clear_display')
def on_clear_display():
    global current_usager, current_bureau
    current_usager = ''
    current_bureau = ''
    _sync_display()


@socketio.on('reset_all')
def on_reset_all():
    usagers_list.clear()
    displayed_usagers.clear()
    selected_usagers.clear()
    global current_usager, current_bureau
    current_usager = current_bureau = ''
    _sync_all()


@socketio.on('save_bureau_names')
def on_save_bureau_names(data):
    for key in ('bureau1', 'bureau2', 'bureau3'):
        bureau_names[key] = data.get(key, bureau_names[key])
    os.makedirs('data', exist_ok=True)
    with open('data/bureaux.txt', 'w') as f:
        f.write('\n'.join(bureau_names.values()))
    socketio.emit('update_bureau_names', bureau_names)

# --- Internal Sync Helpers ---
def _sync_usagers_list():
    socketio.emit('update_usagers', {'usagers': usagers_list})

def _sync_usager_states():
    socketio.emit('update_displayed_usagers', {'displayed_usagers': list(displayed_usagers)})
    socketio.emit('update_selected_usagers', {'selected_usagers': list(selected_usagers)})
    _sync_usagers_list()

def _sync_display():
    socketio.emit('update_display', {'usager': current_usager, 'bureau': current_bureau})
def _sync_all():
    _sync_usagers_list()
    _sync_usager_states()
    socketio.emit('update_current_bureau', {'current_bureau': current_bureau})
    _sync_display()

# --- Bureau Names Persistence ---
def load_saved_bureaux():
    try:
        with open('data/bureaux.txt') as f:
            names = [line.strip() for line in f.readlines()]
            for idx, key in enumerate(bureau_names.keys()):
                bureau_names[key] = names[idx]
            socketio.emit('update_bureau_names', bureau_names)
    except FileNotFoundError:
        pass

# --- Application Entry Point ---
if __name__ == '__main__':
    load_saved_bureaux()
    print(f"Serveur lancé sur http://{IP}:{PORT}")
    socketio.run(app, debug=True, host=IP, port=PORT)