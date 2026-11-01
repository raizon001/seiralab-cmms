// ============================================================================
// SEIRALAB CMMS - TOOLS-RBAC.JS (INSTANT ROLE AUTH, WELCOME BANNER & TOOLS)
// ============================================================================

window.currentAccessRole = localStorage.getItem('seiralab_access_role') || 'Visitor';

// ROLE PASSWORDS (Hidden from UI)
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
// 1. SELF-HEALING PASSWORD MODAL & INSTANT ROLE SWITCHING
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

// Guarantees the password modal always exists in the DOM so clicking a role never freezes
function ensurePasswordModalExists() {
    if (document.getElementById('rolePasswordModal')) return;
    const modalHTML = `
    <div id="rolePasswordModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 id="rolePasswordPromptTitle" class="font-bold text-slate-900 text-base">Enter Password</h3>
                <button type="button" onclick="closeRolePasswordModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">&times;</button>
            </div>
            <form onsubmit="verifyRolePassword(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Authorization Password *</label>
                    <input type="password" id="rolePasswordInput" required placeholder="Enter password..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                </div>
                <div class="flex items-center justify-end space-x-2 pt-2">
                    <button type="button" onclick="closeRolePasswordModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors">Cancel</button>
                    <button type="submit" class="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors">Login</button>
                </div>
            </form>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showWelcomeBanner(roleName) {
    const existing = document.getElementById('seiralabWelcomePopup');
    if (existing) existing.remove();

    const welcomeLabel = roleName === 'MasterAdmin' ? 'Welcome, MasterAdmin!' :
                         roleName === 'Head Technical' ? 'Welcome, Head Technical!' :
                         roleName === 'Technical' ? 'Welcome, Technical!' : 'Visitor Mode Active';

    const banner = document.createElement('div');
    banner.id = 'seiralabWelcomePopup';
    banner.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-teal-700 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center space-x-3 border border-teal-400 transition-all';
    banner.innerHTML = `<span>&#10003;</span><span>${welcomeLabel}</span>`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 3500);
}

function applyRolePermissions(roleName) {
    const isVis = isVisitor(roleName);
    const hasSupervisorAccess = isSupervisorOrAdmin(roleName);
    const hasMasterAccess = isMasterAdminOnly(roleName);

    document.querySelectorAll('.restricted-head-master').forEach(el => {
        el.classList.toggle('hidden', !hasSupervisorAccess);
    });

    document.querySelectorAll('.restricted-master-only').forEach(el => {
        el.classList.toggle('hidden', !hasMasterAccess);
    });

    if (isVis) {
        const activeTab = document.querySelector('.tab-content.active')?.id;
        if (activeTab === 'inventory' || activeTab === 'reports' || activeTab === 'calibration') {
            if (typeof switchTab === 'function') switchTab('dashboard');
        }
    } else if (!hasSupervisorAccess) {
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

let pendingRoleTarget = null;

function requestSwitchRole(roleName, roleSubtitle) {
    document.getElementById('roleDropdownMenu')?.classList.add('hidden');

    if (roleName === window.currentAccessRole) return;

    const requiredPass = ROLE_PASSWORDS[roleName];
    if (!requiredPass) {
        switchAccessRole(roleName, roleSubtitle, false);
        return;
    }

    ensurePasswordModalExists();
    pendingRoleTarget = { name: roleName, subtitle: roleSubtitle };

    const titleEl = document.getElementById('rolePasswordPromptTitle');
    const inputEl = document.getElementById('rolePasswordInput');
    const modalEl = document.getElementById('rolePasswordModal');

    if (titleEl) titleEl.innerText = `Login as ${roleName}`;
    if (inputEl) inputEl.value = '';
    if (modalEl) {
        modalEl.classList.remove('hidden');
        setTimeout(() => inputEl?.focus(), 50);
    }
}

function closeRolePasswordModal() {
    document.getElementById('rolePasswordModal')?.classList.add('hidden');
    pendingRoleTarget = null;
}

function verifyRolePassword(event) {
    event.preventDefault();
    const inputEl = document.getElementById('rolePasswordInput');
    const typed = inputEl ? inputEl.value.trim() : '';
    if (!pendingRoleTarget) return;

    const targetName = pendingRoleTarget.name;
    const targetSub = pendingRoleTarget.subtitle;
    const correctPass = ROLE_PASSWORDS[targetName];

    if (typed === correctPass) {
        closeRolePasswordModal();
        switchAccessRole(targetName, targetSub, false);
    } else {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Incorrect password for ${targetName}`, true);
        } else {
            alert(`Incorrect password for ${targetName}`);
        }
        if (inputEl) {
            inputEl.value = '';
            inputEl.focus();
        }
    }
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

// Also support any older HTML button calls that used switchAccessRole directly
window.requestSwitchRole = requestSwitchRole;
window.switchAccessRole = switchAccessRole;

window.addEventListener('click', function(e) {
    const menu = document.getElementById('roleDropdownMenu');
    if (menu && !menu.classList.contains('hidden') && !menu.parentElement.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// ============================================================================
// 2. CALIBRATION REPORT TABLE & EXCEL/CSV IMPORTER
// ============================================================================
function renderCalibrationTable() {
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
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No calibration records loaded.</td></tr>`;
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

async function handleCalibrationFileUpload(event) {
    if (isVisitor(window.currentAccessRole)) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true);
        return;
    }
    const file = event.target.files[0];
    if (!file) return;

    try {
        if (typeof showNotificationToast === 'function') showNotificationToast(`Importing calibration data from ${file.name}...`);
        const XLSX = await loadSheetJSLibrary();
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const importedCal = [];
        let certSeq = 1001;

        workbook.SheetNames.forEach(sheetName => {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
            rows.forEach(row => {
                const facility = String(row['FACILITY'] || row['ACCOUNT NAME'] || row['ACCOUNTNAME'] || row['Hospital'] || "").trim();
                const desc = String(row['EQUIPMENT'] || row['DESC'] || row['Equipment Name'] || "").trim();
                if (!facility || !desc) return;

                const mfg = String(row['MFG'] || "").trim();
                const model = String(row['MODEL'] || "").trim();
                const serial = String(row['SN'] || row['SERIAL'] || `SN-CAL-${certSeq}`).trim();
                const certId = String(row['CERTIFICATE ID'] || row['CERT_ID'] || `CERT-2026-${certSeq}`).trim();
                const accuracy = String(row['ACCURACY'] || row['ERROR MARGIN'] || "± 0.5% Tolerance (Pass)").trim();

                let calDate = "2026-05-15";
                let nextDue = "2026-11-15";
                const rawDate = row['CALIBRATION DATE'] || row['INSTALL DATE'] || row['DATE'];
                if (rawDate) {
                    const dt = new Date(rawDate);
                    if (!isNaN(dt.getTime())) {
                        calDate = dt.toISOString().split('T')[0];
                        const m = dt.getMonth();
                        const d = Math.min(dt.getDate(), 28);
                        let dueDt = new Date(2026, m, d);
                        if (dueDt < new Date(2026, 9, 1)) dueDt = new Date(2026, m + 6, d);
                        nextDue = dueDt.toISOString().split('T')[0];
                    }
                }

                const eqTitle = `${mfg ? mfg + ' ' : ''}${desc}${model ? ' (' + model + ')' : ''}`.trim();
                importedCal.push({ id: certId, eqName: eqTitle, serial, facility, calDate, nextDue, accuracy });
                certSeq++;
            });
        });

        if (importedCal.length > 0) {
            window.calibrationList = importedCal;
            localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
            renderCalibrationTable();
            if (typeof showNotificationToast === 'function') showNotificationToast(`Imported ${importedCal.length} calibration records!`);
            if (typeof pushToGitHub === 'function') await pushToGitHub(`Import ${importedCal.length} calibration records`);
        }
    } catch (err) {
        console.error(err);
        if (typeof showNotificationToast === 'function') showNotificationToast(`Import Error: ${err.message}`, true);
    } finally {
        event.target.value = '';
    }
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
// 3. BIOMED OFFICE TOOL & KIT LOGBOOK
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
    ensurePasswordModalExists();

    // Automatically clean any old password/subtitle text from the role dropdown if index.html is cached
    document.querySelectorAll('#roleDropdownMenu button').forEach(btn => {
        const sub = btn.querySelector('p:nth-child(2)');
        if (sub) sub.remove();
        const title = btn.querySelector('p:first-child');
        if (title) {
            title.innerText = title.innerText.replace(/\s*\(.*?\)/g, '').trim();
        }
    });

    const savedRole = localStorage.getItem('seiralab_access_role') || 'Visitor';
    const savedSub = localStorage.getItem('seiralab_access_subtitle') || 'View Only';
    switchAccessRole(savedRole, savedSub, true);
    renderCalibrationTable();
    renderToolLogsTable();
});
