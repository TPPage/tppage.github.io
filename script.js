/**
 * ==============================================================================
 * TPPage Core Logic - Retro Operating System & Window Management
 * ==============================================================================
 */

// ==========================================
// 1. GLOBAL CONFIGURATION & STATE
// ==========================================

const ROLES = {
    GUEST: 0,
    USER: 1,
    MODERATOR: 2,
    ADMIN: 3,
    OWNER: 4
};

/**
 * Retrieves the stored username from local storage or generates a default guest ID.
 * @returns {string} The active username.
 */
function getInitialUsername() {
    return localStorage.getItem('tppage_username') || `guest_${Math.floor(Math.random() * 899 + 100)}`;
}

let CURRENT_USER = getInitialUsername();
let highestZIndex = 4001;

/**
 * Cache for primary structural UI elements to minimize DOM lookups.
 */
const DOM = {
    overlay: () => document.getElementById('overlay'),
    startMenu: () => document.getElementById('start-menu'),
    helpPanel: () => document.getElementById('help-panel'),
    explorer: () => document.getElementById('explorer')
};

// ==========================================
// 2. USER AUTHENTICATION & PERMISSIONS
// ==========================================

/**
 * Retrieves current active user profile information and role level.
 * @returns {{ username: string, role: string, level: number }}
 */
function getCurrentUserProfile() {
    if (CURRENT_USER === 'TGLabsOfficial') {
        return { username: CURRENT_USER, role: 'owner', level: ROLES.OWNER };
    }

    if (CURRENT_USER.startsWith('guest_')) {
        return { username: CURRENT_USER, role: 'guest', level: ROLES.GUEST };
    }

    return { username: CURRENT_USER, role: 'user', level: ROLES.USER };
}

/**
 * Checks if the active user meets a required permission level.
 * @param {number} requiredLevel - Minimum required level from ROLES enum
 * @returns {boolean}
 */
function hasPermission(requiredLevel) {
    return getCurrentUserProfile().level >= requiredLevel;
}

/**
 * Authenticates or registers a user with credentials stored in Cloud Firestore.
 * @async
 * @param {string} newUsername 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<boolean>}
 */
async function setUsername(newUsername, email, password) {
    const cleanName = newUsername.trim();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanName) {
        showToast('[ERROR] Username cannot be empty');
        return false;
    }

    if (cleanName.toLowerCase().startsWith('guest_') && cleanName !== CURRENT_USER) {
        showToast('[ERROR] "guest_" prefix is reserved for guests');
        return false;
    }

    if (!cleanPass) {
        showToast('[ERROR] Password required');
        return false;
    }

    if (!window.db || !window.fbFS) {
        showToast('[ERROR] Database offline');
        return false;
    }

    const { doc, getDoc, setDoc } = window.fbFS;
    const userRef = doc(window.db, 'users', cleanName);

    try {
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // Existing user verification
            const userData = userSnap.data();
            if (userData.password !== cleanPass) {
                showToast('[ERROR] Invalid password!');
                return false;
            }

            // Optional email update upon re-login
            if (cleanEmail && cleanEmail !== userData.email) {
                await setDoc(userRef, { email: cleanEmail }, { merge: true });
            }

            showToast(`[INFO] Welcome back, ${cleanName}!`);
        } else {
            // New user registration
            const role = (cleanName === 'TGLabsOfficial') ? 'owner' : 'user';

            await setDoc(userRef, {
                username: cleanName,
                email: cleanEmail || null,
                password: cleanPass,
                role: role,
                createdAt: new Date()
            });

            showToast('[INFO] Account created successfully!');
        }

        CURRENT_USER = cleanName;
        localStorage.setItem('tppage_username', CURRENT_USER);

        // Update UI elements
        ['display-user-id', 'modal-user-name'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = CURRENT_USER;
        });

        const userInput = document.getElementById('username-input');
        if (userInput) userInput.value = CURRENT_USER;

        const passInput = document.getElementById('password-input');
        if (passInput) passInput.value = '';

        return true;

    } catch (err) {
        console.error("Firestore Auth Error:", err);
        showToast('[ERROR] Could not save user data');
        return false;
    }
}

/**
 * Event handler triggered by save button or enter key in authentication modal.
 * @async
 */
async function updateUsername() {
    const userInput = document.getElementById('username-input');
    const emailInput = document.getElementById('email-input');
    const passInput = document.getElementById('password-input');
    const btn = document.getElementById('auth-save-btn');

    const username = userInput?.value || '';
    const email = emailInput?.value || '';
    const password = passInput?.value || '';

    if (btn) btn.disabled = true;
    const success = await setUsername(username, email, password);
    if (btn) btn.disabled = false;

    if (success) {
        closeAllModals();
    }
}

// ==========================================
// 3. WINDOW & Z-INDEX MANAGEMENT
// ==========================================

/**
 * Promotes a specified window/dialog element to the top z-index layer.
 * @param {HTMLElement|null} element
 */
function bringToFront(element) {
    if (!element) return;
    element.style.zIndex = String(++highestZIndex);
}

/**
 * Toggles visibility state of the Explorer sidebar panel.
 */
function toggleExplorer() {
    const win = DOM.explorer();
    if (!win) return;
    const isActive = win.classList.toggle('active');
    if (isActive) bringToFront(win);
}

/**
 * Displays modal dialog and activates related taskbar indicators.
 * @param {string} modalId
 * @param {string|null} [badgeId=null]
 */
function openProject(modalId, badgeId = null) {
    const modal = document.getElementById(modalId);
    const overlay = DOM.overlay();
    
    if (overlay) overlay.classList.add('active', 'modal-active');
    
    if (modal) {
        modal.classList.add('active', 'modal-active');
        modal.setAttribute('aria-hidden', 'false');
        bringToFront(modal);
        
        const badge = badgeId ? document.getElementById(badgeId) : document.querySelector(`[onclick*="${modalId}"].taskbar-item`);
        badge?.classList.add('active', 'active-app');

        modal.querySelector('.dot')?.focus();
    }
}

/**
 * Dismisses all modal dialog windows and resets taskbar states.
 */
function closeAllModals() {
    const overlay = DOM.overlay();
    if (overlay) overlay.classList.remove('active', 'modal-active');
    
    document.querySelectorAll('.modal-window').forEach(modal => {
        modal.classList.remove('active', 'modal-active');
        modal.setAttribute('aria-hidden', 'true');
        // Reset manual position styles applied during dragging
        modal.style.left = '';
        modal.style.top = '';
        modal.style.transform = '';
    });

    document.querySelectorAll('.taskbar-item').forEach(badge => {
        badge.classList.remove('active', 'active-app');
    });
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
// 4. DRAGGABLE WINDOW SYSTEM
// ==========================================

/**
 * Registers drag handlers on headers for movable window containers.
 */
function makeWindowsDraggable() {
    document.querySelectorAll('.modal-window, #help-panel, .sidebar').forEach(winElement => {
        const win = winElement;
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
// 5. COMMENTS MANAGER (FIRESTORE)
// ==========================================

const CommentsManager = {
    /**
     * Initializes the real-time listener once Firebase is loaded globally.
     */
    init() {
        const checkFB = setInterval(() => {
            if (window.db && window.fbFS) {
                clearInterval(checkFB);
                this.listenForComments();
            }
        }, 100);
    },

    /**
     * Subscribes to Cloud Firestore collection updates in real time.
     */
    listenForComments() {
        const container = document.getElementById('listaCommenti');
        if (!container || !window.db || !window.fbFS) return;

        const { collection, query, orderBy, limit, onSnapshot } = window.fbFS;
        const q = query(collection(window.db, 'comments'), orderBy('timestamp', 'desc'), limit(25));

        onSnapshot(q, (snapshot) => {
            container.innerHTML = "";

            if (snapshot.empty) {
                container.innerHTML = "<p>No comments yet. Be the first to leave a message!</p>";
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                const dateObj = data.timestamp ? data.timestamp.toDate() : new Date();
                const formattedDate = dateObj.toLocaleString('en-US', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                });

                const author = data.author || "anon";
                const text = data.text || "";
                const role = (data.role || (data.isGuest ? 'guest' : 'user')).toUpperCase();

                const div = document.createElement('div');
                div.className = 'comments-item';
                div.innerHTML = `
                    <span class="comments-date">[${formattedDate}]</span> 
                    <span class="role-badge badge-${role.toLowerCase()}">[${role}]</span>
                    <strong class="comments-author">${author}</strong>: 
                    <span class="comments-text">${text}</span>
                `;
                container.appendChild(div);
            });
        }, (err) => {
            console.error("Firestore comments listener error:", err);
            container.innerHTML = "<p>[ERROR] Loading comments failed.</p>";
        });
    },

    /**
     * Submits current comment input payload to Cloud Firestore.
     * @async
     */
    async send() {
        const input = document.getElementById('commento');
        const sendBtn = document.getElementById('send-btn');
        const text = input?.value.trim();

        if (!text || !sendBtn) return;

        if (!window.db || !window.fbFS) {
            showToast('[ERROR] Database offline');
            return;
        }

        const userProfile = getCurrentUserProfile();

        sendBtn.disabled = true;
        const originalText = sendBtn.innerText;
        sendBtn.innerText = "[SENDING...]";

        try {
            const { collection, addDoc } = window.fbFS;
            await addDoc(collection(window.db, 'comments'), {
                text: text,
                author: userProfile.username,
                role: userProfile.role,
                isGuest: userProfile.level === ROLES.GUEST,
                timestamp: new Date()
            });

            input.value = "";
            showToast('[INFO] Comment published!');
            sendBtn.innerText = "[OK]";
            setTimeout(() => {
                sendBtn.innerText = originalText;
                sendBtn.disabled = false;
            }, 1000);
        } catch (err) {
            console.error("Failed to post comment:", err);
            showToast('[ERROR] Could not send comment');
            sendBtn.innerText = "[ERROR]";
            setTimeout(() => {
                sendBtn.innerText = originalText;
                sendBtn.disabled = false;
            }, 2000);
        }
    }
};

// ==========================================
// 6. VISITOR COUNTER SERVICE - GOATCOUNTER
// ==========================================

/**
 * Polls proxy endpoint to update page view counter elements.
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
                element.textContent = Number(count).toLocaleString("en-US");
            }
        });
    } catch (error) {
        console.error("Failed to fetch visitor count:", error);
    }
}

// ==========================================
// 7. UTILITY UX & NOTIFICATIONS
// ==========================================

/**
 * Assembles and injects obfuscated email link into target container.
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
 */
function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) {
        clock.innerText = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
}

/**
 * Displays retro toast notification banner overlay.
 * @param {string} msg 
 * @param {number} [duration=3000] 
 */
function showToast(msg, duration = 3000) {
    let toast = document.getElementById('retro-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'retro-toast';
        toast.className = 'retro-toast toast';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ==========================================
// 8. RETRO BOOT SEQUENCE
// ==========================================

/**
 * Renders loading screen boot process sequence using animated typewriter effect.
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
// 9. INITIALIZATION & EVENT HANDLERS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    typeWriterEffect();
    initEmailObfuscation();
    CommentsManager.init();
    makeWindowsDraggable();

    // Synchronize UI elements with current username state
    ['display-user-id', 'modal-user-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = CURRENT_USER;
    });

    const userInput = document.getElementById('username-input');
    if (userInput) userInput.value = CURRENT_USER.startsWith('guest_') ? '' : CURRENT_USER;

    const projectCount = document.querySelectorAll('section#projects .window').length;
    ['project-count', 'modal-total-projects'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = String(projectCount);
    });

    // Enter key listeners for authentication inputs
    ['username-input', 'email-input', 'password-input'].forEach(id => {
        document.getElementById(id)?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') updateUsername();
        });
    });

    // Enter key listener for comments
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

// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        const menu = DOM.startMenu();
        if (menu?.classList.contains('active')) {
            menu.classList.remove('active');
            menu.setAttribute('aria-hidden', 'true');
            document.getElementById('start-btn')?.setAttribute('aria-expanded', 'false');
        }
        DOM.helpPanel()?.classList.remove('active', 'show');
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
    const clickTarget = e.target;
    
    // Close Start Menu if clicking outside
    if (menu?.classList.contains('active') && !menu.contains(clickTarget) && !btn?.contains(clickTarget)) {
        menu.classList.remove('active');
        menu.setAttribute('aria-hidden', 'true');
        btn?.setAttribute('aria-expanded', 'false');
    }

    // Close Explorer sidebar if clicking outside
    const explorer = DOM.explorer();
    const openBtn = document.getElementById('open-explorer');
    if (explorer?.classList.contains('active') && !explorer.contains(clickTarget) && !openBtn?.contains(clickTarget)) {
        explorer.classList.remove('active');
    }
});