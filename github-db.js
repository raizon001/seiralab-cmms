// ============================================================================
// SEIRALAB ATLAS CMMS — GITHUB-DB.JS (ANTI-WIPE & SMART CLOUD SYNC ENGINE)
// - Never overwrites non-empty local data with an empty [] cloud response
// - Automatically seeds the Cloud DB if the cloud file is empty/new
// - Supports both Cloudflare Worker Proxy (/api/data) & Direct GitHub PAT
// ============================================================================

const DEFAULT_GH_CONFIG = {
    mode: "proxy",
    proxyUrl: "/api/data",
    owner: "raizon001",
    repo: "seiralab-cmms-db",
    branch: "main",
    path: "data/cmms_db.json",
    token: ""
};

let ghConfig = Object.assign(
    {},
    DEFAULT_GH_CONFIG,
    JSON.parse(localStorage.getItem("seiralab_gh_config") || "{}")
);

// Auto-correct if user accidentally pointed repo to the main code repo instead of the DB repo
if (!ghConfig.proxyUrl) ghConfig.proxyUrl = "/api/data";
if (!ghConfig.owner) ghConfig.owner = "raizon001";
if (!ghConfig.repo || ghConfig.repo === "seiralab-cmms") {
    ghConfig.repo = "seiralab-cmms-db";
}
if (!ghConfig.path || ghConfig.path === "data/cmms.json") {
    ghConfig.path = "data/cmms_db.json";
}

let currentFileSHA = localStorage.getItem("seiralab_last_sha") || "";
let isSyncingFromCloud = false;
let hasPendingLocalChanges = false;

function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function base64ToUtf8(b64) {
    const clean = String(b64 || "").replace(/\s/g, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

function updateGitHubStatusBadge(state, text) {
    const dot = document.getElementById("ghStatusDot");
    const label = document.getElementById("ghStatusText");
    if (!dot || !label) return;

    label.innerText = text;
    if (state === "connected" || state === "saved") {
        dot.className = "w-2 h-2 rounded-full bg-emerald-500";
    } else if (state === "syncing") {
        dot.className = "w-2 h-2 rounded-full bg-amber-500 animate-ping";
    } else if (state === "local") {
        dot.className = "w-2 h-2 rounded-full bg-teal-500";
    } else {
        dot.className = "w-2 h-2 rounded-full bg-rose-500";
    }
}

function getCurrentDatabasePayload() {
    let eq = window.equipmentList;
    let hist = window.historyLogs;
    let tools = window.toolLogs;
    let cals = window.calibrationList;

    try {
        if (!Array.isArray(eq) || eq.length === 0) {
            const storedEq = JSON.parse(localStorage.getItem("seiralab_equipment") || "[]");
            if (Array.isArray(storedEq) && storedEq.length > 0) eq = storedEq;
        }
        if (!Array.isArray(hist) || hist.length === 0) {
            const storedHist = JSON.parse(localStorage.getItem("seiralab_history") || "[]");
            if (Array.isArray(storedHist) && storedHist.length > 0) hist = storedHist;
        }
        if (!Array.isArray(tools) || tools.length === 0) {
            const storedTools = JSON.parse(localStorage.getItem("seiralab_tool_logs") || "[]");
            if (Array.isArray(storedTools) && storedTools.length > 0) tools = storedTools;
        }
        if (!Array.isArray(cals) || cals.length === 0) {
            const storedCals = JSON.parse(localStorage.getItem("seiralab_calibrations") || "[]");
            if (Array.isArray(storedCals) && storedCals.length > 0) cals = storedCals;
        }
    } catch (_) {}

    return {
        updatedAt: new Date().toISOString(),
        UpdatedByRole: window.currentAccessRole || "System",
        equipmentList: Array.isArray(eq) ? eq : [],
        historyLogs: Array.isArray(hist) ? hist : [],
        toolLogs: Array.isArray(tools) ? tools : [],
        calibrationList: Array.isArray(cals) ? cals : []
    };
}

function refreshAllViewsAfterSync() {
    if (typeof window.autoRepairScrambledInventoryData === "function") {
        window.autoRepairScrambledInventoryData();
    }
    if (typeof window.populateFacilityFilter === "function") {
        window.populateFacilityFilter();
    }
    if (typeof window.renderInventoryTable === "function") {
        window.renderInventoryTable();
    }
    if (typeof window.renderDashboard === "function") {
        window.renderDashboard();
    }
    if (typeof window.renderScheduleCards === "function") {
        window.renderScheduleCards();
    }
    if (typeof window.renderHistoryTable === "function") {
        window.renderHistoryTable();
    }
    if (typeof window.upgradeMaintenanceHistoryCertificateButtons === "function") {
        window.upgradeMaintenanceHistoryCertificateButtons();
    }
    if (typeof window.renderCalibrationTable === "function") {
        window.renderCalibrationTable();
    }
    if (typeof window.renderToolLogsTable === "function") {
        window.renderToolLogsTable();
    }
    if (typeof window.buildSystemNotifications === "function") {
        window.buildSystemNotifications();
    }
}

// Safely apply cloud data WITHOUT ever wiping non-empty local data with an empty [] array
function applyDatabaseToAppState(cloudData) {
    if (!cloudData || typeof cloudData !== "object") return false;

    // If Worker returned local-fallback mode because GITHUB_TOKEN isn't set, keep local data!
    if (cloudData.mode === "local") {
        return false;
    }

    const localPayload = getCurrentDatabasePayload();
    let updatedAny = false;

    // 1. Equipment List: Only apply cloud equipmentList if it actually has records,
    // OR if local storage is also empty. NEVER overwrite 500+ local machines with an empty [] cloud array!
    if (Array.isArray(cloudData.equipmentList)) {
        if (cloudData.equipmentList.length > 0) {
            window.equipmentList = cloudData.equipmentList;
            try { if (typeof equipmentList !== "undefined") equipmentList = cloudData.equipmentList; } catch (_) {}
            localStorage.setItem("seiralab_equipment", JSON.stringify(cloudData.equipmentList));
            updatedAny = true;
        } else if (localPayload.equipmentList.length > 0) {
            // Cloud has 0 items, but user has local items -> keep local items!
            window.equipmentList = localPayload.equipmentList;
        }
    }

    // 2. Maintenance History Logs
    if (Array.isArray(cloudData.historyLogs) && cloudData.historyLogs.length > 0) {
        window.historyLogs = cloudData.historyLogs;
        try { if (typeof historyLogs !== "undefined") historyLogs = cloudData.historyLogs; } catch (_) {}
        localStorage.setItem("seiralab_history", JSON.stringify(cloudData.historyLogs));
        updatedAny = true;
    }

    // 3. Tool Logbook
    if (Array.isArray(cloudData.toolLogs) && cloudData.toolLogs.length > 0) {
        window.toolLogs = cloudData.toolLogs;
        localStorage.setItem("seiralab_tool_logs", JSON.stringify(cloudData.toolLogs));
        updatedAny = true;
    }

    // 4. Calibration Certificates
    if (Array.isArray(cloudData.calibrationList) && cloudData.calibrationList.length > 0) {
        window.calibrationList = cloudData.calibrationList;
        localStorage.setItem("seiralab_calibrations", JSON.stringify(cloudData.calibrationList));
        updatedAny = true;
    }

    if (updatedAny) {
        refreshAllViewsAfterSync();
    }
    return updatedAny;
}

// ============================================================================
// PULL FROM CLOUD (GET) — With Auto-Seed If Cloud Is Empty
// ============================================================================
async function syncFromGitHub(showToast = false) {
    if (isSyncingFromCloud) return;
    isSyncingFromCloud = true;
    updateGitHubStatusBadge("syncing", "Syncing DB...");

    try {
        const localBefore = getCurrentDatabasePayload();

        // OPTION A: If user entered a Direct GitHub PAT Token in the modal, use GitHub REST API directly
        if (ghConfig.token && ghConfig.token.trim().startsWith("gh") || ghConfig.token.trim().startsWith("github_pat_")) {
            const apiUrl = `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${ghConfig.path}?ref=${encodeURIComponent(ghConfig.branch || "main")}`;
            const res = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${ghConfig.token.trim()}`,
                    "Accept": "application/vnd.github+json"
                }
            });

            if (res.status === 404) {
                // Cloud file doesn't exist yet -> Seed it with our current local data!
                isSyncingFromCloud = false;
                if (localBefore.equipmentList.length > 0) {
                    await pushToGitHub("Initial Cloud DB Seed from Local Storage");
                } else {
                    updateGitHubStatusBadge("connected", "Cloud DB: Ready");
                }
                return;
            }

            if (res.ok) {
                const meta = await res.json();
                currentFileSHA = meta.sha || "";
                localStorage.setItem("seiralab_last_sha", currentFileSHA);
                const cloudData = meta.content ? JSON.parse(base64ToUtf8(meta.content)) : {};

                if ((!cloudData.equipmentList || cloudData.equipmentList.length === 0) && localBefore.equipmentList.length > 0) {
                    isSyncingFromCloud = false;
                    await pushToGitHub("Sync Local Equipment Inventory to Cloud DB");
                    return;
                }

                applyDatabaseToAppState(cloudData);
                updateGitHubStatusBadge("connected", "Cloud DB: Synced");
                if (showToast && typeof showNotificationToast === "function") {
                    showNotificationToast("Synced latest records from GitHub Cloud DB!");
                }
                isSyncingFromCloud = false;
                return;
            }
        }

        // OPTION B: Default Cloudflare Worker Proxy (/api/data)
        const res = await fetch(ghConfig.proxyUrl || "/api/data", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json",
                "X-Seiralab-Client": "ATLAS-v1"
            }
        });

        if (!res.ok) {
            updateGitHubStatusBadge("local", "Local Storage Saved");
            isSyncingFromCloud = false;
            return;
        }

        const shaHeader = res.headers.get("X-File-SHA") || "";
        const cloudData = await res.json();

        // If Worker reports GITHUB_TOKEN is not configured yet ("local-only"), keep all local data intact!
        if (shaHeader === "local-only" || cloudData.mode === "local") {
            updateGitHubStatusBadge("local", "Local Storage Saved");
            refreshAllViewsAfterSync();
            if (showToast && typeof showNotificationToast === "function") {
                showNotificationToast("Saved locally. Add GITHUB_TOKEN in Cloudflare or paste a token in Cloud Settings for cross-device sync.");
            }
            isSyncingFromCloud = false;
            return;
        }

        if (shaHeader) {
            currentFileSHA = shaHeader;
            localStorage.setItem("seiralab_last_sha", currentFileSHA);
        }

        // If Cloud DB is brand-new/empty ("init" or 0 equipment items) and we have local data, PUSH our local data to Cloud!
        const cloudEqCount = Array.isArray(cloudData.equipmentList) ? cloudData.equipmentList.length : 0;
        if ((shaHeader === "init" || cloudEqCount === 0) && localBefore.equipmentList.length > 0) {
            isSyncingFromCloud = false;
            await pushToGitHub("Initialize Cloud DB with Local Inventory");
            return;
        }

        applyDatabaseToAppState(cloudData);
        updateGitHubStatusBadge("connected", "Cloud DB: Synced");
        if (showToast && typeof showNotificationToast === "function") {
            showNotificationToast("Cloud Database synced!");
        }
    } catch (err) {
        updateGitHubStatusBadge("local", "Local Storage Saved");
    } finally {
        isSyncingFromCloud = false;
    }
}

// ============================================================================
// PUSH TO CLOUD (POST / PUT)
// ============================================================================
async function pushToGitHub(commitMessage = "Update Seiralab ATLAS Database") {
    const payload = getCurrentDatabasePayload();

    // Always persist to localStorage immediately first so data is 100% safe on this device
    localStorage.setItem("seiralab_equipment", JSON.stringify(payload.equipmentList));
    localStorage.setItem("seiralab_history", JSON.stringify(payload.historyLogs));
    localStorage.setItem("seiralab_tool_logs", JSON.stringify(payload.toolLogs));
    localStorage.setItem("seiralab_calibrations", JSON.stringify(payload.calibrationList));

    updateGitHubStatusBadge("syncing", "Saving to Cloud...");

    try {
        // OPTION A: Direct GitHub PAT Token entered in Modal
        if (ghConfig.token && (ghConfig.token.trim().startsWith("gh") || ghConfig.token.trim().startsWith("github_pat_"))) {
            const cleanToken = ghConfig.token.trim();
            const apiUrl = `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${ghConfig.path}`;
            const ghHeaders = {
                "Authorization": `Bearer ${cleanToken}`,
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json"
            };

            // Fetch latest SHA first so commit never fails with 409 conflict
            let latestSha = currentFileSHA;
            const checkRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(ghConfig.branch || "main")}`, {
                method: "GET",
                headers: ghHeaders
            });
            if (checkRes.ok) {
                const checkMeta = await checkRes.json();
                latestSha = checkMeta.sha;
            }

            const bodyObj = {
                message: commitMessage,
                content: utf8ToBase64(JSON.stringify(payload, null, 2)),
                branch: ghConfig.branch || "main"
            };
            if (latestSha && latestSha !== "init" && latestSha !== "local-only") {
                bodyObj.sha = latestSha;
            }

            const putRes = await fetch(apiUrl, {
                method: "PUT",
                headers: ghHeaders,
                body: JSON.stringify(bodyObj)
            });

            if (putRes.ok) {
                const resData = await putRes.json();
                currentFileSHA = resData?.content?.sha || "";
                localStorage.setItem("seiralab_last_sha", currentFileSHA);
                hasPendingLocalChanges = false;
                updateGitHubStatusBadge("saved", "Cloud DB: Saved");
                return true;
            }
        }

        // OPTION B: Cloudflare Worker Proxy (/api/data)
        const sessionToken = localStorage.getItem("seiralab_session_token") || "";
        const activeRole = window.currentAccessRole || sessionStorage.getItem("seiralab_active_session_role") || "MasterAdmin";

        const res = await fetch(ghConfig.proxyUrl || "/api/data", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-Seiralab-Client": "ATLAS-v1",
                "X-Seiralab-Role": activeRole,
                "X-Session-Token": sessionToken
            },
            body: JSON.stringify({
                message: commitMessage,
                sha: currentFileSHA,
                data: payload
            })
        });

        if (res.ok) {
            const result = await res.json();
            const newSha = res.headers.get("X-File-SHA") || result.sha || "";
            if (newSha && newSha !== "local-only") {
                currentFileSHA = newSha;
                localStorage.setItem("seiralab_last_sha", currentFileSHA);
                hasPendingLocalChanges = false;
                updateGitHubStatusBadge("saved", "Cloud DB: Saved");
                return true;
            }
        }

        // If Worker doesn't have GITHUB_TOKEN configured yet, data is still safely saved in localStorage
        hasPendingLocalChanges = true;
        updateGitHubStatusBadge("local", "Local Storage Saved");
        return false;
    } catch (err) {
        hasPendingLocalChanges = true;
        updateGitHubStatusBadge("local", "Local Storage Saved");
        return false;
    }
}

// ============================================================================
// CLOUD DATABASE SYNC SETTINGS MODAL HANDLERS
// ============================================================================
function openGitHubModal() {
    const role = window.currentAccessRole || sessionStorage.getItem("seiralab_active_session_role") || "Visitor";
    if (role !== "Head Technical" && role !== "MasterAdmin") {
        if (typeof showNotificationToast === "function") {
            showNotificationToast("Only Head Technical & MasterAdmin can configure Cloud Sync.", true);
        }
        return;
    }

    const proxyEl = document.getElementById("ghProxyUrl");
    const ownerEl = document.getElementById("ghOwner");
    const repoEl = document.getElementById("ghRepo");
    const branchEl = document.getElementById("ghBranch");
    const pathEl = document.getElementById("ghPath");
    const tokenEl = document.getElementById("ghToken");

    if (proxyEl) proxyEl.value = ghConfig.proxyUrl || "/api/data";
    if (ownerEl) ownerEl.value = ghConfig.owner || "raizon001";
    if (repoEl) repoEl.value = ghConfig.repo || "seiralab-cmms-db";
    if (branchEl) branchEl.value = ghConfig.branch || "main";
    if (pathEl) pathEl.value = ghConfig.path || "data/cmms_db.json";
    if (tokenEl) tokenEl.value = ghConfig.token || "";

    document.getElementById("githubConfigModal")?.classList.remove("hidden");
}

function closeGitHubModal() {
    document.getElementById("githubConfigModal")?.classList.add("hidden");
}

async function saveGitHubConfig(event) {
    if (event) event.preventDefault();

    ghConfig = {
        mode: "proxy",
        proxyUrl: (document.getElementById("ghProxyUrl")?.value || "/api/data").trim(),
        owner: (document.getElementById("ghOwner")?.value || "raizon001").trim(),
        repo: (document.getElementById("ghRepo")?.value || "seiralab-cmms-db").trim(),
        branch: (document.getElementById("ghBranch")?.value || "main").trim(),
        path: (document.getElementById("ghPath")?.value || "data/cmms_db.json").trim(),
        token: (document.getElementById("ghToken")?.value || "").trim()
    };

    localStorage.setItem("seiralab_gh_config", JSON.stringify(ghConfig));
    closeGitHubModal();

    // CRITICAL FIX: If we already have data on screen/localStorage, PUSH it to the cloud first
    // so clicking "Save & Sync" NEVER wipes out imported or newly added data!
    const currentData = getCurrentDatabasePayload();
    if (currentData.equipmentList.length > 0) {
        const pushed = await pushToGitHub("Manual Save & Sync from ATLAS Portal");
        if (typeof showNotificationToast === "function") {
            showNotificationToast(
                pushed
                    ? `Saved & synced ${currentData.equipmentList.length} assets to Cloud DB!`
                    : `Saved ${currentData.equipmentList.length} assets in Local Storage!`
            );
        }
    } else {
        await syncFromGitHub(true);
    }
}

window.openGitHubModal = openGitHubModal;
window.closeGitHubModal = closeGitHubModal;
window.saveGitHubConfig = saveGitHubConfig;
window.syncFromGitHub = syncFromGitHub;
window.pushToGitHub = pushToGitHub;

// Initial Sync + Safe 20-Second Live Polling
function initCloudSyncEngine() {
    setTimeout(() => {
        syncFromGitHub(false);
    }, 250);

    setInterval(async () => {
        // Never overwrite while a modal is open or while local unsaved changes exist
        const anyModalOpen = Array.from(document.querySelectorAll('[id$="Modal"]'))
            .some(el => !el.classList.contains("hidden"));
        if (anyModalOpen || isSyncingFromCloud || hasPendingLocalChanges) return;

        try {
            const res = await fetch(ghConfig.proxyUrl || "/api/data", {
                method: "GET",
                credentials: "same-origin",
                headers: { "Accept": "application/json", "X-Seiralab-Client": "ATLAS-v1" }
            });
            if (res.ok) {
                const latestSha = res.headers.get("X-File-SHA") || "";
                if (latestSha && latestSha !== currentFileSHA && latestSha !== "init" && latestSha !== "local-only") {
                    currentFileSHA = latestSha;
                    localStorage.setItem("seiralab_last_sha", latestSha);
                    const data = await res.json();
                    applyDatabaseToAppState(data);
                    updateGitHubStatusBadge("connected", "Cloud DB: Live");
                }
            }
        } catch (_) {}
    }, 20000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCloudSyncEngine);
} else {
    initCloudSyncEngine();
}
