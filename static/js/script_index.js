var socket = io.connect('http://' + window.location.hostname + ':' + window.location.port);
const rootStyles = getComputedStyle(document.documentElement);
const colorPrimary = rootStyles.getPropertyValue('--color-primary').trim();
const colorSecondary = rootStyles.getPropertyValue('--color-secondary').trim();
const colorSelect = rootStyles.getPropertyValue('--color-select-button').trim();

var displayed_usagers = new Set()
var selected_usagers = new Set()
var current_usager = "";

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
    var usagersListContainer = document.getElementById('usagers_list_container');
    usagersListContainer.innerHTML = ""; // Efface les anciens boutons

    usagers.forEach(function(usager, index)
    {
        var usagerContainer = document.createElement('div');
        usagerContainer.classList.add('usager_container');

        // Boutons principal des usagers
        var usagerButton = document.createElement('button');
        usagerButton.classList.add('usager_button');
        usagerButton.id = 'usager_button_' + index;
        usagerButton.textContent = usager;

        // Couleur en fonction des états
        if (selected_usagers.has(usager))
        {
            usagerButton.classList.add('selected');
        }
        else if (displayed_usagers.has(usager))
        {
            usagerButton.classList.add('displayed');
        }
        else
        {
            usagerButton.classList.add('default');
        }

        usagerButton.onclick = function() { ouvrirPopupBureau(usager); };

        // Boutons selectionner un usager
        var usagerSelectButton = document.createElement('button');
        usagerSelectButton.classList.add('usager_select_button');
        usagerSelectButton.id = 'usager_select_button' + index;

        if (selected_usagers.has(usager))
        {
            usagerSelectButton.classList.add('prêt');
            usagerSelectButton.innerHTML = 'PRÊT';
        }
        else
        {
            usagerSelectButton.classList.remove('prêt');
            usagerSelectButton.innerHTML = '&#10003;';
        }
        
        usagerSelectButton.onclick = function()
        {
            socket.emit('select_usager', { usager: usager });
        };

        // Boutons effacer un usager
        var usagerDeleteButton = document.createElement('button');
        usagerDeleteButton.classList.add('clear_button');
        usagerDeleteButton.id = 'usager_delete_button_' + index;
        usagerDeleteButton.innerHTML = '&times;';
        usagerDeleteButton.onclick = function()
        {
            socket.emit('remove_usager', { usager: usager });
        };

        usagerContainer.appendChild(usagerButton);
        usagerContainer.appendChild(usagerSelectButton);
        usagerContainer.appendChild(usagerDeleteButton);
        usagersListContainer.appendChild(usagerContainer);
    });
}

// Fonction pour afficher un usager sur l'interface
function mettreAJourAffichage(usager, bureau)
{
    var usagerDisplay = document.getElementById('usager_display');
    // var bureauDisplay = document.getElementById('bureau_display');

    usagerDisplay.textContent = usager.substring(usager.indexOf("|") + 1).toUpperCase();
    // bureauDisplay.textContent = bureau.substring(bureau.indexOf("|") + 1).toUpperCase();
    

    // Affiche le bouton "clear_button" si un usager est affiché
    if (usager != "") { document.getElementById('display_section').style.display = 'flex'; }
}

// Fonction pour effacer la liste des usagers
function effacerListeUsagers(usager) { socket.emit('clear_usagers'); }

// Fonction pour effacer l'affichage
function effacerAffichage()
{
    socket.emit('clear_display');
    // Cache la "display_section"
    document.getElementById('display_section').style.display = 'none';
}

// -- REQUÊTES SERVEUR --

// Mise à jour de la liste d'usagers
socket.on('update_usagers', function(data)
{
    mettreAJourListe(data.usagers);
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

// Bureau
function ouvrirPopupBureau(usager)
{
    usagerEnCours = usager;
    document.getElementById("popup_bureau").style.display = "flex";
}

function fermerPopupBureau()
{
    document.getElementById("popup_bureau").style.display = "none";
    usagerEnCours = "";
}

function envoyerUsager(bureau)
{
    if (usagerEnCours !== "")
    {
        socket.emit('display_usager',
        {
            usager: usagerEnCours,
            bureau: bureau
        });

        fermerPopupBureau();
    }
}

// Bandeau
function ouvrirPopupBandeau() { document.getElementById("popup_bandeau").style.display = "flex"; }

function fermerPopupBandeau() { document.getElementById("popup_bandeau").style.display = "none"; }

function envoyerMessageBandeau()
{
    var message = document.getElementById("bandeau_input").value;
    if (message.trim() !== "") { socket.emit("bandeau_message", { message: message });}
    fermerPopupBandeau();
} 

// Reinitialise les variables
function resetAll() { socket.emit('reset_all'); } 