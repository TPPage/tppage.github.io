/**
 * ==============================================================================
 * TPPage Core Logic - Windows 95 Style Interface
 * ==============================================================================
 */

// ==========================================
// 1. CONFIGURATION & GLOBAL STATE
// ==========================================

/**
 * Unique identifier for anonymous sessions.
 * @type {string}
 */
const GUEST_NAME = `guest_${Math.floor(Math.random() * 899 + 100)}`;

/**
 * Global counter tracking highest window z-index layer.
 * @type {number}
 */
let highestZIndex = 4001;

/**
 * Cache for primary structural UI elements to minimize DOM lookups.
 * @type {Object.<string, Function>}
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
 * Promotes a specified window/dialog element to top z-index layer.
 * @param {HTMLElement|null} element - Target element to focus.
 */
function bringToFront(element) {
    if (!element) return;
    element.style.zIndex = ++highestZIndex;
}

/**
 * Toggles visibility state of Explorer sidebar panel.
 */
function toggleExplorer() {
    const win = DOM.explorer();
    if (!win) return;
    const isActive = win.classList.toggle('active');
    if (isActive) bringToFront(win);
}

/**
 * Displays modal dialog and activates related taskbar indicators.
 * @param {string} modalId - ID of target modal dialog element.
 * @param {string|null} [badgeId=null] - Optional taskbar element ID to trigger active status.
 */
function openProject(modalId, badgeId = null) {
    const modal = document.getElementById(modalId);
    const overlay = DOM.overlay();
    
    if (overlay) overlay.classList.add('modal-active');
    
    if (modal) {
        modal.classList.add('modal-active');
        modal.setAttribute('aria-hidden', 'false');
        bringToFront(modal);
        
        const badge = badgeId ? document.getElementById(badgeId) : document.querySelector(`[onclick*="${modalId}"].taskbar-item`);
        badge?.classList.add('active');

        modal.querySelector('.dot')?.focus();
    }
}

/**
 * Dismisses all modal dialog windows and resets taskbar states.
 */
function closeAllModals() {
    DOM.overlay()?.classList.remove('modal-active');
    
    document.querySelectorAll('.modal-window.modal-active').forEach(modal => {
        modal.classList.remove('modal-active');
        modal.setAttribute('aria-hidden', 'true');
        // Reset manual position styles applied during dragging
        modal.style.left = '';
        modal.style.top = '';
        modal.style.transform = '';
    });

    document.querySelectorAll('.taskbar-item.active').forEach(badge => badge.classList.remove('active'));
}

/**
 * Toggles system help overlay panel visibility.
 */
function toggleHelpPanel() {
    const help = DOM.helpPanel();
    if (!help) return;
    const isShown = help.classList.toggle('show');
    help.setAttribute('aria-hidden', String(!isShown));
    if (isShown) bringToFront(help);
}

/**
 * Toggles retro Start Menu expansion state.
 */
function toggleStartMenu() {
    const menu = DOM.startMenu();
    const btn = document.getElementById('start-btn');
    if (!menu) return;
    
    const isActive = menu.classList.toggle('active');
    menu.setAttribute('aria-hidden', String(!isActive));
    btn?.setAttribute('aria-expanded', String(isActive));
}

// ==========================================
// 3. DRAGGABLE WINDOW SYSTEM
// ==========================================

/**
 * Registers drag handlers on headers for movable window containers.
 */
function makeWindowsDraggable() {
    document.querySelectorAll('.modal-window, #help-panel, .sidebar').forEach(win => {
        const header = win.querySelector('.header');
        if (!header) return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        win.addEventListener('mousedown', () => bringToFront(win));

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('dot')) return;

            isDragging = true;
            win.classList.add('draggable-window');

            const rect = win.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

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

/**
 * Controller service managing backend integration for comments.
 * @namespace
 */
const CommentsManager = {
    /** @type {string} */
    apiUrl: "https://script.google.com/macros/s/AKfycbzAr3vWOsFtXcAjdicrC3x2TttgHEqYxAq8R730g2wuOpmBd7D7rFWv4i78c8z6L5SO/exec",

    /**
     * Fetches stored comments from remote service and injects markup.
     * @async
     */
    async load() {
        const container = document.getElementById('listaCommenti');
        if (!container) return;

        try {
            const res = await fetch(this.apiUrl);
            const data = await res.json();
            
            container.innerHTML = ""; 
        
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
     * Submits current comment input payload to backend service.
     * @async
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
// 5. VISITOR COUNTER SERVICE - GOATCOUNTER
// ==========================================

/**
 * Polls proxy endpoint to update page view elements.
 * @async
 */
async function updateViewCounter() {
    const proxyUrl = "https://goatcounter.tiagosprojectspage.workers.dev/api/visits";

    try {
        const res = await fetch(`${proxyUrl}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const count = data.total ?? data.count ?? data.visits ?? data.pageviews ?? data.value;

        if (count === undefined || count === null) throw new Error("Visit count missing from response");

        ["view-count", "view-count-tb"].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = Number(count).toLocaleString("it-IT");
            }
        });
    } catch (error) {
        console.error("Failed to fetch visitor count:", error);
    }
}

// ==========================================
// 6. UTILITY UX & NOTIFICATIONS
// ==========================================

/**
 * Synchronizes real-time status bar clock widget.
 */
function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) {
        clock.innerText = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
}

/**
 * Triggers transient notification banner overlay.
 * @param {string} message - Content string for toast popup.
 * @param {number} [duration=3000] - Lifespan in milliseconds.
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
 * Renders loading screen boot process sequence.
 * @async
 */
async function typeWriterEffect() {
    const loadingScreen = document.getElementById('loading-screen');
    const lines = document.querySelectorAll('.loading-content p');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingProgress = document.querySelector('.loading-progress');
    const loadingPercent = document.getElementById('loading-percent');

    const delay = ms => new Promise(r => setTimeout(r, ms));

    for (const line of lines) {
        if (line.classList.contains('loading-bar') || line.id === 'loading-percent') continue;
        line.style.opacity = '1';
        await delay(300);
    }

    if (loadingBar) loadingBar.style.display = 'block';
    if (loadingPercent) loadingPercent.style.display = 'block';

    for (const step of [0, 45, 85, 100]) {
        if (loadingProgress) loadingProgress.style.width = `${step}%`;
        if (loadingPercent) loadingPercent.innerText = `${step}%`;
        await delay(300);
    }

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

    ['display-user-id', 'modal-user-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = GUEST_NAME;
    });

    const projectCount = document.querySelectorAll('#projects .window').length;
    ['project-count', 'modal-total-projects'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = String(projectCount);
    });

    document.getElementById('commento')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') CommentsManager.send();
    });

    document.getElementById('open-explorer')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleExplorer();
        toggleStartMenu();
    });

    setTimeout(() => {
        updateViewCounter();
        setInterval(updateViewCounter, 30000);
    }, 2000);
});

// System Keyboard Shortcuts
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

// Click Outside Handlers
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