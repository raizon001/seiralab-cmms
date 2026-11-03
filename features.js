// ============================================================================
// SEIRALAB CMMS - FEATURES.JS
// NOTIFICATIONS + CALIBRATION (ADD/EDIT/DELETE) + TOOL LOGBOOK (ADD/EDIT/DELETE)
// ============================================================================

const DEFAULT_TOOL_LOGS = [
    { id: 501, borrower: "Eng. Barzce Barcelona", toolName: "Fluke ESA612 Electrical Safety Analyzer", toolCode: "TL-SL-001", destination: "Cebu City Medical Center — ICU PM", borrowDate: "2026-10-30", borrowTime: "08:30", returnDateTime: "", status: "Borrowed" },
    { id: 502, borrower: "Eng. Kyle the GREAT", toolName: "Digital Optical Tachometer & Pipette Calibrator", toolCode: "TL-SL-004", destination: "God Care Medical Diagnostic — Centrifuge PM", borrowDate: "2026-10-29", borrowTime: "09:15", returnDateTime: "2026-10-29 (5:40 PM)", status: "Returned" }
];

const DEFAULT_CALIBRATION_LIST = [
    { id: "CERT-2026-5160", eqName: "Flexor Chemistry Analyzer (AB-380)", serial: "AS24B05160", facility: "Cebu City Medical Center", calDate: "2026-04-24", nextDue: "2026-10-24", accuracy: "± 0.5% Absorbance (Pass)" },
    { id: "CERT-2026-2003", eqName: "Alexis Hematology Analyzer (AB-H630)", serial: "G10012422003", facility: "God Care Medical Diagnostic", calDate: "2026-04-26", nextDue: "2026-10-26", accuracy: "± 0.8% CV (Pass)" }
];

window.toolLogs = JSON.parse(localStorage.getItem('seiralab_tool_logs')) || DEFAULT_TOOL_LOGS;
window.calibrationList = JSON.parse(localStorage.getItem('seiralab_calibrations')) || DEFAULT_CALIBRATION_LIST;

function isVisitorMode() {
    const role = window.currentAccessRole || sessionStorage.getItem('seiralab_active_session_role') || localStorage.getItem('seiralab_access_role') || 'Visitor';
    return !role || role === 'Visitor';
}

// ============================================================================
// 0. SELF-HEALING MODALS (Guarantees Borrow Tool & Calibration Modals Always Open)
// ============================================================================
function ensureFeatureModalsExist() {
    // 1. Ensure Borrow / Edit Tool Modal Exists in DOM
    if (!document.getElementById('borrowToolModal')) {
        const toolModalHTML = `
        <div id="borrowToolModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h3 id="borrowToolModalTitle" class="font-bold text-slate-900 text-lg flex items-center space-x-2">
                        <i data-lucide="wrench" class="w-5 h-5 text-teal-600"></i>
                        <span>Borrow Tool / Test Kit from Biomed Office</span>
                    </h3>
                    <button type="button" onclick="closeBorrowToolModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <form id="borrowToolForm" onsubmit="saveToolBorrow(event)" class="space-y-4 pt-4">
                    <input type="hidden" id="editToolLogId" value="">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Borrower Name (Engineer / Staff) *</label>
                        <input type="text" id="toolBorrower" required placeholder="e.g., Eng. Barzce Barcelona" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Tool / Kit Name *</label>
                            <input type="text" id="toolName" required placeholder="e.g., Fluke 87V Digital Multimeter" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Tool ID / Serial No. *</label>
                            <input type="text" id="toolCode" required placeholder="e.g., TL-SL-004" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Destination Hospital / Lab &amp; Purpose *</label>
                        <input type="text" id="toolDestination" required placeholder="e.g., Cebu City Medical Center - Analyzer Calibration" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Date Borrowed *</label>
                            <input type="date" id="toolBorrowDate" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Time Borrowed *</label>
                            <input type="time" id="toolBorrowTime" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        </div>
                    </div>
                    <div class="pt-4 flex items-center justify-end space-x-3">
                        <button type="button" onclick="closeBorrowToolModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors">Cancel</button>
                        <button type="submit" id="borrowToolSubmitBtn" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg transition-colors">Record Check-Out</button>
                    </div>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', toolModalHTML);
    } else if (!document.getElementById('editToolLogId')) {
        // Upgrade existing modal if hidden edit input is not there yet
        document.getElementById('borrowToolForm')?.insertAdjacentHTML('afterbegin', '<input type="hidden" id="editToolLogId" value="">');
    }

    // 2. Ensure Add / Edit Calibration Report Modal Exists in DOM
    if (!document.getElementById('addCalibrationModal')) {
        const calModalHTML = `
        <div id="addCalibrationModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h3 id="calibrationModalTitle" class="font-bold text-slate-900 text-lg flex items-center space-x-2">
                        <i data-lucide="file-check-2" class="w-5 h-5 text-teal-600"></i>
                        <span>Add Calibration Report</span>
                    </h3>
                    <button type="button" onclick="closeAddCalibrationModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <form id="addCalibrationForm" onsubmit="saveCalibrationReport(event)" class="space-y-4 pt-4">
                    <input type="hidden" id="editCalOriginalId" value="">
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
                        <button type="submit" id="calSubmitBtn" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg transition-colors">Save Calibration Report</button>
                    </div>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', calModalHTML);
    } else if (!document.getElementById('editCalOriginalId')) {
        document.getElementById('addCalibrationForm')?.insertAdjacentHTML('afterbegin', '<input type="hidden" id="editCalOriginalId" value="">');
    }
}

// ============================================================================
// 1. NOTIFICATION CENTER
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
// 2. CALIBRATION REPORTS (WITH ADD, EDIT, DELETE & PDF DOWNLOAD)
// ============================================================================
function upgradeCalibrationToolbarUI() {
    ensureFeatureModalsExist();
    const calHeader = document.querySelector('#calibration > div:first-child');
    if (!calHeader) return;

    let calToolbar = calHeader.querySelector('div:nth-child(2)');
    if (!calToolbar) return;

    calToolbar.className = 'flex items-center space-x-2.5 shrink-0 overflow-x-auto pb-1 sm:pb-0';
    calToolbar.innerHTML = `
        <button type="button" id="btnAddCalibrationReport" onclick="openAddCalibrationModal()" class="inline-flex items-center justify-center px-3.5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap shrink-0">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Add Calibration Report</span>
        </button>
        <button type="button" id="btnExportCalibrationData" onclick="exportCalibrationDataCSV()" class="inline-flex items-center justify-center px-3.5 py-2 bg-white border border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 font-medium text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap shrink-0">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span>Export Calibration Data</span>
        </button>
        <button type="button" onclick="window.print()" class="inline-flex items-center justify-center px-3.5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap shrink-0">
            <i data-lucide="printer" class="w-4 h-4"></i>
            <span>Print Calibration Report</span>
        </button>
    `;
    if (window.lucide) lucide.createIcons();
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

    const isVis = isVisitorMode();

    window.calibrationList.slice(0, 100).forEach(item => {
        const diffDays = Math.ceil((new Date(item.nextDue) - today) / (1000 * 60 * 60 * 24));
        const dueColor = diffDays < 0 ? 'text-rose-600 font-semibold' : (diffDays <= 30 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-medium');
        const safeId = String(item.id).replace(/'/g, "\\'");

        const editDeleteBtns = isVis ? '' : `
            <button type="button" onclick="openEditCalibrationModal('${safeId}')" class="p-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 rounded-lg transition-colors" title="Edit Calibration Report">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button type="button" onclick="deleteCalibrationReport('${safeId}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors" title="Delete Calibration Report">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4 font-mono font-semibold text-slate-700">${item.id}</td>
                <td class="p-4 font-semibold text-slate-900">${item.eqName}<br><span class="text-[11px] font-normal text-slate-500">${item.serial}</span></td>
                <td class="p-4 text-slate-600">${item.facility}</td>
                <td class="p-4 text-slate-600">${item.calDate}</td>
                <td class="p-4 ${dueColor}">${item.nextDue}</td>
                <td class="p-4 text-slate-600">${item.accuracy}</td>
                <td class="p-4 text-right">
                    <div class="inline-flex items-center justify-end space-x-1.5">
                        <button type="button" onclick="downloadCalibrationCert('${safeId}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition-colors">
                            Download PDF
                        </button>
                        ${editDeleteBtns}
                    </div>
                </td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function openAddCalibrationModal() {
    if (isVisitorMode()) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access. Please Sign In.', true);
        return;
    }
    ensureFeatureModalsExist();
    document.getElementById('addCalibrationForm')?.reset();

    const titleEl = document.getElementById('calibrationModalTitle');
    if (titleEl) titleEl.innerHTML = `<i data-lucide="file-check-2" class="w-5 h-5 text-teal-600"></i><span>Add Calibration Report</span>`;

    document.getElementById('editCalOriginalId').value = '';

    const today = new Date();
    const nextSixMonths = new Date();
    nextSixMonths.setMonth(nextSixMonths.getMonth() + 6);

    const randNum = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('calCertId').value = `CERT-${today.getFullYear()}-${randNum}`;
    document.getElementById('calDate').value = today.toISOString().split('T')[0];
    document.getElementById('calNextDue').value = nextSixMonths.toISOString().split('T')[0];
    document.getElementById('calAccuracy').value = "± 0.5% Tolerance (Pass)";

    document.getElementById('addCalibrationModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function openEditCalibrationModal(certId) {
    if (isVisitorMode()) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true);
        return;
    }
    ensureFeatureModalsExist();
    const item = window.calibrationList.find(c => String(c.id) === String(certId));
    if (!item) return;

    const titleEl = document.getElementById('calibrationModalTitle');
    if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 text-teal-600"></i><span>Edit Calibration Report</span>`;

    document.getElementById('editCalOriginalId').value = item.id;
    document.getElementById('calCertId').value = item.id;
    document.getElementById('calSerial').value = item.serial;
    document.getElementById('calEqName').value = item.eqName;
    document.getElementById('calFacility').value = item.facility;
    document.getElementById('calDate').value = item.calDate;
    document.getElementById('calNextDue').value = item.nextDue;
    document.getElementById('calAccuracy').value = item.accuracy;

    document.getElementById('addCalibrationModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeAddCalibrationModal() {
    document.getElementById('addCalibrationModal')?.classList.add('hidden');
}

async function saveCalibrationReport(event) {
    event.preventDefault();
    if (isVisitorMode()) return;

    const originalId = document.getElementById('editCalOriginalId')?.value || '';
    const id = document.getElementById('calCertId').value.trim();
    const serial = document.getElementById('calSerial').value.trim();
    const eqName = document.getElementById('calEqName').value.trim();
    const facility = document.getElementById('calFacility').value.trim();
    const calDate = document.getElementById('calDate').value;
    const nextDue = document.getElementById('calNextDue').value;
    const accuracy = document.getElementById('calAccuracy').value.trim();

    let commitAction = '';
    if (originalId) {
        const existing = window.calibrationList.find(c => String(c.id) === String(originalId));
        if (existing) {
            Object.assign(existing, { id, eqName, serial, facility, calDate, nextDue, accuracy });
            commitAction = `Update Calibration Certificate ${id} (${eqName})`;
        }
    } else {
        window.calibrationList.unshift({ id, eqName, serial, facility, calDate, nextDue, accuracy });
        commitAction = `Add Calibration Certificate ${id} (${eqName})`;
    }

    localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
    closeAddCalibrationModal();
    renderCalibrationTable();
    buildSystemNotifications();

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(originalId ? `Updated Calibration ${id}!` : `Saved Calibration ${id}!`);
    }
    if (typeof pushToGitHub === 'function') await pushToGitHub(commitAction);
}

async function deleteCalibrationReport(certId) {
    if (isVisitorMode()) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true);
        return;
    }
    const target = window.calibrationList.find(c => String(c.id) === String(certId));
    if (!target) return;

    if (confirm(`Delete calibration report "${target.id}" (${target.eqName})?`)) {
        window.calibrationList = window.calibrationList.filter(c => String(c.id) !== String(certId));
        localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
        renderCalibrationTable();
        buildSystemNotifications();

        if (typeof showNotificationToast === 'function') showNotificationToast(`Deleted Calibration ${target.id}`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(`Delete Calibration Certificate ${target.id}`);
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
    if (typeof showNotificationToast === 'function') showNotificationToast("Exported Calibration Reports CSV!");
}

function downloadCalibrationCert(certId) {
    const item = window.calibrationList.find(c => String(c.id) === String(certId));
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
// 3. BIOMED OFFICE TOOL & KIT LOGBOOK (WITH BORROW, EDIT, DELETE & RETURN)
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
    ensureFeatureModalsExist();
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

    const isVis = isVisitorMode();
    filtered.forEach(log => {
        const statusBadge = log.status === 'Borrowed'
            ? `<span class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span><span>Borrowed (Out)</span></span>`
            : `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Returned</span></span>`;

        let actionBtns = `<span class="text-xs text-slate-400 italic">View Only</span>`;
        if (!isVis) {
            const returnBtn = log.status === 'Borrowed'
                ? `<button type="button" onclick="markToolReturned(${log.id})" class="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs">Mark Returned</button>`
                : `<span class="px-2 py-1 text-xs text-slate-400 font-medium">Cleared</span>`;

            actionBtns = `
                <div class="inline-flex items-center justify-end space-x-1.5">
                    ${returnBtn}
                    <button type="button" onclick="openEditToolModal(${log.id})" class="p-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 rounded-lg transition-colors" title="Edit Tool Log">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button type="button" onclick="deleteToolLog(${log.id})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors" title="Delete Tool Log">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4 font-semibold text-slate-900">${log.borrower}</td>
                <td class="p-4 font-medium text-slate-800">${log.toolName}<br><span class="text-xs font-mono text-slate-400">ID: ${log.toolCode}</span></td>
                <td class="p-4 text-xs text-slate-600">${log.destination}</td>
                <td class="p-4 text-xs font-medium text-slate-800">${log.borrowDate}<br><span class="text-teal-600 font-semibold">${formatTime12Hr(log.borrowTime)}</span></td>
                <td class="p-4 text-xs text-slate-600">${log.returnDateTime || '<span class="text-amber-600 italic">Still in field</span>'}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4 text-right">${actionBtns}</td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function openBorrowToolModal() {
    if (isVisitorMode()) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access. Please Sign In.', true);
        return;
    }
    ensureFeatureModalsExist();
    document.getElementById('borrowToolForm')?.reset();

    const titleEl = document.getElementById('borrowToolModalTitle');
    if (titleEl) titleEl.innerHTML = `<i data-lucide="wrench" class="w-5 h-5 text-teal-600"></i><span>Borrow Tool / Test Kit from Biomed Office</span>`;

    const submitBtn = document.getElementById('borrowToolSubmitBtn');
    if (submitBtn) submitBtn.innerText = 'Record Check-Out';

    document.getElementById('editToolLogId').value = '';

    const now = new Date();
    document.getElementById('toolBorrowDate').value = now.toISOString().split('T')[0];
    document.getElementById('toolBorrowTime').value = now.toTimeString().slice(0, 5);
    document.getElementById('borrowToolModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function openEditToolModal(logId) {
    if (isVisitorMode()) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true);
        return;
    }
    ensureFeatureModalsExist();
    const log = window.toolLogs.find(t => t.id == logId);
    if (!log) return;

    const titleEl = document.getElementById('borrowToolModalTitle');
    if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 text-teal-600"></i><span>Edit Borrowed Tool / Kit Record</span>`;

    const submitBtn = document.getElementById('borrowToolSubmitBtn');
    if (submitBtn) submitBtn.innerText = 'Save Changes';

    document.getElementById('editToolLogId').value = log.id;
    document.getElementById('toolBorrower').value = log.borrower;
    document.getElementById('toolName').value = log.toolName;
    document.getElementById('toolCode').value = log.toolCode;
    document.getElementById('toolDestination').value = log.destination;
    document.getElementById('toolBorrowDate').value = log.borrowDate;
    document.getElementById('toolBorrowTime').value = log.borrowTime;

    document.getElementById('borrowToolModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeBorrowToolModal() {
    document.getElementById('borrowToolModal')?.classList.add('hidden');
}

async function saveToolBorrow(event) {
    event.preventDefault();
    if (isVisitorMode()) return;

    const editId = document.getElementById('editToolLogId')?.value || '';
    const borrower = document.getElementById('toolBorrower').value.trim();
    const toolName = document.getElementById('toolName').value.trim();
    const toolCode = document.getElementById('toolCode').value.trim();
    const destination = document.getElementById('toolDestination').value.trim();
    const borrowDate = document.getElementById('toolBorrowDate').value;
    const borrowTime = document.getElementById('toolBorrowTime').value;

    let commitMsg = '';
    if (editId) {
        const existing = window.toolLogs.find(t => t.id == editId);
        if (existing) {
            Object.assign(existing, { borrower, toolName, toolCode, destination, borrowDate, borrowTime });
            commitMsg = `Update Tool Log: ${toolName} (${toolCode}) by ${borrower}`;
        }
    } else {
        window.toolLogs.unshift({
            id: Date.now(), borrower, toolName, toolCode, destination, borrowDate, borrowTime, returnDateTime: "", status: "Borrowed"
        });
        commitMsg = `Tool Check-Out: ${toolName} (${toolCode}) by ${borrower}`;
    }

    localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
    closeBorrowToolModal();
    renderToolLogsTable();
    buildSystemNotifications();

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(editId ? `Updated ${toolName} record!` : `Logged out ${toolName} to ${borrower}!`);
    }
    if (typeof pushToGitHub === 'function') await pushToGitHub(commitMsg);
}

async function deleteToolLog(logId) {
    if (isVisitorMode()) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true);
        return;
    }
    const target = window.toolLogs.find(t => t.id == logId);
    if (!target) return;

    if (confirm(`Delete tool log for "${target.toolName}" borrowed by ${target.borrower}?`)) {
        window.toolLogs = window.toolLogs.filter(t => t.id != logId);
        localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
        renderToolLogsTable();
        buildSystemNotifications();

        if (typeof showNotificationToast === 'function') showNotificationToast(`Deleted tool record for ${target.toolName}`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(`Delete Tool Log: ${target.toolName} (${target.toolCode})`);
    }
}

async function markToolReturned(logId) {
    if (isVisitorMode()) return;
    const log = window.toolLogs.find(t => t.id == logId);
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

// Global hooks so HTML onclick handlers always find them
window.openBorrowToolModal = openBorrowToolModal;
window.openEditToolModal = openEditToolModal;
window.closeBorrowToolModal = closeBorrowToolModal;
window.saveToolBorrow = saveToolBorrow;
window.deleteToolLog = deleteToolLog;
window.markToolReturned = markToolReturned;

window.openAddCalibrationModal = openAddCalibrationModal;
window.openEditCalibrationModal = openEditCalibrationModal;
window.closeAddCalibrationModal = closeAddCalibrationModal;
window.saveCalibrationReport = saveCalibrationReport;
window.deleteCalibrationReport = deleteCalibrationReport;

const baseSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
    const role = window.currentAccessRole || sessionStorage.getItem('seiralab_active_session_role') || 'Visitor';
    if (tabId === 'inventory' && role !== 'Head Technical' && role !== 'MasterAdmin') {
        if (typeof showNotificationToast === 'function') showNotificationToast('Only Head Technical & MasterAdmin can access Inventory.', true);
        return;
    }
    if (typeof baseSwitchTab === 'function') {
        baseSwitchTab(tabId);
    }
    if (tabId === 'tools') renderToolLogsTable();
    if (tabId === 'calibration') renderCalibrationTable();
};

window.addEventListener('DOMContentLoaded', function() {
    ensureFeatureModalsExist();
    upgradeCalibrationToolbarUI();
    renderCalibrationTable();
    renderToolLogsTable();
    buildSystemNotifications();
});

// ============================================================================
// 4. EXCEL (.XLSX / .XLS), CSV & JSON ASSET IMPORTER WITH DEDUPLICATION
// ============================================================================

// Dynamically load SheetJS (xlsx) library if not already loaded
function ensureSheetJSLoaded() {
    return new Promise((resolve, reject) => {
        if (window.XLSX) return resolve(window.XLSX);
        const existingScript = document.getElementById('sheetjs-cdn-script');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.XLSX));
            return;
        }
        const script = document.createElement('script');
        script.id = 'sheetjs-cdn-script';
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => resolve(window.XLSX);
        script.onerror = () => reject(new Error('Failed to load Excel parser'));
        document.head.appendChild(script);
    });
}

function relocateImportAssetButtonAndFixInput() {
    // 1. Remove "Import Asset Data" from PM Schedule & Tasks tab
    const scheduleHeader = document.querySelector('#schedule');
    if (scheduleHeader) {
        scheduleHeader.querySelectorAll('button').forEach(btn => {
            if (btn.innerText.includes('Import Asset Data')) {
                btn.remove();
            }
        });
    }

    // 2. Place "Import Asset Data" next to "+ Add Equipment" in Equipment Inventory
    const invSection = document.getElementById('inventory');
    if (!invSection) return;

    let addEqBtn = null;
    invSection.querySelectorAll('button').forEach(btn => {
        if (btn.innerText.includes('Add Equipment')) {
            addEqBtn = btn;
        }
    });

    if (addEqBtn && !document.getElementById('btnInventoryImportAsset')) {
        const parentDiv = addEqBtn.parentElement;
        parentDiv.className = 'flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2';

        const importBtn = document.createElement('button');
        importBtn.type = 'button';
        importBtn.id = 'btnInventoryImportAsset';
        importBtn.onclick = triggerAssetImportPicker;
        importBtn.className = 'inline-flex items-center justify-center px-3.5 py-2 bg-white border border-slate-300 hover:border-teal-600 text-slate-700 hover:text-teal-700 hover:bg-teal-50 rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap cursor-pointer';
        importBtn.innerHTML = `
            <i data-lucide="file-spreadsheet" class="w-4 h-4 text-teal-600"></i>
            <span>Import Asset Data (.xlsx / .csv)</span>
        `;

        parentDiv.insertBefore(importBtn, addEqBtn);
    }

    // 3. Create hidden file input supporting .xlsx, .xls, .csv, and .json
    let fileInput = document.getElementById('seiralabAssetFileInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'seiralabAssetFileInput';
        fileInput.accept = '.xlsx,.xls,.csv,.json,.txt';
        fileInput.className = 'hidden';
        fileInput.addEventListener('change', handleAssetDataFileImport);
        document.body.appendChild(fileInput);
    } else {
        fileInput.accept = '.xlsx,.xls,.csv,.json,.txt';
    }

    const legacyInput = document.getElementById('importFileInput');
    if (legacyInput) {
        legacyInput.accept = '.xlsx,.xls,.csv,.json,.txt';
        legacyInput.onchange = handleAssetDataFileImport;
    }

    if (window.lucide) lucide.createIcons();
}

function triggerAssetImportPicker() {
    if (isVisitorMode()) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Visitors have view-only access. Please Sign In.', true);
        }
        return;
    }
    relocateImportAssetButtonAndFixInput();
    const fileInput = document.getElementById('seiralabAssetFileInput');
    if (fileInput) {
        fileInput.value = ''; // Always reset so re-uploading an updated file works immediately
        fileInput.click();
    }
}

// Convert Excel serial dates (e.g. 46136) or string dates to YYYY-MM-DD
function normalizeImportedDate(val, fallbackMonthsOffset = 0) {
    if (val !== undefined && val !== null && val !== '') {
        // Handle Excel numeric date serials (e.g. 45000 - 55000)
        if (typeof val === 'number' && val > 25000 && val < 80000) {
            const utcDays = Math.floor(val - 25569);
            const d = new Date(utcDays * 86400 * 1000);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        if (val instanceof Date && !isNaN(val.getTime())) {
            return val.toISOString().split('T')[0];
        }
        const cleaned = String(val).trim();
        if (/^\d{5}$/.test(cleaned)) {
            const utcDays = Math.floor(Number(cleaned) - 25569);
            const d = new Date(utcDays * 86400 * 1000);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
    }
    const d = new Date();
    if (fallbackMonthsOffset) d.setMonth(d.getMonth() + fallbackMonthsOffset);
    return d.toISOString().split('T')[0];
}

// Normalize serial numbers so "AS-24B05160" and "as24b05160 " match as the same asset
function normalizeSerialKey(serial) {
    return String(serial || '')
        .trim()
        .toLowerCase()
        .replace(/[\s\-_]/g, '');
}

// Normalize composite key (Name + Model + Facility) in case Serial Number is blank or generic
function normalizeCompositeKey(item) {
    const n = String(item.name || '').trim().toLowerCase();
    const m = String(item.model || '').trim().toLowerCase();
    const f = String(item.facility || '').trim().toLowerCase();
    return `${n}|${m}|${f}`;
}

// Map an arbitrary object row from SheetJS / CSV / JSON into a standardized Seiralab Equipment object
function mapRawRowToEquipment(row, idx) {
    // Build a lookup of lowercase alphanumeric keys -> values
    const cleanMap = {};
    Object.keys(row || {}).forEach(k => {
        const cleanKey = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
        cleanMap[cleanKey] = row[k];
    });

    const pick = (keywords, fallback = '') => {
        for (const kw of keywords) {
            for (const key of Object.keys(cleanMap)) {
                if (key.includes(kw) && cleanMap[key] !== undefined && cleanMap[key] !== '') {
                    return String(cleanMap[key]).trim();
                }
            }
        }
        return fallback;
    };

    // If equipment & model are combined like "Flexor Chemistry Analyzer (AB-380)"
    let rawName = pick(['equipmentname', 'equipment', 'assetname', 'asset', 'machine', 'item', 'name'], '');
    let rawModel = pick(['model', 'brand', 'version', 'type'], '');

    if (!rawModel && rawName.includes('(') && rawName.endsWith(')')) {
        const openIdx = rawName.lastIndexOf('(');
        rawModel = rawName.slice(openIdx + 1, -1).trim();
        rawName = rawName.slice(0, openIdx).trim();
    }

    const name = rawName || 'Medical Diagnostic Analyzer';
    const model = rawModel || 'Standard';
    const serial = pick(['serial', 'sn', 'assetid', 'id', 'code', 'tag'], `SN-${idx + 1}`);
    const facility = pick(['hospital', 'facility', 'client', 'site', 'clinic', 'center'], 'Cebu City Medical Center');
    const dept = pick(['dept', 'department', 'section', 'ward', 'unit'], 'Pathology Lab');
    const location = pick(['location', 'region', 'city', 'area', 'room'], 'CEBU - Clinical Lab');

    let risk = pick(['risk', 'priority', 'criticality'], 'High');
    if (!['Critical', 'High', 'Medium', 'Low'].includes(risk)) {
        const rLow = risk.toLowerCase();
        risk = rLow.includes('crit') ? 'Critical'
             : rLow.includes('med') ? 'Medium'
             : rLow.includes('low') ? 'Low' : 'High';
    }

    let status = pick(['status', 'condition', 'state'], 'Operational');
    if (!['Operational', 'Maintenance Due', 'Under Repair', 'Decommissioned'].includes(status)) {
        const sLow = status.toLowerCase();
        status = sLow.includes('repair') ? 'Under Repair'
               : sLow.includes('due') ? 'Maintenance Due'
               : sLow.includes('decom') ? 'Decommissioned' : 'Operational';
    }

    const rawLastPM = cleanMap['lastpm'] || cleanMap['lastpmdate'] || cleanMap['installdate'] || cleanMap['calibrationdate'] || pick(['lastpm', 'install', 'service'], '');
    const rawNextDue = cleanMap['nextdue'] || cleanMap['nextpm'] || cleanMap['nextpmduedate'] || cleanMap['duedate'] || pick(['nextdue', 'nextpm', 'due'], '');

    return {
        id: row.id || (Date.now() + idx),
        name,
        model,
        serial,
        facility,
        dept,
        location,
        risk,
        status,
        lastPM: normalizeImportedDate(rawLastPM, 0),
        nextDue: normalizeImportedDate(rawNextDue, 6),
        interval: pick(['interval', 'frequency', 'schedule'], 'Semi-Annual (6 Mos)')
    };
}

async function handleAssetDataFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    let rawRows = [];
    let importedHistory = null;
    let importedTools = null;
    let importedCalibrations = null;

    try {
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            // Use SheetJS to parse .xlsx, .xls, or .csv accurately
            const XLSX = await ensureSheetJSLoaded();
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        } else {
            // Parse .json or .txt
            const text = (await file.text()).trim();
            if (text.startsWith('{') || text.startsWith('[')) {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    rawRows = parsed;
                } else if (parsed && typeof parsed === 'object') {
                    rawRows = parsed.equipmentList || parsed.equipment || parsed.assets || [];
                    if (Array.isArray(parsed.historyLogs)) importedHistory = parsed.historyLogs;
                    if (Array.isArray(parsed.toolLogs)) importedTools = parsed.toolLogs;
                    if (Array.isArray(parsed.calibrationList)) importedCalibrations = parsed.calibrationList;
                }
            } else {
                const XLSX = await ensureSheetJSLoaded();
                const workbook = XLSX.read(text, { type: 'string' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            }
        }
    } catch (err) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Error reading file. Please upload a valid .xlsx, .csv, or .json file.', true);
        }
        return;
    }

    if ((!rawRows || rawRows.length === 0) && !importedHistory && !importedTools && !importedCalibrations) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('No valid equipment rows found in the uploaded file.', true);
        }
        return;
    }

    if (!Array.isArray(window.equipmentList)) window.equipmentList = [];

    // STEP 1: Normalize all rows & deduplicate within the uploaded file itself
    const uniqueIncomingMap = new Map();
    rawRows.forEach((rawRow, idx) => {
        // Skip completely blank rows in Excel
        const values = Object.values(rawRow || {}).map(v => String(v).trim()).filter(Boolean);
        if (values.length === 0) return;

        const mapped = mapRawRowToEquipment(rawRow, idx);
        const sKey = normalizeSerialKey(mapped.serial);
        const dedupKey = (sKey && !sKey.startsWith('sn')) ? `serial:${sKey}` : `comp:${normalizeCompositeKey(mapped)}`;

        // Later rows in the same Excel sheet overwrite earlier duplicate rows
        uniqueIncomingMap.set(dedupKey, mapped);
    });

    // STEP 2: Upsert into window.equipmentList (Update existing matches in place, add only new ones)
    let addedCount = 0;
    let updatedCount = 0;

    uniqueIncomingMap.forEach(incomingItem => {
        const incomingSerialKey = normalizeSerialKey(incomingItem.serial);
        const incomingCompKey = normalizeCompositeKey(incomingItem);

        const existingIndex = window.equipmentList.findIndex(existing => {
            const existingSerialKey = normalizeSerialKey(existing.serial);
            // Match 1: Same normalized Serial Number
            if (incomingSerialKey && existingSerialKey && incomingSerialKey === existingSerialKey) {
                return true;
            }
            // Match 2: Same Equipment Name + Model + Hospital Facility (when serial was edited or generic)
            return normalizeCompositeKey(existing) === incomingCompKey;
        });

        if (existingIndex !== -1) {
            // Update existing asset in place (keep original ID so history logs stay linked, avoid duplicate)
            const preservedId = window.equipmentList[existingIndex].id;
            window.equipmentList[existingIndex] = {
                ...window.equipmentList[existingIndex],
                ...incomingItem,
                id: preservedId
            };
            updatedCount++;
        } else {
            // Brand new asset -> Add to inventory
            window.equipmentList.unshift(incomingItem);
            addedCount++;
        }
    });

    // STEP 3: Save to localStorage and sync app.js state
    localStorage.setItem('seiralab_equipment', JSON.stringify(window.equipmentList));
    try {
        if (typeof equipmentList !== 'undefined') {
            equipmentList = window.equipmentList;
        }
    } catch (_) {}

    if (importedHistory) {
        window.historyLogs = importedHistory;
        localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
    }
    if (importedTools) {
        window.toolLogs = importedTools;
        localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
    }
    if (importedCalibrations) {
        window.calibrationList = importedCalibrations;
        localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
    }

    // STEP 4: Re-render all tables, counters, hospital filters, and notifications
    if (typeof populateFacilityFilter === 'function') populateFacilityFilter();
    if (typeof renderInventoryTable === 'function') renderInventoryTable();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderScheduleCards === 'function') renderScheduleCards();
    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    if (typeof renderCalibrationTable === 'function') renderCalibrationTable();
    if (typeof renderToolLogsTable === 'function') renderToolLogsTable();
    if (typeof buildSystemNotifications === 'function') buildSystemNotifications();

    const msg = `Excel/Asset Import Complete: ${addedCount} new added, ${updatedCount} existing updated (0 duplicates).`;
    if (typeof showNotificationToast === 'function') {
        showNotificationToast(msg);
    }

    // STEP 5: Push updated database to GitHub via Cloudflare Worker
    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`Import Assets (${file.name}): +${addedCount} new, ${updatedCount} updated`);
    }
}

window.triggerAssetImportPicker = triggerAssetImportPicker;
window.importAssetData = triggerAssetImportPicker;
window.triggerImport = triggerAssetImportPicker;
window.handleImportFile = handleAssetDataFileImport;

window.addEventListener('DOMContentLoaded', function () {
    ensureSheetJSLoaded().catch(() => {});
    relocateImportAssetButtonAndFixInput();
});
setTimeout(relocateImportAssetButtonAndFixInput, 300);

// ============================================================================
// 5. REMOVE "RISK" FROM DASHBOARD, EQUIPMENT INVENTORY & ADD EQUIPMENT MODAL
// ============================================================================
function removeRiskFromAllUI() {
    // 1. Inject CSS to hide Risk in Dashboard (col 3) & Inventory (col 5)
    if (!document.getElementById('hideAllRiskColumnsStyle')) {
        const style = document.createElement('style');
        style.id = 'hideAllRiskColumnsStyle';
        style.textContent = `
            #dashboard table th:nth-child(3),
            #dashboard table td:nth-child(3),
            #inventory table th:nth-child(5),
            #inventory table td:nth-child(5) {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Hide the "Risk Level" dropdown inside the Add/Edit Equipment modal
    const riskSelect = document.getElementById('eqRisk');
    if (riskSelect && riskSelect.parentElement) {
        riskSelect.parentElement.classList.add('hidden');
    }
}

window.addEventListener('DOMContentLoaded', removeRiskFromAllUI);
setTimeout(removeRiskFromAllUI, 200);
// ============================================================================
// 6. OFFICIAL SEIRALAB SERVICE REPORT TEMPLATE IN MAINTENANCE HISTORY & LOGS
// Cleaned header (single logo banner) + blank Findings, Action Taken & Amount
// ============================================================================

function ensureServiceReportModalExists() {
    if (document.getElementById('seiralabServiceReportModal')) return;

    if (!document.getElementById('seiralabServiceReportPrintStyle')) {
        const style = document.createElement('style');
        style.id = 'seiralabServiceReportPrintStyle';
        style.textContent = `
            #srPaperSheet {
                font-family: 'Times New Roman', Times, serif;
                color: #111827;
            }
            #srPaperSheet input[type="text"] {
                font-family: 'Inter', Arial, sans-serif;
                color: #0f172a;
                font-weight: 600;
            }
            #srPaperSheet textarea {
                font-family: 'Inter', Arial, sans-serif;
                color: #0f172a;
                resize: none;
            }
            @media print {
                body * {
                    visibility: hidden !important;
                }
                #seiralabServiceReportModal,
                #seiralabServiceReportModal #srPaperSheet,
                #seiralabServiceReportModal #srPaperSheet * {
                    visibility: visible !important;
                }
                #seiralabServiceReportModal {
                    position: absolute !important;
                    inset: 0 !important;
                    background: #ffffff !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    display: block !important;
                    overflow: visible !important;
                }
                #srModalToolbar {
                    display: none !important;
                }
                #srPaperSheet {
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 auto !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 8mm 12mm !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    const modalHTML = `
    <div id="seiralabServiceReportModal" class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-[120] hidden overflow-y-auto p-3 sm:p-6 flex flex-col items-center">
        <!-- Top Action Bar (Hidden when printing) -->
        <div id="srModalToolbar" class="w-full max-w-4xl bg-slate-900 text-white rounded-t-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border border-slate-700 shadow-xl">
            <div class="flex items-center space-x-2.5">
                <i data-lucide="file-text" class="w-5 h-5 text-teal-400"></i>
                <div>
                    <h3 class="text-sm font-bold">Seiralab Official Service Report Certificate</h3>
                    <p class="text-[11px] text-slate-400">Click any line, checkbox, or box below to fill in details before printing or saving as PDF</p>
                </div>
            </div>
            <div class="flex items-center space-x-2.5">
                <button type="button" onclick="window.print()" class="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg shadow-sm inline-flex items-center space-x-1.5 cursor-pointer transition-colors">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                    <span>Print / Save PDF</span>
                </button>
                <button type="button" onclick="closeServiceReportModal()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg cursor-pointer transition-colors">
                    Close
                </button>
            </div>
        </div>

        <!-- Printable Paper Form -->
        <div id="srPaperSheet" class="w-full max-w-4xl bg-white shadow-2xl border border-slate-300 rounded-b-2xl p-6 sm:p-10 text-sm leading-snug mb-10">

            <!-- Header: Centered Official Seiralab Banner Logo Only (Duplicate Text Removed) -->
            <div class="flex flex-col items-center justify-center text-center pb-1">
                <img src="./seiralab-logo.jpg" alt="Seiralab Incorporated" class="h-20 sm:h-24 w-auto object-contain mx-auto" onerror="this.onerror=null; this.src='./seiralab-logo.gIH9ySyn.jpg';">
                <p class="text-xs sm:text-[13px] text-slate-900 mt-1.5">
                    Unit 1-6, Level 2, MGM Bldg., Gensan Drive, Brgy. Sto. Niño,<br>
                    City of Koronadal, South Cotabato, 9506
                </p>
            </div>

            <!-- Title & Red Serial Number -->
            <div class="relative flex items-center justify-center my-4">
                <h2 class="text-xl sm:text-2xl font-bold tracking-wider uppercase text-slate-900">SERVICE REPORT</h2>
                <div class="absolute right-0 sm:right-6 top-0">
                    <input type="text" id="srReportNo" value="05535" class="w-24 sm:w-28 text-right text-xl sm:text-2xl font-mono font-bold text-rose-500/90 focus:outline-none border-b border-transparent focus:border-rose-400 bg-transparent" title="Report Serial Number">
                </div>
            </div>

            <!-- Customer / Facility Info Lines -->
            <div class="space-y-1.5 text-[13px]">
                <div class="flex items-end w-full sm:w-1/2 pr-4">
                    <span class="font-semibold shrink-0 mr-2">Date:</span>
                    <input type="text" id="srDate" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none">
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-12 gap-x-6 gap-y-1.5">
                    <div class="sm:col-span-7 flex items-end">
                        <span class="font-semibold shrink-0 mr-2">Company Name:</span>
                        <input type="text" id="srCompany" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none">
                    </div>
                    <div class="sm:col-span-5 flex items-end">
                        <span class="font-semibold shrink-0 mr-2">Tel. No./Fax:</span>
                        <input type="text" id="srTel" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-12 gap-x-6 gap-y-1.5">
                    <div class="sm:col-span-7 flex items-end">
                        <span class="font-semibold shrink-0 mr-2">Contact Person:</span>
                        <input type="text" id="srContact" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none">
                    </div>
                    <div class="sm:col-span-5 flex items-end">
                        <span class="font-semibold shrink-0 mr-2">Department:</span>
                        <input type="text" id="srDepartment" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none">
                    </div>
                </div>

                <div class="flex items-end">
                    <span class="font-semibold shrink-0 mr-2">Address:</span>
                    <input type="text" id="srAddress" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none">
                </div>

                <div class="flex items-end pt-2">
                    <span class="font-bold uppercase shrink-0 mr-2">COMPLAINTS:</span>
                    <input type="text" id="srComplaints" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none">
                </div>
            </div>

            <!-- Checkboxes Row -->
            <div class="flex flex-wrap items-center justify-between gap-2 my-3 text-xs font-semibold text-slate-900 px-1">
                <label class="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" id="srChkWarranty" class="w-3.5 h-3.5 accent-slate-900">
                    <span>Warranty</span>
                </label>
                <label class="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" id="srChkOutWarranty" class="w-3.5 h-3.5 accent-slate-900">
                    <span>Out or Warranty</span>
                </label>
                <label class="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" id="srChkCheckup" class="w-3.5 h-3.5 accent-slate-900">
                    <span>Check-up</span>
                </label>
                <label class="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" id="srChkCleaning" class="w-3.5 h-3.5 accent-slate-900">
                    <span>Cleaning Repair</span>
                </label>
                <label class="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" id="srChkContract" class="w-3.5 h-3.5 accent-slate-900">
                    <span>Under Contract</span>
                </label>
                <label class="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" id="srChkOrientation" class="w-3.5 h-3.5 accent-slate-900">
                    <span>Orientation</span>
                </label>
                <label class="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input type="checkbox" id="srChkDelivery" class="w-3.5 h-3.5 accent-slate-900">
                    <span>Delivery</span>
                </label>
            </div>

            <!-- Box 1: Equipment / Model / Serial No. / Location -->
            <div class="border-2 border-slate-900 p-2.5 mb-3 space-y-2 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div class="sm:col-span-5 flex items-end">
                        <span class="font-bold shrink-0 mr-1.5">Equipment:</span>
                        <input type="text" id="srEquipmentName" class="w-full border-b border-slate-800 px-1 py-0.5 focus:outline-none">
                    </div>
                    <div class="sm:col-span-3 flex items-end">
                        <span class="font-bold shrink-0 mr-1.5">Model:</span>
                        <input type="text" id="srModel" class="w-full border-b border-slate-800 px-1 py-0.5 focus:outline-none">
                    </div>
                    <div class="sm:col-span-4 flex items-end">
                        <span class="font-bold shrink-0 mr-1.5">Serial No.:</span>
                        <input type="text" id="srSerial" class="w-full border-b border-slate-800 px-1 py-0.5 font-mono focus:outline-none">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div class="sm:col-span-6 flex items-end">
                        <span class="font-bold shrink-0 mr-1.5">Address / Area:</span>
                        <input type="text" id="srEqArea1" class="w-full border-b border-slate-800 px-1 py-0.5 focus:outline-none">
                    </div>
                    <div class="sm:col-span-6 flex items-end">
                        <span class="font-bold shrink-0 mr-1.5">Next Due / Status:</span>
                        <input type="text" id="srEqArea2" class="w-full border-b border-slate-800 px-1 py-0.5 focus:outline-none">
                    </div>
                </div>
            </div>

            <!-- Box 2: Findings | Action Taken | Amount (Clean & Empty by Default) -->
            <div class="border-2 border-slate-900 mb-3">
                <div class="grid grid-cols-12 border-b border-slate-900 text-xs font-bold text-center bg-slate-50/50">
                    <div class="col-span-4 py-1 border-r border-slate-900">Findings</div>
                    <div class="col-span-5 py-1 border-r border-slate-900">Action Taken</div>
                    <div class="col-span-3 py-1">Amount</div>
                </div>
                <div class="grid grid-cols-12 h-28">
                    <div class="col-span-4 border-r border-slate-900 p-1.5">
                        <textarea id="srFindings" class="w-full h-full text-xs focus:outline-none bg-transparent"></textarea>
                    </div>
                    <div class="col-span-5 border-r border-slate-900 p-1.5">
                        <textarea id="srActionTaken" class="w-full h-full text-xs focus:outline-none bg-transparent"></textarea>
                    </div>
                    <div class="col-span-3 p-1.5">
                        <textarea id="srServiceAmount" class="w-full h-full text-xs text-center focus:outline-none bg-transparent"></textarea>
                    </div>
                </div>
            </div>

            <!-- Box 3: Parts for Replacement | Amount -->
            <div class="border-2 border-slate-900 mb-3">
                <div class="grid grid-cols-12 border-b border-slate-900 text-xs font-bold text-center bg-slate-50/50">
                    <div class="col-span-9 py-1 border-r border-slate-900">Parts for Replacement</div>
                    <div class="col-span-3 py-1">Amount</div>
                </div>
                <div class="grid grid-cols-12 h-24">
                    <div class="col-span-9 border-r border-slate-900 p-1.5">
                        <textarea id="srParts" class="w-full h-full text-xs focus:outline-none bg-transparent"></textarea>
                    </div>
                    <div class="col-span-3 p-1.5">
                        <textarea id="srPartsAmount" class="w-full h-full text-xs text-center focus:outline-none bg-transparent"></textarea>
                    </div>
                </div>
            </div>

            <!-- Box 4: Remarks / Recommendations Box -->
            <div class="border-2 border-slate-900 mb-3 h-16 p-1.5">
                <textarea id="srRemarks" class="w-full h-full text-xs focus:outline-none bg-transparent"></textarea>
            </div>

            <!-- Box 5: Signatures Footer (Attending Engineer/Technician | Customer Signature) -->
            <div class="border-2 border-slate-900 grid grid-cols-1 sm:grid-cols-12 text-xs">
                <div class="sm:col-span-6 border-b sm:border-b-0 sm:border-r border-slate-900 p-2.5 flex flex-col justify-between min-h-[90px]">
                    <div class="pt-5 text-center">
                        <input type="text" id="srTechnicianName" class="w-4/5 mx-auto text-center border-b border-slate-900 font-bold text-xs py-0.5 focus:outline-none">
                        <div class="font-semibold text-slate-900 mt-0.5">Attending Engineer/Technician</div>
                    </div>
                    <div class="flex items-end mt-2">
                        <span class="font-semibold mr-1.5">Date:</span>
                        <input type="text" id="srTechDate" class="w-40 border-b border-slate-800 px-1 text-xs focus:outline-none">
                    </div>
                </div>

                <div class="sm:col-span-6 p-2.5 flex flex-col justify-between min-h-[90px]">
                    <div class="text-[11px] font-semibold text-slate-900">I hereby acknowledged the above service/s rendered:</div>
                    <div class="pt-3 text-center">
                        <input type="text" id="srCustomerSign" class="w-4/5 mx-auto text-center border-b border-slate-900 font-bold text-xs py-0.5 focus:outline-none">
                        <div class="font-semibold text-slate-900 mt-0.5">Customer Signature Over Printed Name</div>
                    </div>
                    <div class="flex items-end mt-1">
                        <span class="font-semibold mr-1.5">Date:</span>
                        <input type="text" id="srCustomerDate" class="w-40 border-b border-slate-800 px-1 text-xs focus:outline-none">
                    </div>
                </div>
            </div>

        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) lucide.createIcons();
}

function openServiceReportTemplate(logId) {
    ensureServiceReportModalExists();

    const logs = window.historyLogs || JSON.parse(localStorage.getItem('seiralab_history') || '[]');
    const eqList = window.equipmentList || JSON.parse(localStorage.getItem('seiralab_equipment') || '[]');

    const log = logs.find(l => String(l.id) === String(logId)) || null;

    let matchedEq = null;
    if (log) {
        matchedEq = eqList.find(e =>
            (log.serial && String(e.serial).toLowerCase() === String(log.serial).toLowerCase()) ||
            (log.eqName && String(e.name).toLowerCase() === String(log.eqName).toLowerCase())
        );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const reportNumber = log
        ? String(5500 + (Math.abs(parseInt(String(log.id).slice(-3), 10) || 35))).padStart(5, '0')
        : '05535';

    document.getElementById('srReportNo').value = reportNumber;
    document.getElementById('srDate').value = log?.date || todayStr;
    document.getElementById('srCompany').value = log?.facility || matchedEq?.facility || '';
    document.getElementById('srTel').value = '';
    document.getElementById('srContact').value = '';
    document.getElementById('srDepartment').value = matchedEq?.dept || '';
    document.getElementById('srAddress').value = matchedEq?.location || log?.facility || '';
    document.getElementById('srComplaints').value = log?.type || '';

    document.getElementById('srEquipmentName').value = log?.eqName || matchedEq?.name || '';
    document.getElementById('srModel').value = matchedEq?.model || log?.model || '';
    document.getElementById('srSerial').value = log?.serial || matchedEq?.serial || '';
    document.getElementById('srEqArea1').value = matchedEq?.location || log?.facility || '';
    document.getElementById('srEqArea2').value = matchedEq?.nextDue ? `Next PM Due: ${matchedEq.nextDue}` : '';

    // Keep Findings, Action Taken, Amount, Parts, and Remarks clean (no pre-filled boilerplate text)
    document.getElementById('srFindings').value = '';
    document.getElementById('srActionTaken').value = log?.notes || '';
    document.getElementById('srServiceAmount').value = '';
    document.getElementById('srParts').value = '';
    document.getElementById('srPartsAmount').value = '';
    document.getElementById('srRemarks').value = '';

    document.getElementById('srTechnicianName').value = log?.tech || '';
    document.getElementById('srTechDate').value = log?.date || todayStr;
    document.getElementById('srCustomerSign').value = '';
    document.getElementById('srCustomerDate').value = log?.date || todayStr;

    document.getElementById('seiralabServiceReportModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeServiceReportModal() {
    document.getElementById('seiralabServiceReportModal')?.classList.add('hidden');
}

function upgradeMaintenanceHistoryCertificateButtons() {
    ensureServiceReportModalExists();

    const historySection = document.getElementById('history');
    if (historySection) {
        const headerContainer = historySection.querySelector('div:first-child');
        if (headerContainer && !document.getElementById('btnOpenBlankServiceReport')) {
            let btnGroup = headerContainer.querySelector('div:nth-child(2)') || headerContainer;
            const blankBtn = document.createElement('button');
            blankBtn.type = 'button';
            blankBtn.id = 'btnOpenBlankServiceReport';
            blankBtn.onclick = () => openServiceReportTemplate(null);
            blankBtn.className = 'inline-flex items-center justify-center px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap cursor-pointer mr-2';
            blankBtn.innerHTML = `
                <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
                <span>Service Report Form</span>
            `;
            btnGroup.insertBefore(blankBtn, btnGroup.firstChild);
        }
    }

    window.downloadCertificate = function (logId) {
        openServiceReportTemplate(logId);
    };

    const historyTbody = document.getElementById('historyTableBody');
    if (historyTbody) {
        historyTbody.querySelectorAll('button').forEach(btn => {
            const txt = btn.innerText.trim();
            if (txt.includes('Certificate') || txt.includes('Download') || txt.includes('Report')) {
                btn.className = 'px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer';
                btn.innerHTML = `<i data-lucide="printer" class="w-3.5 h-3.5"></i><span>Service Report</span>`;
            }
        });
    }
    if (window.lucide) lucide.createIcons();
}

const origRenderHistoryTable = window.renderHistoryTable;
if (typeof origRenderHistoryTable === 'function') {
    window.renderHistoryTable = function () {
        origRenderHistoryTable.apply(this, arguments);
        upgradeMaintenanceHistoryCertificateButtons();
    };
}

window.openServiceReportTemplate = openServiceReportTemplate;
window.closeServiceReportModal = closeServiceReportModal;

window.addEventListener('DOMContentLoaded', function () {
    setTimeout(upgradeMaintenanceHistoryCertificateButtons, 250);
});
setTimeout(upgradeMaintenanceHistoryCertificateButtons, 400);
