

function toggleExplorer() {
    // Seleziona la finestra tramite il suo ID
    const win = document.getElementById('explorer');
    
    // Aggiunge o toglie la classe 'active'
    win.classList.toggle('active');
}

// Opzionale: chiudi con il tasto ESC
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        document.getElementById('explorer').classList.remove('active');
    }
});
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const btn = document.querySelector('.menu-trigger');

    // Se la sidebar è aperta (ha la classe active)...
    if (sidebar.classList.contains('active')) {
        
        /* ...e se il click NON è avvenuto dentro la sidebar 
           e NON è avvenuto sul pulsante del menu... */
        if (!sidebar.contains(event.target) && !btn.contains(event.target)) {
            
            // ...allora togli la classe active
            sidebar.classList.remove('active');
            console.log("Explorer: CLOSED_BY_EXTERNAL_CLICK");
        }
    }
});


function openProject(modalId) {
    document.getElementById('overlay').classList.add('modal-active');
    document.getElementById(modalId).classList.add('modal-active');
}

function closeAllModals() {
    document.getElementById('overlay').classList.remove('modal-active');
    // Cerca tutte le finestre modali e le chiude
    const modals = document.querySelectorAll('.modal-window');
    modals.forEach(m => m.classList.remove('modal-active'));
}


document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        closeAllModals();
        // Se vuoi chiudere anche la sidebar:
        const sidebar = document.querySelector('.sidebar');
        if(sidebar) sidebar.classList.remove('active');
    }
});


function sendToSheets() {
    const url = "https://script.google.com/macros/s/AKfycbw81UUis3dhRRJgBXiYraFRDx9TqbjmkJY1h0opabg0RnbS_tOyQ0f6I9iGozfCCn26/exec";
    const testo = document.getElementById('commento').value;
  
    // Se il campo è vuoto, esce dalla funzione senza fare nulla
    if(!testo) return;
  
    const formData = new FormData();
    formData.append("testo", testo);
  
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: formData
    })
    .then(() => {
      // Pulisce il campo di testo in silenzio
      document.getElementById('commento').value = "";
      console.log("Inviato con successo!"); 
    })
    .catch(err => {
      // Registra l'errore solo in console per i tuoi test
      console.error("Errore nell'invio:", err);
    });
  }
  
  async function caricaCommenti() {
    const url = "https://script.google.com/macros/s/AKfycbw81UUis3dhRRJgBXiYraFRDx9TqbjmkJY1h0opabg0RnbS_tOyQ0f6I9iGozfCCn26/exec";
    
    try {
      const response = await fetch(url);
      const righe = await response.json();
      const contenitore = document.getElementById('listaCommenti');
      contenitore.innerHTML = ""; // Pulisce il caricamento
  
      // Mostra i commenti dal più recente al più vecchio
      righe.reverse().forEach(riga => {
        const dataISO = riga[0];
        const testo = riga[1];
        
        // Abbrevia la data (es: 15/02, 17:30)
        const dataAbbreviata = new Date(dataISO).toLocaleString('it-IT', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
  
        const div = document.createElement('div');
        div.innerHTML = `<small style="color: #333;">${dataAbbreviata}</small> <br> <p>${testo}</p> <hr style="border: 1px solid;">`;
        contenitore.appendChild(div);
      });
    } catch (e) {
      console.error("Errore caricamento:", e);
    }
  }
  
  // Carica i commenti appena apri la pagina
  caricaCommenti();
  // Controlla nuovi commenti ogni 30 secondi
    setInterval(caricaCommenti, 30000); 
