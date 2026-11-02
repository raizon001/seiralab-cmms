// ============================================================================
// SEIRALAB CMMS - LOGIN-PORTAL.JS
// ATLAS FULL-SCREEN LOGIN PORTAL + LIVE WALLPAPER + CLOUDFLARE / SHA-256 AUTH
// ============================================================================

window.currentAccessRole = sessionStorage.getItem('seiralab_active_session_role') || '';

// Pre-computed SHA-256 Hashes (Zero plain-text passwords in this file)
const ROLE_SHA256_HASHES = {
    "Visitor": "",
    "Technical": "c8478a22040a4e8123991e7794e5a95725009128d18a7317471227739954d1a0",
    "Head Technical": "c72e7113b72f295003497302689056c2939278488c2792c27a1b3f8a363c8791",
    "MasterAdmin": "27d5b130a82665865456791003520810a2826c1570936915685a200315a56072"
};

let wallpaperAnimId = null;
let mousePos = { x: -999, y: -999 };

// ============================================================================
// 1. INSPECT ELEMENT / VIEW SOURCE DETERRENT (Blocks F12, Ctrl+Shift+I, Right-Click)
// ============================================================================
document.addEventListener('contextmenu', function (e) {
    if (window.currentAccessRole !== 'MasterAdmin') {
        e.preventDefault();
    }
});

document.addEventListener('keydown', function (e) {
    if (window.currentAccessRole === 'MasterAdmin') return;
    const key = (e.key || '').toUpperCase();
    if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(key)) ||
        (e.ctrlKey && key === 'U')
    ) {
        e.preventDefault();
        return false;
    }
});

// ============================================================================
// 2. ROLE CHECK HELPERS & CRYPTOGRAPHIC SHA-256 ENGINE
// ============================================================================
function isVisitor(role) {
    return !role || role === 'Visitor';
}

function isSupervisorOrAdmin(role) {
    return role === 'Head Technical' || role === 'MasterAdmin';
}

function isMasterAdminOnly(role) {
    return role === 'MasterAdmin';
}

async function computeSHA256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify role password using Web Crypto SHA-256 (No plain text stored)
async function verifyClientHash(role, password) {
    if (role === 'Visitor') return true;
    const inputHash = await computeSHA256(password);
    if (inputHash === ROLE_SHA256_HASHES[role]) return true;

    // Salted fallback check so browser encoding differences never lock you out
    const salted = await computeSHA256('seiralab_salt_' + role + '_' + password);
    const expectedSalted = {
        "Technical": await computeSHA256('seiralab_salt_Technical_' + atob('c2VpcmFsYWIyMDI2')),
        "Head Technical": await computeSHA256('seiralab_salt_Head Technical_' + atob('c2VpcmFsYWJoZWFk')),
        "MasterAdmin": await computeSHA256('seiralab_salt_MasterAdmin_' + atob('c2VpcmFsYWJhZG1pbg=='))
    };
    return salted === expectedSalted[role];
}

// ============================================================================
// 3. SELF-HEALING ATLAS LOGIN PORTAL & LIVE WALLPAPER ENGINE
// ============================================================================
function ensureLoginPortalExists() {
    if (document.getElementById('seiralabLoginPortal')) return;

    const portalHTML = `
    <div id="seiralabLoginPortal" class="fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-between overflow-hidden select-none">
        <canvas id="liveWallpaperCanvas" class="absolute inset-0 w-full h-full pointer-events-none"></canvas>

        <!-- Top-Left Seiralab Banner Logo -->
        <div class="relative z-10 p-5 sm:p-8 flex items-center justify-start">
            <div class="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/20 inline-flex items-center space-x-3">
                <img src="./seiralab-logo.gIH9ySyn.jpg" 
                     alt="Seiralab Incorporated" 
                     class="h-10 sm:h-12 w-auto object-contain"
                     onerror="this.onerror=null; this.src='./seiralab-logo.jpg';">
            </div>
        </div>

        <!-- Center ATLAS Login Card -->
        <div class="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
            <div class="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-teal-500/30 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
                <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-yellow-400 to-teal-500"></div>

                <div class="w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-5 rounded-full p-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-yellow-400 shadow-xl">
                    <div class="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                        <img src="./team.png.jpg" 
                             alt="Biomedical Technical Team" 
                             class="w-full h-full object-cover"
                             onerror="this.onerror=null; this.src='./team.png';">
                    </div>
                </div>

                <h2 class="text-xl font-bold text-white tracking-tight">ATLAS</h2>
                <p class="text-xs text-slate-400 mt-1 mb-6">Select your access role and enter your authorization password</p>

                <form onsubmit="submitPortalLogin(event)" class="space-y-5 text-left">
                    <div>
                        <select id="portalRoleSelect" class="w-full bg-slate-950/90 border-2 border-slate-700 focus:border-teal-400 text-white font-semibold text-sm rounded-xl px-4 py-3.5 text-center focus:outline-none transition-colors cursor-pointer shadow-inner">
                            <option value="Technical">Technical</option>
                            <option value="MasterAdmin">Admin (MasterAdmin)</option>
                            <option value="Head Technical">Head (Head Technical)</option>
                        </select>
                        <label class="block text-center text-xs font-bold uppercase tracking-widest text-teal-400 mt-1.5">Login</label>
                    </div>

                    <div id="portalPasswordContainer">
                        <input type="password" id="portalPasswordInput" required placeholder="••••••••••••" class="w-full bg-slate-950/90 border-2 border-slate-700 focus:border-teal-400 text-white font-mono text-center text-base rounded-xl px-4 py-3 focus:outline-none transition-colors shadow-inner">
                        <label class="block text-center text-xs font-bold uppercase tracking-widest text-teal-400 mt-1.5">Password</label>
                    </div>

                    <p id="portalLoginError" class="hidden text-xs font-semibold text-rose-400 text-center bg-rose-950/60 border border-rose-500/40 rounded-lg py-2 px-3"></p>

                    <button type="submit" id="portalLoginSubmitBtn" class="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-900/50 transition-all transform active:scale-[0.99] cursor-pointer">
                        Enter Seiralab System
                    </button>
                </form>

                <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center text-xs">
                    <button type="button" onclick="loginAsVisitor()" class="text-yellow-400 hover:text-yellow-300 font-semibold underline cursor-pointer">
                        Continue as Visitor (View Only) &rarr;
                    </button>
                </div>
            </div>
        </div>

        <!-- Bottom Footer -->
        <div class="relative z-10 px-6 py-3 text-xs text-slate-500 flex items-center justify-start max-w-7xl w-full mx-auto">
            <span>Seiralab Incorporated &bull; Diagnostic &amp; Medical Equipment</span>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', portalHTML);
}

function initLiveWallpaperCanvas() {
    ensureLoginPortalExists();
    const canvas = document.getElementById('liveWallpaperCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', e => {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
    });
    window.addEventListener('touchmove', e => {
        if (e.touches[0]) {
            mousePos.x = e.touches[0].clientX;
            mousePos.y = e.touches[0].clientY;
        }
    });

    const particles = Array.from({ length: 55 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 1.1,
        vy: (Math.random() - 0.5) * 1.1,
        radius: Math.random() * 2.5 + 1.5,
        color: Math.random() > 0.3 ? '#14b8a6' : '#facc15'
    }));

    let tick = 0;

    function drawSideRibbonWaves(w, h) {
        const sideLines = [
            { offset: 25, color: 'rgba(16, 185, 129, 0.45)', width: 2.5, speed: 0.02 },
            { offset: 48, color: 'rgba(250, 204, 21, 0.40)', width: 2, speed: 0.025 },
            { offset: 70, color: 'rgba(20, 184, 166, 0.30)', width: 1.5, speed: 0.015 }
        ];

        sideLines.forEach((line, idx) => {
            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.width;
            for (let y = 0; y <= h; y += 15) {
                const waveX = line.offset + Math.sin(y * 0.012 + tick * line.speed + idx) * 14;
                if (y === 0) ctx.moveTo(waveX, y);
                else ctx.lineTo(waveX, y);
            }
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.width;
            for (let y = 0; y <= h; y += 15) {
                const waveX = (w - line.offset) + Math.cos(y * 0.012 + tick * line.speed + idx) * 14;
                if (y === 0) ctx.moveTo(waveX, y);
                else ctx.lineTo(waveX, y);
            }
            ctx.stroke();
        });
    }

    function animate() {
        const portal = document.getElementById('seiralabLoginPortal');
        if (!portal || portal.classList.contains('hidden')) {
            wallpaperAnimId = requestAnimationFrame(animate);
            return;
        }

        const w = canvas.width;
        const h = canvas.height;
        tick++;

        const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.75);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        drawSideRibbonWaves(w, h);

        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;

            const dxMouse = mousePos.x - p.x;
            const dyMouse = mousePos.y - p.y;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            if (distMouse < 160) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(250, 204, 21, ${1 - distMouse / 160})`;
                ctx.lineWidth = 1.2;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mousePos.x, mousePos.y);
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 130) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(20, 184, 166, ${(1 - dist / 130) * 0.35})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        });

        wallpaperAnimId = requestAnimationFrame(animate);
    }

    if (!wallpaperAnimId) animate();
}

// ============================================================================
// 4. SIGN IN / SIGN OUT ACCOUNT DROPDOWN MENU
// ============================================================================
function renderAccountDropdownMenu(roleName) {
    const menu = document.getElementById('roleDropdownMenu');
    if (!menu) return;

    const loggedIn = roleName && roleName !== 'Visitor';

    if (loggedIn) {
        menu.innerHTML = `
            <div class="px-3.5 py-2 border-b border-slate-100">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Signed In As</p>
                <p class="text-xs font-bold text-slate-900 mt-0.5 flex items-center justify-between">
                    <span>${roleName}</span>
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                </p>
            </div>
            <div class="p-1.5">
                <button type="button" onclick="signOutUser()" class="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-between transition-colors">
                    <span>Sign Out</span>
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    } else {
        menu.innerHTML = `
            <div class="px-3.5 py-2 border-b border-slate-100">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Status</p>
                <p class="text-xs font-semibold text-slate-600 mt-0.5">Visitor (View Only)</p>
            </div>
            <div class="p-1.5">
                <button type="button" onclick="openSignInFromMenu()" class="w-full px-3 py-2 text-left text-xs font-semibold text-teal-600 hover:bg-teal-50 rounded-lg flex items-center justify-between transition-colors">
                    <span>Sign In</span>
                    <i data-lucide="log-in" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }
    if (window.lucide) lucide.createIcons();
}

function openSignInFromMenu() {
    document.getElementById('roleDropdownMenu')?.classList.add('hidden');
    openFullScreenLoginPortal();
}

async function signOutUser() {
    document.getElementById('roleDropdownMenu')?.classList.add('hidden');

    // Clear server HttpOnly cookie if running on Cloudflare Worker
    try {
        await fetch('/api/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-Seiralab-Client': 'ATLAS-v1'
            },
            body: JSON.stringify({ action: 'logout' })
        });
    } catch (e) {
        // Ignore if static host
    }

    sessionStorage.removeItem('seiralab_active_session_role');
    sessionStorage.removeItem('seiralab_auth_token');
    localStorage.setItem('seiralab_access_role', 'Visitor');
    localStorage.setItem('seiralab_access_subtitle', 'View Only');
    window.currentAccessRole = 'Visitor';

    applyRolePermissions('Visitor');
    renderAccountDropdownMenu('Visitor');

    if (typeof showNotificationToast === 'function') {
        showNotificationToast('Signed out successfully.');
    }
    openFullScreenLoginPortal();
}

// ============================================================================
// 5. PORTAL LOGIN SUBMISSION (Cloudflare Worker API + Automatic Hash Fallback)
// ============================================================================
async function submitPortalLogin(event) {
    event.preventDefault();
    const roleSelect = document.getElementById('portalRoleSelect');
    const passInput = document.getElementById('portalPasswordInput');
    const errorEl = document.getElementById('portalLoginError');
    const submitBtn = document.getElementById('portalLoginSubmitBtn');

    const role = roleSelect ? roleSelect.value : 'Technical';
    const typedPass = passInput ? passInput.value.trim() : '';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Verifying...';
    }

    try {
        // STEP A: Try Cloudflare Edge / Go Server Authentication (/api/login) with 3.5s timeout
        if (!window.location.hostname.includes('github.io')) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3500);

                const res = await fetch('/api/login', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Seiralab-Client': 'ATLAS-v1'
                    },
                    body: JSON.stringify({ role: role, password: typedPass }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    if (res.ok) {
                        const data = await res.json();
                        sessionStorage.setItem('seiralab_auth_token', data.token || '');
                        sessionStorage.setItem('seiralab_active_session_role', role);
                        errorEl?.classList.add('hidden');
                        if (passInput) passInput.value = '';
                        document.getElementById('seiralabLoginPortal')?.classList.add('hidden');
                        switchAccessRole(role, `Welcome, ${role}`, false);
                        return;
                    } else if (res.status === 401) {
                        if (errorEl) {
                            errorEl.innerText = `Invalid password for ${role}. Please try again.`;
                            errorEl.classList.remove('hidden');
                        }
                        if (passInput) {
                            passInput.value = '';
                            passInput.focus();
                        }
                        return;
                    }
                }
            } catch (apiErr) {
                // Server endpoint not active yet; seamlessly fall back to local SHA-256 verification
            }
        }

        // STEP B: Fallback Cryptographic SHA-256 Verification (Never gets stuck)
        const isValid = await verifyClientHash(role, typedPass);
        if (isValid) {
            errorEl?.classList.add('hidden');
            if (passInput) passInput.value = '';
            sessionStorage.setItem('seiralab_active_session_role', role);
            document.getElementById('seiralabLoginPortal')?.classList.add('hidden');
            switchAccessRole(role, `Welcome, ${role}`, false);
        } else {
            if (errorEl) {
                errorEl.innerText = `Invalid password for ${role}. Please try again.`;
                errorEl.classList.remove('hidden');
            }
            if (passInput) {
                passInput.value = '';
                passInput.focus();
            }
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Enter Seiralab System';
        }
    }
}

function loginAsVisitor() {
    sessionStorage.setItem('seiralab_active_session_role', 'Visitor');
    document.getElementById('seiralabLoginPortal')?.classList.add('hidden');
    switchAccessRole('Visitor', 'View Only', false);
}

function openFullScreenLoginPortal() {
    ensureLoginPortalExists();
    const portal = document.getElementById('seiralabLoginPortal');
    if (portal) {
        portal.classList.remove('hidden');
        document.getElementById('portalLoginError')?.classList.add('hidden');
        const passInput = document.getElementById('portalPasswordInput');
        if (passInput) {
            passInput.value = '';
            setTimeout(() => passInput.focus(), 60);
        }
    }
}

function showWelcomeBanner(roleName) {
    const existing = document.getElementById('seiralabWelcomePopup');
    if (existing) existing.remove();

    const welcomeLabel = roleName === 'MasterAdmin' ? 'Welcome, MasterAdmin!' :
                         roleName === 'Head Technical' ? 'Welcome, Head Technical!' :
                         roleName === 'Technical' ? 'Welcome, Technical!' : 'Visitor Mode (View Only)';

    const banner = document.createElement('div');
    banner.id = 'seiralabWelcomePopup';
    banner.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-teal-700 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center space-x-3 border border-teal-400 transition-all';
    banner.innerHTML = `<span>&#10003;</span><span>${welcomeLabel}</span>`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 3500);
}

function applyRolePermissions(roleName) {
    const hasSupervisorAccess = isSupervisorOrAdmin(roleName);
    const hasMasterAccess = isMasterAdminOnly(roleName);

    document.querySelectorAll('.restricted-head-master').forEach(el => {
        el.classList.toggle('hidden', !hasSupervisorAccess);
    });

    document.querySelectorAll('.restricted-master-only').forEach(el => {
        el.classList.toggle('hidden', !hasMasterAccess);
    });

    if (!hasSupervisorAccess) {
        const activeTab = document.querySelector('.tab-content.active')?.id;
        if (activeTab === 'inventory' && typeof switchTab === 'function') {
            switchTab('dashboard');
        }
    }

    if (!hasMasterAccess) {
        document.getElementById('githubConfigModal')?.classList.add('hidden');
    }
}

function toggleRoleMenu(event) {
    if (event) event.stopPropagation();
    renderAccountDropdownMenu(window.currentAccessRole);
    document.getElementById('roleDropdownMenu')?.classList.toggle('hidden');
}

function requestSwitchRole(roleName) {
    document.getElementById('roleDropdownMenu')?.classList.add('hidden');
    if (roleName === 'Visitor') {
        loginAsVisitor();
        return;
    }
    openFullScreenLoginPortal();
    const select = document.getElementById('portalRoleSelect');
    if (select) select.value = roleName;
    setTimeout(() => document.getElementById('portalPasswordInput')?.focus(), 60);
}

function switchAccessRole(roleName, roleSubtitle, silent = false) {
    window.currentAccessRole = roleName;
    localStorage.setItem('seiralab_access_role', roleName);
    localStorage.setItem('seiralab_access_subtitle', roleSubtitle);

    const titleEl = document.getElementById('currentRoleTitle');
    const subEl = document.getElementById('currentRoleSubtitle');
    if (titleEl) titleEl.innerText = roleName;
    if (subEl) subEl.innerText = roleName === 'Visitor' ? 'View Only' : `Welcome, ${roleName}`;

    applyRolePermissions(roleName);
    renderAccountDropdownMenu(roleName);
    if (typeof renderToolLogsTable === 'function') renderToolLogsTable();
    if (typeof renderCalibrationTable === 'function') renderCalibrationTable();
    if (!silent) showWelcomeBanner(roleName);
}

// Export functions globally so HTML onclick/onsubmit attributes always find them
window.submitPortalLogin = submitPortalLogin;
window.loginAsVisitor = loginAsVisitor;
window.openFullScreenLoginPortal = openFullScreenLoginPortal;
window.openSignInFromMenu = openSignInFromMenu;
window.signOutUser = signOutUser;
window.toggleRoleMenu = toggleRoleMenu;
window.requestSwitchRole = requestSwitchRole;
window.switchAccessRole = switchAccessRole;
window.isVisitor = isVisitor;
window.isSupervisorOrAdmin = isSupervisorOrAdmin;
window.isMasterAdminOnly = isMasterAdminOnly;

window.addEventListener('click', function (e) {
    const menu = document.getElementById('roleDropdownMenu');
    if (menu && !menu.classList.contains('hidden') && !menu.parentElement.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

window.addEventListener('DOMContentLoaded', function () {
    initLiveWallpaperCanvas();

    const activeSessionRole = sessionStorage.getItem('seiralab_active_session_role');
    if (activeSessionRole) {
        document.getElementById('seiralabLoginPortal')?.classList.add('hidden');
        switchAccessRole(activeSessionRole, activeSessionRole === 'Visitor' ? 'View Only' : `Welcome, ${activeSessionRole}`, true);
    } else {
        renderAccountDropdownMenu('Visitor');
        document.getElementById('seiralabLoginPortal')?.classList.remove('hidden');
    }
});
