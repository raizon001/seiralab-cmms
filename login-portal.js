// ============================================================================
// SEIRALAB CMMS - LOGIN-PORTAL.JS (SERVER-SIDE AUTHENTICATION)
// ============================================================================

function togglePortalPasswordInput() {
    const roleSelect = document.getElementById('portalRoleSelect');
    const pwdContainer = document.getElementById('portalPasswordContainer');
    if (!roleSelect || !pwdContainer) return;

    if (roleSelect.value === 'Visitor') {
        pwdContainer.classList.add('hidden');
    } else {
        pwdContainer.classList.remove('hidden');
    }
}

function enterVisitorModeDirect() {
    window.currentAccessRole = 'Visitor';
    sessionStorage.setItem('seiralab_active_session_role', 'Visitor');
    localStorage.setItem('seiralab_access_role', 'Visitor');
    const overlay = document.getElementById('loginPortalOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (typeof switchAccessRole === 'function') switchAccessRole('Visitor');
    if (typeof showNotificationToast === 'function') showNotificationToast('Entered system as Visitor (View Only)');
}

async function handlePortalLogin(event) {
    event.preventDefault();
    const role = document.getElementById('portalRoleSelect')?.value || 'Technical';
    const password = document.getElementById('portalPasswordInput')?.value || '';
    const errEl = document.getElementById('portalErrorMsg');
    if (errEl) errEl.classList.add('hidden');

    if (role === 'Visitor') {
        enterVisitorModeDirect();
        return;
    }

    if (!password.trim()) {
        if (errEl) {
            errEl.innerText = 'Please enter the authorization password.';
            errEl.classList.remove('hidden');
        }
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            window.currentAccessRole = role;
            sessionStorage.setItem('seiralab_active_session_role', role);
            localStorage.setItem('seiralab_access_role', role);
            if (result.token) {
                localStorage.setItem('seiralab_session_token', result.token);
            }

            const overlay = document.getElementById('loginPortalOverlay');
            if (overlay) overlay.classList.add('hidden');

            if (typeof switchAccessRole === 'function') switchAccessRole(role);
            if (typeof showNotificationToast === 'function') showNotificationToast(`Logged in successfully as ${role}`);
        } else {
            if (errEl) {
                errEl.innerText = result.error || 'Invalid authorization password.';
                errEl.classList.remove('hidden');
            }
        }
    } catch (err) {
        if (errEl) {
            errEl.innerText = 'Connection error. Please check your network or Worker proxy.';
            errEl.classList.remove('hidden');
        }
    }
}

// Wallpaper Animation Canvas in Login Background
window.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('biomedWallpaperCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 35 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1
    }));

    function animateWallpaper() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(13, 148, 136, 0.25)';
        ctx.strokeStyle = 'rgba(13, 148, 136, 0.1)';

        particles.forEach((p, idx) => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            for (let j = idx + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 130) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        });
        requestAnimationFrame(animateWallpaper);
    }
    animateWallpaper();
});
