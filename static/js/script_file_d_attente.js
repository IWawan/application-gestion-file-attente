var socket = io.connect('http://' + document.domain + ':' + location.port);
var audio = new Audio('/static/audio/notification_sound.mp3');
var lastUsagerDisplayed = "";

var nextUsagers = [];
var displayed_usagers = new Set();

function updateUsager(usager, msg)
{
    var mainName = document.getElementById('main-name');
    var subtext = document.getElementById('subtext');

    if (usager)
    {
        // Vérifie que le nom est différent du précédent et non vide
        if (usager !== lastUsagerDisplayed)
        { 
            // Joue le son
            audio.play().catch(function(error)
            {
                console.log("Erreur de lecture du son : ", error);
            });

            lastUsagerDisplayed = usager; // Met à jour le dernier nom affiché
        }

        if (msg)
        {
            mainName.textContent = usager;
            subtext.textContent = msg;
            //display_section.style.display = 'block';
        }
    }
    else
    {
        mainName.textContent = "";
        subtext.textContent = "";
    }
}

function updateNextUsagers()
{
    var nextUsager1 = document.getElementById('next-usager-1');
    var nextUsager2 = document.getElementById('next-usager-2');
    var nextUsager3 = document.getElementById('next-usager-3');
    var nextUsager4 = document.getElementById('next-usager-4');
    
    if (nextUsagers.length >= 1)
    {
        nextUsager1.textContent = nextUsagers[0];
    }
    if (nextUsagers.length >= 2)
    {
        nextUsager2.textContent = nextUsagers[1];
    }
    if (nextUsagers.length >= 3)
    {
        nextUsager3.textContent = nextUsagers[2];
    }
    if (nextUsagers.length >= 4)
    {
        nextUsager4.textContent = nextUsagers[3];
    }
}

// ----------------------
//  SOCKET.IO LISTENERS
// ----------------------

// Mise à jour de l'affichage
socket.on('update_display', function(data)
{    
    newUsager = data.usager.substring(data.usager.indexOf("|") + 1).toUpperCase();
    updateUsager(newUsager, data.msg)
    updateNextUsagers();
});

// Mise à jour du bandeau
socket.on('update_bandeau', function(data)
{
    var bandeau = document.getElementById('bandeau');
    bandeau.textContent = data.bandeau_message.toUpperCase();
    bandeau.style.display = 'block';
});

// Mise à jour de la liste d'usagers 1
socket.on('update_usagers_list_1', function(data)
{
    nextUsagers = data.usagers.filter(usager => !displayed_usagers.has(usager));
    updateNextUsagers();
});

// Mise à jour de des usagers envoyés de la liste 1
socket.on('update_displayed_usagers_1', function(data)
{
    displayed_usagers = new Set(data.displayed_usagers); 
});