var socket = io.connect('http://' + document.domain + ':' + location.port);
var audio = new Audio('/static/audio/notification_sound.mp3');
var lastUsagerDisplayed = "";

socket.on('update_display', function(data)
{    
    var usagerDisplay = document.getElementById('usager_display');
    var bureauDisplay = document.getElementById('bureau_display');
    var display_section = document.getElementById('display_section');

    var newUsager = data.usager.substring(data.usager.indexOf("|") + 1).toUpperCase();
    var bureau = data.bureau;

    if (newUsager)
    {
        // Vérifie que le nom est différent du précédent et non vide
        if (newUsager !== lastUsagerDisplayed)
        { 
            // Joue le son
            audio.play().catch(function(error)
            {
                console.log("Erreur de lecture du son : ", error);
            });

            lastUsagerDisplayed = newUsager; // Mets à jour le dernier nom affiché
        }

        if (bureau)
        {
            usagerDisplay.textContent = newUsager;
            bureauDisplay.textContent = "EST ATTENDU(E) AU " + bureau.toUpperCase();
            display_section.style.display = 'block';
        }
    }
    else
    {
        usagerDisplay.textContent = "";
        bureauDisplay.textContent = "";
    }
});

socket.on('update_bandeau', function(data)
{
    var bandeau = document.getElementById('bandeau');
    bandeau.textContent = data.bandeau_message.toUpperCase();
    bandeau.style.display = 'block';
});

// Meteo
function meteo()
{
    meteoDisplay = document.getElementById('meteo_display');

    if(meteoDisplay)
    {
        meteoDisplay.style.cssText = 'width:677px; height:131px; color:#ECECEC;background:#962030; overflow:hidden;';
        meteoDisplay.innerHTML = '<iframe id="TTF_yetKYxDgDcYc1L6Ujkz24lHl4WuUaYB" src="https://fr.tutiempo.net/s-widget/tt_NXx8OTYyMDMwfG58bnxufDQxNzQ4fDYwfDE2fDF8N3w1fDN8MjV8bnxufG58fHx8fEVDRUNFQ3w5NnwzfDkwfDkwfDIwNnwzMnwxMDZ8MHw2Nzd8MTMxfDcxfDUzfDIxfDIxfDQxfDkyfDQwfHllfDV8" frameborder="0" scrolling="no" width="100%" height="100%" allowtransparency="allowtransparency" style="overflow:hidden;pointer-events:auto;"></iframe>';
        var meteoScript = document.createElement("script");
        meteoScript.src = 'https://www.tutiempo.net/s-widget/lcx_yetKYxDgDcYc1L6Ujkz24lHl4WuUaYB_eu_'+encodeURIComponent(window.location.hostname);
        document.head.appendChild(scriptyetKYxDgDcYc1L6Ujkz24lHl4WuUaYB);
    }
}