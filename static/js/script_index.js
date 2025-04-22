var socket = io.connect('http://' + window.location.hostname + ':' + window.location.port);

var displayed_usagers = new Set()
var selected_usagers = new Set()
var current_usager = "";
var current_bureau;
var bureaux;

// -- FONCTIONS --

// Fonction pour séléctionner un fichier .xlsx à charger
function selectXLSX(event)
{
    var file = event.target.files[0];  // Récupère le fichier sélectionné

    if (file)
    {
        var formData = new FormData();
        formData.append("file", file);  // Ajoute le fichier à FormData

        // Envoie le fichier au serveur via une requête POST
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function()
        {
            if (xhr.readyState === 4 && xhr.status === 200)
            {
                alert("Fichier importé !");
            }
            else if (xhr.readyState === 4)
            {
                alert("Erreur lors de l'importation du fichier !");
                console.log(xhr.responseText);
            }
        };

        xhr.open('POST', '/upload_xlsx', true);
        xhr.send(formData);
    }
}

// Fonction pour charger la liste des usagers
function chargerListeUsagers()
{   
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === 4 && xhr.status === 200)
        {
            var response = JSON.parse(xhr.responseText);

            // Envoie la liste à tous les clients connectés
            socket.emit('update_usagers', { usagers: response.usagers });
        }
    };
    xhr.open('GET', '/load_usagers', true);
    xhr.send();
}

// Fonction pour mettre à jour la liste des usagers
function mettreAJourListe(usagers)
{
    var usagersListContainer = document.getElementById('usagers-list-container');
    usagersListContainer.innerHTML = ""; // Efface les anciens boutons

    usagers.forEach(function(usager, index)
    {
        var usagerContainer = document.createElement('div');
        usagerContainer.classList.add('usager-container');

        // Boutons principal des usagers
        var usagerBtn = document.createElement('button');
        usagerBtn.classList.add('usager-btn');
        usagerBtn.id = 'usager-btn-' + index;
        usagerBtn.textContent = usager;

        // Couleur en fonction des états
        if (selected_usagers.has(usager))
        {
            usagerBtn.classList.add('selected');
        }
        else if (displayed_usagers.has(usager))
        {
            usagerBtn.classList.add('displayed');
        }
        else
        {
            usagerBtn.classList.add('default');
        }

        usagerBtn.onclick = function() { envoyerUsager(usager); };

        // Boutons selectionner un usager
        var usagerSelectBtn = document.createElement('button');
        usagerSelectBtn.classList.add('usager-select-btn');
        usagerSelectBtn.id = 'usager-select-btn-' + index;

        if (selected_usagers.has(usager))
        {
            usagerSelectBtn.classList.add('prêt');
            usagerSelectBtn.innerHTML = 'EN ATTENTE';
        }
        else
        {
            usagerSelectBtn.classList.remove('prêt');
            usagerSelectBtn.innerHTML = '&#10003;';
        }
        
        usagerSelectBtn.onclick = function()
        {
            socket.emit('select_usager', { usager: usager });
        };

        // Boutons effacer un usager
        var usagerDeleteBtn = document.createElement('button');
        usagerDeleteBtn.classList.add('clear-btn');
        usagerDeleteBtn.id = 'usager-delete-btn-' + index;
        usagerDeleteBtn.innerHTML = '&times;';
        usagerDeleteBtn.onclick = function()
        {
            socket.emit('remove_usager', { usager: usager });
        };

        usagerContainer.appendChild(usagerBtn);
        usagerContainer.appendChild(usagerSelectBtn);
        usagerContainer.appendChild(usagerDeleteBtn);
        usagersListContainer.appendChild(usagerContainer);
    });
}

// Fonction pour envoyer un usager, si un bureau est sélectionné
function envoyerUsager(usager)
{
    if (current_bureau)
    {
        socket.emit('display_usager', { usager: usager });
    }
    else
    {
        alert("Veuillez sélectionner un bureau avant d'afficher un usager !");
    }
}

// Fonction pour afficher un usager sur l'interface
function mettreAJourAffichage(usager, bureau)
{
    var usagerDisplay = document.getElementById('usager-display');

    usagerDisplay.textContent = usager.substring(usager.indexOf("|") + 1).toUpperCase();

    // Affiche le bouton "clear-btn" si un usager est affiché
    if (usager != "") { document.getElementById('display-section').style.display = 'flex'; }
}

// Fonction pour effacer la liste des usagers
function effacerListeUsagers(usager) { socket.emit('clear_usagers'); }

// Fonction pour effacer l'affichage
function effacerAffichage()
{
    socket.emit('clear_display');
    // Cache la "display_section"
    document.getElementById('display-section').style.display = 'none';
}

// Ouvrir/Fermer l'onglet menu
function ouvrirOngletMenu()
{
    var ongletMenu = document.getElementById("onglet-menu");
    ongletMenu.style.display = ongletMenu.style.display === "block" ? "none" : "block";
    fermerPopupBandeau();
    fermerPopupBureaux();
}

function fermerOngletMenu()
{
    var ongletMenu = document.getElementById("onglet-menu");
    ongletMenu.style.display = ongletMenu.style.display === "none" ? "block" : "none";
}

// Modifications bandeau
function ouvrirPopupBandeau()
{
    document.getElementById("popup-bandeau").style.display = "flex";
    fermerOngletMenu();
}

function fermerPopupBandeau() { document.getElementById("popup-bandeau").style.display = "none"; }

function envoyerMessageBandeau()
{
    var message = document.getElementById("bandeau-input").value;
    if (message.trim() !== "") { socket.emit("bandeau_message", { message: message }); }
} 

// Modifications bureaux
function ouvrirPopupBureaux() {
    document.getElementById("popup-bureaux").style.display = "flex";
    fermerOngletMenu();
}

function fermerPopupBureaux() { document.getElementById("popup-bureaux").style.display = "none"; }

// Fonction pour séléctionner un bureau
function selectionnerBureau(bureauBtn)
{
    const bureau = bureauBtn.innerText.trim();
    
    socket.emit('select_bureau', { bureau: bureau });
}

function ajouterBureau()
{
    let nbBureaux = Object.keys(bureaux).length;
    let newKey = "bureau" + (nbBureaux + 1);

    bureaux[newKey] = "Bureau " + (nbBureaux + 1);

    socket.emit('save_bureaux', { bureaux: bureaux });
    updateBureaux();
}

function supprimerBureau(key)
{
    let nbBureaux = Object.keys(bureaux).length;

    if (nbBureaux > 1)
    {
        delete bureaux[key];
        socket.emit('save_bureaux', { bureaux: bureaux });
        updateBureaux();
    }
}

// Fonction pour modifier les bureaux 
function sauvegarderModifsBureaux()
{
    var bureau1 = document.getElementById("bureau1").value.trim();
    var bureau2 = document.getElementById("bureau2").value.trim();
    var bureau3 = document.getElementById("bureau3").value.trim();

    if (bureau1 && bureau2 && bureau3)
    {
        // Envoie les nouveaux noms au serveur via Socket.IO
        socket.emit('save_bureaux', { bureau1, bureau2, bureau3 });

        // Fermer le menu après la sauvegarde
        fermerPopupBureaux();
    }
    else
    {
        alert("Veuillez remplir tous les champs !");
    }
}

function updateBureaux()
{
    const bureauxBtnContainer = document.getElementById("bureaux-btn-container");
    bureauxBtnContainer.textContent = "";

    const bureauxModifContainer = document.getElementById("bureaux-modif-container");
    bureauxModifContainer.textContent = "";
    
    let i = 0;
    
    for (let key in bureaux)
    {
        const nom = bureaux[key];

        // bureaux-btn-container
        let bureauBtn = document.createElement('button');
        bureauBtn.id = 'btn-bureau-' + (++i);
        bureauBtn.textContent = nom;
        bureauBtn.onclick = function() { selectionnerBureau(bureauBtn); };
        bureauxBtnContainer.appendChild(bureauBtn);

        // bureaux-modif-container
        let bureauLabel = document.createElement('label');
        bureauLabel.setAttribute('for', key);
        bureauLabel.textContent = nom;
        let bureauInput = document.createElement('input');
        bureauInput.type = 'text';
        bureauInput.id = key;
        bureauInput.value = nom;
        bureauInput.onchange = function() { bureaux[key] = bureauInput.value; };
        bureauLabel.appendChild(bureauInput);
        let removeBureauBtn = document.createElement('button');
        removeBureauBtn.classList.add('remove-bureau-btn');
        removeBureauBtn.innerHTML = '&times;';
        removeBureauBtn.onclick = function() { supprimerBureau(key); };
        bureauxModifContainer.appendChild(bureauLabel);
        bureauxModifContainer.appendChild(removeBureauBtn);
        bureauxModifContainer.appendChild(document.createElement('br'));
    }
}

// Fonction pour changer l'état du bureau sélectionné
function changeEtat()
{
    const btnBureaux = document.querySelectorAll('#bureaux-btn-container button');
    const bureauSelect = Array.from(btnBureaux).find(btn => btn.innerText.trim() === current_bureau);

    btnBureaux.forEach(btn =>
    {
        btn.classList.remove('selected');
    });

    if (bureauSelect)
    {
        bureauSelect.classList.add('selected');
    }
}

// Reinitialise les variables
function resetAll() { socket.emit('reset_all'); } 

// -- REQUÊTES SERVEUR --

// Mise à jour de la liste d'usagers
socket.on('update_usagers', function(data)
{
    mettreAJourListe(data.usagers);
});

// Mise à jour du bureau sélectionné
socket.on('update_current_bureau', function(data)
{
    current_bureau = data.current_bureau;
    
    changeEtat(); // Met à jour l'état visuel des boutons de bureau
});

// Mise à jour de l'affichage
socket.on('update_display', function(data)
{
    mettreAJourAffichage(data.usager, data.bureau);
});

// Mise à jour de des usagers envoyés
socket.on('update_displayed_usagers', function(data)
{
    displayed_usagers = new Set(data.displayed_usagers);        
});

// Mise à jour de des usagers selectionnes
socket.on('update_selected_usagers', function(data)
{
    selected_usagers = new Set(data.selected_usagers);
});

// Mettre à jour les noms des bureaux sur tous les clients
socket.on('update_bureaux', function(data)
{
    bureaux = data.bureaux;
    
    updateBureaux();
});