// ============================================================================
// SEIRALAB CMMS - TOOLS-RBAC.JS (RBAC, NOTIFICATIONS, CALIBRATION & TOOLS)
// ============================================================================

window.currentAccessRole = localStorage.getItem('seiralab_access_role') || 'Visitor';

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
// 1. ROLE PERMISSIONS & PASSWORD AUTHENTICATION
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
    // 1. Ensure Password Modal Exists
    if (!document.getElementById('rolePasswordModal')) {
        const passModalHTML = `
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
        document.body.insertAdjacentHTML('beforeend', passModalHTML);
    }

    // 2. Ensure Add Calibration Report Modal Exists
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
                         roleName === 'Technical' ? 'Welcome, Technical!' : 'Visitor Mode Active';

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

let pendingRoleTarget = null;

function requestSwitchRole(roleName, roleSubtitle) {
    document.getElementById('roleDropdownMenu')?.classList.add('hidden');
    if (roleName === window.currentAccessRole) return;

    const requiredPass = ROLE_PASSWORDS[roleName];
    if (!requiredPass) {
        switchAccessRole(roleName, roleSubtitle, false);
        return;
    }

    ensureDynamicModalsExist();
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

window.requestSwitchRole = requestSwitchRole;
window.switchAccessRole = switchAccessRole;

window.addEventListener('click', function(e) {
    const menu = document.getElementById('roleDropdownMenu');
    if (menu && !menu.classList.contains('hidden') && !menu.parentElement.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// ============================================================================
// 2. FUNCTIONAL NOTIFICATION CENTER (RED ARROW INDICATOR)
// ============================================================================
function buildSystemNotifications() {
    const list = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    if (!list) return;

    const today = new Date();
    const alerts = [];

    // 1. Check Equipment PM Overdue & Upcoming
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

    // 2. Check Calibration Certificates Due
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

    // 3. Check Unreturned Biomed Office Tools
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

    // Update red badge counter on bell icon
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
    const modal = document.getElementById('notificationModal');
    if (modal) modal.classList.remove('hidden');
}

function closeNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) modal.classList.add('hidden');
}

function jumpFromNotification(tabId) {
    closeNotificationModal();
    if (typeof switchTab === 'function') {
        switchTab(tabId);
    }
}

window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.renderNotifications = buildSystemNotifications;

// ============================================================================
// 3. CALIBRATION REPORT: ADD MODAL (GREEN LINE) & EXPORT CSV (PINK LINE)
// ============================================================================
function upgradeCalibrationToolbarUI() {
    ensureDynamicModalsExist();
    const calToolbar = document.querySelector('#calibration .flex.items-center.space-x-3');
    if (!calToolbar) return;

    // Rebuild toolbar with: [+ Add Calibration Report] [Export Calibration Data] [Print Calibration Report]
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
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access. Switch to Technical, Head Technical, or MasterAdmin.', true);
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

    const newReport = { id, eqName, serial, facility, calDate, nextDue, accuracy };
    window.calibrationList.unshift(newReport);
    localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));

    closeAddCalibrationModal();
    renderCalibrationTable();
    buildSystemNotifications();

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(`Calibration Report ${id} saved!`);
    }
    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`Add Calibration Certificate ${id} for ${eqName} (${facility})`);
    }
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
    if (typeof showNotificationToast === 'function') {
        showNotificationToast("Exported Calibration Reports CSV!");
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
// 4. BIOMED OFFICE TOOL & KIT LOGBOOK
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

    document.querySelectorAll('#roleDropdownMenu button').forEach(btn => {
        const sub = btn.querySelector('p:nth-child(2)');
        if (sub) sub.remove();
        const title = btn.querySelector('p:first-child') || btn.querySelector('span:first-child');
        if (title) {
            title.innerText = title.innerText.replace(/\s*\(.*?\)/g, '').trim();
        }
    });

    const savedRole = localStorage.getItem('seiralab_access_role') || 'Visitor';
    const savedSub = localStorage.getItem('seiralab_access_subtitle') || 'View Only';
    switchAccessRole(savedRole, savedSub, true);
    renderCalibrationTable();
    renderToolLogsTable();
    buildSystemNotifications();
});
