/**
 * ==============================================================================
 * TPPage Core Logic - Windows 95 Style Interface
 * ==============================================================================
 */

// ==========================================
// 1. CONFIGURATION & GLOBAL STATE
// ==========================================

/**
 * Retrieves the stored username from local storage or generates a default guest ID.
 * @returns {string} The active username.
 */
function getInitialUsername() {
    return localStorage.getItem('tppage_username') || `guest_${Math.floor(Math.random() * 899 + 100)}`;
}

/**
 * Current user identifier used for active session and comment submissions.
 * @type {string}
 */
let CURRENT_USER = getInitialUsername();

/**
 * Global counter tracking the highest window z-index layer.
 * @type {number}
 */
let highestZIndex = 4001;

/**
 * Cache for primary structural UI elements to minimize DOM lookups.
 * @type {Object.<string, function(): HTMLElement|null>}
 */
const DOM = {
    overlay: () => document.getElementById('overlay'),
    startMenu: () => document.getElementById('start-menu'),
    helpPanel: () => document.getElementById('help-panel'),
    explorer: () => document.getElementById('explorer')
};

/**
 * Retrieves stored user database object mapping usernames to passwords.
 * @returns {Object.<string, string>} Hashmap of user credentials.
 */
function getUserCredentialsDB() {
    try {
        return JSON.parse(localStorage.getItem('tppage_user_db') || '{}');
    } catch {
        return {};
    }
}

/**
 * Updates the current username in persistent storage with password authentication.
 * @param {string} newUsername - The new nickname selected by the user.
 * @param {string} password - The authentication key/password for the nickname.
 * @returns {boolean} True if username update was successful, false otherwise.
 */
function setUsername(newUsername, password) {
    const cleanName = newUsername.trim();
    const cleanPass = password.trim();

    if (!cleanName) {
        showToast('[ERROR] Username cannot be empty');
        return false;
    }

    if (!cleanPass) {
        showToast('[ERROR] Password required to claim nickname');
        return false;
    }

    const db = getUserCredentialsDB();

    // Check if the username is already registered in local database
    if (db[cleanName]) {
        if (db[cleanName] !== cleanPass) {
            showToast('[ERROR] Invalid password for this nickname!');
            return false;
        }
    } else {
        // Register new nickname with given password
        db[cleanName] = cleanPass;
        localStorage.setItem('tppage_user_db', JSON.stringify(db));
        showToast('[INFO] New nickname registered with password');
    }

    CURRENT_USER = cleanName;
    localStorage.setItem('tppage_username', CURRENT_USER);

    // Synchronize DOM UI elements
    ['display-user-id', 'modal-user-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = CURRENT_USER;
    });

    const userInput = /** @type {HTMLInputElement|null} */ (document.getElementById('username-input'));
    if (userInput) userInput.value = CURRENT_USER;

    const passInput = /** @type {HTMLInputElement|null} */ (document.getElementById('password-input'));
    if (passInput) passInput.value = '';

    showToast(`[INFO] Authenticated as: ${CURRENT_USER}`);
    return true;
}

/**
 * Handler function invoked via input triggers or buttons to save profile credentials.
 * @returns {void}
 */
function updateUsername() {
    const userInput = /** @type {HTMLInputElement|null} */ (document.getElementById('username-input'));
    const passInput = /** @type {HTMLInputElement|null} */ (document.getElementById('password-input'));

    const username = userInput?.value || '';
    const password = passInput?.value || '';

    const success = setUsername(username, password);
    if (success) {
        closeAllModals();
    }
}

// ==========================================
// 2. WINDOW & Z-INDEX MANAGEMENT
// ==========================================

/**
 * Promotes a specified window/dialog element to the top z-index layer.
 * @param {HTMLElement|null} element - Target element to focus.
 * @returns {void}
 */
function bringToFront(element) {
    if (!element) return;
    element.style.zIndex = String(++highestZIndex);
}

/**
 * Toggles visibility state of the Explorer sidebar panel.
 * @returns {void}
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
 * @returns {void}
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

        /** @type {HTMLElement|null} */ (modal.querySelector('.dot'))?.focus();
    }
}

/**
 * Dismisses all modal dialog windows and resets taskbar states.
 * @returns {void}
 */
function closeAllModals() {
    DOM.overlay()?.classList.remove('modal-active');
    
    document.querySelectorAll('.modal-window.modal-active').forEach(modal => {
        const htmlModal = /** @type {HTMLElement} */ (modal);
        htmlModal.classList.remove('modal-active');
        htmlModal.setAttribute('aria-hidden', 'true');
        // Reset manual position styles applied during dragging
        htmlModal.style.left = '';
        htmlModal.style.top = '';
        htmlModal.style.transform = '';
    });

    document.querySelectorAll('.taskbar-item.active').forEach(badge => badge.classList.remove('active'));
}

/**
 * Toggles system help overlay panel visibility.
 * @returns {void}
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
 * @returns {void}
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
 * @returns {void}
 */
function makeWindowsDraggable() {
    document.querySelectorAll('.modal-window, #help-panel, .sidebar').forEach(winElement => {
        const win = /** @type {HTMLElement} */ (winElement);
        const header = win.querySelector('.header');
        if (!header) return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        win.addEventListener('mousedown', () => bringToFront(win));

        header.addEventListener('mousedown', (e) => {
            const mouseEv = /** @type {MouseEvent} */ (e);
            if ((/** @type {HTMLElement} */ (mouseEv.target)).classList.contains('dot')) return;

            isDragging = true;
            win.classList.add('draggable-window');

            const rect = win.getBoundingClientRect();
            startX = mouseEv.clientX;
            startY = mouseEv.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

            win.style.transform = 'none';
            win.style.left = `${initialLeft}px`;
            win.style.top = `${initialTop}px`;

            /**
             * Handles window movement during mouse dragging.
             * @param {MouseEvent} ev - Mouse move event.
             */
            const onMouseMove = (ev) => {
                if (!isDragging) return;
                win.style.left = `${initialLeft + (ev.clientX - startX)}px`;
                win.style.top = `${initialTop + (ev.clientY - startY)}px`;
            };

            /**
             * Cleans up mouse drag listeners upon releasing click.
             */
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
 * @typedef {Object} CommentsManager
 * @property {string} apiUrl - Endpoint URL for the backend App Script service.
 * @property {function(): Promise<void>} load - Fetches and renders existing comments.
 * @property {function(): Promise<void>} send - Submits a new comment payload.
 */

/** @type {CommentsManager} */
const CommentsManager = {
    /** @type {string} */
    apiUrl: "https://script.google.com/macros/s/AKfycbzAr3vWOsFtXcAjdicrC3x2TttgHEqYxAq8R730g2wuOpmBd7D7rFWv4i78c8z6L5SO/exec",

    /**
     * Fetches stored comments from remote service and injects markup into DOM.
     * @async
     * @returns {Promise<void>}
     */
    async load() {
        const container = document.getElementById('listaCommenti');
        if (!container) return;

        try {
            const res = await fetch(this.apiUrl);
            /** @type {Array<[string, string, string]>} */
            const data = await res.json();
            
            container.innerHTML = ""; 
        
            data.reverse().forEach(([dateIso, author = "anon", text]) => {
                if (!text) return;

                const formattedDate = new Date(dateIso).toLocaleString('en-US', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                });
        
                const div = document.createElement('div');
                div.className = 'comments-item';
                div.innerHTML = `
                    <span class="comments-date">[${formattedDate}]</span> 
                    <strong class="comments-author">${author}</strong>: 
                    <span class="comments-text">${text}</span>
                `;
                container.appendChild(div);
            });
        } catch (e) {
            console.error("Failed to load comments:", e);
        }
    },

    /**
     * Submits current comment input payload to backend service using current user nickname.
     * @async
     * @returns {Promise<void>}
     */
    async send() {
        const input = /** @type {HTMLInputElement|null} */ (document.getElementById('commento'));
        const sendBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('send-btn'));
        const text = input?.value.trim();

        if (!text || !sendBtn) return;
        
        sendBtn.disabled = true;
        const originalText = sendBtn.innerText;
        sendBtn.innerText = "[SENDING...]";
      
        const formData = new FormData();
        formData.append("testo", text); 
        formData.append("autore", CURRENT_USER); 
      
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
 * Polls proxy endpoint to update page view counter elements.
 * @async
 * @returns {Promise<void>}
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
                element.textContent = Number(count).toLocaleString("en-US");
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
 * Assembles and injects obfuscated email link into target container to prevent web scraping.
 * @returns {void}
 */
function initEmailObfuscation() {
    const user = 'tiagosprojectspage';
    const domain = 'gmail.com';
    const container = document.getElementById('email-container');

    if (container) {
        container.innerHTML = `<a href="mailto:${user}@${domain}" class="link">${user}@${domain}</a>`;
    }
}

/**
 * Synchronizes real-time status bar clock widget.
 * @returns {void}
 */
function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) {
        clock.innerText = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
}

/**
 * Triggers a transient notification banner overlay.
 * @param {string} message - Content string for toast popup.
 * @param {number} [duration=3000] - Lifespan in milliseconds.
 * @returns {void}
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
 * Renders loading screen boot process sequence using animated typewriter effect.
 * @async
 * @returns {Promise<void>}
 */
async function typeWriterEffect() {
    const loadingScreen = document.getElementById('loading-screen');
    const lines = document.querySelectorAll('.loading-content p');
    const loadingBar = /** @type {HTMLElement|null} */ (document.querySelector('.loading-bar'));
    const loadingProgress = /** @type {HTMLElement|null} */ (document.querySelector('.loading-progress'));
    const loadingPercent = document.getElementById('loading-percent');

    /**
     * Pauses execution for a specified duration.
     * @param {number} ms - Delay in milliseconds.
     * @returns {Promise<void>}
     */
    const delay = ms => new Promise(r => setTimeout(r, ms));

    for (const line of lines) {
        const htmlLine = /** @type {HTMLElement} */ (line);
        if (htmlLine.classList.contains('loading-bar') || htmlLine.id === 'loading-percent') continue;
        htmlLine.style.opacity = '1';
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
    initEmailObfuscation();
    CommentsManager.load();
    setInterval(() => CommentsManager.load(), 30000);
    makeWindowsDraggable();

    // Synchronize UI elements with current username state
    ['display-user-id', 'modal-user-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = CURRENT_USER;
    });

    const userInput = /** @type {HTMLInputElement|null} */ (document.getElementById('username-input'));
    if (userInput) userInput.value = CURRENT_USER;

    const projectCount = document.querySelectorAll('section#projects .window').length;
    ['project-count', 'modal-total-projects'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = String(projectCount);
    });

    // Enter listeners for login modal inputs
    document.getElementById('username-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') updateUsername();
    });
    document.getElementById('password-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') updateUsername();
    });

    // Enter listener for posting comments
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
        const menu = DOM.startMenu();
        if (menu?.classList.contains('active')) {
            menu.classList.remove('active');
            menu.setAttribute('aria-hidden', 'true');
            document.getElementById('start-btn')?.setAttribute('aria-expanded', 'false');
        }
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
    const clickTarget = /** @type {Node} */ (e.target);
    
    // Close Start menu if user clicks outside
    if (menu?.classList.contains('active') && !menu.contains(clickTarget) && !btn?.contains(clickTarget)) {
        menu.classList.remove('active');
        menu.setAttribute('aria-hidden', 'true');
        btn?.setAttribute('aria-expanded', 'false');
    }

    const explorer = DOM.explorer();
    const openBtn = document.getElementById('open-explorer');
    if (explorer?.classList.contains('active') && !explorer.contains(clickTarget) && !openBtn?.contains(clickTarget)) {
        explorer.classList.remove('active');
    }
});