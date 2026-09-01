/**
 * ==============================================================================
 * TPPage Core Logic - Windows 95 Style Interface
 * ==============================================================================
 */

// ==========================================
// 1. CONFIGURATION & GLOBAL STATE
// ==========================================
const GUEST_NAME = `guest_${Math.floor(Math.random() * 899 + 100)}`;
let highestZIndex = 4001;

/**
 * Cache for essential UI elements to avoid repeated DOM queries.
 */
const DOM = {
    overlay: () => document.getElementById('overlay'),
    startMenu: () => document.getElementById('start-menu'),
    helpPanel: () => document.getElementById('help-panel'),
    explorer: () => document.getElementById('explorer')
};

// ==========================================
// 2. WINDOW & Z-INDEX MANAGEMENT
// ==========================================

/**
 * Brings a target HTML element to the foreground by incrementing z-index.
 * @param {HTMLElement} element - The window/panel to bring to front.
 */
function bringToFront(element) {
    if (!element) return;
    element.style.zIndex = ++highestZIndex;
}

/**
 * Toggles the Explorer sidebar navigation panel.
 */
function toggleExplorer() {
    const win = DOM.explorer();
    if (!win) return;
    const isActive = win.classList.toggle('active');
    if (isActive) bringToFront(win);
}

/**
 * Opens a project modal window and highlights its taskbar badge.
 * @param {string} modalId - The DOM ID of the modal to open.
 * @param {string|null} badgeId - Optional taskbar badge ID to activate.
 */
function openProject(modalId, badgeId = null) {
    const modal = document.getElementById(modalId);
    const overlay = DOM.overlay();
    
    if (overlay) overlay.classList.add('modal-active');
    
    if (modal) {
        modal.classList.add('modal-active');
        modal.setAttribute('aria-hidden', 'false');
        bringToFront(modal);
        
        // Auto-detect or activate explicit taskbar item
        const badge = badgeId ? document.getElementById(badgeId) : document.querySelector(`[onclick*="${modalId}"].taskbar-item`);
        badge?.classList.add('active');

        // Set focus on close button for keyboard accessibility
        modal.querySelector('.dot')?.focus();
    }
}

/**
 * Closes all active modal windows and resets taskbar states.
 */
function closeAllModals() {
    DOM.overlay()?.classList.remove('modal-active');
    
    document.querySelectorAll('.modal-window.modal-active').forEach(m => {
        m.classList.remove('modal-active');
        m.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('.taskbar-item.active').forEach(b => b.classList.remove('active'));
}

/**
 * Toggles the retro Help Panel (F1).
 */
function toggleHelpPanel() {
    const help = DOM.helpPanel();
    if (!help) return;
    const isShown = help.classList.toggle('show');
    help.setAttribute('aria-hidden', !isShown);
    if (isShown) bringToFront(help);
}

/**
 * Toggles the Windows 95 Start Menu visibility and ARIA attributes.
 */
function toggleStartMenu() {
    const menu = DOM.startMenu();
    const btn = document.getElementById('start-btn');
    if (!menu) return;
    
    const isActive = menu.classList.toggle('active');
    menu.setAttribute('aria-hidden', !isActive);
    btn?.setAttribute('aria-expanded', isActive);
}

// ==========================================
// 3. DRAGGABLE WINDOW SYSTEM
// ==========================================

/**
 * Initializes click-and-drag functionality for window headers.
 */
function makeWindowsDraggable() {
    document.querySelectorAll('.modal-window, #help-panel, .sidebar').forEach(win => {
        const header = win.querySelector('.header');
        if (!header) return;

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        // Bring window to front on direct click
        win.addEventListener('mousedown', () => bringToFront(win));

        header.addEventListener('mousedown', (e) => {
            // Prevent dragging when clicking control buttons
            if (e.target.classList.contains('dot')) return;

            isDragging = true;
            win.classList.add('draggable-window');

            const rect = win.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

            // Remove transform centering to allow pixel positioning
            win.style.transform = 'none';
            win.style.left = `${initialLeft}px`;
            win.style.top = `${initialTop}px`;

            const onMouseMove = (ev) => {
                if (!isDragging) return;
                win.style.left = `${initialLeft + (ev.clientX - startX)}px`;
                win.style.top = `${initialTop + (ev.clientY - startY)}px`;
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// ==========================================
// 4. COMMENTS SYSTEM (GOOGLE SHEETS BACKEND)
// ==========================================

const CommentsManager = {
    apiUrl: "https://script.google.com/macros/s/AKfycbzAr3vWOsFtXcAjdicrC3x2TttgHEqYxAq8R730g2wuOpmBd7D7rFWv4i78c8z6L5SO/exec",

    /**
     * Fetches public comments from backend and renders them to the UI.
     */
    async load() {
        const container = document.getElementById('listaCommenti');
        if (!container) return;

        try {
            const res = await fetch(this.apiUrl);
            const data = await res.json();
            
            container.innerHTML = ""; 
        
            // Render comments in reverse chronological order
            data.reverse().forEach(([dateIso, author = "anon", text]) => {
                if (!text) return;

                const formattedDate = new Date(dateIso).toLocaleString('it-IT', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                });
        
                const div = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML = `
                    <span class="comment-date">[${formattedDate}]</span> 
                    <strong class="comment-author">${author}</strong>: 
                    <span class="comment-text">${text}</span>
                `;
                container.appendChild(div);
            });
        } catch (e) {
            console.error("Failed to load comments:", e);
        }
    },

    /**
     * Posts a new comment to Google Apps Script endpoint.
     */
    async send() {
        const input = document.getElementById('commento');
        const sendBtn = document.getElementById('send-btn');
        const text = input?.value.trim();

        if (!text || !sendBtn) return;
        
        sendBtn.disabled = true;
        const originalText = sendBtn.innerText;
        sendBtn.innerText = "[SENDING...]";
      
        const formData = new FormData();
        formData.append("testo", text); 
        formData.append("autore", GUEST_NAME); 
      
        try {
            await fetch(this.apiUrl, { method: "POST", mode: "no-cors", body: formData });
            input.value = "";
            showToast('[INFO] Comment posted successfully');
            sendBtn.innerText = "[OK]";
            setTimeout(() => {
                sendBtn.innerText = originalText;
                sendBtn.disabled = false;
            }, 1500);
            this.load(); 
        } catch (err) {
            console.error("Failed to post comment:", err);
            sendBtn.innerText = "[ERROR]";
            setTimeout(() => {
                sendBtn.innerText = originalText;
                sendBtn.disabled = false;
            }, 2000);
        }
    }
};

// ==========================================
// 5. VISITOR COUNTER SERVICE
// ==========================================

/**
 * Updates page counter using a CORS proxy and counterapi.dev service.
 */
async function updateViewCounter() {
    const proxy = "https://corsproxy.io/?";
    const baseUrl = "https://api.counterapi.dev/v2/tiagos-team-1-2933/vistor-count";
    const sessionActive = sessionStorage.getItem('visited_tppage');
    const apiUrl = `${baseUrl}${sessionActive ? "" : "/up"}?t=${Date.now()}`;

    try {
        const res = await fetch(proxy + encodeURIComponent(apiUrl));
        const json = await res.json();
        const count = json.data?.up_count;

        if (count !== undefined) {
            ['view-count', 'view-count-tb'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = count;
            });
            if (!sessionActive) sessionStorage.setItem('visited_tppage', 'true');
        }
    } catch (e) {
        console.error("Counter sync error:", e);
    }
}

// ==========================================
// 6. UTILITY UX & NOTIFICATIONS
// ==========================================

/**
 * Updates status bar clock display.
 */
function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) {
        clock.innerText = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
}

/**
 * Displays a temporary toast message at bottom right.
 * @param {string} message - Text to show in notification.
 * @param {number} duration - Display time in milliseconds.
 */
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

// ==========================================
// 7. RETRO BOOT SEQUENCE
// ==========================================

/**
 * Simulates a command-line loading screen with typewriter effect.
 */
async function typeWriterEffect() {
    const loadingScreen = document.getElementById('loading-screen');
    const lines = document.querySelectorAll('.loading-content p');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingProgress = document.querySelector('.loading-progress');
    const loadingPercent = document.getElementById('loading-percent');

    const delay = ms => new Promise(r => setTimeout(r, ms));

    // Reveal text lines sequentially
    for (const line of lines) {
        if (line.classList.contains('loading-bar') || line.id === 'loading-percent') continue;
        line.style.opacity = '1';
        await delay(300);
    }

    if (loadingBar) loadingBar.style.display = 'block';
    if (loadingPercent) loadingPercent.style.display = 'block';

    // Step-by-step progress bar animation
    for (const step of [0, 45, 85, 100]) {
        if (loadingProgress) loadingProgress.style.width = `${step}%`;
        if (loadingPercent) loadingPercent.innerText = `${step}%`;
        await delay(300);
    }

    // Hide boot screen
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        await delay(400);
        loadingScreen.style.display = 'none';
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// ==========================================
// 8. INITIALIZATION & EVENT HANDLERS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    typeWriterEffect();
    CommentsManager.load();
    setInterval(() => CommentsManager.load(), 30000);
    makeWindowsDraggable();

    // Set guest ID across interface
    ['display-user-id', 'modal-user-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = GUEST_NAME;
    });

    // Count and update active projects display
    const projectCount = document.querySelectorAll('#projects .window').length;
    ['project-count', 'modal-total-projects'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = projectCount;
    });

    // Handle comment submit via Enter key
    document.getElementById('commento')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') CommentsManager.send();
    });

    // Start Menu Explorer action
    document.getElementById('open-explorer')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleExplorer();
        toggleStartMenu();
    });

    // Delayed view counter fetch
    setTimeout(() => {
        updateViewCounter();
        setInterval(updateViewCounter, 30000);
    }, 2000);
});

// Global keyboard shortcuts (ESC to close, F1 for Help)
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        DOM.startMenu()?.classList.remove('active');
        DOM.helpPanel()?.classList.remove('show');
        DOM.explorer()?.classList.remove('active');
        closeAllModals();
    }
    if (e.key === "F1") {
        e.preventDefault();
        toggleHelpPanel();
    }
});

// Close UI popups when clicking outside their area
document.addEventListener('click', (e) => {
    const menu = DOM.startMenu();
    const btn = document.getElementById('start-btn');
    if (menu?.classList.contains('active') && !menu.contains(e.target) && !btn?.contains(e.target)) {
        menu.classList.remove('active');
    }

    const explorer = DOM.explorer();
    const openBtn = document.getElementById('open-explorer');
    if (explorer?.classList.contains('active') && !explorer.contains(e.target) && !openBtn?.contains(e.target)) {
        explorer.classList.remove('active');
    }
});