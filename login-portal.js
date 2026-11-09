// ============================================================================
// SEIRALAB CMMS - LOGIN-PORTAL.JS
// Restores Live Interactive Biomedical Wallpaper + Hybrid Server/Hash Login
// ============================================================================

(function () {
    // Obfuscated SHA-256 verification for original Seiralab credentials
    // Technical: seiralabtech | Head Technical: seiralabhead | MasterAdmin: seiralabadmin
    const _0x9a = [
        ['VmlzaXRvcg==', ''],
        ['VGVjaG5pY2Fs', 'YzA0NzhhMjIwNDBhN2UwMTI1OTkxZTdlOTRlNjk1NzI1MDA5MTI4ZDFiYTczMTc0NzEyMjc3Mzk5NTRkMWU4'],
        ['SGVhZCBUZWNobmljYWw=', 'YzcyZTcxMTM2NzJmMjk1MDA4NDk3OTAyNjg5Njk1NjYyOTk5Mjc4NDg4YzI3OTJjMjdhMGI1ZjhhMzYzYzg3OTE='],
        ['TWFzdGVyQWRtaW4=', 'Mjc1NWMxM2E4MjI2NjU4ODk0OTY3OTEwODM1MjAwMTBhMjgyNmMxNTcwOTM4OTk1Njg1YTIwMDMxNWE1NjA3Mg==']
    ];

    async function verifyClientHash(role, password) {
        const cleanPass = String(password || '').trim();
        const msgBuffer = new TextEncoder().encode(cleanPass);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashHex = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        for (const [rB64, hB64] of _0x9a) {
            if (atob(rB64) === role) {
                return hashHex === atob(hB64);
            }
        }
        return false;
    }
    window.verifyClientHash = verifyClientHash;

    function togglePortalPasswordInput() {
        const roleSelect = document.getElementById('portalRoleSelect');
        const pwdContainer = document.getElementById('portalPasswordContainer');
        const errEl = document.getElementById('portalErrorMsg');
        if (errEl) errEl.classList.add('hidden');
        if (!roleSelect || !pwdContainer) return;

        if (roleSelect.value === 'Visitor') {
            pwdContainer.classList.add('hidden');
        } else {
            pwdContainer.classList.remove('hidden');
        }
    }

    function applyAuthenticatedSession(role, token) {
        window.currentAccessRole = role;
        sessionStorage.setItem('seiralab_active_session_role', role);
        localStorage.setItem('seiralab_access_role', role);
        if (token) {
            localStorage.setItem('seiralab_session_token', token);
        }

        const roleDropdown = document.getElementById('accessRoleSelect');
        if (roleDropdown) roleDropdown.value = role;

        const subtext = document.getElementById('accessRoleSubtext');
        if (subtext) subtext.innerText = `Welcome, ${role}`;

        const overlay = document.getElementById('loginPortalOverlay');
        if (overlay) overlay.classList.add('hidden');

        if (typeof window.switchAccessRole === 'function') {
            window.switchAccessRole(role, true);
        }
        if (typeof window.upgradeMaintenanceHistoryCertificateButtons === 'function') {
            window.upgradeMaintenanceHistoryCertificateButtons();
        }
        if (typeof window.renderCalibrationTable === 'function') {
            window.renderCalibrationTable();
        }
        if (typeof window.showNotificationToast === 'function') {
            window.showNotificationToast(`Logged in as ${role}`);
        }
    }

    function enterVisitorModeDirect() {
        applyAuthenticatedSession('Visitor', 'visitor_session');
    }

    async function handlePortalLogin(event) {
        if (event) event.preventDefault();

        const role = document.getElementById('portalRoleSelect')?.value || 'Technical';
        const password = (document.getElementById('portalPasswordInput')?.value || '').trim();
        const errEl = document.getElementById('portalErrorMsg');
        if (errEl) errEl.classList.add('hidden');

        if (role === 'Visitor') {
            enterVisitorModeDirect();
            return;
        }

        if (!password) {
            if (errEl) {
                errEl.innerText = 'Please enter your role authorization password.';
                errEl.classList.remove('hidden');
            }
            return;
        }

        let authenticated = false;
        let sessionToken = '';

        // 1. Try Server-Side Worker Authentication (/api/login) first
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, password })
            });

            if (response.ok) {
                const result = await response.json();
                if (result && result.success) {
                    authenticated = true;
                    sessionToken = result.token || ('sli_' + Date.now());
                }
            }
        } catch (_) {
            // Worker endpoint not reachable or offline -> fall through to SHA-256 verification
        }

        // 2. Fallback to SHA-256 verification so login ALWAYS works even if /api/login isn't in worker.js yet
        if (!authenticated) {
            authenticated = await verifyClientHash(role, password);
            if (authenticated) {
                sessionToken = 'sli_local_' + Date.now();
            }
        }

        if (authenticated) {
            applyAuthenticatedSession(role, sessionToken);
        } else {
            if (errEl) {
                errEl.innerText = `Incorrect password for ${role}. Please try again.`;
                errEl.classList.remove('hidden');
            }
        }
    }

    // Allow switching roles from the top-right header dropdown
    const origSwitchAccessRole = window.switchAccessRole;
    window.switchAccessRole = function (newRole, skipPrompt) {
        if (skipPrompt) {
            if (typeof origSwitchAccessRole === 'function') origSwitchAccessRole(newRole);
            return;
        }
        const currentRole = window.currentAccessRole || sessionStorage.getItem('seiralab_active_session_role') || 'Visitor';
        if (newRole === currentRole) return;

        if (newRole === 'Visitor') {
            applyAuthenticatedSession('Visitor', 'visitor_session');
            return;
        }

        // Re-open login portal pre-selected to the requested role
        const overlay = document.getElementById('loginPortalOverlay');
        const portalSelect = document.getElementById('portalRoleSelect');
        const portalPass = document.getElementById('portalPasswordInput');
        if (portalSelect) portalSelect.value = newRole;
        togglePortalPasswordInput();
        if (portalPass) portalPass.value = '';
        if (overlay) overlay.classList.remove('hidden');
        startBiomedLiveWallpaper();
    };

    // ========================================================================
    // LIVE INTERACTIVE BIOMEDICAL WALLPAPER (Starts Immediately — No DOMContentLoaded Bug)
    // ========================================================================
    let wallpaperAnimId = null;

    function startBiomedLiveWallpaper() {
        const overlay = document.getElementById('loginPortalOverlay');
        let canvas = document.getElementById('biomedWallpaperCanvas');
        if (!overlay) return;

        // Ensure mobile landscape scrolling works without cutting off top/bottom of card
        overlay.className = 'fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-start sm:justify-center p-4 overflow-y-auto select-none';

        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'biomedWallpaperCanvas';
            overlay.prepend(canvas);
        }

        // Make sure canvas is full-bleed and visible behind the login card
        canvas.className = 'fixed inset-0 w-full h-full pointer-events-none z-0';
        canvas.style.opacity = '0.85';

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (wallpaperAnimId) cancelAnimationFrame(wallpaperAnimId);

        let width = (canvas.width = window.innerWidth || 800);
        let height = (canvas.height = window.innerHeight || 600);
        let mouse = { x: width / 2, y: height / 2 };

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches[0]) {
                mouse.x = e.touches[0].clientX;
                mouse.y = e.touches[0].clientY;
            }
        }, { passive: true });

        const particleCount = width < 768 ? 38 : 65;
        const particles = Array.from({ length: particleCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.85,
            vy: (Math.random() - 0.5) * 0.85,
            radius: Math.random() * 2.4 + 1.2,
            pulse: Math.random() * Math.PI * 2
        }));

        let ecgOffset = 0;

        function renderFrame() {
            if (overlay.classList.contains('hidden')) {
                wallpaperAnimId = null;
                return;
            }

            ctx.clearRect(0, 0, width, height);

            // Subtle radial biomedical glow in center
            const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, Math.max(width, height) * 0.7);
            grad.addColorStop(0, 'rgba(13, 148, 136, 0.16)');
            grad.addColorStop(0.5, 'rgba(6, 78, 59, 0.08)');
            grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            // Subtle ECG heartbeat wave across the background
            ecgOffset = (ecgOffset + 2.2) % width;
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(20, 184, 166, 0.18)';
            ctx.lineWidth = 1.5;
            const midY = height * 0.5;
            for (let x = 0; x < width; x += 6) {
                const distFromWave = Math.abs(x - ecgOffset);
                let y = midY;
                if (distFromWave < 45) {
                    const phase = (x - ecgOffset) / 9;
                    y = midY + Math.sin(phase * Math.PI) * 28 * Math.exp(-distFromWave / 18);
                }
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Draw glowing nodes & molecular constellation lines
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += 0.04;

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                // Node glow
                const alpha = 0.45 + Math.sin(p.pulse) * 0.25;
                ctx.beginPath();
                ctx.fillStyle = `rgba(45, 212, 191, ${alpha})`;
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();

                // Connect nearby particles
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 135) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(20, 184, 166, ${(1 - dist / 135) * 0.28})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }

                // Connect to mouse/touch cursor
                const mDist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
                if (mDist < 160) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(52, 211, 153, ${(1 - mDist / 160) * 0.45})`;
                    ctx.lineWidth = 1.2;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }

            wallpaperAnimId = requestAnimationFrame(renderFrame);
        }

        renderFrame();
    }

    // Export globally so index.html form onsubmit="handlePortalLogin(event)" always finds them
    window.togglePortalPasswordInput = togglePortalPasswordInput;
    window.enterVisitorModeDirect = enterVisitorModeDirect;
    window.handlePortalLogin = handlePortalLogin;
    window.startBiomedLiveWallpaper = startBiomedLiveWallpaper;

    // Start immediately if DOM is already ready, or on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startBiomedLiveWallpaper);
    } else {
        startBiomedLiveWallpaper();
    }
})();
