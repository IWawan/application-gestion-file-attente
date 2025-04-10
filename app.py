from flask import Flask, render_template, jsonify, request, session
from flask_session import Session
from flask_socketio import SocketIO, emit
from extract_xlsx import extract_xlsx
import os
import redis

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_KEY_PREFIX'] = 'session:'
app.config['SESSION_REDIS'] = redis.StrictRedis(host='localhost', port=6379, db=0)

Session(app)
socketio = SocketIO(app, manage_session=False)

IP = "255.255.255.255" # A modifier
PORT = 8080

# Liste des usagers stockée en mémoire
usagers_list = []
current_usager = ""
current_bureau = ""
displayed_usagers = set()
selected_usagers = set()

# Configuration du dossier de téléchargement
RESOURCES_FOLDER = 'resources'
FILE_NAME = 'Agenda - RDV360.xlsx'
app.config['ALLOWED_EXTENSIONS'] = {'xlsx'}
app.config['UPLOAD_FOLDER'] = RESOURCES_FOLDER

@app.route('/')
def index():
    return render_template('index.html')

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
    global usagers_list
    file_path = RESOURCES_FOLDER + '/' + FILE_NAME
    extractor = extract_xlsx(file_path)
    usagers_list = extractor.to_array()

    socketio.emit('update_usagers', {'usagers': usagers_list})
    return jsonify({"usagers": usagers_list})

@app.route('/display')
def display():
    return render_template('display.html')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Met à jour la liste des usagers
@socketio.on('update_usagers')
def handle_update_usagers(data):
    global usagers_list
    usagers_list = data.get('usagers', [])
    socketio.emit('update_usagers', {'usagers': usagers_list})

# Efface un usager de la liste
@socketio.on('remove_usager')
def handle_delete_usager(data):
    global usagers_list
    usager = data.get('usager')
    if usager in usagers_list:
        usagers_list.remove(usager)
        socketio.emit('update_usagers', {'usagers': usagers_list})

# Sélectionne un usager et un bureau et envoi à tous les écrans
@socketio.on('display_usager')
def handle_display_usager_with_bureau(data):
    global current_usager
    global current_bureau
    usager = data.get('usager')
    bureau = data.get('bureau')

    if usager and bureau:
        displayed_usagers.add(usager)
        selected_usagers.discard(usager)
        current_usager = usager
        current_bureau = bureau

        # Envoie la liste des usagers mis à jour
        socketio.emit('update_displayed_usagers', {'displayed_usagers': list(displayed_usagers)})
        socketio.emit('update_selected_usagers', {'selected_usagers': list(selected_usagers)})
        socketio.emit('update_display',
            {
                'usager': usager,
                'bureau': bureau
            })
        socketio.emit('update_usagers', {'usagers': usagers_list})

# Affiche un message sur le bandeau
@socketio.on('bandeau_message')
def handle_bandeau_message(data):
    bandeau_message = data.get('message')
    if bandeau_message:
        print(bandeau_message)
        socketio.emit('update_bandeau', {'bandeau_message': bandeau_message})
        
# Sélectionne un usager de la liste
@socketio.on('select_usager')
def handle_select_usager(data):
    usager = data.get('usager')
    if usager:
        if usager in selected_usagers:
            displayed_usagers.add(usager)
            selected_usagers.discard(usager)
        else:
            selected_usagers.add(usager)
            displayed_usagers.discard(usager)

        # Envoie la liste des usagers mis à jour
        socketio.emit('update_displayed_usagers', {'displayed_usagers': list(displayed_usagers)})
        socketio.emit('update_selected_usagers', {'selected_usagers': list(selected_usagers)})
        socketio.emit('update_usagers', {'usagers': usagers_list})
        
# Efface la liste des usagers
@socketio.on('clear_usagers')
def handle_clear_usagers():
    global usagers_list
    usagers_list = []  # Vide la liste
    socketio.emit('update_usagers', {'usagers': []})

# Efface l'affichage de l'usager
@socketio.on('clear_display')
def handle_clear_display():
    global current_usager
    global current_bureau
    current_usager = ""  # Efface l'usager affiché
    current_bureau = ""  # Efface le bureau affiché
    socketio.emit('update_display',
        {
            'usager': current_usager,
            'bureau': current_bureau
        })

# Envoie les usagers affichés
@socketio.on('get_displayed_usagers')
def handle_get_displayed_usagers():
    for usager in displayed_usagers:
        socketio.emit('update_displayed_usager', {'usager': usager})

# Envoie les usagers sélectionnés
@socketio.on('get_selected_usagers')
def handle_get_selected_usagers():
    for usager in selected_usagers:
        socketio.emit('update_selected_usager', {'usager': usager})

# Initialisation à la connexion
@socketio.on('connect')
def handle_on_connect():
    socketio.emit('update_usagers', {'usagers': usagers_list})
    socketio.emit('update_display',
        {
            'usager': current_usager,
            'bureau': current_bureau
        })
    socketio.emit('update_displayed_usagers', {'displayed_usagers': list(displayed_usagers)})
    socketio.emit('update_selected_usagers', {'selected_usagers': list(selected_usagers)})
    socketio.emit('update_usagers', {'usagers': usagers_list})
    

@socketio.on('reset_all')
def handle_reset_all():
    global usagers_list, current_usager, current_bureau, displayed_usagers, selected_usagers
    usagers_list = []
    current_usager = ""
    current_bureau = ""
    displayed_usagers = set()
    selected_usagers = set()

    socketio.emit('update_usagers', {'usagers': []})
    socketio.emit('update_display',
        {
            'usager': current_usager,
            'bureau': current_bureau
        })
    socketio.emit('update_displayed_usagers', {'displayed_usagers': list(displayed_usagers)})
    socketio.emit('update_selected_usagers', {'selected_usagers': list(selected_usagers)})

if __name__ == '__main__':
    socketio.run(app, debug=True, host=IP, port=PORT)
