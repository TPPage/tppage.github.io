/**
 * ==============================================================================
 * TPPage Web OS - Core Client Script
 * ==============================================================================
 * @fileoverview Full Web OS execution engine, Firestore authentication, role-based access control,
 * session re-authentication verification, and window manager for TPPage.
 * @module Core
 */

// ==========================================
// 1. GLOBAL CONFIGURATION & STATE
// ==========================================

/**
 * Enumeration of available user roles and their numerical hierarchy levels.
 * @readonly
 * @enum {number}
 */
const ROLES = {
    GUEST: 0,
    USER: 1,
    VIP: 2,
    MOD: 3,
    ADMIN: 4,
    OWNER: 5
};

/**
 * Mapping table to convert string identifiers to numerical ROLES levels.
 * @type {Object.<string, number>}
 */
const ROLE_LEVELS = {
    'guest': ROLES.GUEST,
    'user': ROLES.USER,
    'vip': ROLES.VIP,
    'mod': ROLES.MOD,
    'moderator': ROLES.MOD,
    'admin': ROLES.ADMIN,
    'owner': ROLES.OWNER
};

/**
 * Generates a default guest handle or retrieves the saved handle from localStorage.
 * @returns {string} Active user handle.
 */
function getInitialUsername() {
    return localStorage.getItem('tppage_username') || `guest_${Math.floor(Math.random() * 899 + 100)}`;
}

/** @type {string} */
let currentUser = getInitialUsername();

/** @type {number} */
let highestZIndex = 4001;

/** @type {number|null} */
let toastTimeoutId = null;

/**
 * DOM reference caching map for performance optimization.
 * @type {Object.<string, function(): (HTMLElement|null)>}
 */
const DOM = {
    /** @returns {HTMLElement|null} */
    startMenu: () => document.getElementById('start-menu'),
    /** @returns {HTMLElement|null} */
    explorer: () => document.getElementById('explorer')
};

// ==========================================
// 2. USER AUTHENTICATION & PERMISSIONS
// ==========================================

/**
 * @typedef {Object} UserProfile
 * @property {string} username - User handle.
 * @property {string} role - String role key.
 * @property {number} level - Numerical permissions level matching ROLES enum.
 */

/**
 * Resolves profile properties and permission level of the currently active account.
 * @returns {UserProfile} Active user profile metadata.
 */
function getCurrentUserProfile() {
    if (currentUser.startsWith('guest_')) {
        return { username: currentUser, role: 'guest', level: ROLES.GUEST };
    }

    const savedRole = (localStorage.getItem('tppage_role') || 'user').toLowerCase();
    const level = ROLE_LEVELS[savedRole] ?? ROLES.USER;

    return { username: currentUser, role: savedRole, level: level };
}

/**
 * Verifies if the active account meets or exceeds a required permission level.
 * @param {number} requiredLevel - Minimum required level from ROLES enum.
 * @returns {boolean} True if user has adequate permission level.
 */
function hasPermission(requiredLevel) {
    return getCurrentUserProfile().level >= requiredLevel;
}

/**
 * Helper function to update all UI elements showing current user state.
 */
function updateUIUserDisplay() {
    const profile = getCurrentUserProfile();
    const roleUpper = profile.role.toUpperCase();

    const nameElem = document.getElementById('modal-user-name');
    if (nameElem) nameElem.innerText = currentUser;

    const roleElem = document.getElementById('modal-user-role');
    if (roleElem) roleElem.innerText = roleUpper;

    const displayUserElem = document.getElementById('display-user-id');
    if (displayUserElem) displayUserElem.innerText = `${currentUser} [${roleUpper}]`;
}

/**
 * Synchronizes user role state directly from Cloud Firestore upon initialization.
 * @async
 * @returns {Promise<void>}
 */
async function syncUserProfileOnLoad() {
    if (currentUser.startsWith('guest_') || !window.db || !window.fbFS) return;

    try {
        const { doc, getDoc } = window.fbFS;
        const userSnap = await getDoc(doc(window.db, 'users', currentUser));

        if (userSnap.exists()) {
            const userData = userSnap.data();
            let realRole = (userData.role || 'user').toLowerCase();
            if (realRole === 'moderator') realRole = 'mod';
            localStorage.setItem('tppage_role', realRole);
            updateUIUserDisplay();
        }
    } catch (err) {
        console.error("Failed to sync user profile from Firestore:", err);
    }
}

/**
 * Performs user login or registration against Cloud Firestore.
 * @async
 * @param {string} newUsername - Proposed handle.
 * @param {string} email - User email address (optional).
 * @param {string} password - User account authentication key.
 * @returns {Promise<boolean>} True if authentication succeeded.
 */
async function setUsername(newUsername, email, password) {
    const cleanName = newUsername.trim().replace(/[/#[\]]/g, '');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanName) {
        showToast('[ERROR] Username cannot be empty');
        return false;
    }

    if (cleanName.toLowerCase().startsWith('guest_') && cleanName !== currentUser) {
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
            const userData = userSnap.data();
            if (userData.password !== cleanPass) {
                showToast('[ERROR] Invalid password! (This account may already be registered)');
                return false;
            }

            let userRole = (userData.role || 'user').toLowerCase();
            if (userRole === 'moderator') userRole = 'mod';
            localStorage.setItem('tppage_role', userRole);

            if (cleanEmail && cleanEmail !== userData.email) {
                await setDoc(userRef, { email: cleanEmail }, { merge: true });
            }

            showToast(`[INFO] Welcome back, ${cleanName}!`);
        } else {
            const defaultRole = 'user';

            await setDoc(userRef, {
                username: cleanName,
                email: cleanEmail || null,
                password: cleanPass,
                role: defaultRole,
                createdAt: new Date()
            });

            localStorage.setItem('tppage_role', defaultRole);
            showToast('[INFO] Account created successfully!');
        }

        currentUser = cleanName;
        localStorage.setItem('tppage_username', currentUser);
        sessionStorage.setItem('tppage_session_auth', 'true');

        updateUIUserDisplay();

        const userInput = /** @type {HTMLInputElement|null} */ (document.getElementById('username-input'));
        if (userInput) {
            userInput.value = currentUser;
        }

        const passInput = /** @type {HTMLInputElement|null} */ (document.getElementById('password-input'));
        if (passInput) {
            passInput.value = '';
        }

        return true;

    } catch (err) {
        console.error("Firestore Auth Error:", err);
        showToast('[ERROR] Could not save user data');
        return false;
    }
}

/**
 * Triggers the login/registration workflow from the user authentication modal form.
 * @async
 * @returns {Promise<void>}
 */
async function updateUsername() {
    const userInput = /** @type {HTMLInputElement|null} */ (document.getElementById('username-input'));
    const emailInput = /** @type {HTMLInputElement|null} */ (document.getElementById('email-input'));
    const passInput = /** @type {HTMLInputElement|null} */ (document.getElementById('password-input'));
    const saveButton = /** @type {HTMLButtonElement|null} */ (document.getElementById('auth-save-btn'));

    const username = userInput?.value || '';
    const email = emailInput?.value || '';
    const password = passInput?.value || '';

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerText = "[SAVING...]";
    }

    const isSuccess = await setUsername(username, email, password);

    if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerText = "[SAVE / LOGIN]";
    }

    if (isSuccess) {
        closeWindow('modal-user');
    }
}

// ==========================================
// 3. MULTI-WINDOW WEB OS MANAGEMENT
// ==========================================

/**
 * Elevates the specified window element to the top layer of the Web OS display stack.
 * @param {HTMLElement|null} element - Target container element to bring forward.
 */
function bringToFront(element) {
    if (!element) return;

    highestZIndex += 1;
    element.style.zIndex = String(highestZIndex);

    document.querySelectorAll('.modal-window, .sidebar').forEach(win => {
        win.classList.remove('focused');
    });

    element.classList.add('focused');
}

/**
 * Toggles the Explorer sidebar navigation drawer.
 */
function toggleExplorer() {
    const sidebar = DOM.explorer();
    if (!sidebar) return;

    const isActive = sidebar.classList.toggle('active');
    if (isActive) {
        bringToFront(sidebar);
    }
}

/**
 * Displays a desktop window or modal container and activates its taskbar tab.
 * @param {string} windowId - Target window DOM element identifier.
 * @param {string|null} [badgeId=null] - Optional taskbar item identifier.
 */
function openProject(windowId, badgeId = null) {
    const win = document.getElementById(windowId);
    if (!win) return;

    win.style.top = '';
    win.style.left = '';
    win.classList.remove('is-dragging', 'dragged');

    if (!win.classList.contains('active')) {
        win.classList.add('active');
        win.setAttribute('aria-hidden', 'false');
    }

    bringToFront(win);

    const badge = badgeId 
        ? document.getElementById(badgeId) 
        : document.querySelector(`[onclick*="${windowId}"].taskbar-item`);
        
    badge?.classList.add('active', 'active-app');

    const focusableElement = win.querySelector('.dot');
    if (focusableElement instanceof HTMLElement) {
        focusableElement.focus();
    }
}

/**
 * Closes an active desktop window or modal dialog.
 * @param {string} windowId - Target window DOM element identifier.
 */
function closeWindow(windowId) {
    const win = document.getElementById(windowId);
    if (!win) return;

    win.classList.remove('active', 'focused', 'is-dragging', 'dragged');
    win.setAttribute('aria-hidden', 'true');
    win.style.top = '';
    win.style.left = '';

    const badge = document.querySelector(`[onclick*="${windowId}"].taskbar-item`);
    badge?.classList.remove('active', 'active-app');
}

/**
 * Dismisses all visible desktop window overlays and resets taskbar states.
 */
function closeAllModals() {
    document.querySelectorAll('.modal-window').forEach(modal => {
        const modalElement = /** @type {HTMLElement} */ (modal);
        modalElement.classList.remove('active', 'focused', 'is-dragging', 'dragged');
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.style.top = '';
        modalElement.style.left = '';
    });

    document.querySelectorAll('.taskbar-item').forEach(badge => {
        badge.classList.remove('active', 'active-app');
    });
}

/**
 * Toggles the visibility state of the system documentation and help overlay.
 */
function toggleHelpPanel() {
    const helpPanel = document.getElementById('help-panel');
    if (!helpPanel) return;

    if (helpPanel.classList.contains('active')) {
        closeWindow('help-panel');
    } else {
        openProject('help-panel');
    }
}

/**
 * Opens or closes the primary Windows 95 Start Menu.
 */
function toggleStartMenu() {
    const startMenu = DOM.startMenu();
    const startButton = document.getElementById('start-btn');
    if (!startMenu) return;

    const isActive = startMenu.classList.toggle('active');
    startMenu.setAttribute('aria-hidden', String(!isActive));
    startButton?.setAttribute('aria-expanded', String(isActive));
}

// ==========================================
// 4. DRAGGABLE WINDOW SYSTEM
// ==========================================

/**
 * Binds mouse drag listeners across window headers to facilitate desktop window movement.
 */
function makeWindowsDraggable() {
    document.querySelectorAll('.modal-window, .sidebar:not(#explorer)').forEach(winElement => {
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
            const mouseEvent = /** @type {MouseEvent} */ (e);
            const target = /** @type {HTMLElement} */ (mouseEvent.target);

            if (target.classList.contains('dot')) return;

            isDragging = true;
            
            const rect = win.getBoundingClientRect();
            startX = mouseEvent.clientX;
            startY = mouseEvent.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

            win.classList.add('is-dragging', 'dragged');

            win.style.left = `${initialLeft}px`;
            win.style.top = `${initialTop}px`;

            const onMouseMove = (ev) => {
                if (!isDragging) return;
                const deltaX = ev.clientX - startX;
                const deltaY = ev.clientY - startY;

                win.style.left = `${initialLeft + deltaX}px`;
                win.style.top = `${initialTop + deltaY}px`;
            };

            const onMouseUp = () => {
                isDragging = false;
                win.classList.remove('is-dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// ==========================================
// 5. DATE & TIME UTILITIES
// ==========================================

/**
 * Formats a Date object into Military European / Technical format (e.g. "02 SEP 2026 14:30").
 * @param {Date} dateObj - Target date object to format.
 * @param {boolean} [includeDate=true] - Whether to include the date string (day, month, year).
 * @returns {string} Formatted military date and/or time string.
 */
function formatMilitaryEuroDateTime(dateObj, includeDate = true) {
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (!includeDate) return timeStr;

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = dateObj.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
    const year = dateObj.getFullYear();

    return `${day} ${month} ${year} ${timeStr}`;
}

// ==========================================
// 6. COMMENTS MANAGER & RE-AUTH SYSTEM
// ==========================================

/**
 * Controller managing real-time chat sync, message creation, anti-spam, and re-authentication checks.
 * @namespace
 */
const CommentsManager = {
    /** @type {number} Timestamp of the last published comment */
    lastCommentTime: 0,
    /** @type {number} Cooldown threshold in milliseconds between comments */
    cooldownMs: 3000,

    /**
     * Initializes Firestore snapshot listeners when database connections become ready.
     */
    init() {
        const checkFirebaseReady = setInterval(() => {
            if (window.db && window.fbFS) {
                clearInterval(checkFirebaseReady);
                this.listenForCommentsPreview();
                this.listenForFullComments();
            }
        }, 100);
    },

    /**
     * Subscribes to recent Firestore comments for the home preview stream.
     */
    listenForCommentsPreview() {
        const container = document.getElementById('comments-preview-list');
        if (!container || !window.db || !window.fbFS) return;

        const { collection, query, orderBy, limit, onSnapshot } = window.fbFS;
        const q = query(collection(window.db, 'comments'), orderBy('timestamp', 'desc'), limit(5));

        onSnapshot(q, (snapshot) => {
            container.innerHTML = "";

            if (snapshot.empty) {
                container.innerHTML = "<p>No comments yet. Be the first to leave a message!</p>";
                return;
            }

            const docs = snapshot.docs.reverse();

            docs.forEach((docSnap) => {
                const data = docSnap.data();
                const dateObj = data.timestamp ? data.timestamp.toDate() : new Date();
                const formattedDate = formatMilitaryEuroDateTime(dateObj, true);

                const author = data.author || "anon";
                const text = data.text || "";
                
                let rawRole = data.role || (data.isGuest ? 'guest' : 'user');
                if (rawRole.toLowerCase() === 'moderator') rawRole = 'mod';
                const role = rawRole.toUpperCase();

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
            console.error("Firestore preview error:", err);
            container.innerHTML = "<p>[ERROR] Failed to load comment preview.</p>";
        });
    },

    /**
     * Subscribes to the complete Firestore comment history for the modal window chat log.
     */
    listenForFullComments() {
        const container = document.getElementById('comments-list');
        if (!container || !window.db || !window.fbFS) return;

        const { collection, query, orderBy, limit, onSnapshot } = window.fbFS;
        const q = query(collection(window.db, 'comments'), orderBy('timestamp', 'asc'), limit(50));

        onSnapshot(q, (snapshot) => {
            container.innerHTML = "";

            if (snapshot.empty) {
                container.innerHTML = "<p>No comments yet. Be the first to leave a message!</p>";
                return;
            }

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const dateObj = data.timestamp ? data.timestamp.toDate() : new Date();
                const formattedDate = formatMilitaryEuroDateTime(dateObj, true);

                const author = data.author || "anon";
                const text = data.text || "";
                
                let rawRole = data.role || (data.isGuest ? 'guest' : 'user');
                if (rawRole.toLowerCase() === 'moderator') rawRole = 'mod';
                const role = rawRole.toUpperCase();

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

            container.scrollTop = container.scrollHeight;
        }, (err) => {
            console.error("Firestore full chat error:", err);
            container.innerHTML = "<p>[ERROR] Failed to load chat logs.</p>";
        });
    },

    /**
     * Handles comment posting to Cloud Firestore with session verification via sessionStorage.
     * @async
     * @returns {Promise<void>}
     */
    async send() {
        const input = /** @type {HTMLInputElement|null} */ (
            document.getElementById('comment-input') || document.getElementById('commento')
        );
        const sendBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('send-btn'));
        const text = input?.value.trim();

        if (!text) return;

        // Anti-Spam Rate-Limiting Control
        const now = Date.now();
        const timeElapsed = now - this.lastCommentTime;
        if (timeElapsed < this.cooldownMs) {
            const waitSeconds = Math.ceil((this.cooldownMs - timeElapsed) / 1000);
            showToast(`[WARN] Anti-Spam: Please wait ${waitSeconds}s before posting again.`);
            return;
        }

        if (!window.db || !window.fbFS) {
            showToast('[ERROR] Database offline');
            return;
        }

        const userProfile = getCurrentUserProfile();

        // Session Authentication check via sessionStorage (expires on page refresh)
        if (userProfile.level > ROLES.GUEST) {
            const isVerified = sessionStorage.getItem('tppage_session_auth') === 'true';

            if (!isVerified) {
                showToast('[ERROR] Re-login to post');
                openProject('modal-user');
                return;
            }
        }

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerText = "[SENDING...]";
        }

        try {
            const { collection, addDoc } = window.fbFS;
            await addDoc(collection(window.db, 'comments'), {
                text: text,
                author: userProfile.username,
                role: userProfile.role,
                isGuest: userProfile.level === ROLES.GUEST,
                timestamp: new Date()
            });

            this.lastCommentTime = Date.now();

            if (input) {
                input.value = "";
            }
            showToast('[INFO] Comment published!');
            
            if (sendBtn) {
                sendBtn.innerText = "[OK]";
                setTimeout(() => {
                    sendBtn.innerText = "[SEND]";
                    sendBtn.disabled = false;
                    input?.focus();
                }, 1000);
            }
        } catch (err) {
            console.error("Failed to post comment:", err);
            showToast('[ERROR] Could not send comment');
            if (sendBtn) {
                sendBtn.innerText = "[ERROR]";
                setTimeout(() => {
                    sendBtn.innerText = "[SEND]";
                    sendBtn.disabled = false;
                }, 2000);
            }
        }
    }
};

// ==========================================
// 7. VISITOR COUNTER SERVICE
// ==========================================

/**
 * Fetches current site view metrics from the Cloudflare worker proxy.
 * @async
 * @returns {Promise<void>}
 */
async function updateViewCounter() {
    const proxyUrl = "https://goatcounter.tiagosprojectspage.workers.dev/api/visits";

    try {
        const response = await fetch(`${proxyUrl}?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const count = data.total ?? data.count ?? data.visits ?? data.pageviews ?? data.value;

        if (count === undefined || count === null) throw new Error("Visit count missing");

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
// 8. UTILITY UX & NOTIFICATIONS
// ==========================================

/**
 * Injects obfuscated email addresses into designated UI containers.
 */
function initEmailObfuscation() {
    const username = 'tiagosprojectspage';
    const domain = 'gmail.com';
    const container = document.getElementById('email-container');

    if (container) {
        container.innerHTML = `<a href="mailto:${username}@${domain}" class="link">${username}@${domain}</a>`;
    }
}

/**
 * Synchronizes the desktop taskbar digital clock readout.
 */
function updateClock() {
    const clockElement = document.getElementById('clock');
    if (clockElement) {
        clockElement.innerText = formatMilitaryEuroDateTime(new Date(), false);
    }
}

/**
 * Renders a Windows 95 styled toast notification message.
 * @param {string} message - Text notification content.
 * @param {number} [duration=3000] - Display duration in milliseconds.
 */
function showToast(message, duration = 3000) {
    let toast = document.getElementById('retro-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'retro-toast';
        toast.className = 'retro-toast toast';
        document.body.appendChild(toast);
    }

    if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
    }

    toast.innerText = message;
    toast.classList.add('show');

    toastTimeoutId = setTimeout(() => {
        toast?.classList.remove('show');
    }, duration);
}

// ==========================================
// 9. RETRO BOOT SEQUENCE
// ==========================================

/**
 * Executes system boot animations and progress bar transitions.
 * @async
 * @returns {Promise<void>}
 */
async function typeWriterEffect() {
    const loadingScreen = document.getElementById('loading-screen');
    const lines = document.querySelectorAll('.loading-content p');
    const loadingBar = /** @type {HTMLElement|null} */ (document.querySelector('.loading-bar'));
    const loadingProgress = /** @type {HTMLElement|null} */ (document.querySelector('.loading-progress'));
    const loadingPercent = document.getElementById('loading-percent');

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const line of lines) {
        const lineElement = /** @type {HTMLElement} */ (line);
        if (lineElement.classList.contains('loading-bar') || lineElement.id === 'loading-percent') continue;
        lineElement.style.opacity = '1';
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
// 10. INITIALIZATION & EVENT HANDLERS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    sessionStorage.removeItem('tppage_session_auth');

    typeWriterEffect();
    initEmailObfuscation();
    CommentsManager.init();
    makeWindowsDraggable();
    
    const checkDbReady = setInterval(() => {
        if (window.db && window.fbFS) {
            clearInterval(checkDbReady);
            syncUserProfileOnLoad();
        }
    }, 100);

    updateUIUserDisplay();

    const userInput = /** @type {HTMLInputElement|null} */ (document.getElementById('username-input'));
    if (userInput) {
        userInput.value = currentUser.startsWith('guest_') ? '' : currentUser;
    }

    const projectCount = document.querySelectorAll('section#projects .window').length;
    ['project-count', 'modal-total-projects'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerText = String(projectCount);
    });

    ['username-input', 'email-input', 'password-input'].forEach(id => {
        document.getElementById(id)?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') updateUsername();
        });
    });

    ['comment-input', 'commento'].forEach(id => {
        document.getElementById(id)?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') CommentsManager.send();
        });
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

// Global Keyboard Handler (Escape dismisses modal overlays, F1 toggles system help)
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        const startMenu = DOM.startMenu();
        if (startMenu?.classList.contains('active')) {
            startMenu.classList.remove('active');
            startMenu.setAttribute('aria-hidden', 'true');
            document.getElementById('start-btn')?.setAttribute('aria-expanded', 'false');
        }
        DOM.explorer()?.classList.remove('active');
        closeAllModals();
    }
    if (e.key === "F1") {
        e.preventDefault();
        toggleHelpPanel();
    }
});

// Click Outside Event Handler
document.addEventListener('click', (e) => {
    const startMenu = DOM.startMenu();
    const startButton = document.getElementById('start-btn');
    const clickTarget = /** @type {Node} */ (e.target);

    if (startMenu?.classList.contains('active') && !startMenu.contains(clickTarget) && !startButton?.contains(clickTarget)) {
        startMenu.classList.remove('active');
        startMenu.setAttribute('aria-hidden', 'true');
        startButton?.setAttribute('aria-expanded', 'false');
    }

    const explorer = DOM.explorer();
    const openExplorerBtn = document.getElementById('open-explorer');
    if (explorer?.classList.contains('active') && !explorer.contains(clickTarget) && !openExplorerBtn?.contains(clickTarget)) {
        explorer.classList.remove('active');
    }
});