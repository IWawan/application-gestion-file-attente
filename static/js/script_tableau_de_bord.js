var socket = io.connect('http://' + window.location.hostname + ':' + window.location.port);

var displayed_usagers = new Set()
var selected_usagers = new Set()
var current_usager = "";
var current_bureau;
var bureaux;

// ----------------------
//  FONCTIONS GÉNÉRIQUES
// ----------------------

// Séléctionner un fichier .xlsx à charger
function selectXLSX(event)
{
    var file = event.target.files[0];  // Récupère le fichier sélectionné

    if (!file) return;

    var formData = new FormData();
    formData.append("file", file);

    // Envoie le fichier au serveur via une requête POST
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === 4)
        {
            if (xhr.status === 200) alert("Fichier importé !");
            else
            {
                alert("Erreur lors de l'importation du fichier !");
                console.log(xhr.responseText);
            }
        }
    };

    xhr.open('POST', '/upload_xlsx', true);
    xhr.send(formData);
}

// Charger la liste des usagers
function chargerListeUsagers()
{   
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === 4 && xhr.status === 200)
        {
            var response = JSON.parse(xhr.responseText);

            socket.emit('update_usagers', { usagers: response.usagers });
        }
    };
    xhr.open('GET', '/load_usagers', true);
    xhr.send();
}

// Séléctionner un bureau
function selectionnerBureau(bureauBtn)
{
    const bureau = bureauBtn.innerText.trim();
    
    socket.emit('select_bureau', { bureau: bureau });
}

// Changer l'état du bureau sélectionné
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

// Envoyer un usager sur le serveur, si un bureau est sélectionné
function envoyerUsager(usager)
{
    if (!current_bureau)
    {
        alert("Veuillez sélectionner un bureau avant d'afficher un usager !");
        return;
    }

    socket.emit('display_usager', { usager: usager });
}

// Effacer la liste des usagers
function effacerListeUsagers()
{
    socket.emit('clear_usagers');
}

// Effacer l'affichage
function effacerAffichage()
{
    socket.emit('clear_display');
    document.getElementById('display-section').style.display = 'none';
}

// Reinitialise les variables
function resetAll()
{
    socket.emit('reset_all');
} 

// -------------
//  MISE À JOUR
// -------------

// Mettre à jour la liste des usagers
function mettreAJourListe(usagers)
{
    var cont = document.getElementById('usagers-list-container');
    cont.innerHTML = ""; // Efface les anciens boutons

    usagers.forEach(function(usager, i)
    {
        var div = document.createElement('div');
        div.classList.add('usager-container');

        // Boutons principal des usagers
        var btn = document.createElement('button');
        btn.classList.add('usager-btn');
        btn.id = 'usager-btn-' + i;
        btn.textContent = usager;

        // Couleur en fonction des états
        if (selected_usagers.has(usager))
        {
            btn.classList.add('selected');
        }
        else if (displayed_usagers.has(usager))
        {
            btn.classList.add('displayed');
        }
        else if (usager.includes("|"))
        {
            btn.classList.add('new-usager');
        }
        else
        {
            btn.classList.add('default');
        }

        btn.onclick = function() { envoyerUsager(usager); };

        // Boutons sélection
        var sel = document.createElement('button');
        sel.classList.add('select-btn');
        sel.id = 'select-btn-' + i;

        if (selected_usagers.has(usager))
        {
            sel.classList.add('prêt');
            sel.innerHTML = 'EN ATTENTE';
        }
        else
        {
            sel.classList.remove('prêt');
            sel.innerHTML = '<i data-feather="check"></i>'; // Icône coche
        }
        
        sel.onclick = function()
        {
            socket.emit('select_usager', { usager: usager });
        };

        // Boutons supression
        var del = document.createElement('button');
        del.classList.add('delete-btn');
        del.id = 'delete-btn-' + i;
        del.innerHTML = '<i data-feather="x"></i>'; // Icône croix
        del.onclick = function()
        {
            socket.emit('remove_usager', { usager: usager });
        };

        div.append(btn, sel, del);
        cont.appendChild(div);
        feather.replace();
    });
}

// Mettre à jour les bureaux
function mettreAJourBureaux()
{
    const btnCont = document.getElementById("bureaux-btn-container");
    const modifCont = document.getElementById("bureaux-modif-container");

    btnCont.textContent = "";
    modifCont.textContent = "";
    
    let i = 0;
    
    for (let key in bureaux)
    {
        const nom = bureaux[key];

        // bureaux-btn-container
        let btn = document.createElement('button');
        btn.id = 'btn-bureau-' + (++i);
        btn.textContent = nom;
        btn.onclick = function() { selectionnerBureau(btn); };
        btnCont.appendChild(btn);

        // bureaux-modif-container
        let label = document.createElement('label');
        label.setAttribute('for', key);
        label.textContent = key.replace(/^bureau/, "Bureau ") + " : ";
        let input = document.createElement('input');
        input.type = 'text';
        input.id = key;
        input.value = nom;
        input.onchange = function() { bureaux[key] = input.value; };
        let rmv = document.createElement('button');
        rmv.classList.add('remove-bureau-btn');
        rmv.innerHTML = '&times;';
        rmv.onclick = function() { supprimerBureau(key); };

        modifCont.append(label, input, rmv, document.createElement('br'));
    }
}

// Mettre à jour l'affichage des usagers sur l'interface
function mettreAJourAffichage(usager, bureau)
{
    var usagerDisplay = document.getElementById('usager-display');

    usagerDisplay.textContent = usager.substring(usager.indexOf("|") + 1).toUpperCase();

    // Affiche le bouton "clear-btn" si un usager est affiché
    if (usager != "") { document.getElementById('display-section').style.display = 'flex'; }
}

// ---------------
//  POPUPS & MENU
// ---------------

// Ouvrir le menu latéral
function ouvrirMenuLateral()
{
    document.getElementById('side-menu').classList.toggle('open');
}

// Fermer le menu latéral
function fermerMenuLateral()
{
    document.getElementById('side-menu').classList.remove('open');
}

// Ouvrir le popup du bandeau
function ouvrirPopupBandeau()
{
    document.getElementById('popup-bandeau').classList.add('open');

    fermerMenuLateral();
}

// Fermer le popup du bandeau
function fermerPopupBandeau()
{
    document.getElementById('popup-bandeau').classList.remove('open');
}

// Ouvrir le popup de modification des bureaux
function ouvrirPopupBureaux()
{
    document.getElementById('popup-bureaux').classList.add('open');

    fermerMenuLateral();
}

// Fermer le popup de modification des bureaux
function fermerPopupBureaux()
{
    document.getElementById('popup-bureaux').classList.remove('open');
}

// Ouvrir le popup d'ajout de rendez-vous
function ouvrirPopupRDV()
{
    document.getElementById('popup-rdv').classList.add('open');

    fermerMenuLateral();
}

// Fermer le popup d'ajout de rendez-vous
function fermerPopupRDV()
{
    document.getElementById('popup-rdv').classList.remove('open');
}

// Afficher un message sur le bandeau
function envoyerMessageBandeau()
{
    var message = document.getElementById("bandeau-input").value;
    if (message.trim() !== "") { socket.emit("bandeau_message", { message: message }); }

    fermerPopupBandeau();
} 

// Ajouter un nouveau bureau
function ajouterBureau()
{
    let n = Object.keys(bureaux).length;
    let newKey = "bureau" + (n + 1);
    bureaux[newKey] = "Bureau " + (n + 1);

    socket.emit('save_bureaux', { bureaux: bureaux });
}

// Supprimer un bureau
function supprimerBureau(key)
{
    socket.emit('remove_bureau', { key: key });
}

// Renommer les bureaux
function renommerBureaux()
{
    const clés = Object.keys(bureaux);
    const nouveauBureaux = {};
  
    for (let key of clés)
    {
        const input = document.getElementById(key);
        if (!input)
        {
            alert(`Impossible de trouver l'input pour "${key}"`);
            return;
        }

        const nom = input.value.trim();
        if (!nom)
        {
            alert(`Veuillez renseigner un nom pour "${key}"`);
            return;
        }
        
        nouveauBureaux[key] = nom;
    }

    socket.emit('save_bureaux', { bureaux: nouveauBureaux });

    fermerPopupBureaux();
}

// Ajouter un nouveau rendez-vous
function ajouterRDV()
{
    const nom = document.getElementById("new-usager-input").value.trim();

    if (nom)
    {
        socket.emit('add_usager', { usager: nom });
    }
    
    document.getElementById("new-usager-input").value = ""; // Réinitialise le champ de saisie
    fermerPopupRDV();
}

// Fermeture du popup au clic sur l’overlay
document.addEventListener('DOMContentLoaded', () =>
{
    document.querySelectorAll('.popup').forEach(popup =>
    {
        popup.querySelector('.popup-overlay').addEventListener('click', () => popup.classList.remove('open'));
    });
});

// ----------------------
//  SOCKET.IO LISTENERS
// ----------------------

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
    
    mettreAJourBureaux();
});