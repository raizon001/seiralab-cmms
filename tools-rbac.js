// ============================================================================
// SEIRALAB CMMS - TOOLS-RBAC.JS (PASSWORDS, ROLES & TOOL LOGBOOK)
// ============================================================================

window.currentAccessRole = localStorage.getItem('seiralab_access_role') || 'Visitor';

// DEFAULT ROLE PASSWORDS (You can change these anytime here)
const ROLE_PASSWORDS = {
    "Visitor": "", // No password needed for viewing
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
// 1. ROLE PERMISSIONS & PASSWORD MODAL
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

function applyRolePermissions(roleName) {
    const isVis = isVisitor(roleName);
    const hasSupervisorAccess = isSupervisorOrAdmin(roleName);
    const hasMasterAccess = isMasterAdminOnly(roleName);

    // Hide/show Head & Admin features (Inventory)
    document.querySelectorAll('.restricted-head-master').forEach(el => {
        el.classList.toggle('hidden', !hasSupervisorAccess);
    });

    // Hide/show MasterAdmin features (GitHub DB settings)
    document.querySelectorAll('.restricted-master-only').forEach(el => {
        el.classList.toggle('hidden', !hasMasterAccess);
    });

    // If visitor tries to access inventory, reports, or calibration execution, bounce to dashboard
    if (isVis) {
        const activeTab = document.querySelector('.tab-content.active')?.id;
        if (activeTab === 'inventory' || activeTab === 'reports' || activeTab === 'calibration') {
            if (typeof switchTab === 'function') switchTab('dashboard');
        }
    }
}

function toggleRoleMenu() {
    const menu = document.getElementById('roleDropdownMenu');
    if (menu) menu.classList.toggle('hidden');
}

let pendingRoleTarget = null;

function requestSwitchRole(roleName, roleSubtitle) {
    if (roleName === window.currentAccessRole) {
        document.getElementById('roleDropdownMenu')?.classList.add('hidden');
        return;
    }

    const requiredPass = ROLE_PASSWORDS[roleName];
    if (!requiredPass) {
        // Visitor has no password
        switchAccessRole(roleName, roleSubtitle);
        return;
    }

    // Prompt for password
    pendingRoleTarget = { name: roleName, subtitle: roleSubtitle };
    document.getElementById('roleDropdownMenu')?.classList.add('hidden');
    document.getElementById('rolePasswordInput').value = '';
    document.getElementById('rolePasswordPromptTitle').innerText = `Enter Password for ${roleName}`;
    document.getElementById('rolePasswordModal')?.classList.remove('hidden');
}

function closeRolePasswordModal() {
    document.getElementById('rolePasswordModal')?.classList.add('hidden');
    pendingRoleTarget = null;
}

function verifyRolePassword(event) {
    event.preventDefault();
    const typed = document.getElementById('rolePasswordInput')?.value.trim();
    if (!pendingRoleTarget) return;

    const correctPass = ROLE_PASSWORDS[pendingRoleTarget.name];
    if (typed === correctPass) {
        closeRolePasswordModal();
        switchAccessRole(pendingRoleTarget.name, pendingRoleTarget.subtitle);
    } else {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Incorrect password for ' + pendingRoleTarget.name, true);
        } else {
            alert('Incorrect password!');
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
    if (subEl) subEl.innerText = roleSubtitle;

    ['Visitor', 'Technical', 'Head', 'MasterAdmin'].forEach(r => {
        const dot = document.getElementById(`roleCheck-${r}`);
        if (dot) {
            const match = (r === 'Head' && roleName === 'Head Technical') || (r === roleName);
            dot.className = match ? 'w-2 h-2 rounded-full bg-teal-600' : 'w-2 h-2 rounded-full bg-transparent';
        }
    });

    applyRolePermissions(roleName);

    if (!silent && typeof showNotificationToast === 'function') {
        showNotificationToast(`Switched to: ${roleName}`);
    }
    if (window.lucide) lucide.createIcons();
}

window.addEventListener('click', function(e) {
    const menu = document.getElementById('roleDropdownMenu');
    if (menu && !menu.parentElement.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// ============================================================================
// 2. BIOMED OFFICE TOOL & KIT LOGBOOK
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

    const total = window.toolLogs.length;
    const outCount = window.toolLogs.filter(t => t.status === 'Borrowed').length;
    const returnedCount = window.toolLogs.filter(t => t.status === 'Returned').length;

    const elTotal = document.getElementById('statToolsTotal');
    const elOut = document.getElementById('statToolsOut');
    const elRet = document.getElementById('statToolsReturned');
    if (elTotal) elTotal.innerText = total;
    if (elOut) elOut.innerText = outCount;
    if (elRet) elRet.innerText = returnedCount;

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

    filtered.forEach(log => {
        const statusBadge = log.status === 'Borrowed'
            ? `<span class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span><span>Borrowed (Out)</span></span>`
            : `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Returned</span></span>`;

        const isVis = isVisitor(window.currentAccessRole);
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
    if (window.lucide) lucide.createIcons();
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
    if (window.lucide) lucide.createIcons();
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

    const newEntry = {
        id: Date.now(),
        borrower,
        toolName,
        toolCode,
        destination,
        borrowDate,
        borrowTime,
        returnDateTime: "",
        status: "Borrowed"
    };

    window.toolLogs.unshift(newEntry);
    localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
    closeBorrowToolModal();
    renderToolLogsTable();

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(`Logged out ${toolName} to ${borrower}`);
    }
    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`Tool Check-Out: ${toolName} (${toolCode}) by ${borrower}`);
    }
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

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(`Marked ${log.toolName} as Returned!`);
    }
    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`Tool Returned: ${log.toolName} (${log.toolCode}) by ${log.borrower}`);
    }
}

function exportToolLogsCSV() {
    const headers = ["Log ID", "Borrower Name", "Tool / Kit Name", "Tool ID", "Destination / Purpose", "Date Borrowed", "Time Borrowed", "Date & Time Returned", "Status"];
    const rows = window.toolLogs.map(t => [
        t.id, `"${t.borrower}"`, `"${t.toolName}"`, `"${t.toolCode}"`, `"${t.destination}"`, t.borrowDate, t.borrowTime, `"${t.returnDateTime || 'Still Out'}"`, t.status
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    if (typeof downloadBlob === 'function') {
        downloadBlob(csv, `Seiralab_Biomed_Tool_Logbook_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    }
    if (typeof showNotificationToast === 'function') {
        showNotificationToast("Downloaded Tool Logbook CSV!");
    }
}

// Guarded Tab Switcher for Visitors
const baseSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
    if (isVisitor(window.currentAccessRole) && (tabId === 'inventory' || tabId === 'reports' || tabId === 'calibration')) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Visitors have view-only access to Dashboard, PM Schedule, History & Tools.', true);
        }
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
    if (window.lucide) lucide.createIcons();
};

window.addEventListener('DOMContentLoaded', function() {
    const savedRole = localStorage.getItem('seiralab_access_role') || 'Visitor';
    const savedSub = localStorage.getItem('seiralab_access_subtitle') || 'Public Viewer (View Only)';
    switchAccessRole(savedRole, savedSub, true);
    renderToolLogsTable();
});
