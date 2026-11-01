// ============================================================================
// SEIRALAB CMMS - TOOLS-RBAC.JS
// FULL-SCREEN LIVE WALLPAPER LOGIN PORTAL + RBAC + CALIBRATION + TOOL LOGBOOK
// ============================================================================

window.currentAccessRole = sessionStorage.getItem('seiralab_active_session_role') || '';

const ROLE_PASSWORDS = {
    "Visitor": "",
    "Technical": "seiralab2026",
    "Head Technical": "seiralabhead",
    "MasterAdmin": "seiralabadmin"
};

const DEFAULT_TOOL_LOGS = [
    { id: 501, borrower: "Eng. Barzce Barcelona", toolName: "Fluke ESA612 Electrical Safety Analyzer", toolCode: "TL-SL-001", destination: "Cebu City Medical Center — ICU PM", borrowDate: "2026-10-30", borrowTime: "08:30", returnDateTime: "", status: "Borrowed" },
    { id: 502, borrower: "Eng. Marcus Vance", toolName: "Digital Optical Tachometer & Pipette Calibrator", toolCode: "TL-SL-004", destination: "God Care Medical Diagnostic — Centrifuge PM", borrowDate: "2026-10-29", borrowTime: "09:15", returnDateTime: "2026-10-29 (5:40 PM)", status: "Returned" }
];

const DEFAULT_CALIBRATION_LIST = [
    { id: "CERT-2026-5160", eqName: "Flexor Chemistry Analyzer (AB-380)", serial: "AS24B05160", facility: "Cebu City Medical Center", calDate: "2026-04-24", nextDue: "2026-10-24", accuracy: "± 0.5% Absorbance (Pass)" },
    { id: "CERT-2026-2003", eqName: "Alexis Hematology Analyzer (AB-H630)", serial: "G10012422003", facility: "God Care Medical Diagnostic", calDate: "2026-04-26", nextDue: "2026-10-26", accuracy: "± 0.8% CV (Pass)" }
];

window.toolLogs = JSON.parse(localStorage.getItem('seiralab_tool_logs')) || DEFAULT_TOOL_LOGS;
window.calibrationList = JSON.parse(localStorage.getItem('seiralab_calibrations')) || DEFAULT_CALIBRATION_LIST;

// ============================================================================
// 1. FULL-SCREEN LOGIN PORTAL WITH INTERACTIVE LIVE WALLPAPER
// ============================================================================
let wallpaperMode = localStorage.getItem('seiralab_wallpaper_mode') || 'network'; // 'network' | 'ecg' | 'static'
let wallpaperAnimId = null;

function buildFullScreenLoginPortal() {
    if (document.getElementById('seiralabLoginPortal')) return;

    const portalHTML = `
    <div id="seiralabLoginPortal" class="fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-between overflow-hidden select-none">
        <!-- Interactive HTML5 Canvas Live Wallpaper -->
        <canvas id="liveWallpaperCanvas" class="absolute inset-0 w-full h-full pointer-events-none"></canvas>

        <!-- Top Bar: Seiralab Incorporated Wide Banner Logo (Top-Left per Sketch) -->
        <div class="relative z-10 p-5 sm:p-8 flex items-center justify-between">
            <div class="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/20 inline-flex items-center space-x-3">
                <img src="./seiralab-logo.gIH9ySyn.jpg" 
                     alt="Seiralab Incorporated" 
                     class="h-10 sm:h-12 w-auto object-contain"
                     onerror="this.onerror=null; this.src='./seiralab-logo.jpg';">
            </div>

            <!-- Live Wallpaper Mode Switcher (Test 3 Background Options) -->
            <div class="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 flex items-center space-x-1 text-[11px] text-slate-300 shadow-lg">
                <span class="px-2 font-semibold text-teal-400 hidden sm:inline">Live Wallpaper:</span>
                <button type="button" onclick="setWallpaperMode('network')" id="wpBtn-network" class="px-2.5 py-1 rounded-lg font-medium transition-colors bg-teal-600 text-white">1. Bio-Nodes</button>
                <button type="button" onclick="setWallpaperMode('ecg')" id="wpBtn-ecg" class="px-2.5 py-1 rounded-lg font-medium transition-colors hover:bg-slate-800">2. ECG Pulse</button>
                <button type="button" onclick="setWallpaperMode('static')" id="wpBtn-static" class="px-2.5 py-1 rounded-lg font-medium transition-colors hover:bg-slate-800">3. Static</button>
            </div>
        </div>

        <!-- Center Login Card (Matches Sketch Layout) -->
        <div class="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
            <div class="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-teal-500/30 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
                <!-- Subtle top glow bar -->
                <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-yellow-400 to-teal-500"></div>

                <!-- Center Biomedical Technical Team Logo -->
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
                    <!-- BOX 1: LOGIN (ROLE CHOICES: Technical, Admin, Head) -->
                    <div>
                        <select id="portalRoleSelect" onchange="handlePortalRoleChange()" class="w-full bg-slate-950/90 border-2 border-slate-700 focus:border-teal-400 text-white font-semibold text-sm rounded-xl px-4 py-3.5 text-center focus:outline-none transition-colors cursor-pointer shadow-inner">
                            <option value="Technical">Technical</option>
                            <option value="MasterAdmin">Admin (MasterAdmin)</option>
                            <option value="Head Technical">Head (Head Technical)</option>
                        </select>
                        <label class="block text-center text-xs font-bold uppercase tracking-widest text-teal-400 mt-1.5">Login</label>
                    </div>

                    <!-- BOX 2: PASSWORD INPUT -->
                    <div id="portalPasswordContainer">
                        <input type="password" id="portalPasswordInput" required placeholder="••••••••••••" class="w-full bg-slate-950/90 border-2 border-slate-700 focus:border-teal-400 text-white font-mono text-center text-base rounded-xl px-4 py-3 focus:outline-none transition-colors shadow-inner">
                        <label class="block text-center text-xs font-bold uppercase tracking-widest text-teal-400 mt-1.5">Password</label>
                    </div>

                    <!-- Error Message Display -->
                    <p id="portalLoginError" class="hidden text-xs font-semibold text-rose-400 text-center bg-rose-950/60 border border-rose-500/40 rounded-lg py-2 px-3"></p>

                    <!-- Sign In Button -->
                    <button type="submit" class="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-900/50 transition-all transform active:scale-[0.99] cursor-pointer">
                        Enter Seiralab System
                    </button>
                </form>

                <!-- Visitor View-Only Quick Access -->
                <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Hospital Client or Auditor?</span>
                    <button type="button" onclick="loginAsVisitor()" class="text-yellow-400 hover:text-yellow-300 font-semibold underline cursor-pointer">
                        Continue as Visitor (View Only) &rarr;
                    </button>
                </div>
            </div>
        </div>

        <!-- Bottom Status Footer -->
        <div class="relative z-10 px-6 py-3 text-center text-[11px] text-slate-500 flex items-center justify-between max-w-7xl w-full mx-auto">
            <span>Seiralab Incorporated &bull; Diagnostic &amp; Medical Equipment</span>
            <span class="hidden sm:inline text-slate-400">Move mouse or touch screen to interact with live wallpaper</span>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', portalHTML);
    initLiveWallpaperCanvas();
}

// ============================================================================
// 2. HTML5 CANVAS INTERACTIVE LIVE WALLPAPER ENGINE (3 MODES)
// ============================================================================
let mousePos = { x: -999, y: -999 };

function setWallpaperMode(mode) {
    wallpaperMode = mode;
    localStorage.setItem('seiralab_wallpaper_mode', mode);
    ['network', 'ecg', 'static'].forEach(m => {
        const btn = document.getElementById(`wpBtn-${m}`);
        if (btn) {
            btn.className = m === mode
                ? 'px-2.5 py-1 rounded-lg font-medium transition-colors bg-teal-600 text-white'
                : 'px-2.5 py-1 rounded-lg font-medium transition-colors hover:bg-slate-800 text-slate-300';
        }
    });
}

function initLiveWallpaperCanvas() {
    const canvas = document.getElementById('liveWallpaperCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    setWallpaperMode(wallpaperMode);

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

    // Create movable floating biomedical nodes
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
        // Left & Right decorative vertical waves (Green, Yellow, Navy lines from your sketch)
        const sideLines = [
            { offset: 25, color: 'rgba(16, 185, 129, 0.45)', width: 2.5, speed: 0.02 },
            { offset: 48, color: 'rgba(250, 204, 21, 0.40)', width: 2, speed: 0.025 },
            { offset: 70, color: 'rgba(20, 184, 166, 0.30)', width: 1.5, speed: 0.015 }
        ];

        sideLines.forEach((line, idx) => {
            // Left wave
            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.width;
            for (let y = 0; y <= h; y += 15) {
                const waveX = line.offset + Math.sin(y * 0.012 + tick * line.speed + idx) * 14;
                if (y === 0) ctx.moveTo(waveX, y);
                else ctx.lineTo(waveX, y);
            }
            ctx.stroke();

            // Right wave
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

        // Deep medical navy/slate gradient background
        const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.75);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Always draw the sketch's left & right vertical accent waves
        drawSideRibbonWaves(w, h);

        if (wallpaperMode === 'network') {
            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;

                // Interactive mouse repulsion/attraction
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

                // Draw node
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                // Connect nearby biomedical nodes
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
        } else if (wallpaperMode === 'ecg') {
            // Animated ECG / Telemetry Waveform
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.lineWidth = 2;
            const midY = h * 0.5;
            for (let x = 0; x < w; x += 6) {
                const phase = (x + tick * 4) % 260;
                let yOffset = Math.sin((x + tick * 2) * 0.02) * 12;
                if (phase > 110 && phase < 125) yOffset -= 65;
                else if (phase >= 125 && phase < 140) yOffset += 45;
                else if (phase >= 140 && phase < 160) yOffset -= 25;

                if (x === 0) ctx.moveTo(x, midY + yOffset);
                else ctx.lineTo(x, midY + yOffset);
            }
            ctx.stroke();
        }

        wallpaperAnimId = requestAnimationFrame(animate);
    }

    if (!wallpaperAnimId) {
        animate();
    }
}

function submitPortalLogin(event) {
    event.preventDefault();
    const role = document.getElementById('portalRoleSelect').value;
    const typedPass = document.getElementById('portalPasswordInput').value.trim();
    const errorEl = document.getElementById('portalLoginError');

    const correctPass = ROLE_PASSWORDS[role];
    if (typedPass === correctPass) {
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
    buildFullScreenLoginPortal();
    const portal = document.getElementById('seiralabLoginPortal');
    if (portal) {
        portal.classList.remove('hidden');
        document.getElementById('portalLoginError')?.classList.add('hidden');
        document.getElementById('portalPasswordInput').value = '';
    }
}

// ============================================================================
// 3. ROLE PERMISSIONS & PASSWORD AUTHENTICATION
// ============================================================================
function isVisitor(role) {
    return role === 'Visitor';
}

function isSupervisorOrAdmin(role) {
    return role === 'Head Technical' || role === 'MasterAdmin';
}

function isMasterAdminOnly(role) {
    return role === 'MasterAdmin';
}

function ensureDynamicModalsExist() {
    buildFullScreenLoginPortal();

    if (!document.getElementById('addCalibrationModal')) {
        const calModalHTML = `
        <div id="addCalibrationModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h3 class="font-bold text-slate-900 text-lg flex items-center space-x-2">
                        <i data-lucide="file-check-2" class="w-5 h-5 text-teal-600"></i>
                        <span>Add Calibration Report</span>
                    </h3>
                    <button type="button" onclick="closeAddCalibrationModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <form id="addCalibrationForm" onsubmit="saveCalibrationReport(event)" class="space-y-4 pt-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Certificate ID *</label>
                            <input type="text" id="calCertId" required placeholder="e.g., CERT-2026-9001" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Serial Number *</label>
                            <input type="text" id="calSerial" required placeholder="e.g., AS24B05160" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Equipment Name &amp; Model *</label>
                        <input type="text" id="calEqName" required placeholder="e.g., Flexor Chemistry Analyzer (AB-380)" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Hospital / Laboratory Facility *</label>
                        <input type="text" id="calFacility" required placeholder="e.g., Cebu City Medical Center" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Calibration Date *</label>
                            <input type="date" id="calDate" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Next Due Date *</label>
                            <input type="date" id="calNextDue" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Accuracy / Error Margin Result *</label>
                        <input type="text" id="calAccuracy" required placeholder="e.g., ± 0.5% Absorbance (Pass)" value="± 0.5% Tolerance (Pass)" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    </div>
                    <div class="pt-4 flex items-center justify-end space-x-3">
                        <button type="button" onclick="closeAddCalibrationModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg transition-colors">Save Calibration Report</button>
                    </div>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', calModalHTML);
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
        if (activeTab === 'inventory') {
            if (typeof switchTab === 'function') switchTab('dashboard');
        }
    }

    if (!hasMasterAccess) {
        document.getElementById('githubConfigModal')?.classList.add('hidden');
    }
}

function toggleRoleMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('roleDropdownMenu');
    if (menu) menu.classList.toggle('hidden');
}

function requestSwitchRole(roleName, roleSubtitle) {
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
    if (subEl) {
        subEl.innerText = roleName === 'Visitor' ? 'View Only' : `Welcome, ${roleName}`;
    }

    ['Visitor', 'Technical', 'Head', 'MasterAdmin'].forEach(r => {
        const dot = document.getElementById(`roleCheck-${r}`);
        if (dot) {
            const match = (r === 'Head' && roleName === 'Head Technical') || (r === roleName);
            dot.className = match ? 'w-2 h-2 rounded-full bg-teal-600' : 'w-2 h-2 rounded-full bg-transparent';
        }
    });

    applyRolePermissions(roleName);
    renderToolLogsTable();

    if (!silent) {
        showWelcomeBanner(roleName);
    }
}

window.requestSwitchRole = requestSwitchRole;
window.switchAccessRole = switchAccessRole;

window.addEventListener('click', function(e) {
    const menu = document.getElementById('roleDropdownMenu');
    if (menu && !menu.classList.contains('hidden') && !menu.parentElement.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// ============================================================================
// 4. FUNCTIONAL NOTIFICATION CENTER
// ============================================================================
function buildSystemNotifications() {
    const list = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    if (!list) return;

    const today = new Date();
    const alerts = [];

    (window.equipmentList || []).forEach(eq => {
        const diffDays = Math.ceil((new Date(eq.nextDue) - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            alerts.push({
                type: 'overdue',
                title: `Overdue PM: ${eq.name}`,
                desc: `${eq.facility} (${eq.model}) — Overdue by ${Math.abs(diffDays)} days (Due: ${eq.nextDue})`,
                tab: 'schedule'
            });
        } else if (diffDays <= 14) {
            alerts.push({
                type: 'upcoming',
                title: `Upcoming PM Due in ${diffDays}d: ${eq.name}`,
                desc: `${eq.facility} (${eq.model}) — Scheduled for ${eq.nextDue}`,
                tab: 'schedule'
            });
        }
    });

    (window.calibrationList || []).forEach(cal => {
        const diffDays = Math.ceil((new Date(cal.nextDue) - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
            alerts.push({
                type: diffDays < 0 ? 'overdue' : 'upcoming',
                title: `${diffDays < 0 ? 'Recalibration Overdue' : 'Recalibration Due'}: ${cal.eqName}`,
                desc: `Cert ${cal.id} at ${cal.facility} — Due ${cal.nextDue}`,
                tab: 'calibration'
            });
        }
    });

    (window.toolLogs || []).forEach(tool => {
        if (tool.status === 'Borrowed') {
            alerts.push({
                type: 'tool',
                title: `Tool Currently Out: ${tool.toolName}`,
                desc: `Borrowed by ${tool.borrower} for ${tool.destination} (${tool.borrowDate})`,
                tab: 'tools'
            });
        }
    });

    if (badge) {
        if (alerts.length > 0) {
            badge.classList.remove('hidden');
            badge.className = 'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center';
            badge.innerText = alerts.length > 99 ? '99+' : alerts.length;
        } else {
            badge.classList.add('hidden');
        }
    }

    list.innerHTML = '';
    if (alerts.length === 0) {
        list.innerHTML = `<div class="py-8 text-center text-xs text-slate-400">All clear! No urgent maintenance, calibration, or tool alerts.</div>`;
        return;
    }

    alerts.slice(0, 25).forEach(a => {
        const boxStyle = a.type === 'overdue'
            ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/70 text-rose-900'
            : (a.type === 'tool' ? 'bg-blue-50 border-blue-200 hover:bg-blue-100/70 text-blue-900' : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70 text-amber-900');

        const dotColor = a.type === 'overdue' ? 'bg-rose-500' : (a.type === 'tool' ? 'bg-blue-500' : 'bg-amber-500');

        list.innerHTML += `
            <div onclick="jumpFromNotification('${a.tab}')" class="p-3 rounded-xl border ${boxStyle} flex items-start justify-between cursor-pointer transition-colors">
                <div class="flex items-start space-x-2.5">
                    <span class="w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0"></span>
                    <div>
                        <p class="text-xs font-bold">${a.title}</p>
                        <p class="text-[11px] opacity-80 mt-0.5">${a.desc}</p>
                    </div>
                </div>
                <span class="text-[10px] font-semibold underline ml-2 shrink-0">View &rarr;</span>
            </div>
        `;
    });
}

function openNotificationModal() {
    buildSystemNotifications();
    document.getElementById('notificationModal')?.classList.remove('hidden');
}

function closeNotificationModal() {
    document.getElementById('notificationModal')?.classList.add('hidden');
}

function jumpFromNotification(tabId) {
    closeNotificationModal();
    if (typeof switchTab === 'function') switchTab(tabId);
}

window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.renderNotifications = buildSystemNotifications;

// ============================================================================
// 5. CALIBRATION REPORT: ADD MODAL & EXPORT CSV
// ============================================================================
function upgradeCalibrationToolbarUI() {
    ensureDynamicModalsExist();
    const calToolbar = document.querySelector('#calibration .flex.items-center.space-x-3') || document.querySelector('#calibration .flex.flex-wrap.items-center.gap-3');
    if (!calToolbar) return;

    if (!document.getElementById('btnAddCalibrationReport')) {
        calToolbar.innerHTML = `
            <button type="button" id="btnAddCalibrationReport" onclick="openAddCalibrationModal()" class="inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm shadow-sm transition-all space-x-2">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>Add Calibration Report</span>
            </button>
            <button type="button" id="btnExportCalibrationData" onclick="exportCalibrationDataCSV()" class="inline-flex items-center justify-center px-4 py-2 bg-white border border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 font-medium text-sm shadow-xs transition-all space-x-2">
                <i data-lucide="download" class="w-4 h-4"></i>
                <span>Export Calibration Data</span>
            </button>
            <button type="button" onclick="window.print()" class="inline-flex items-center justify-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-sm shadow-sm transition-all space-x-2">
                <i data-lucide="printer" class="w-4 h-4"></i>
                <span>Print Calibration Report</span>
            </button>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

function renderCalibrationTable() {
    upgradeCalibrationToolbarUI();
    const tbody = document.getElementById('calibrationTableBody');
    if (!tbody) return;

    const today = new Date();
    let dueSoonCount = 0;

    window.calibrationList.forEach(item => {
        const diffDays = Math.ceil((new Date(item.nextDue) - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) dueSoonCount++;
    });

    const elTotal = document.getElementById('statCalTotal');
    const elDue = document.getElementById('statCalDue');
    if (elTotal) elTotal.innerText = window.calibrationList.length;
    if (elDue) elDue.innerText = dueSoonCount;

    tbody.innerHTML = '';
    if (window.calibrationList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No calibration records found. Click "+ Add Calibration Report" to create one.</td></tr>`;
        return;
    }

    window.calibrationList.slice(0, 100).forEach(item => {
        const diffDays = Math.ceil((new Date(item.nextDue) - today) / (1000 * 60 * 60 * 24));
        const dueColor = diffDays < 0 ? 'text-rose-600 font-semibold' : (diffDays <= 30 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-medium');

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4 font-mono font-semibold text-slate-700">${item.id}</td>
                <td class="p-4 font-semibold text-slate-900">${item.eqName}<br><span class="text-[11px] font-normal text-slate-500">${item.serial}</span></td>
                <td class="p-4 text-slate-600">${item.facility}</td>
                <td class="p-4 text-slate-600">${item.calDate}</td>
                <td class="p-4 ${dueColor}">${item.nextDue}</td>
                <td class="p-4 text-slate-600">${item.accuracy}</td>
                <td class="p-4 text-right">
                    <button onclick="downloadCalibrationCert('${item.id}')" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors">Download PDF</button>
                </td>
            </tr>
        `;
    });
}

function openAddCalibrationModal() {
    if (isVisitor(window.currentAccessRole)) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true);
        return;
    }
    ensureDynamicModalsExist();
    document.getElementById('addCalibrationForm')?.reset();

    const today = new Date();
    const nextSixMonths = new Date();
    nextSixMonths.setMonth(nextSixMonths.getMonth() + 6);

    const randNum = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('calCertId').value = `CERT-${today.getFullYear()}-${randNum}`;
    document.getElementById('calDate').value = today.toISOString().split('T')[0];
    document.getElementById('calNextDue').value = nextSixMonths.toISOString().split('T')[0];
    document.getElementById('calAccuracy').value = "± 0.5% Tolerance (Pass)";

    document.getElementById('addCalibrationModal')?.classList.remove('hidden');
}

function closeAddCalibrationModal() {
    document.getElementById('addCalibrationModal')?.classList.add('hidden');
}

async function saveCalibrationReport(event) {
    event.preventDefault();
    if (isVisitor(window.currentAccessRole)) return;

    const id = document.getElementById('calCertId').value.trim();
    const serial = document.getElementById('calSerial').value.trim();
    const eqName = document.getElementById('calEqName').value.trim();
    const facility = document.getElementById('calFacility').value.trim();
    const calDate = document.getElementById('calDate').value;
    const nextDue = document.getElementById('calNextDue').value;
    const accuracy = document.getElementById('calAccuracy').value.trim();

    window.calibrationList.unshift({ id, eqName, serial, facility, calDate, nextDue, accuracy });
    localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));

    closeAddCalibrationModal();
    renderCalibrationTable();
    buildSystemNotifications();

    if (typeof showNotificationToast === 'function') showNotificationToast(`Calibration Report ${id} saved!`);
    if (typeof pushToGitHub === 'function') await pushToGitHub(`Add Calibration Certificate ${id} for ${eqName}`);
}

function exportCalibrationDataCSV() {
    const headers = ["Certificate ID", "Equipment Name & Model", "Serial Number", "Hospital / Facility", "Calibration Date", "Next Due Date", "Accuracy / Error Margin"];
    const rows = (window.calibrationList || []).map(c => [
        `"${c.id}"`, `"${c.eqName}"`, `"${c.serial}"`, `"${c.facility}"`, c.calDate, c.nextDue, `"${c.accuracy}"`
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    if (typeof downloadBlob === 'function') {
        downloadBlob(csv, `Seiralab_Calibration_Reports_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    }
    if (typeof showNotificationToast === 'function') showNotificationToast("Exported Calibration Reports CSV!");
}

function downloadCalibrationCert(certId) {
    const item = window.calibrationList.find(c => c.id === certId);
    if (!item) return;
    const content = `=========================================================
SEIRALAB INCORPORATED - OFFICIAL CALIBRATION CERTIFICATE
=========================================================
Certificate No.   : ${item.id}
Client Facility   : ${item.facility}
Equipment & Model : ${item.eqName}
Serial Number     : ${item.serial}
Calibration Date  : ${item.calDate}
Next Recalibration: ${item.nextDue}
Measured Accuracy : ${item.accuracy}
Standard Status   : ISO/IEC 17025 Traceable — PASSED
=========================================================`;
    if (typeof downloadBlob === 'function') downloadBlob(content, `Seiralab_Calibration_${item.id}.txt`, 'text/plain');
}

// ============================================================================
// 6. BIOMED OFFICE TOOL & KIT LOGBOOK
// ============================================================================
function formatTime12Hr(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

function renderToolLogsTable() {
    const tbody = document.getElementById('toolLogsTableBody');
    if (!tbody) return;

    const search = (document.getElementById('toolSearchInput')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('toolStatusFilter')?.value || '';

    const elTotal = document.getElementById('statToolsTotal');
    const elOut = document.getElementById('statToolsOut');
    const elRet = document.getElementById('statToolsReturned');
    if (elTotal) elTotal.innerText = window.toolLogs.length;
    if (elOut) elOut.innerText = window.toolLogs.filter(t => t.status === 'Borrowed').length;
    if (elRet) elRet.innerText = window.toolLogs.filter(t => t.status === 'Returned').length;

    const filtered = window.toolLogs.filter(t => {
        const matchSearch = t.borrower.toLowerCase().includes(search) ||
                            t.toolName.toLowerCase().includes(search) ||
                            t.toolCode.toLowerCase().includes(search) ||
                            t.destination.toLowerCase().includes(search);
        const matchStatus = !statusFilter || t.status === statusFilter;
        return matchSearch && matchStatus;
    });

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No tool borrowing records match your filter.</td></tr>`;
        return;
    }

    const isVis = isVisitor(window.currentAccessRole);
    filtered.forEach(log => {
        const statusBadge = log.status === 'Borrowed'
            ? `<span class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span><span>Borrowed (Out)</span></span>`
            : `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Returned</span></span>`;

        const actionBtns = isVis ? `<span class="text-xs text-slate-400 italic">View Only</span>` : (
            log.status === 'Borrowed'
                ? `<button onclick="markToolReturned(${log.id})" class="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs">Mark Returned</button>`
                : `<span class="text-xs text-slate-400 font-medium">Cleared</span>`
        );

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4 font-semibold text-slate-900">${log.borrower}</td>
                <td class="p-4 font-medium text-slate-800">${log.toolName}<br><span class="text-xs font-mono text-slate-400">ID: ${log.toolCode}</span></td>
                <td class="p-4 text-xs text-slate-600">${log.destination}</td>
                <td class="p-4 text-xs font-medium text-slate-800">${log.borrowDate}<br><span class="text-teal-600 font-semibold">${formatTime12Hr(log.borrowTime)}</span></td>
                <td class="p-4 text-xs text-slate-600">${log.returnDateTime || '<span class="text-amber-600 italic">Still in field</span>'}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4 text-right space-x-2">${actionBtns}</td>
            </tr>
        `;
    });
}

function openBorrowToolModal() {
    if (isVisitor(window.currentAccessRole)) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true);
        return;
    }
    document.getElementById('borrowToolForm')?.reset();
    const now = new Date();
    document.getElementById('toolBorrowDate').value = now.toISOString().split('T')[0];
    document.getElementById('toolBorrowTime').value = now.toTimeString().slice(0, 5);
    document.getElementById('borrowToolModal')?.classList.remove('hidden');
}

function closeBorrowToolModal() {
    document.getElementById('borrowToolModal')?.classList.add('hidden');
}

async function saveToolBorrow(event) {
    event.preventDefault();
    if (isVisitor(window.currentAccessRole)) return;

    const borrower = document.getElementById('toolBorrower').value.trim();
    const toolName = document.getElementById('toolName').value.trim();
    const toolCode = document.getElementById('toolCode').value.trim();
    const destination = document.getElementById('toolDestination').value.trim();
    const borrowDate = document.getElementById('toolBorrowDate').value;
    const borrowTime = document.getElementById('toolBorrowTime').value;

    window.toolLogs.unshift({
        id: Date.now(), borrower, toolName, toolCode, destination, borrowDate, borrowTime, returnDateTime: "", status: "Borrowed"
    });
    localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
    closeBorrowToolModal();
    renderToolLogsTable();
    buildSystemNotifications();

    if (typeof showNotificationToast === 'function') showNotificationToast(`Logged out ${toolName} to ${borrower}`);
    if (typeof pushToGitHub === 'function') await pushToGitHub(`Tool Check-Out: ${toolName} (${toolCode}) by ${borrower}`);
}

async function markToolReturned(logId) {
    if (isVisitor(window.currentAccessRole)) return;
    const log = window.toolLogs.find(t => t.id === logId);
    if (!log) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = formatTime12Hr(now.toTimeString().slice(0, 5));
    log.returnDateTime = `${dateStr} (${timeStr})`;
    log.status = "Returned";

    localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
    renderToolLogsTable();
    buildSystemNotifications();

    if (typeof showNotificationToast === 'function') showNotificationToast(`Marked ${log.toolName} as Returned!`);
    if (typeof pushToGitHub === 'function') await pushToGitHub(`Tool Returned: ${log.toolName} (${log.toolCode}) by ${log.borrower}`);
}

function exportToolLogsCSV() {
    const headers = ["Log ID", "Borrower Name", "Tool / Kit Name", "Tool ID", "Destination / Purpose", "Date Borrowed", "Time Borrowed", "Date & Time Returned", "Status"];
    const rows = window.toolLogs.map(t => [
        t.id, `"${t.borrower}"`, `"${t.toolName}"`, `"${t.toolCode}"`, `"${t.destination}"`, t.borrowDate, t.borrowTime, `"${t.returnDateTime || 'Still Out'}"`, t.status
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    if (typeof downloadBlob === 'function') downloadBlob(csv, `Seiralab_Biomed_Tool_Logbook_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

const baseSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
    if (tabId === 'inventory' && !isSupervisorOrAdmin(window.currentAccessRole)) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Only Head Technical & MasterAdmin can access Inventory.', true);
        return;
    }
    if (typeof baseSwitchTab === 'function') {
        baseSwitchTab(tabId);
    } else {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-teal-600', 'text-teal-600');
            btn.classList.add('border-transparent', 'text-slate-500');
        });
        document.getElementById(tabId)?.classList.add('active');
        const activeBtn = document.querySelector(`[data-target="${tabId}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('border-transparent', 'text-slate-500');
            activeBtn.classList.add('border-teal-600', 'text-teal-600');
        }
    }
    if (tabId === 'tools') renderToolLogsTable();
    if (tabId === 'calibration') renderCalibrationTable();
};

window.addEventListener('DOMContentLoaded', function() {
    ensureDynamicModalsExist();
    upgradeCalibrationToolbarUI();

    // Clean role dropdown & add "Full Login Screen" option
    const roleMenu = document.getElementById('roleDropdownMenu');
    if (roleMenu) {
        roleMenu.innerHTML = `
            <div class="px-3 py-1.5 border-b border-slate-100">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Switch Access Level</p>
            </div>
            <button type="button" onclick="requestSwitchRole('Visitor', 'View Only')" class="w-full px-3 py-2 text-left text-xs hover:bg-teal-50 flex items-center justify-between group">
                <span class="font-semibold text-slate-800 group-hover:text-teal-700">Visitor</span>
                <span id="roleCheck-Visitor" class="w-2 h-2 rounded-full bg-transparent"></span>
            </button>
            <button type="button" onclick="requestSwitchRole('Technical', 'Welcome, Technical')" class="w-full px-3 py-2 text-left text-xs hover:bg-teal-50 flex items-center justify-between group">
                <span class="font-semibold text-slate-800 group-hover:text-teal-700">Technical</span>
                <span id="roleCheck-Technical" class="w-2 h-2 rounded-full bg-transparent"></span>
            </button>
            <button type="button" onclick="requestSwitchRole('Head Technical', 'Welcome, Head Technical')" class="w-full px-3 py-2 text-left text-xs hover:bg-teal-50 flex items-center justify-between group">
                <span class="font-semibold text-slate-800 group-hover:text-teal-700">Head Technical</span>
                <span id="roleCheck-Head" class="w-2 h-2 rounded-full bg-transparent"></span>
            </button>
            <button type="button" onclick="requestSwitchRole('MasterAdmin', 'Welcome, MasterAdmin')" class="w-full px-3 py-2 text-left text-xs hover:bg-teal-50 flex items-center justify-between group">
                <span class="font-semibold text-slate-800 group-hover:text-teal-700">MasterAdmin</span>
                <span id="roleCheck-MasterAdmin" class="w-2 h-2 rounded-full bg-transparent"></span>
            </button>
            <div class="border-t border-slate-100 mt-1 pt-1">
                <button type="button" onclick="openFullScreenLoginPortal()" class="w-full px-3 py-2 text-left text-xs font-bold text-teal-600 hover:bg-teal-50 flex items-center justify-between">
                    <span>Lock / Full Login Screen</span>
                    <span>&rarr;</span>
                </button>
            </div>
        `;
    }

    // Show the full-screen Login Portal on fresh visit, or restore active session
    const activeSessionRole = sessionStorage.getItem('seiralab_active_session_role');
    if (activeSessionRole) {
        document.getElementById('seiralabLoginPortal')?.classList.add('hidden');
        switchAccessRole(activeSessionRole, activeSessionRole === 'Visitor' ? 'View Only' : `Welcome, ${activeSessionRole}`, true);
    } else {
        document.getElementById('seiralabLoginPortal')?.classList.remove('hidden');
    }

    renderCalibrationTable();
    renderToolLogsTable();
    buildSystemNotifications();
});
