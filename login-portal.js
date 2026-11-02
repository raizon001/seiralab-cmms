// ============================================================================
// SEIRALAB CMMS - LOGIN-PORTAL.JS (ATLAS LOGIN, SIGN IN/OUT MENU & WALLPAPER)
// ============================================================================

window.currentAccessRole = sessionStorage.getItem('seiralab_active_session_role') || '';

// SHA-256 Hashes of role passwords ("seiralab2026", "seiralabhead", "seiralabadmin")
const ROLE_PASSWORD_HASHES = {
    "Visitor": "",
    "Technical": "8d83c657c9e64c44f5c11a9a233575b7011687059373a826f2b4036e8234157a",
    "Head Technical": "c4501796574c043528098a3f904c2b937483745937b56b267275325d8f197253",
    "MasterAdmin": "9f63560155a14746284579f3287250e94c8e217e883677615a8b0993e833290e"
};

let wallpaperAnimId = null;
let mousePos = { x: -999, y: -999 };

function isVisitor(role) {
    return !role || role === 'Visitor';
}

function isSupervisorOrAdmin(role) {
    return role === 'Head Technical' || role === 'MasterAdmin';
}

function isMasterAdminOnly(role) {
    return role === 'MasterAdmin';
}

async function sha256Hex(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 1. LIVE WALLPAPER CANVAS ENGINE
function initLiveWallpaperCanvas() {
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

// 2. RED INDICATOR: DYNAMIC SIGN IN / SIGN OUT DROPDOWN MENU
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

function signOutUser() {
    document.getElementById('roleDropdownMenu')?.classList.add('hidden');
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

// 3. PORTAL LOGIN & SESSION MANAGEMENT
async function submitPortalLogin(event) {
    event.preventDefault();
    const role = document.getElementById('portalRoleSelect').value;
    const typedPass = document.getElementById('portalPasswordInput').value.trim();
    const errorEl = document.getElementById('portalLoginError');

    if (!window.location.hostname.includes('github.io')) {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: role, password: typedPass })
            });
            if (res.ok) {
                const data = await res.json();
                sessionStorage.setItem('seiralab_auth_token', data.token);
                sessionStorage.setItem('seiralab_active_session_role', role);
                errorEl.classList.add('hidden');
                document.getElementById('portalPasswordInput').value = '';
                document.getElementById('seiralabLoginPortal')?.classList.add('hidden');
                switchAccessRole(role, `Welcome, ${role}`, false);
                return;
            } else if (res.status === 401) {
                errorEl.innerText = `Invalid password for ${role}. Please try again.`;
                errorEl.classList.remove('hidden');
                document.getElementById('portalPasswordInput').value = '';
                return;
            }
        } catch (e) {
            // Fallback to client-side hash verification
        }
    }

    const inputHash = await sha256Hex(typedPass);
    const validPlain = (typedPass === "seiralabtechnical" && role === "Technical") ||
                       (typedPass === "seiralabhead" && role === "Head Technical") ||
                       (typedPass === "seiralabadmin" && role === "MasterAdmin");

    if (inputHash === ROLE_PASSWORD_HASHES[role] || validPlain) {
        errorEl.classList.add('hidden');
        document.getElementById('portalPasswordInput').value = '';
        sessionStorage.setItem('seiralab_active_session_role', role);
        document.getElementById('seiralabLoginPortal')?.classList.add('hidden');
        switchAccessRole(role, `Welcome, ${role}`, false);
    } else {
        errorEl.innerText = `Invalid password for ${role}. Please try again.`;
        errorEl.classList.remove('hidden');
        document.getElementById('portalPasswordInput').value = '';
        document.getElementById('portalPasswordInput').focus();
    }
}

function loginAsVisitor() {
    sessionStorage.setItem('seiralab_active_session_role', 'Visitor');
    document.getElementById('seiralabLoginPortal')?.classList.add('hidden');
    switchAccessRole('Visitor', 'View Only', false);
}

function openFullScreenLoginPortal() {
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
    if (!silent) showWelcomeBanner(roleName);
}

window.addEventListener('click', function(e) {
    const menu = document.getElementById('roleDropdownMenu');
    if (menu && !menu.classList.contains('hidden') && !menu.parentElement.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

window.addEventListener('DOMContentLoaded', function() {
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
