// 1. GENERAZIONE IDENTITÀ CASUALE
const randomId = Math.floor(Math.random() * 899 + 100);
const guestName = `guest_${randomId}`;

// 2. GESTIONE FINESTRE E SIDEBAR
function toggleExplorer() {
    const win = document.getElementById('explorer');
    win.classList.toggle('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        const explorer = document.getElementById('explorer');
        if(explorer) explorer.classList.remove('active');
        closeAllModals();
    }
});

document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const btn = document.querySelector('.menu-trigger');
    if (sidebar && sidebar.classList.contains('active')) {
        if (!sidebar.contains(event.target) && !btn.contains(event.target)) {
            sidebar.classList.remove('active');
            console.log("Explorer: CLOSED_BY_EXTERNAL_CLICK");
        }
    }
});

// 3. GESTIONE MODALI
function openProject(modalId) {
    document.getElementById('overlay').classList.add('modal-active');
    document.getElementById(modalId).classList.add('modal-active');
}

function closeAllModals() {
    const overlay = document.getElementById('overlay');
    if(overlay) overlay.classList.remove('modal-active');
    const modals = document.querySelectorAll('.modal-window');
    modals.forEach(m => m.classList.remove('modal-active'));
}

// 4. INVIO DATI A GOOGLE SHEETS
function sendToSheets() {
    const url = "https://script.google.com/macros/s/AKfycbzAr3vWOsFtXcAjdicrC3x2TttgHEqYxAq8R730g2wuOpmBd7D7rFWv4i78c8z6L5SO/exec"; // <--- METTI IL TUO URL /exec
    const input = document.getElementById('commento');
    const testo_da_inviare = input.value;
  
    if(!testo_da_inviare) return;
  
    const formData = new FormData();
    
    // CONTROLLA BENE QUI:
    // "testo" deve contenere il messaggio (finirà in Colonna C)
    // "autore" deve contenere il guestName (finirà in Colonna B)
    formData.append("testo", testo_da_inviare); 
    formData.append("autore", guestName); 
  
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: formData
    })
    .then(() => {
      input.value = "";
      console.log("Inviato: " + testo_da_inviare + " come " + guestName);
      caricaCommenti(); 
    })
    .catch(err => console.error("Errore invio:", err));
}


// 5. CARICAMENTO COMMENTI (STILE TERMINALE)
async function caricaCommenti() {
    const url = "https://script.google.com/macros/s/AKfycbzAr3vWOsFtXcAjdicrC3x2TttgHEqYxAq8R730g2wuOpmBd7D7rFWv4i78c8z6L5SO/exec";
    
    try {
      const response = await fetch(url);
      const righe = await response.json();
      const contenitore = document.getElementById('listaCommenti');
      if(!contenitore) return;
      
      contenitore.innerHTML = ""; 
  
      righe.reverse().forEach(riga => {
        const dataISO = riga[0];
        const autore = riga[1] || "anon";
        const testo = riga[2];
        
        if(!testo) return;

        // MODIFICA QUI: Aggiunto day e month
        const dataAbbreviata = new Date(dataISO).toLocaleString('it-IT', {
          day: '2-digit', 
          month: '2-digit',
          hour: '2-digit', 
          minute: '2-digit'
        });
  
        const div = document.createElement('div');
        div.className = 'comment-item';
        
        // Risultato: [16/02, 14:30] guest_123: Messaggio
        div.innerHTML = `<span style="color: #666;">[${dataAbbreviata}]</span> <span style="color: #16c60c;">${autore}@tppage:</span> <span style="color: #D3D7CF;">${testo}</span>`;
        contenitore.appendChild(div);
      });
    } catch (e) {
      console.error("Errore caricamento:", e);
    }
}


// 6. INIZIALIZZAZIONE AL CARICAMENTO
window.addEventListener('load', () => {
    console.log("Script.js caricato correttamente!");
    
    // Imposta il prompt del terminale col nome casuale
    const promptDisplay = document.getElementById('display-guest-name');
    if (promptDisplay) {
        promptDisplay.innerText = `${guestName}@tppage:~$`;
    }

    // Carica commenti e attiva loop 30s
    caricaCommenti();
    setInterval(caricaCommenti, 30000);

    // Permetti invio con tasto INVIO
    const inputField = document.getElementById('commento');
    if(inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendToSheets();
        });
    }

    // --- CONTATORE VISITE ---
  async function updateViewCounter() {
    const proxy = "https://corsproxy.io/?";
    const baseUrl = "https://api.counterapi.dev/v2/tiagos-team-1-2933/vistor-count";
    const sessionActive = sessionStorage.getItem('visited_tppage');
    
    // Creiamo il timestamp per la cache
    const ts = new Date().getTime();
    
    // Costruiamo l'URL corretto per l'API v2
    // Se non ha visitato: .../vistor-count/up?t=123
    // Se ha già visitato: .../vistor-count?t=123
    let apiUrl = baseUrl + (sessionActive ? "" : "/up") + "?t=" + ts;

    // Ora passiamo tutto l'URL pulito al proxy
    const finalUrl = proxy + encodeURIComponent(apiUrl);

    try {
        const response = await fetch(finalUrl);
        const json = await response.json();
        
        const countValue = json.data ? json.data.up_count : undefined;
        const element = document.getElementById('view-count');

        if (element && countValue !== undefined) {
            element.innerText = countValue;
            console.log("Real-time sync:", countValue);
        }

        if (!sessionActive && countValue !== undefined) {
            sessionStorage.setItem('visited_tppage', 'true');
        }
    } catch (error) {
        console.error("Sync error:", error);
    }
}



    setTimeout(() => {
        updateViewCounter();
        setInterval(updateViewCounter, 30000);
    }, 3000);
});





