(() => {
  const socket = io();
  let displayed = new Set(), selected = new Set(), currentBureau = '';

  // --- Elements DOM ---
  const elems = {
    uploadBtn: document.getElementById('btn-upload'),
    loadBtn:   document.getElementById('btn-load'),
    clearBtn:  document.getElementById('btn-clear-all'),
    bannerBtn: document.getElementById('btn-banner-popup'),
    fileInput: document.getElementById('fileInput'),
    bureaux:   document.querySelectorAll('#bureaux_buttons button'),
    list:      document.getElementById('usagers_list_container'),
    display:   document.getElementById('display_section'),
    displayTxt:document.getElementById('usager_display'),
    endBtn:    document.getElementById('btn-end-rdv'),
    popup:     document.getElementById('popup_bandeau'),
    sendBanner:document.getElementById('btn-send-banner'),
    closeBanner:document.getElementById('btn-close-banner'),
    bannerInput:document.getElementById('bandeau_input')
  };

  // --- Initialization ---
  elems.uploadBtn.addEventListener('click', () => elems.fileInput.click());
  elems.fileInput.addEventListener('change', handleFileUpload);
  elems.loadBtn.addEventListener('click', () => { resetAll(); loadUsagers(); });
  elems.clearBtn.addEventListener('click', () => { resetAll(); clearUsagers(); clearDisplay(); });
  elems.bannerBtn.addEventListener('click', () => elems.popup.hidden = false);
  elems.closeBanner.addEventListener('click', () => elems.popup.hidden = true);
  elems.sendBanner.addEventListener('click', sendBannerMessage);
  elems.endBtn.addEventListener('click', clearDisplay);
  elems.bureaux.forEach(btn => btn.addEventListener('click', () => selectBureau(btn.dataset.bureau)));

  // --- AJAX & Socket Communication ---
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    fetch('/upload_xlsx', { method: 'POST', body: form })
      .then(r => r.json()).then(alert)
      .catch(console.error);
  }
  function loadUsagers() {
    fetch('/load_usagers')
      .then(r => r.json())
      .then(data => socket.emit('update_usagers', { usagers: data.usagers }));
  }
  function clearUsagers()    { socket.emit('clear_usagers'); }
  function resetAll()        { socket.emit('reset_all'); }
  function clearDisplay()    { socket.emit('clear_display'); elems.display.hidden = true; }
  function sendBannerMessage() {
    const msg = elems.bannerInput.value.trim();
    if (msg) socket.emit('bandeau_message', { message: msg });
    elems.popup.hidden = true;
  }
  function selectBureau(name) {
    currentBureau = name;
    socket.emit('select_bureau', { bureau: name });
  }
  function sendUsager(name) {
    if (!currentBureau) return alert('Sélectionnez un bureau d\u00E9but !');
    socket.emit('display_usager', { usager: name });
  }

  // --- UI Update Helpers ---
  function renderList(usagers) {
    elems.list.innerHTML = '';
    usagers.forEach((u, i) => {
      const container = document.createElement('div');
      container.className = 'usager_container';
      const mainBtn = document.createElement('button');
      mainBtn.textContent = u;
      mainBtn.onclick = () => sendUsager(u);
      container.append(mainBtn, createSelectBtn(u), createDeleteBtn(u));
      elems.list.append(container);
    });
  }
  function createSelectBtn(u) {
    const btn = document.createElement('button');
    btn.textContent = selected.has(u) ? 'EN ATTENTE' : '\u2713';
    btn.onclick = () => socket.emit('select_usager', { usager: u });
    return btn;
  }
  function createDeleteBtn(u) {
    const btn = document.createElement('button');
    btn.innerHTML = '&times;';
    btn.onclick = () => socket.emit('remove_usager', { usager: u });
    return btn;
  }
  function updateBureaux(names) {
    elems.bureaux.forEach((btn, idx) => btn.textContent = names[`bureau${idx+1}`]);
  }
  function updateDisplay(u, b) {
    elems.displayTxt.textContent = u.split('|')[1]?.toUpperCase() || '';
    elems.display.hidden = !u;
  }

  // --- Socket Listeners ---
  socket.on('update_usagers', data => renderList(data.usagers));
  socket.on('update_selected_usagers', d => selected = new Set(d.selected_usagers));
  socket.on('update_displayed_usagers', d => displayed = new Set(d.displayed_usagers));
  socket.on('update_current_bureau', d => {
    currentBureau = d.current_bureau;
    elems.bureaux.forEach(btn => btn.classList.toggle('selected', btn.textContent === currentBureau));
  });
  socket.on('update_bureau_names', updateBureaux);
  socket.on('update_display', d => updateDisplay(d.usager, d.bureau));
})();