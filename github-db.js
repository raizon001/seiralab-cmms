// ============================================================================
// SEIRALAB ATLAS - PERMANENT CLOUD & LOCAL DATABASE SYNC ENGINE (github-db.js)
// Automatically saves every Create, Edit, Import, and Delete to Cloud + Local
// ============================================================================

const DEFAULT_GH_CONFIG = {
    mode: 'proxy', // 'proxy' uses Cloudflare /api/data automatically
    proxyUrl: '/api/data',
    owner: 'raizon001',
    repo: 'seiralab-cmms-db',
    branch: 'main',
    path: 'data/cmms_db.json',
    token: ''
};

let ghConfig = Object.assign({}, DEFAULT_GH_CONFIG, JSON.parse(localStorage.getItem('seiralab_gh_config') || '{}'));
// Force proxyUrl to /api/data so it always talks to your Cloudflare Worker
if (!ghConfig.proxyUrl) ghConfig.proxyUrl = '/api/data';

let currentFileSHA = localStorage.getItem('seiralab_last_sha') || '';
let isSyncingFromCloud = false;
let syncDebounceTimer = null;

// ============================================================================
// 1. UTF-8 SAFE BASE64 HELPERS (For Direct GitHub API Fallback)
// ============================================================================
function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUtf8(base64) {
    const clean = (base64 || '').replace(/\s/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

// ============================================================================
// 2. KEEP app.js AND window.* ARRAYS 100% SYNCHRONIZED
// ============================================================================
function getCurrentDatabasePayload() {
    let eq = window.equipmentList;
    let hist = window.historyLogs;
    let tools = window.toolLogs;
    let cals = window.calibrationList;

    // Pull from localStorage if local scope in app.js updated it first
    try {
        const storedEq = JSON.parse(localStorage.getItem('seiralab_equipment') || 'null');
        if (Array.isArray(storedEq)) eq = storedEq;
    } catch (_) {}

    try {
        const storedHist = JSON.parse(localStorage.getItem('seiralab_history') || 'null');
        if (Array.isArray(storedHist)) hist = storedHist;
    } catch (_) {}

    try {
        const storedTools = JSON.parse(localStorage.getItem('seiralab_tool_logs') || 'null');
        if (Array.isArray(storedTools)) tools = storedTools;
    } catch (_) {}

    try {
        const storedCals = JSON.parse(localStorage.getItem('seiralab_calibrations') || 'null');
        if (Array.isArray(storedCals)) cals = storedCals;
    } catch (_) {}

    window.equipmentList = Array.isArray(eq) ? eq : [];
    window.historyLogs = Array.isArray(hist) ? hist : [];
    window.toolLogs = Array.isArray(tools) ? tools : [];
    window.calibrationList = Array.isArray(cals) ? cals : [];

    return {
        updatedAt: new Date().toISOString(),
        updatedBy: window.currentAccessRole || 'System',
        equipmentList: window.equipmentList,
        historyLogs: window.historyLogs,
        toolLogs: window.toolLogs,
        calibrationList: window.calibrationList
    };
}

function applyDatabaseToAppState(dbData) {
    if (!dbData || typeof dbData !== 'object') return;

    isSyncingFromCloud = true;
    try {
        if (Array.isArray(dbData.equipmentList)) {
            window.equipmentList = dbData.equipmentList;
            localStorage.setItem('seiralab_equipment', JSON.stringify(dbData.equipmentList));
            try { if (typeof equipmentList !== 'undefined') equipmentList = dbData.equipmentList; } catch (_) {}
        }
        if (Array.isArray(dbData.historyLogs)) {
            window.historyLogs = dbData.historyLogs;
            localStorage.setItem('seiralab_history', JSON.stringify(dbData.historyLogs));
            try { if (typeof historyLogs !== 'undefined') historyLogs = dbData.historyLogs; } catch (_) {}
        }
        if (Array.isArray(dbData.toolLogs)) {
            window.toolLogs = dbData.toolLogs;
            localStorage.setItem('seiralab_tool_logs', JSON.stringify(dbData.toolLogs));
        }
        if (Array.isArray(dbData.calibrationList)) {
            window.calibrationList = dbData.calibrationList;
            localStorage.setItem('seiralab_calibrations', JSON.stringify(dbData.calibrationList));
        }
    } finally {
        isSyncingFromCloud = false;
    }

    refreshAllUIComponents();
}

function refreshAllUIComponents() {
    if (typeof populateFacilityFilter === 'function') populateFacilityFilter();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderInventoryTable === 'function') renderInventoryTable();
    if (typeof renderScheduleCards === 'function') renderScheduleCards();
    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    if (typeof renderReports === 'function') renderReports();
    if (typeof renderCalibrationTable === 'function') renderCalibrationTable();
    if (typeof renderToolLogsTable === 'function') renderToolLogsTable();
    if (typeof buildSystemNotifications === 'function') buildSystemNotifications();
}

function updateGitHubStatusBadge(state, label) {
    const textEl = document.getElementById('ghStatusText');
    const dotEl = document.getElementById('ghStatusDot');
    if (textEl) textEl.innerText = label;
    if (dotEl) {
        dotEl.className = 'w-2 h-2 rounded-full ' + (
            state === 'connected' ? 'bg-emerald-500' :
            state === 'syncing' ? 'bg-amber-500 animate-ping' :
            state === 'error' ? 'bg-rose-500' : 'bg-slate-400'
        );
    }
}

// ============================================================================
// 3. PULL PERMANENT DATA FROM CLOUD ON PAGE LOAD (syncFromGitHub)
// ============================================================================
async function syncFromGitHub(showToast = false) {
    updateGitHubStatusBadge('syncing', 'Syncing DB...');

    // Try 1: Pull from Cloudflare Worker (/api/data)
    try {
        const res = await fetch(ghConfig.proxyUrl || '/api/data', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'X-Seiralab-Client': 'ATLAS-v1'
            }
        });

        if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
            const sha = res.headers.get('X-File-SHA') || '';
            if (sha) {
                currentFileSHA = sha;
                localStorage.setItem('seiralab_last_sha', sha);
            }
            const data = await res.json();

            // If cloud DB is brand new/empty (`init`), seed it immediately with current local data
            const isCloudEmpty = sha === 'init' && (!data.equipmentList || data.equipmentList.length === 0);
            if (isCloudEmpty) {
                await pushToGitHub('Initialize Seiralab ATLAS Cloud Database');
            } else {
                applyDatabaseToAppState(data);
            }

            updateGitHubStatusBadge('connected', 'Cloud DB: Synced');
            if (showToast && typeof showNotificationToast === 'function') {
                showNotificationToast('Synced latest records from Cloud DB!');
            }
            return true;
        }
    } catch (proxyErr) {
        // Fall through to Direct GitHub PAT if configured
    }

    // Try 2: Direct GitHub REST API (if MasterAdmin entered a Token in the modal)
    if (ghConfig.token && ghConfig.owner && ghConfig.repo) {
        try {
            const apiUrl = `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${ghConfig.path}?ref=${ghConfig.branch}`;
            const ghRes = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${ghConfig.token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });

            if (ghRes.ok) {
                const fileObj = await ghRes.json();
                currentFileSHA = fileObj.sha;
                localStorage.setItem('seiralab_last_sha', currentFileSHA);
                const decoded = JSON.parse(base64ToUtf8(fileObj.content));
                applyDatabaseToAppState(decoded);
                updateGitHubStatusBadge('connected', 'GitHub DB: Synced');
                if (showToast && typeof showNotificationToast === 'function') {
                    showNotificationToast('Synced directly from GitHub DB!');
                }
                return true;
            }
        } catch (directErr) {
            updateGitHubStatusBadge('error', 'DB Sync Error');
        }
    }

    // Fallback: Keep local storage data intact and render it
    const localSnapshot = getCurrentDatabasePayload();
    applyDatabaseToAppState(localSnapshot);
    updateGitHubStatusBadge('local', 'Local Storage Saved');
    return false;
}

// ============================================================================
// 4. PUSH EVERY CREATE, EDIT, AND DELETE PERMANENTLY TO CLOUD (pushToGitHub)
// ============================================================================
async function pushToGitHub(commitMessage = 'Update Seiralab CMMS records') {
    const role = window.currentAccessRole || sessionStorage.getItem('seiralab_active_session_role') || 'Visitor';
    if (!role || role === 'Visitor') return false;

    const payloadObj = getCurrentDatabasePayload();
    const payloadJSON = JSON.stringify(payloadObj, null, 2);

    updateGitHubStatusBadge('syncing', 'Saving to Cloud...');

    // Try 1: Save via Cloudflare Worker (/api/data)
    try {
        const sessionToken = sessionStorage.getItem('seiralab_auth_token') || '';
        const res = await fetch(ghConfig.proxyUrl || '/api/data', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-Seiralab-Client': 'ATLAS-v1',
                'X-Seiralab-Role': role,
                'Authorization': sessionToken ? `Bearer ${sessionToken}` : '',
                'X-File-SHA': currentFileSHA,
                'X-Commit-Message': commitMessage
            },
            body: payloadJSON
        });

        if (res.ok) {
            const respData = await res.json().catch(() => ({}));
            if (respData?.content?.sha) {
                currentFileSHA = respData.content.sha;
                localStorage.setItem('seiralab_last_sha', currentFileSHA);
            }
            updateGitHubStatusBadge('connected', 'Cloud DB: Saved');
            return true;
        }
    } catch (proxyErr) {
        // Fall through to Direct GitHub Token mode if available
    }

    // Try 2: Direct GitHub API Push (if token is saved in browser modal)
    if (ghConfig.token && ghConfig.owner && ghConfig.repo) {
        try {
            const apiUrl = `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${ghConfig.path}`;
            let shaToUse = currentFileSHA;

            const checkRes = await fetch(`${apiUrl}?ref=${ghConfig.branch}`, {
                headers: {
                    'Authorization': `Bearer ${ghConfig.token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });
            if (checkRes.ok) {
                const existing = await checkRes.json();
                shaToUse = existing.sha;
            }

            const body = {
                message: `[Seiralab ${role}] ${commitMessage}`,
                content: utf8ToBase64(payloadJSON),
                branch: ghConfig.branch
            };
            if (shaToUse && shaToUse !== 'init') body.sha = shaToUse;

            const putRes = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${ghConfig.token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (putRes.ok) {
                const putData = await putRes.json();
                if (putData?.content?.sha) {
                    currentFileSHA = putData.content.sha;
                    localStorage.setItem('seiralab_last_sha', currentFileSHA);
                }
                updateGitHubStatusBadge('connected', 'GitHub DB: Saved');
                return true;
            }
        } catch (err) {
            updateGitHubStatusBadge('error', 'Save Error');
        }
    }

    updateGitHubStatusBadge('local', 'Saved Locally');
    return false;
}

// ============================================================================
// 5. AUTOMATICALLY INTERCEPT ALL LOCALSTORAGE SAVES (CREATE / EDIT / DELETE)
// Guarantees app.js Equipment Add, Edit, Delete, and PM Logs Auto-Save to Cloud!
// ============================================================================
(function interceptAllDataMutations() {
    const rawSetItem = Storage.prototype.setItem;
    const WATCHED_KEYS = {
        'seiralab_equipment': 'Update Equipment Inventory',
        'seiralab_history': 'Update Maintenance History Logs',
        'seiralab_tool_logs': 'Update Biomed Tool Logbook',
        'seiralab_calibrations': 'Update Calibration Certificates'
    };

    Storage.prototype.setItem = function (key, value) {
        rawSetItem.apply(this, arguments);

        if (this === localStorage && WATCHED_KEYS[key] && !isSyncingFromCloud) {
            try {
                const parsed = JSON.parse(value);
                if (key === 'seiralab_equipment') window.equipmentList = parsed;
                if (key === 'seiralab_history') window.historyLogs = parsed;
                if (key === 'seiralab_tool_logs') window.toolLogs = parsed;
                if (key === 'seiralab_calibrations') window.calibrationList = parsed;
            } catch (_) {}

            // Debounce by 400ms so rapid edits/deletes push cleanly in one commit
            clearTimeout(syncDebounceTimer);
            syncDebounceTimer = setTimeout(() => {
                pushToGitHub(WATCHED_KEYS[key]);
            }, 400);
        }
    };
})();

// ============================================================================
// 6. GITHUB CONFIG MODAL CONTROLS
// ============================================================================
function openGitHubModal() {
    if (window.currentAccessRole !== 'MasterAdmin') {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Only MasterAdmin can configure Database settings.', true);
        }
        return;
    }
    const modal = document.getElementById('githubConfigModal');
    if (!modal) return;

    const ownerInput = document.getElementById('ghOwner');
    const repoInput = document.getElementById('ghRepo');
    const branchInput = document.getElementById('ghBranch');
    const pathInput = document.getElementById('ghPath');
    const tokenInput = document.getElementById('ghToken');
    const proxyInput = document.getElementById('ghProxyUrl');

    if (ownerInput) ownerInput.value = ghConfig.owner || 'raizon001';
    if (repoInput) repoInput.value = ghConfig.repo || 'seiralab-cmms-db';
    if (branchInput) branchInput.value = ghConfig.branch || 'main';
    if (pathInput) pathInput.value = ghConfig.path || 'data/cmms_db.json';
    if (tokenInput) tokenInput.value = ghConfig.token || '';
    if (proxyInput) proxyInput.value = ghConfig.proxyUrl || '/api/data';

    modal.classList.remove('hidden');
}

function closeGitHubModal() {
    document.getElementById('githubConfigModal')?.classList.add('hidden');
}

async function saveGitHubConfig(event) {
    if (event) event.preventDefault();
    ghConfig.owner = (document.getElementById('ghOwner')?.value || 'raizon001').trim();
    ghConfig.repo = (document.getElementById('ghRepo')?.value || 'seiralab-cmms-db').trim();
    ghConfig.branch = (document.getElementById('ghBranch')?.value || 'main').trim();
    ghConfig.path = (document.getElementById('ghPath')?.value || 'data/cmms_db.json').trim();
    ghConfig.token = (document.getElementById('ghToken')?.value || '').trim();
    ghConfig.proxyUrl = (document.getElementById('ghProxyUrl')?.value || '/api/data').trim();

    localStorage.setItem('seiralab_gh_config', JSON.stringify(ghConfig));
    closeGitHubModal();

    const ok = await syncFromGitHub(true);
    if (ok) {
        await pushToGitHub('Verify & Sync Database Connection');
    }
}

window.syncFromGitHub = syncFromGitHub;
window.pushToGitHub = pushToGitHub;
window.openGitHubModal = openGitHubModal;
window.closeGitHubModal = closeGitHubModal;
window.saveGitHubConfig = saveGitHubConfig;

window.addEventListener('DOMContentLoaded', function () {
    // Pull permanent cloud database as soon as the app loads
    setTimeout(() => {
        syncFromGitHub(false);
    }, 150);
});
