// ==========================================
// 1. GENERAZIONE IDENTITÀ CASUALE
// ==========================================
const randomId = Math.floor(Math.random() * 899 + 100);
const guestName = `guest_${randomId}`;

// ==========================================
// 2. GESTIONE FINESTRE E SIDEBAR
// ==========================================
function toggleExplorer() {
    const win = document.getElementById('explorer');
    if (win) win.classList.toggle('active');
}

// ==========================================
// 3. GESTIONE MODALI E BADGE TASKBAR
// ==========================================
function openProject(modalId, badgeId = null) {
    // Prima chiudiamo eventuali altre modali aperte per evitare sovrapposizioni
    closeAllModals();

    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('overlay');
    
    if (overlay) overlay.classList.add('modal-active');
    
    if (modal) {
        modal.classList.add('modal-active');
        modal.setAttribute('aria-hidden', 'false');
        
        // Attiva lo stato premuto/incavato sul badge specificato
        if (badgeId) {
            const badge = document.getElementById(badgeId);
            if (badge) badge.classList.add('active');
        } else {
            // Se non è stato passato un badgeId, trova il badge associato alla modale se esiste
            const autoBadge = document.querySelector(`[onclick*="${modalId}"]`);
            if (autoBadge && autoBadge.classList.contains('taskbar-item')) {
                autoBadge.classList.add('active');
            }
        }

        const closeBtn = modal.querySelector('.dot');
        if (closeBtn) closeBtn.focus();
    }
}

function openModal(modalId, badgeId) {
    openProject(modalId, badgeId);
}

function closeModal(modalId, badgeId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('modal-active');
        modal.setAttribute('aria-hidden', 'true');
    }
    
    if (badgeId) {
        const badge = document.getElementById(badgeId);
        if (badge) badge.classList.remove('active');
    }

    // Se non ci sono altre modali aperte, nascondi l'overlay
    const activeModals = document.querySelectorAll('.modal-window.modal-active');
    if (activeModals.length === 0) {
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.classList.remove('modal-active');
    }
}

function closeAllModals() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('modal-active');
    
    // Chiudi tutte le finestre modali
    const modals = document.querySelectorAll('.modal-window');
    modals.forEach(m => {
        m.classList.remove('modal-active');
        m.setAttribute('aria-hidden', 'true');
    });

    // Rimuovi lo stato attivo (incavato) da tutti i badge della taskbar
    const activeBadges = document.querySelectorAll('.taskbar-item.active');
    activeBadges.forEach(b => b.classList.remove('active'));
}

// ==========================================
// 4. INVIO DATI A GOOGLE SHEETS
// ==========================================
function sendToSheets() {
    const url = "https://script.google.com/macros/s/AKfycbzAr3vWOsFtXcAjdicrC3x2TttgHEqYxAq8R730g2wuOpmBd7D7rFWv4i78c8z6L5SO/exec";
    const input = document.getElementById('commento');
    const sendBtn = document.getElementById('send-btn');
    
    if (!input || !input.value.trim()) return;
    const testo_da_inviare = input.value.trim();
  
    sendBtn.disabled = true;
    const originalText = sendBtn.innerText;
    sendBtn.innerText = "[SENDING...]";
    sendBtn.style.color = "#000080";
  
    const formData = new FormData();
    formData.append("testo", testo_da_inviare); 
    formData.append("autore", guestName); 
  
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: formData
    })
    .then(() => {
      input.value = "";
      showToast('[INFO] Comment posted successfully');
      
      sendBtn.innerText = "[OK]";
      sendBtn.style.color = "#00AA00";
      
      setTimeout(() => {
        sendBtn.innerText = originalText;
        sendBtn.style.color = "#000000";
        sendBtn.disabled = false;
      }, 1500);
      
      caricaCommenti(); 
    })
    .catch(err => {
      console.error("Errore invio:", err);
      sendBtn.innerText = "[ERROR]";
      sendBtn.style.color = "#AA0000";
      
      setTimeout(() => {
        sendBtn.innerText = originalText;
        sendBtn.style.color = "#000000";
        sendBtn.disabled = false;
      }, 2000);
    });
}

// ==========================================
// 5. CARICAMENTO COMMENTI
// ==========================================
async function caricaCommenti() {
    const url = "https://script.google.com/macros/s/AKfycbzAr3vWOsFtXcAjdicrC3x2TttgHEqYxAq8R730g2wuOpmBd7D7rFWv4i78c8z6L5SO/exec";
    
    try {
      const response = await fetch(url);
      const righe = await response.json();
      const contenitore = document.getElementById('listaCommenti');
      if (!contenitore) return;
      
      contenitore.innerHTML = ""; 
  
      righe.reverse().forEach(riga => {
        const dataISO = riga[0];
        const autore = riga[1] || "anon";
        const testo = riga[2];
        
        if (!testo) return;

        const dataAbbreviata = new Date(dataISO).toLocaleString('it-IT', {
          day: '2-digit', 
          month: '2-digit',
          hour: '2-digit', 
          minute: '2-digit'
        });
  
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `<span style="color: #666;">[${dataAbbreviata}]</span> <span style="color: #00AA00;">${autore}@tppage:</span> <span style="color: #000000;">${testo}</span>`;
        contenitore.appendChild(div);
      });
    } catch (e) {
      console.error("Errore caricamento commenti:", e);
    }
}

// ==========================================
// 6. UPDATE VISITOR COUNTER
// ==========================================
async function updateViewCounter() {
    const proxy = "https://corsproxy.io/?";
    const baseUrl = "https://api.counterapi.dev/v2/tiagos-team-1-2933/vistor-count";
    const sessionActive = sessionStorage.getItem('visited_tppage');
    
    const ts = new Date().getTime();
    let apiUrl = baseUrl + (sessionActive ? "" : "/up") + "?t=" + ts;
    const finalUrl = proxy + encodeURIComponent(apiUrl);

    try {
        const response = await fetch(finalUrl);
        const json = await response.json();
        
        const countValue = json.data ? json.data.up_count : undefined;
        const element = document.getElementById('view-count');
        const elementTb = document.getElementById('view-count-tb');

        if (countValue !== undefined) {
            if (element) element.innerText = countValue;
            if (elementTb) elementTb.innerText = countValue;
        }

        if (!sessionActive && countValue !== undefined) {
            sessionStorage.setItem('visited_tppage', 'true');
        }
    } catch (error) {
        console.error("Sync error:", error);
    }
}

// ==========================================
// 7. UX RETRÒ & UTILS
// ==========================================
function updateStatusBar() {
    const clockElem = document.getElementById('clock');
    
    const now = new Date();
    const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (clockElem) clockElem.innerText = time;
}

function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function toggleHelpPanel() {
    const helpPanel = document.getElementById('help-panel');
    if (helpPanel) {
        helpPanel.classList.toggle('show');
        const isShown = helpPanel.classList.contains('show');
        helpPanel.setAttribute('aria-hidden', !isShown);
    }
}

function toggleStartMenu() {
    const menu = document.getElementById('start-menu');
    const btn = document.getElementById('start-btn');
    if (menu) {
        menu.classList.toggle('active');
        const isActive = menu.classList.contains('active');
        menu.setAttribute('aria-hidden', !isActive);
        if (btn) btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    }
}

// ==========================================
// 8. EFFETTO DATTILOGRAFIA PER LOADING SCREEN
// ==========================================
async function typeWriterEffect() {
    const loadingScreen = document.getElementById('loading-screen');
    const lines = document.querySelectorAll('.loading-content p');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingProgress = document.querySelector('.loading-progress');
    const loadingPercent = document.getElementById('loading-percent');
    const statusBar = document.getElementById('status-bar');

    if (statusBar) statusBar.style.display = 'none';

    for (const line of lines) {
        if (line.classList.contains('loading-bar') || line.id === 'loading-percent') continue;
        line.style.opacity = '1';
        await new Promise(r => setTimeout(r, 400));
    }

    if (loadingBar) loadingBar.style.display = 'block';
    if (loadingPercent) loadingPercent.style.display = 'block';

    const steps = [0, 45, 85, 100];
    for (const step of steps) {
        if (loadingProgress) loadingProgress.style.width = step + '%';
        if (loadingPercent) loadingPercent.innerText = step + '%';
        await new Promise(r => setTimeout(r, 400));
    }

    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        await new Promise(r => setTimeout(r, 500));
        loadingScreen.style.display = 'none';
    }
    
    if (statusBar) statusBar.style.display = 'flex';
    
    updateStatusBar();
    setInterval(updateStatusBar, 1000);
}

// ==========================================
// 9. INIZIALIZZAZIONE & EVENT LISTENERS GLOBALI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    typeWriterEffect();
    caricaCommenti();
    setInterval(caricaCommenti, 30000);

    // Configurazione ID e Nome Utente Generato
    const promptDisplay = document.getElementById('display-guest-name');
    if (promptDisplay) promptDisplay.innerText = `C:\\TPPage>`;

    const displayUserId = document.getElementById('display-user-id');
    const modalUserName = document.getElementById('modal-user-name');
    if (displayUserId) displayUserId.innerText = guestName;
    if (modalUserName) modalUserName.innerText = guestName;

    // Conteggio Automatico dei Progetti nella Pagina
    const projectCards = document.querySelectorAll('#projects .window');
    const projectCountElem = document.getElementById('project-count');
    const modalTotalProjects = document.getElementById('modal-total-projects');
    if (projectCountElem) projectCountElem.innerText = projectCards.length;
    if (modalTotalProjects) modalTotalProjects.innerText = projectCards.length;

    // Listener per Invio Commento tramite Invio
    const inputField = document.getElementById('commento');
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendToSheets();
        });
    }

    // Gestione Click sul Tasto Explorer nel Menu Start
    const explorerLink = document.getElementById('open-explorer');
    if (explorerLink) {
        explorerLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleExplorer();
            
            // Chiude il Menu Start dopo il click
            const startMenu = document.getElementById('start-menu');
            const startBtn = document.getElementById('start-btn');
            if (startMenu) {
                startMenu.classList.remove('active');
                startMenu.setAttribute('aria-hidden', 'true');
                if (startBtn) startBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Contatore Visite
    setTimeout(() => {
        updateViewCounter();
        setInterval(updateViewCounter, 30000);
    }, 2000);
});

// Gestione Scorciatoie da Tastiera
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        const startMenu = document.getElementById('start-menu');
        const helpPanel = document.getElementById('help-panel');
        const explorer = document.getElementById('explorer');
        
        if (startMenu) startMenu.classList.remove('active');
        if (helpPanel) helpPanel.classList.remove('show');
        if (explorer) explorer.classList.remove('active');
        closeAllModals();
    }
    
    if (e.key === "F1") {
        e.preventDefault();
        toggleHelpPanel();
    }
});

// Gestione Click Esterno per Chiudere i Menu
document.addEventListener('click', (e) => {
    const startMenu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-btn');
    if (startMenu && startMenu.classList.contains('active')) {
        if (!startMenu.contains(e.target) && (!startBtn || !startBtn.contains(e.target))) {
            startMenu.classList.remove('active');
            startMenu.setAttribute('aria-hidden', 'true');
            if (startBtn) startBtn.setAttribute('aria-expanded', 'false');
        }
    }

    const sidebar = document.getElementById('explorer');
    const openExplorerBtn = document.getElementById('open-explorer');
    
    if (sidebar && sidebar.classList.contains('active')) {
        const clickedExplorerLink = openExplorerBtn && openExplorerBtn.contains(e.target);
        if (!sidebar.contains(e.target) && !clickedExplorerLink) {
            sidebar.classList.remove('active');
        }
    }
});