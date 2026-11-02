// ============================================================================
// SEIRALAB CMMS - LOGIN-PORTAL.JS (ATLAS LOGIN, RBAC & LIVE WALLPAPER ENGINE)
// ============================================================================

window.currentAccessRole = sessionStorage.getItem('seiralab_active_session_role') || '';

const ROLE_PASSWORDS = {
    "Visitor": "",
    "Technical": "seiralab2026",
    "Head Technical": "seiralabhead",
    "MasterAdmin": "seiralabadmin"
};

let wallpaperAnimId = null;
let mousePos = { x: -999, y: -999 };

function isVisitor(role) {
    return role === 'Visitor';
}

function isSupervisorOrAdmin(role) {
    return role === 'Head Technical' || role === 'MasterAdmin';
}

function isMasterAdminOnly(role) {
    return role === 'MasterAdmin';
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

// 2. PORTAL AUTHENTICATION & ROLE SWITCHING
function submitPortalLogin(event) {
    event.preventDefault();
    const role = document.getElementById('portalRoleSelect').value;
    const typedPass = document.getElementById('portalPasswordInput').value.trim();
    const errorEl = document.getElementById('portalLoginError');

    if (typedPass === ROLE_PASSWORDS[role]) {
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
        if (passInput) passInput.value = '';
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

    ['Visitor', 'Technical', 'Head', 'MasterAdmin'].forEach(r => {
        const dot = document.getElementById(`roleCheck-${r}`);
        if (dot) {
            const match = (r === 'Head' && roleName === 'Head Technical') || (r === roleName);
            dot.className = match ? 'w-2 h-2 rounded-full bg-teal-600' : 'w-2 h-2 rounded-full bg-transparent';
        }
    });

    applyRolePermissions(roleName);
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
        document.getElementById('seiralabLoginPortal')?.classList.remove('hidden');
    }
});
