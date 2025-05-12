var socket = io.connect('http://' + window.location.hostname + ':' + window.location.port);

usagers_list_1 = [];
usagers_list_2 = [];
var displayed_usagers_1 = new Set();
var displayed_usagers_2 = new Set();
var selected_usagers_1 = new Set();
var selected_usagers_2 = new Set();
var current_usager = "";
var current_bureau;
var bureaux;

// ----------------------
//  FONCTIONS GÉNÉRIQUES
// ----------------------

// Séléctionner un fichier .xlsx à charger
function selectXLSX(event, nb_list)
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

    if (nb_list == 1)
    {
        xhr.open('POST', '/upload_xlsx_1', true);
    }
    if (nb_list == 2)
    {
        xhr.open('POST', '/upload_xlsx_2', true);
    }
    
    xhr.send(formData);
}

// Charger la liste des usagers
function chargerListeUsagers(nb_list)
{   
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === 4 && xhr.status === 200)
        {
            var response = JSON.parse(xhr.responseText);

                if (nb_list == 1)
                {
                    socket.emit('update_usagers_list_1', { usagers: response.usagers });
                }
                if ((nb_list == 2))
                {
                    socket.emit('update_usagers_list_2', { usagers: response.usagers });
                }
        }
    };

    if (nb_list == 1)
    {
        xhr.open('GET', '/load_usagers_list_1', true);
    }
    if ((nb_list == 2))
    {
        xhr.open('GET', '/load_usagers_list_2', true);
    }
    
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
function envoyerUsager(usager, nb_list)
{
    if (!current_bureau)
    {
        alert("Veuillez sélectionner un bureau avant d'afficher un usager !");
        return;
    }

    if (nb_list == 1)
    {
        socket.emit('display_usager_1', { usager: usager });
    }
    if (nb_list == 2)
    {
        socket.emit('display_usager_2', { usager: usager });
    }
    
}

// Effacer la liste des usagers
function effacerListeUsagers(nb_list)
{
    if ((nb_list == 1))
    {
        socket.emit('clear_usagers_1');
    }
    if ((nb_list == 2))
    {
        socket.emit('clear_usagers_2');
    }
}

// Effacer l'affichage
function effacerAffichage()
{
    socket.emit('clear_display');
    document.getElementById('display-section').style.display = 'none';
}

// Reinitialise les variables
function resetList(nb_list)
{
    if (nb_list == 1)
    {
        socket.emit('reset_list_1');
    }
    if (nb_list == 2)
    {
        socket.emit('reset_list_2');
    }
} 

// -------------
//  MISE À JOUR
// -------------

// Mettre à jour la liste 1
function mettreAJourListe_1(usagers)
{
    var cont = document.getElementById("usagers-list-1-content");
    cont.innerHTML = ""; // Efface les anciens boutons

    usagers.forEach(function(usager, i)
    {
        var div = document.createElement('div');
        div.classList.add('usager-container');

        usagers_list_1.push(usager); // Ajoute l'usager à la liste

        // Boutons principal des usagers
        var btn = document.createElement('button');
        btn.classList.add('usager-btn');
        btn.id = 'usager-btn-' + i;
        btn.textContent = usager;

        // Couleur en fonction des états
        if (selected_usagers_1.has(usager))
        {
            btn.classList.add('selected');
        }
        else if (displayed_usagers_1.has(usager))
        {
            btn.classList.add('displayed');
        }
        else if (!usager.includes('|'))
        {
            btn.classList.add('new-usager');
        }
        else
        {
            btn.classList.add('default');
        }

        btn.onclick = function() { envoyerUsager(usager, 1); };

        // Boutons sélection
        var sel = document.createElement('button');
        sel.classList.add('select-btn');
        sel.id = 'select-btn-' + i;

        if (selected_usagers_1.has(usager))
        {
            sel.classList.add('prêt');
            sel.innerHTML = 'ATTENTE';
        }
        else
        {
            sel.classList.remove('prêt');
            sel.innerHTML = '&check;'; // Icône coche
        }
        
        sel.onclick = function()
        {
            socket.emit('select_usager_1', { usager: usager });
        };

        // Boutons supression
        var del = document.createElement('button');
        del.classList.add('delete-btn');
        del.id = 'delete-btn-' + i;
        del.innerHTML = '&times;'; // Icône croix
        del.onclick = function()
        {
            socket.emit('remove_usager_1', { usager: usager });
        };

        div.append(btn, sel, del);
        cont.appendChild(div);
        feather.replace();
    });
}

// Mettre à jour la liste 1
function mettreAJourListe_2(usagers)
{
    var cont = document.getElementById("usagers-list-2-content");
    cont.innerHTML = ""; // Efface les anciens boutons

    usagers.forEach(function(usager, i)
    {
        var div = document.createElement('div');
        div.classList.add('usager-container');

        usagers_list_2.push(usager); // Ajoute l'usager à la liste

        // Boutons principal des usagers
        var btn = document.createElement('button');
        btn.classList.add('usager-btn');
        btn.id = 'usager-btn-' + i;
        btn.textContent = usager;

        // Couleur en fonction des états
        if (selected_usagers_2.has(usager))
        {
            btn.classList.add('selected');
        }
        else if (displayed_usagers_2.has(usager))
        {
            btn.classList.add('displayed');
        }
        else if (!usager.includes('|'))
        {
            btn.classList.add('new-usager');
        }
        else
        {
            btn.classList.add('default');
        }

        btn.onclick = function() { envoyerUsager(usager, 2); };

        // Boutons sélection
        var sel = document.createElement('button');
        sel.classList.add('select-btn');
        sel.id = 'select-btn-' + i;

        if (selected_usagers_2.has(usager))
        {
            sel.classList.add('prêt');
            sel.innerHTML = 'ATTENTE';
        }
        else
        {
            sel.classList.remove('prêt');
            sel.innerHTML = '&check;'; // Icône coche
        }
        
        sel.onclick = function()
        {
            socket.emit('select_usager_2', { usager: usager });
        };

        // Boutons supression
        var del = document.createElement('button');
        del.classList.add('delete-btn');
        del.id = 'delete-btn-' + i;
        del.innerHTML = '&times;'; // Icône croix
        del.onclick = function()
        {
            socket.emit('remove_usager_2', { usager: usager });
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
function ouvrirPopupRDV(nb_list)
{
    if (nb_list == 1)
    {
        document.getElementById('popup-rdv-1').classList.add('open');
    }
    if (nb_list == 2)
    {
        document.getElementById('popup-rdv-2').classList.add('open');
    }
    

    fermerMenuLateral();
}

// Fermer le popup d'ajout de rendez-vous
function fermerPopupRDV()
{
    document.getElementById('popup-rdv-1').classList.remove('open');
    document.getElementById('popup-rdv-2').classList.remove('open');
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

    if (n >= 9)
    {
        alert("Impossible d'ajouter plus de 9 bureaux.");
        return;   
    }
    
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
}

// Ajouter un nouveau rendez-vous
function ajouterRDV(nb_list)
{
    if (nb_list == 1)
    {
        const usager = document.getElementById("new-usager-input-1").value.trim();
        socket.emit('add_usager_1', { usager: usager });
        document.getElementById("new-usager-input-1").value = ""; // Réinitialise le champ de saisie    
    }
    if (nb_list == 2)
    {
        const usager = document.getElementById("new-usager-input-2").value.trim();
        socket.emit('add_usager_2', { usager: usager });
        document.getElementById("new-usager-input-2").value = ""; // Réinitialise le champ de saisie    
    }
}

// Fermeture du popup au clic en dehors
document.addEventListener('DOMContentLoaded', () =>
{
    document.querySelectorAll('.popup').forEach(popup =>
    {
        popup.querySelector('.popup-overlay').addEventListener('click', () => popup.classList.remove('open'));
    });
});

// Fermeture du popup avec "échap"
document.addEventListener('keydown', (event) =>
{
    if (event.key === 'Escape')
    {
        document.querySelectorAll('.popup.open').forEach(popup =>
        {
            popup.classList.remove('open');
        });
    }
});

// Ok avec "entrée"
document.addEventListener('keydown', (event) =>
    {
        if (event.key === 'Enter')
        {
            const popup = document.querySelector('.popup.open')

            if (popup && popup.id === 'popup-bandeau')
            {
                envoyerMessageBandeau();
            }
            else if (popup && popup.id === 'popup-bureaux')
            {
                renommerBureaux();
            }
            else if (popup && popup.id === 'popup-rdv-1')
            {
                ajouterRDV(1);
            }
            else if (popup && popup.id === 'popup-rdv-2')
            {
                ajouterRDV(2);
            }
        }
    });

// ----------------------
//  SOCKET.IO LISTENERS
// ----------------------

// Mise à jour de la liste d'usagers 1
socket.on('update_usagers_list_1', function(data)
{
    mettreAJourListe_1(data.usagers);
});

// Mise à jour de la liste d'usagers 2
socket.on('update_usagers_list_2', function(data)
{
    mettreAJourListe_2(data.usagers);
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

// Mise à jour de des usagers envoyés de la liste 1
socket.on('update_displayed_usagers_1', function(data)
{
    displayed_usagers_1 = new Set(data.displayed_usagers);        
});

// Mise à jour de des usagers envoyés de la liste 2
socket.on('update_displayed_usagers_2', function(data)
{
    displayed_usagers_2 = new Set(data.displayed_usagers);        
});

// Mise à jour de des usagers selectionnes de la liste 1
socket.on('update_selected_usagers_1', function(data)
{
    selected_usagers_1 = new Set(data.selected_usagers);
});

// Mise à jour de des usagers selectionnes de la liste 2
socket.on('update_selected_usagers_2', function(data)
{
    selected_usagers_2 = new Set(data.selected_usagers);
});

// Mettre à jour les noms des bureaux sur tous les clients
socket.on('update_bureaux', function(data)
{
    bureaux = data.bureaux;
    
    mettreAJourBureaux();
});