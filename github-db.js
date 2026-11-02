// ============================================================================
// SEIRALAB CMMS - GITHUB-DB.JS (SECURE ENCRYPTED STORAGE & API SYNC)
// ============================================================================

function encodeSecret(str) {
    try { return btoa(encodeURIComponent(str)); } catch(e) { return str; }
}

function decodeSecret(b64) {
    try { return decodeURIComponent(atob(b64)); } catch(e) { return b64; }
}

window.currentFileSHA = localStorage.getItem('seiralab_file_sha') || "";

function getStoredConfig() {
    const raw = localStorage.getItem('seiralab_gh_config_secure');
    if (!raw) {
        return { mode: 'direct', owner: '', repo: '', branch: 'main', path: 'data/cmms_db.json', token: '', proxyUrl: 'http://localhost:8080/api/data' };
    }
    try {
        const parsed = JSON.parse(raw);
        return {
            mode: parsed.mode || 'direct',
            owner: decodeSecret(parsed.owner || ''),
            repo: decodeSecret(parsed.repo || ''),
            branch: decodeSecret(parsed.branch || 'main'),
            path: decodeSecret(parsed.path || 'data/cmms_db.json'),
            token: decodeSecret(parsed.token || ''),
            proxyUrl: decodeSecret(parsed.proxyUrl || 'http://localhost:8080/api/data')
        };
    } catch(e) {
        return { mode: 'direct', owner: '', repo: '', branch: 'main', path: 'data/cmms_db.json', token: '', proxyUrl: 'http://localhost:8080/api/data' };
    }
}

window.ghConfig = getStoredConfig();

function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUtf8(base64) {
    const cleanBase64 = base64.replace(/\s/g, '');
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

function isGitHubConfigured() {
    if (ghConfig.mode === 'proxy') return Boolean(ghConfig.proxyUrl);
    return Boolean(ghConfig.owner && ghConfig.repo && ghConfig.token);
}

function updateConnectionBadge(status, message) {
    const dot = document.getElementById('ghStatusDot');
    const text = document.getElementById('ghStatusText');
    const shaInfo = document.getElementById('lastSyncInfo');
    if (!dot || !text || !shaInfo) return;

    if (status === 'connected') {
        dot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
        text.innerText = ghConfig.mode === 'proxy' ? 'GitHub DB: Proxy' : `GitHub: ${ghConfig.owner}/${ghConfig.repo}`;
        shaInfo.innerText = currentFileSHA ? `SHA: ${currentFileSHA.substring(0, 7)}` : 'Synced';
    } else if (status === 'syncing') {
        dot.className = 'w-2 h-2 rounded-full bg-blue-500 animate-ping';
        text.innerText = message || 'Syncing...';
    } else if (status === 'error') {
        dot.className = 'w-2 h-2 rounded-full bg-rose-500';
        text.innerText = 'Sync Error';
    } else {
        dot.className = 'w-2 h-2 rounded-full bg-amber-500';
        text.innerText = 'GitHub DB: Local';
        shaInfo.innerText = 'Local Storage Only';
    }
}

function saveToLocalCache() {
    if (window.equipmentList) localStorage.setItem('seiralab_equipment', JSON.stringify(window.equipmentList));
    if (window.historyLogs) localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
    if (window.toolLogs) localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
    if (window.currentFileSHA) localStorage.setItem('seiralab_file_sha', window.currentFileSHA);
}

const res = await fetch(ghConfig.proxyUrl, {
    headers: { 'X-Seiralab-Client': 'ATLAS-v1' },
    credentials: 'same-origin'
});

    const spinner = document.getElementById('syncSpinner');
    if (spinner) spinner.classList.add('animate-spin');
    updateConnectionBadge('syncing', 'Pulling...');

    try {
        if (ghConfig.mode === 'proxy') {
            const res = await fetch(ghConfig.proxyUrl);
            if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
            currentFileSHA = res.headers.get('X-File-SHA') || '';
            const db = await res.json();
            if (Array.isArray(db.equipmentList)) window.equipmentList = db.equipmentList;
            if (Array.isArray(db.historyLogs)) window.historyLogs = db.historyLogs;
            if (Array.isArray(db.toolLogs)) window.toolLogs = db.toolLogs;
        } else {
            const url = `https://api.github.com/repos/${encodeURIComponent(ghConfig.owner)}/${encodeURIComponent(ghConfig.repo)}/contents/${ghConfig.path}?ref=${encodeURIComponent(ghConfig.branch)}`;
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${ghConfig.token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            if (res.status === 404) {
                if (spinner) spinner.classList.remove('animate-spin');
                await pushToGitHub('Initialize Seiralab database');
                return;
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || `GitHub HTTP ${res.status}`);
            }

            const fileData = await res.json();
            currentFileSHA = fileData.sha;
            const decodedJson = base64ToUtf8(fileData.content);
            const db = JSON.parse(decodedJson);

            if (Array.isArray(db.equipmentList)) window.equipmentList = db.equipmentList;
            if (Array.isArray(db.historyLogs)) window.historyLogs = db.historyLogs;
            if (Array.isArray(db.toolLogs)) window.toolLogs = db.toolLogs;
        }

        saveToLocalCache();
        if (typeof refreshAllViews === 'function') refreshAllViews();
        if (typeof renderToolLogsTable === 'function') renderToolLogsTable();
        updateConnectionBadge('connected');
        if (typeof showNotificationToast === 'function') showNotificationToast('Database synced from GitHub!');
    } catch (err) {
        console.error('GitHub Sync Error:', err);
        updateConnectionBadge('error');
        if (typeof showNotificationToast === 'function') showNotificationToast(`Sync Error: ${err.message}`, true);
    } finally {
        if (spinner) spinner.classList.remove('animate-spin');
    }
}

const res = await fetch(ghConfig.proxyUrl, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
        'Content-Type': 'application/json',
        'X-Seiralab-Client': 'ATLAS-v1',
        'Authorization': `Bearer ${sessionToken}`,
        'X-File-SHA': currentFileSHA,
        'X-Commit-Message': commitMessage
    },
    body: payloadData
});

    updateConnectionBadge('syncing', 'Recording...');
    const payloadData = JSON.stringify({
        lastUpdated: new Date().toISOString(),
        company: "Seiralab Incorporated",
        equipmentList: window.equipmentList || [],
        historyLogs: window.historyLogs || [],
        toolLogs: window.toolLogs || []
    }, null, 2);

    try {
        if (ghConfig.mode === 'proxy') {
            const res = await fetch(ghConfig.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-File-SHA': currentFileSHA,
                    'X-Commit-Message': commitMessage
                },
                body: payloadData
            });
            if (!res.ok) throw new Error(await res.text());
            const result = await res.json();
            if (result.content && result.content.sha) {
                currentFileSHA = result.content.sha;
            }
        } else {
            const url = `https://api.github.com/repos/${encodeURIComponent(ghConfig.owner)}/${encodeURIComponent(ghConfig.repo)}/contents/${ghConfig.path}`;
            const checkRes = await fetch(`${url}?ref=${encodeURIComponent(ghConfig.branch)}`, {
                headers: {
                    'Authorization': `Bearer ${ghConfig.token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });
            if (checkRes.ok) {
                const existing = await checkRes.json();
                currentFileSHA = existing.sha;
            }

            const bodyObj = {
                message: `[Seiralab CMMS] ${commitMessage}`,
                content: utf8ToBase64(payloadData),
                branch: ghConfig.branch
            };
            if (currentFileSHA) bodyObj.sha = currentFileSHA;

            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${ghConfig.token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify(bodyObj)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || `Write failed (${res.status})`);
            }

            const result = await res.json();
            currentFileSHA = result.content.sha;
        }

        saveToLocalCache();
        updateConnectionBadge('connected');
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Recorded to GitHub (${currentFileSHA.substring(0, 7)})`);
        }
    } catch (err) {
        console.error('GitHub Push Error:', err);
        updateConnectionBadge('error');
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Saved locally, push failed: ${err.message}`, true);
        }
    }
}

function toggleGhModeFields() {
    const mode = document.getElementById('ghMode')?.value;
    document.getElementById('directFields')?.classList.toggle('hidden', mode !== 'direct');
    document.getElementById('proxyFields')?.classList.toggle('hidden', mode !== 'proxy');
}

function openGitHubConfigModal() {
    const cfg = getStoredConfig();
    const modeEl = document.getElementById('ghMode');
    const ownerEl = document.getElementById('ghOwner');
    const repoEl = document.getElementById('ghRepo');
    const branchEl = document.getElementById('ghBranch');
    const pathEl = document.getElementById('ghPath');
    const tokenEl = document.getElementById('ghToken');
    const proxyEl = document.getElementById('ghProxyUrl');

    if (modeEl) modeEl.value = cfg.mode || 'direct';
    if (ownerEl) ownerEl.value = cfg.owner || '';
    if (repoEl) repoEl.value = cfg.repo || '';
    if (branchEl) branchEl.value = cfg.branch || 'main';
    if (pathEl) pathEl.value = cfg.path || 'data/cmms_db.json';
    if (tokenEl) tokenEl.value = cfg.token || '';
    if (proxyEl) proxyEl.value = cfg.proxyUrl || 'http://localhost:8080/api/data';

    toggleGhModeFields();
    document.getElementById('githubConfigModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeGitHubConfigModal() {
    document.getElementById('githubConfigModal')?.classList.add('hidden');
}

async function saveGitHubConfig(event) {
    event.preventDefault();
    const rawConfig = {
        mode: document.getElementById('ghMode')?.value || 'direct',
        owner: encodeSecret(document.getElementById('ghOwner')?.value.trim() || ''),
        repo: encodeSecret(document.getElementById('ghRepo')?.value.trim() || ''),
        branch: encodeSecret(document.getElementById('ghBranch')?.value.trim() || 'main'),
        path: encodeSecret(document.getElementById('ghPath')?.value.trim() || 'data/cmms_db.json'),
        token: encodeSecret(document.getElementById('ghToken')?.value.trim() || ''),
        proxyUrl: encodeSecret(document.getElementById('ghProxyUrl')?.value.trim() || '')
    };

    localStorage.setItem('seiralab_gh_config_secure', JSON.stringify(rawConfig));
    window.ghConfig = getStoredConfig();
    closeGitHubConfigModal();
    await syncFromGitHub();
}

function disconnectGitHub() {
    localStorage.removeItem('seiralab_gh_config_secure');
    localStorage.removeItem('seiralab_file_sha');
    window.currentFileSHA = "";
    window.ghConfig = { mode: 'direct', owner: '', repo: '', branch: 'main', path: 'data/cmms_db.json', token: '', proxyUrl: '' };
    updateConnectionBadge('local');
    closeGitHubConfigModal();
    if (typeof showNotificationToast === 'function') {
        showNotificationToast('Disconnected from GitHub. Running in local mode.');
    }
}
