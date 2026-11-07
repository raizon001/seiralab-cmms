// ============================================================================
// SEIRALAB CMMS - FEATURES.JS (COMPLETE & CLEAN)
// 1. NOTIFICATIONS
// 2. CALIBRATION REPORTS (ADD / EDIT / DELETE / PDF)
// 3. BIOMED TOOL & KIT LOGBOOK (BORROW / EDIT / DELETE / RETURN)
// 4. EXCEL (.XLSX / .XLS), CSV & JSON ASSET IMPORTER (ZERO DUPLICATES)
// 5. REMOVE RISK COLUMN FROM DASHBOARD & INVENTORY
// 6. OFFICIAL SEIRALAB SERVICE REPORT TEMPLATE (SINGLE LOGO + BLANK FIELDS)
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
        document.getElementById('borrowToolForm')?.insertAdjacentHTML('afterbegin', '<input type="hidden" id="editToolLogId" value="">');
    }

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
// 4. MULTI-SHEET EXCEL (.XLS / .XLSX), CSV & JSON IMPORTER (FIXED FOR installation.xls)
// Automatically detects header row, reads all regional tabs, and fixes "undefined"
// ============================================================================

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
    const scheduleHeader = document.querySelector('#schedule');
    if (scheduleHeader) {
        scheduleHeader.querySelectorAll('button').forEach(btn => {
            if (btn.innerText.includes('Import Asset Data')) btn.remove();
        });
    }

    const invSection = document.getElementById('inventory');
    if (!invSection) return;

    let addEqBtn = null;
    invSection.querySelectorAll('button').forEach(btn => {
        if (btn.innerText.includes('Add Equipment')) addEqBtn = btn;
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
            <span>Import Asset Data (.xlsx / .xls / .csv)</span>
        `;

        parentDiv.insertBefore(importBtn, addEqBtn);
    }

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
        fileInput.value = '';
        fileInput.click();
    }
}

// Parse dates like "APRIL 24, 2025", "SEPTEMBER 17, 2019", Excel serials, or YYYY-MM-DD
function parseFlexibleInstallDate(val) {
    if (val !== undefined && val !== null && val !== '') {
        if (typeof val === 'number' && val > 20000 && val < 80000) {
            const utcDays = Math.floor(val - 25569);
            const d = new Date(utcDays * 86400 * 1000);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        if (val instanceof Date && !isNaN(val.getTime())) {
            return val.toISOString().split('T')[0];
        }
        let str = String(val).trim().replace(/\s+/g, ' ');
        if (str.toUpperCase() !== 'N/A' && str !== '-' && str !== '') {
            // Fix typos like "SEPTEMBER 17,2019" -> "SEPTEMBER 17, 2019"
            str = str.replace(/,(\d{4})/, ', $1');
            const parsed = new Date(str);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1995 && parsed.getFullYear() <= 2035) {
                return parsed.toISOString().split('T')[0];
            }
        }
    }
    return new Date().toISOString().split('T')[0];
}

// Compute Next PM Due (6 months after install/last PM, rolled forward to current cycle)
function computeNextPMFromInstall(installDateStr) {
    const base = new Date(installDateStr);
    if (isNaN(base.getTime())) {
        const fallback = new Date();
        fallback.setMonth(fallback.getMonth() + 6);
        return fallback.toISOString().split('T')[0];
    }
    const next = new Date(base);
    next.setMonth(next.getMonth() + 6);

    // If installed years ago (e.g. 2021-2025), advance in 6-month PM intervals to the current 2026/2027 cycle
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 2);
    while (next < cutoff) {
        next.setMonth(next.getMonth() + 6);
    }
    return next.toISOString().split('T')[0];
}

function inferDepartmentFromProduct(productType, brand) {
    const p = `${productType || ''} ${brand || ''}`.toLowerCase();
    if (p.includes('hematology') || p.includes('coagulation')) return 'Hematology Section';
    if (p.includes('chemistry') || p.includes('electrolyte') || p.includes('immunoassay') || p.includes('elisa') || p.includes('urine')) return 'Clinical Pathology Lab';
    if (p.includes('blood gas') || p.includes('ventilator') || p.includes('anesthesia')) return 'ICU / Respiratory Care';
    if (p.includes('ecg') || p.includes('monitor') || p.includes('defibrillator') || p.includes('ultrasound') || p.includes('xray') || p.includes('x-ray')) return 'Diagnostic Imaging & Cardio';
    return 'Clinical Laboratory';
}

function normalizeSerialKey(serial) {
    const s = String(serial || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
    if (!s || s === 'na' || s === 'n/a' || s === 'none' || s.startsWith('sn')) return '';
    return s;
}

function normalizeCompositeKey(item) {
    const n = String(item.name || '').trim().toLowerCase();
    const m = String(item.model || '').trim().toLowerCase();
    const f = String(item.facility || '').trim().toLowerCase();
    return `${n}|${m}|${f}`;
}

// Extract structured equipment items from a single Excel worksheet (handles title rows at top)
function parseWorksheetToEquipment(worksheet, sheetName, XLSX) {
    const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!matrix || matrix.length === 0) return [];

    // 1. Find the true Header Row (look in the first 15 rows for "Account Name", "Hospital", "Serial", "Model", etc.)
    let headerRowIndex = -1;
    for (let r = 0; r < Math.min(matrix.length, 15); r++) {
        const rowCells = (matrix[r] || []).map(c => String(c).trim().toLowerCase());
        const hasAccountOrHospital = rowCells.some(c => c.includes('account name') || c.includes('hospital') || c.includes('facility') || c.includes('equipment'));
        const hasModelOrSerial = rowCells.some(c => c.includes('model') || c.includes('serial') || c.includes('product type') || c.includes('brand'));
        if (hasAccountOrHospital && hasModelOrSerial) {
            headerRowIndex = r;
            break;
        }
    }

    // If standard Row 0 header
    if (headerRowIndex === -1) headerRowIndex = 0;

    const rawHeaders = (matrix[headerRowIndex] || []).map(h =>
        String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    const findColIdx = (exactList, partialList) => {
        for (const ex of exactList) {
            const idx = rawHeaders.indexOf(ex);
            if (idx !== -1) return idx;
        }
        for (const part of partialList) {
            const idx = rawHeaders.findIndex(h => h.includes(part));
            if (idx !== -1) return idx;
        }
        return -1;
    };

    const colFacility = findColIdx(['accountname', 'hospital', 'facility', 'hospitalfacility', 'client'], ['account', 'hospital', 'facility', 'clinic']);
    const colAddress  = findColIdx(['address', 'location', 'area'], ['address', 'location']);
    const colBrand    = findColIdx(['brand', 'manufacturer', 'make'], ['brand', 'maker']);
    const colProdType = findColIdx(['producttype', 'equipmentname', 'equipment', 'machine', 'description'], ['producttype', 'equipment', 'machine', 'type']);
    const colModel    = findColIdx(['model', 'modelno', 'unitmodel'], ['model']);
    const colSerial   = findColIdx(['serialno', 'serialnumber', 'serial', 'sn', 'serialid'], ['serial', 'sn']);
    const colDate     = findColIdx(['dateinstalled', 'lastpm', 'calibrationdate', 'installdate'], ['dateinstalled', 'install', 'lastpm', 'date']);
    const colNextDue  = findColIdx(['nextdue', 'nextpm', 'nextpmdue', 'duedate'], ['nextdue', 'nextpm', 'due']);
    const colDept     = findColIdx(['department', 'dept', 'section'], ['dept', 'department']);
    const colStatus   = findColIdx(['status', 'condition'], ['status']);

    const extracted = [];
    let lastKnownFacility = '';
    let lastKnownAddress = '';

    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
        const row = matrix[r] || [];
        const nonEmpty = row.map(c => String(c).trim()).filter(Boolean);
        if (nonEmpty.length < 2) continue;

        let facility = colFacility !== -1 ? String(row[colFacility] || '').trim() : '';
        let address  = colAddress !== -1 ? String(row[colAddress] || '').trim() : '';
        const brand    = colBrand !== -1 ? String(row[colBrand] || '').trim() : '';
        const prodType = colProdType !== -1 ? String(row[colProdType] || '').trim() : '';
        const model    = colModel !== -1 ? String(row[colModel] || '').trim() : '';
        const rawSn    = colSerial !== -1 ? String(row[colSerial] || '').trim() : '';
        const rawDate  = colDate !== -1 ? row[colDate] : '';
        const rawNext  = colNextDue !== -1 ? row[colNextDue] : '';
        const rawDept  = colDept !== -1 ? String(row[colDept] || '').trim() : '';
        const rawStat  = colStatus !== -1 ? String(row[colStatus] || '').trim() : '';

        // Skip repeated header rows or summary rows
        if (facility.toLowerCase() === 'account name' || model.toLowerCase() === 'model') continue;
        if (!facility && !prodType && !model && !brand) continue;

        // Handle merged cells in Excel where Account Name is only on the first row of a hospital group
        if (facility) {
            lastKnownFacility = facility;
            if (address) lastKnownAddress = address;
        } else if (lastKnownFacility && (prodType || model || brand)) {
            facility = lastKnownFacility;
            if (!address) address = lastKnownAddress;
        }

        if (!facility && !prodType && !model) continue;

        // Build clean Equipment Name (e.g. "ABX Micros Hematology Analyzer" or "EliTech Electrolyte Analyzer")
        let equipmentName = '';
        if (brand && prodType) {
            equipmentName = prodType.toLowerCase().includes(brand.toLowerCase())
                ? prodType
                : `${brand} ${prodType}`;
        } else {
            equipmentName = prodType || brand || model || 'Medical Diagnostic Equipment';
        }

        const cleanModel = (model && model.toUpperCase() !== 'N/A') ? model : (brand || 'Standard');
        const cleanFacility = facility || `${sheetName} Medical Facility`;
        const cleanDept = rawDept || inferDepartmentFromProduct(prodType, brand);
        const cleanLocation = address
            ? `${sheetName} - ${address}`
            : `${sheetName} - Clinical Lab`;

        const lastPMDate = parseFlexibleInstallDate(rawDate);
        const nextDueDate = rawNext ? parseFlexibleInstallDate(rawNext) : computeNextPMFromInstall(lastPMDate);

        // If Serial No. is "N/A" or blank in Excel, generate a stable unique ID based on sheet + row + model
        const isMissingSn = !rawSn || rawSn.toUpperCase() === 'N/A' || rawSn === '-';
        const cleanSerial = isMissingSn
            ? `${sheetName.slice(0, 3).toUpperCase()}-${cleanModel.replace(/[^A-Za-z0-9]/g, '')}-${r}`
            : rawSn;

        extracted.push({
            id: Date.now() + r + Math.floor(Math.random() * 1000),
            name: equipmentName,
            model: cleanModel,
            serial: cleanSerial,
            facility: cleanFacility,
            department: cleanDept, // Used by app.js
            dept: cleanDept,       // Used by features.js
            location: cleanLocation,
            risk: 'High',
            status: rawStat || 'Operational',
            lastPM: lastPMDate,
            nextDue: nextDueDate,
            interval: 'Semi-Annual (6 Mos)'
        });
    }

    return extracted;
}

// Repair any existing rows in localStorage that have "undefined" department or broken SN-xxx imports
function sanitizeExistingEquipmentList() {
    if (!Array.isArray(window.equipmentList)) return;

    // Remove the broken rows from the previous mis-mapped import (where facility was "Cebu City Medical Center" and serial started with "SN-6" or dept was undefined)
    window.equipmentList = window.equipmentList.filter(item => {
        const isBrokenImport = String(item.serial || '').startsWith('SN-') &&
                               (!item.department || item.department === 'undefined') &&
                               item.facility === 'Cebu City Medical Center' &&
                               item.name !== 'Flexor Chemistry Analyzer';
        return !isBrokenImport;
    });

    // Ensure every remaining item has both .department and .dept populated so "undefined" never appears
    window.equipmentList.forEach(item => {
        const validDept = item.department || item.dept || inferDepartmentFromProduct(item.name, item.model);
        item.department = validDept;
        item.dept = validDept;
        if (!item.location || item.location === 'undefined') {
            item.location = 'Clinical Laboratory';
        }
    });
}

async function handleAssetDataFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    let allExtractedItems = [];
    let importedHistory = null;
    let importedTools = null;
    let importedCalibrations = null;

    try {
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            const XLSX = await ensureSheetJSLoaded();
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

            // Loop through ALL sheets in the workbook (CEBU, VALENCIA, CDOC, DAVAO, ZAMBOANGA, GENSAN, KORONADAL, SOCKSARGEN)
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const sheetItems = parseWorksheetToEquipment(worksheet, sheetName.trim(), XLSX);
                allExtractedItems.push(...sheetItems);
            });
        } else {
            const text = (await file.text()).trim();
            if (text.startsWith('{') || text.startsWith('[')) {
                const parsed = JSON.parse(text);
                const rawList = Array.isArray(parsed) ? parsed : (parsed.equipmentList || parsed.equipment || []);
                allExtractedItems = rawList.map((item, idx) => ({
                    id: item.id || (Date.now() + idx),
                    name: item.name || item.eqName || 'Medical Analyzer',
                    model: item.model || 'Standard',
                    serial: item.serial || `SN-${idx + 1}`,
                    facility: item.facility || item.hospital || 'Cebu City Medical Center',
                    department: item.department || item.dept || 'Clinical Laboratory',
                    dept: item.dept || item.department || 'Clinical Laboratory',
                    location: item.location || 'CEBU - Clinical Lab',
                    risk: item.risk || 'High',
                    status: item.status || 'Operational',
                    lastPM: parseFlexibleInstallDate(item.lastPM),
                    nextDue: item.nextDue ? parseFlexibleInstallDate(item.nextDue) : computeNextPMFromInstall(item.lastPM),
                    interval: item.interval || 'Semi-Annual (6 Mos)'
                }));
                if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.historyLogs)) importedHistory = parsed.historyLogs;
                    if (Array.isArray(parsed.toolLogs)) importedTools = parsed.toolLogs;
                    if (Array.isArray(parsed.calibrationList)) importedCalibrations = parsed.calibrationList;
                }
            }
        }
    } catch (err) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Error reading file. Please upload a valid .xls, .xlsx, .csv, or .json file.', true);
        }
        return;
    }

    if (allExtractedItems.length === 0 && !importedHistory && !importedTools && !importedCalibrations) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('No valid equipment rows found in the uploaded file.', true);
        }
        return;
    }

    if (!Array.isArray(window.equipmentList)) window.equipmentList = [];

    // First clean out any broken "SN-xxx / undefined" rows from the earlier attempt
    sanitizeExistingEquipmentList();

    // STEP 1: Deduplicate within the uploaded workbook itself
    const uniqueIncomingMap = new Map();
    allExtractedItems.forEach(item => {
        const sKey = normalizeSerialKey(item.serial);
        const dedupKey = sKey ? `serial:${sKey}` : `comp:${normalizeCompositeKey(item)}|${item.serial}`;
        uniqueIncomingMap.set(dedupKey, item);
    });

    // STEP 2: Upsert into window.equipmentList (Update existing matches in place, add new ones)
    let addedCount = 0;
    let updatedCount = 0;

    uniqueIncomingMap.forEach(incomingItem => {
        const incomingSerialKey = normalizeSerialKey(incomingItem.serial);
        const incomingCompKey = normalizeCompositeKey(incomingItem);

        const existingIndex = window.equipmentList.findIndex(existing => {
            const existingSerialKey = normalizeSerialKey(existing.serial);
            if (incomingSerialKey && existingSerialKey && incomingSerialKey === existingSerialKey) {
                return true;
            }
            return normalizeCompositeKey(existing) === incomingCompKey &&
                   String(existing.serial) === String(incomingItem.serial);
        });

        if (existingIndex !== -1) {
            const preservedId = window.equipmentList[existingIndex].id;
            window.equipmentList[existingIndex] = {
                ...window.equipmentList[existingIndex],
                ...incomingItem,
                id: preservedId
            };
            updatedCount++;
        } else {
            window.equipmentList.push(incomingItem);
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

    // Rebuild the "All Hospitals / Labs (X Sites)" dropdown dynamically with all imported hospitals
    rebuildHospitalFilterDropdown();

    if (typeof populateFacilityFilter === 'function') populateFacilityFilter();
    if (typeof renderInventoryTable === 'function') renderInventoryTable();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderScheduleCards === 'function') renderScheduleCards();
    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    if (typeof renderCalibrationTable === 'function') renderCalibrationTable();
    if (typeof renderToolLogsTable === 'function') renderToolLogsTable();
    if (typeof buildSystemNotifications === 'function') buildSystemNotifications();

    const totalHospitals = new Set(window.equipmentList.map(e => e.facility).filter(Boolean)).size;
    const msg = `Imported ${addedCount} new & updated ${updatedCount} machines across ${totalHospitals} Hospitals/Labs!`;
    if (typeof showNotificationToast === 'function') {
        showNotificationToast(msg);
    }

    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`Import installation.xls: +${addedCount} new, ${updatedCount} updated (${totalHospitals} sites)`);
    }
}

// Ensure the "All Hospitals / Labs" filter dropdown includes every hospital from installation.xls
function rebuildHospitalFilterDropdown() {
    const facilitySelect = document.getElementById('facilityFilter');
    if (!facilitySelect || !Array.isArray(window.equipmentList)) return;

    const currentVal = facilitySelect.value;
    const facilities = Array.from(
        new Set(window.equipmentList.map(item => (item.facility || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    facilitySelect.innerHTML = `<option value="">All Hospitals / Labs (${facilities.length} Sites)</option>`;
    facilities.forEach(fac => {
        const opt = document.createElement('option');
        opt.value = fac;
        opt.textContent = fac;
        facilitySelect.appendChild(opt);
    });
    facilitySelect.value = currentVal;
}

window.triggerAssetImportPicker = triggerAssetImportPicker;
window.importAssetData = triggerAssetImportPicker;
window.triggerImport = triggerAssetImportPicker;
window.handleImportFile = handleAssetDataFileImport;
window.rebuildHospitalFilterDropdown = rebuildHospitalFilterDropdown;

window.addEventListener('DOMContentLoaded', function () {
    ensureSheetJSLoaded().catch(() => {});
    sanitizeExistingEquipmentList();
    localStorage.setItem('seiralab_equipment', JSON.stringify(window.equipmentList || []));
    relocateImportAssetButtonAndFixInput();
    setTimeout(() => {
        rebuildHospitalFilterDropdown();
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
    }, 300);
});
setTimeout(relocateImportAssetButtonAndFixInput, 300);

// ============================================================================
// 5. REMOVE "RISK" FROM DASHBOARD, EQUIPMENT INVENTORY & ADD EQUIPMENT MODAL
// ============================================================================
function removeRiskFromAllUI() {
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

    const riskSelect = document.getElementById('eqRisk');
    if (riskSelect && riskSelect.parentElement) {
        riskSelect.parentElement.classList.add('hidden');
    }
}

window.addEventListener('DOMContentLoaded', removeRiskFromAllUI);
setTimeout(removeRiskFromAllUI, 200);

// ============================================================================
// 6. SEIRALAB SERVICE REPORT SERIES ENGINE (REGISTER + VIEW + HEAD/ADMIN EDIT)
// Sequential non-duplicating series (05535+) & Head/Admin authorization lock
// ============================================================================

let currentServiceReportMode = 'register'; // 'register' | 'view' | 'edit'
let currentEditingLogId = null;
let tempSupervisorAuthorized = false;

function isHeadOrAdminRole() {
    const role = window.currentAccessRole || sessionStorage.getItem('seiralab_active_session_role') || 'Visitor';
    return role === 'Head Technical' || role === 'MasterAdmin';
}

// Ensure every existing history log has a unique, sequential reportNo (05535, 05536, ...)
function ensureSequentialReportNumbers() {
    if (!Array.isArray(window.historyLogs)) {
        window.historyLogs = JSON.parse(localStorage.getItem('seiralab_history') || '[]');
    }

    const usedNumbers = new Set();
    let maxNum = 5534;

    // First pass: collect existing valid report numbers
    window.historyLogs.forEach(log => {
        if (log.reportNo && /^\d+$/.test(String(log.reportNo).trim())) {
            const num = parseInt(String(log.reportNo).trim(), 10);
            if (!usedNumbers.has(num)) {
                usedNumbers.add(num);
                if (num > maxNum) maxNum = num;
            } else {
                // Duplicate found -> clear so second pass assigns a unique one
                log.reportNo = '';
            }
        }
    });

    // Second pass (oldest to newest): assign sequential numbers to any log missing one
    let changed = false;
    for (let i = window.historyLogs.length - 1; i >= 0; i--) {
        const log = window.historyLogs[i];
        if (!log.reportNo || !/^\d+$/.test(String(log.reportNo).trim())) {
            maxNum++;
            while (usedNumbers.has(maxNum)) {
                maxNum++;
            }
            log.reportNo = String(maxNum).padStart(5, '0');
            usedNumbers.add(maxNum);
            changed = true;
        }
    }

    if (changed) {
        localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
    }
}

// Get the next available non-duplicate 5-digit series number (e.g., "05535", "05536")
function getNextAvailableServiceReportNo() {
    ensureSequentialReportNumbers();
    let maxNum = 5534;
    (window.historyLogs || []).forEach(log => {
        const num = parseInt(String(log.reportNo || '0'), 10);
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    });
    return String(maxNum + 1).padStart(5, '0');
}

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
            #srPaperSheet.sr-readonly-mode input[type="text"],
            #srPaperSheet.sr-readonly-mode textarea {
                pointer-events: none;
                user-select: text;
            }
            #srPaperSheet.sr-readonly-mode input[type="checkbox"] {
                pointer-events: none;
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
                    <div class="flex items-center space-x-2">
                        <h3 id="srModalTitleText" class="text-sm font-bold">Seiralab Official Service Report</h3>
                        <span id="srModeBadge" class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">New Registration</span>
                    </div>
                    <p id="srModalSubtitleText" class="text-[11px] text-slate-400">Fill out the details below and click Register to save to Maintenance History</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button type="button" id="srBtnUnlockEdit" onclick="requestEditServiceReport(currentEditingLogId)" class="hidden px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg shadow-sm inline-flex items-center space-x-1.5 cursor-pointer transition-colors">
                    <i data-lucide="lock" class="w-3.5 h-3.5"></i>
                    <span>Edit (Head / Admin)</span>
                </button>
                <button type="button" id="srBtnSaveReport" onclick="saveRegisteredServiceReport()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm inline-flex items-center space-x-1.5 cursor-pointer transition-colors">
                    <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                    <span id="srBtnSaveLabel">Register Service Report</span>
                </button>
                <button type="button" onclick="window.print()" class="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg shadow-sm inline-flex items-center space-x-1.5 cursor-pointer transition-colors">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                    <span>Print / PDF</span>
                </button>
                <button type="button" onclick="closeServiceReportModal()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg cursor-pointer transition-colors">
                    Close
                </button>
            </div>
        </div>

        <!-- Printable Paper Form -->
        <div id="srPaperSheet" class="w-full max-w-4xl bg-white shadow-2xl border border-slate-300 rounded-b-2xl p-6 sm:p-10 text-sm leading-snug mb-10">

            <!-- Header: Centered Official Seiralab Banner Logo Only -->
            <div class="flex flex-col items-center justify-center text-center pb-1">
                <img src="./seiralab-logo.jpg" alt="Seiralab Incorporated" class="h-20 sm:h-24 w-auto object-contain mx-auto" onerror="this.onerror=null; this.src='./seiralab-logo.gIH9ySyn.jpg';">
                <p class="text-xs sm:text-[13px] text-slate-900 mt-1.5">
                    Unit 1-6, Level 2, MGM Bldg., Gensan Drive, Brgy. Sto. Niño,<br>
                    City of Koronadal, South Cotabato, 9506
                </p>
            </div>

            <!-- Title & Locked Sequential Serial Number -->
            <div class="relative flex items-center justify-center my-4">
                <h2 class="text-xl sm:text-2xl font-bold tracking-wider uppercase text-slate-900">SERVICE REPORT</h2>
                <div class="absolute right-0 sm:right-6 top-0">
                    <input type="text" id="srReportNo" value="05535" readonly class="w-24 sm:w-28 text-right text-xl sm:text-2xl font-mono font-bold text-slate-900 focus:outline-none bg-transparent cursor-not-allowed" title="Auto-Generated Series Number (Non-Duplicating)">
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

            <!-- Box 2: Findings | Action Taken | Amount -->
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

            <!-- Box 5: Signatures Footer -->
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
    </div>

    <!-- Head Technical / MasterAdmin Permission Modal for Editing Registered Service Reports -->
    <div id="srSupervisorAuthModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[130] hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center space-x-2.5">
                    <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                        <i data-lucide="shield-alert" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-slate-900">Head / Admin Permission Required</h4>
                        <p class="text-[11px] text-slate-500">Editing a registered Service Report requires authorization</p>
                    </div>
                </div>
                <button type="button" onclick="closeSupervisorAuthModal()" class="text-slate-400 hover:text-slate-600 p-1">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <form onsubmit="submitSupervisorEditApproval(event)" class="space-y-4 pt-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Approving Role</label>
                    <select id="srAuthRoleSelect" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="Head Technical">Head Technical</option>
                        <option value="MasterAdmin">MasterAdmin</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Authorization Password *</label>
                    <input type="password" id="srAuthPasswordInput" required placeholder="Enter Head or Admin password" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500">
                </div>
                <p id="srAuthErrorMsg" class="hidden text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"></p>
                <div class="pt-2 flex items-center justify-end space-x-2.5">
                    <button type="button" onclick="closeSupervisorAuthModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer">Authorize &amp; Unlock Edit</button>
                </div>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) lucide.createIcons();
}

function setServiceReportReadOnlyState(isReadOnly) {
    const sheet = document.getElementById('srPaperSheet');
    if (!sheet) return;

    sheet.classList.toggle('sr-readonly-mode', isReadOnly);

    const editableIds = [
        'srDate', 'srCompany', 'srTel', 'srContact', 'srDepartment', 'srAddress', 'srComplaints',
        'srEquipmentName', 'srModel', 'srSerial', 'srEqArea1', 'srEqArea2',
        'srFindings', 'srActionTaken', 'srServiceAmount', 'srParts', 'srPartsAmount', 'srRemarks',
        'srTechnicianName', 'srTechDate', 'srCustomerSign', 'srCustomerDate'
    ];
    editableIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.readOnly = isReadOnly;
    });

    const checkboxIds = [
        'srChkWarranty', 'srChkOutWarranty', 'srChkCheckup', 'srChkCleaning',
        'srChkContract', 'srChkOrientation', 'srChkDelivery'
    ];
    checkboxIds.forEach(id => {
        const chk = document.getElementById(id);
        if (chk) chk.disabled = isReadOnly;
    });
}

// Populate or clear form fields from a Maintenance History log object
function populateServiceReportFields(log, reportNumber) {
    const eqList = window.equipmentList || JSON.parse(localStorage.getItem('seiralab_equipment') || '[]');
    let matchedEq = null;
    if (log) {
        matchedEq = eqList.find(e =>
            (log.serial && String(e.serial).toLowerCase() === String(log.serial).toLowerCase()) ||
            (log.eqName && String(e.name).toLowerCase() === String(log.eqName).toLowerCase())
        );
    }

    const details = log?.srDetails || {};
    const todayStr = new Date().toISOString().split('T')[0];

    document.getElementById('srReportNo').value = reportNumber;
    document.getElementById('srDate').value = details.date ?? log?.date ?? todayStr;
    document.getElementById('srCompany').value = details.company ?? log?.facility ?? matchedEq?.facility ?? '';
    document.getElementById('srTel').value = details.tel ?? '';
    document.getElementById('srContact').value = details.contact ?? '';
    document.getElementById('srDepartment').value = details.department ?? matchedEq?.department ?? matchedEq?.dept ?? '';
    document.getElementById('srAddress').value = details.address ?? matchedEq?.location ?? '';
    document.getElementById('srComplaints').value = details.complaints ?? log?.type ?? '';

    document.getElementById('srChkWarranty').checked = !!details.chkWarranty;
    document.getElementById('srChkOutWarranty').checked = !!details.chkOutWarranty;
    document.getElementById('srChkCheckup').checked = !!details.chkCheckup;
    document.getElementById('srChkCleaning').checked = !!details.chkCleaning;
    document.getElementById('srChkContract').checked = !!details.chkContract;
    document.getElementById('srChkOrientation').checked = !!details.chkOrientation;
    document.getElementById('srChkDelivery').checked = !!details.chkDelivery;

    document.getElementById('srEquipmentName').value = details.equipmentName ?? log?.eqName ?? matchedEq?.name ?? '';
    document.getElementById('srModel').value = details.model ?? log?.model ?? matchedEq?.model ?? '';
    document.getElementById('srSerial').value = details.serial ?? log?.serial ?? matchedEq?.serial ?? '';
    document.getElementById('srEqArea1').value = details.eqArea1 ?? matchedEq?.location ?? log?.facility ?? '';
    document.getElementById('srEqArea2').value = details.eqArea2 ?? (matchedEq?.nextDue ? `Next PM Due: ${matchedEq.nextDue}` : '');

    document.getElementById('srFindings').value = details.findings ?? '';
    document.getElementById('srActionTaken').value = details.actionTaken ?? log?.notes ?? '';
    document.getElementById('srServiceAmount').value = details.serviceAmount ?? '';
    document.getElementById('srParts').value = details.parts ?? '';
    document.getElementById('srPartsAmount').value = details.partsAmount ?? '';
    document.getElementById('srRemarks').value = details.remarks ?? '';

    document.getElementById('srTechnicianName').value = details.technicianName ?? log?.tech ?? '';
    document.getElementById('srTechDate').value = details.techDate ?? log?.date ?? todayStr;
    document.getElementById('srCustomerSign').value = details.customerSign ?? '';
    document.getElementById('srCustomerDate').value = details.customerDate ?? log?.date ?? todayStr;
}

// MODE 1: Open Blank Form to REGISTER a Brand-New Service Report (Next Sequential Number)
function openNewServiceReportRegistration() {
    if (isVisitorMode()) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Visitors have view-only access. Please Sign In to register a Service Report.', true);
        }
        return;
    }
    ensureServiceReportModalExists();
    ensureSequentialReportNumbers();

    currentServiceReportMode = 'register';
    currentEditingLogId = null;

    const nextSeriesNo = getNextAvailableServiceReportNo();
    populateServiceReportFields(null, nextSeriesNo);
    setServiceReportReadOnlyState(false);

    document.getElementById('srModeBadge').className = 'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    document.getElementById('srModeBadge').innerText = `New Series #${nextSeriesNo}`;
    document.getElementById('srModalSubtitleText').innerText = 'Fill in the service details below and click "Register Service Report" to permanently log this number.';

    document.getElementById('srBtnSaveReport')?.classList.remove('hidden');
    document.getElementById('srBtnSaveLabel').innerText = 'Register Service Report';
    document.getElementById('srBtnUnlockEdit')?.classList.add('hidden');

    document.getElementById('seiralabServiceReportModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

// MODE 2: Open Existing Registered Service Report for VIEWING (Read-Only + Print)
function openServiceReportForViewing(logId) {
    ensureServiceReportModalExists();
    ensureSequentialReportNumbers();

    const logs = window.historyLogs || [];
    const log = logs.find(l => String(l.id) === String(logId));
    if (!log) {
        openNewServiceReportRegistration();
        return;
    }

    currentServiceReportMode = 'view';
    currentEditingLogId = log.id;

    populateServiceReportFields(log, log.reportNo || '05535');
    setServiceReportReadOnlyState(true);

    document.getElementById('srModeBadge').className = 'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40';
    document.getElementById('srModeBadge').innerText = `Viewing #${log.reportNo}`;
    document.getElementById('srModalSubtitleText').innerText = 'Read-Only Viewing Mode — Head Technical or MasterAdmin permission is required to edit.';

    document.getElementById('srBtnSaveReport')?.classList.add('hidden');
    document.getElementById('srBtnUnlockEdit')?.classList.remove('hidden');

    document.getElementById('seiralabServiceReportModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

// MODE 3: Request to EDIT an Existing Registered Service Report (Requires Head Technical or MasterAdmin)
function requestEditServiceReport(logId) {
    ensureServiceReportModalExists();
    ensureSequentialReportNumbers();

    const logs = window.historyLogs || [];
    const log = logs.find(l => String(l.id) === String(logId));
    if (!log) return;

    currentEditingLogId = log.id;

    // If current logged-in user is ALREADY Head Technical or MasterAdmin (or just authorized), unlock immediately
    if (isHeadOrAdminRole() || tempSupervisorAuthorized) {
        unlockServiceReportEditMode(log);
    } else {
        // Prompt for Head Technical or MasterAdmin password first
        const errEl = document.getElementById('srAuthErrorMsg');
        if (errEl) errEl.classList.add('hidden');
        const passInput = document.getElementById('srAuthPasswordInput');
        if (passInput) passInput.value = '';
        document.getElementById('srSupervisorAuthModal')?.classList.remove('hidden');
        setTimeout(() => passInput?.focus(), 60);
    }
}

function unlockServiceReportEditMode(log) {
    currentServiceReportMode = 'edit';
    currentEditingLogId = log.id;

    populateServiceReportFields(log, log.reportNo || '05535');
    setServiceReportReadOnlyState(false);

    document.getElementById('srModeBadge').className = 'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40';
    document.getElementById('srModeBadge').innerText = `Editing #${log.reportNo} (Authorized)`;
    document.getElementById('srModalSubtitleText').innerText = 'Authorized Edit Mode — Modify any field below and click "Save Edited Report".';

    document.getElementById('srBtnSaveReport')?.classList.remove('hidden');
    document.getElementById('srBtnSaveLabel').innerText = 'Save Edited Report';
    document.getElementById('srBtnUnlockEdit')?.classList.add('hidden');

    document.getElementById('seiralabServiceReportModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeSupervisorAuthModal() {
    document.getElementById('srSupervisorAuthModal')?.classList.add('hidden');
}

async function submitSupervisorEditApproval(event) {
    event.preventDefault();
    const selectedRole = document.getElementById('srAuthRoleSelect')?.value || 'Head Technical';
    const typedPass = (document.getElementById('srAuthPasswordInput')?.value || '').trim();
    const errEl = document.getElementById('srAuthErrorMsg');

    let isValid = false;

    // Verify using the same SHA-256 verification from login-portal.js
    if (typeof verifyClientHash === 'function') {
        isValid = await verifyClientHash(selectedRole, typedPass);
    } else {
        const expected = selectedRole === 'MasterAdmin' ? atob('c2VpcmFsYWJhZG1pbg==') : atob('c2VpcmFsYWJoZWFk');
        isValid = (typedPass === expected);
    }

    if (!isValid) {
        if (errEl) {
            errEl.innerText = `Invalid ${selectedRole} password. Edit permission denied.`;
            errEl.classList.remove('hidden');
        }
        return;
    }

    tempSupervisorAuthorized = true;
    closeSupervisorAuthModal();

    const log = (window.historyLogs || []).find(l => String(l.id) === String(currentEditingLogId));
    if (log) {
        unlockServiceReportEditMode(log);
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Authorized by ${selectedRole}. Report #${log.reportNo} unlocked for editing.`);
        }
    }
}

// Save either a newly registered Service Report OR an authorized edit
async function saveRegisteredServiceReport() {
    if (currentServiceReportMode === 'view') return;
    if (currentServiceReportMode === 'edit' && !isHeadOrAdminRole() && !tempSupervisorAuthorized) {
        requestEditServiceReport(currentEditingLogId);
        return;
    }

    ensureSequentialReportNumbers();

    const reportNoInput = document.getElementById('srReportNo')?.value.trim() || getNextAvailableServiceReportNo();
    const srDetails = {
        date: document.getElementById('srDate')?.value.trim() || new Date().toISOString().split('T')[0],
        company: document.getElementById('srCompany')?.value.trim() || '',
        tel: document.getElementById('srTel')?.value.trim() || '',
        contact: document.getElementById('srContact')?.value.trim() || '',
        department: document.getElementById('srDepartment')?.value.trim() || '',
        address: document.getElementById('srAddress')?.value.trim() || '',
        complaints: document.getElementById('srComplaints')?.value.trim() || '',
        chkWarranty: !!document.getElementById('srChkWarranty')?.checked,
        chkOutWarranty: !!document.getElementById('srChkOutWarranty')?.checked,
        chkCheckup: !!document.getElementById('srChkCheckup')?.checked,
        chkCleaning: !!document.getElementById('srChkCleaning')?.checked,
        chkContract: !!document.getElementById('srChkContract')?.checked,
        chkOrientation: !!document.getElementById('srChkOrientation')?.checked,
        chkDelivery: !!document.getElementById('srChkDelivery')?.checked,
        equipmentName: document.getElementById('srEquipmentName')?.value.trim() || '',
        model: document.getElementById('srModel')?.value.trim() || '',
        serial: document.getElementById('srSerial')?.value.trim() || '',
        eqArea1: document.getElementById('srEqArea1')?.value.trim() || '',
        eqArea2: document.getElementById('srEqArea2')?.value.trim() || '',
        findings: document.getElementById('srFindings')?.value.trim() || '',
        actionTaken: document.getElementById('srActionTaken')?.value.trim() || '',
        serviceAmount: document.getElementById('srServiceAmount')?.value.trim() || '',
        parts: document.getElementById('srParts')?.value.trim() || '',
        partsAmount: document.getElementById('srPartsAmount')?.value.trim() || '',
        remarks: document.getElementById('srRemarks')?.value.trim() || '',
        technicianName: document.getElementById('srTechnicianName')?.value.trim() || '',
        techDate: document.getElementById('srTechDate')?.value.trim() || '',
        customerSign: document.getElementById('srCustomerSign')?.value.trim() || '',
        customerDate: document.getElementById('srCustomerDate')?.value.trim() || ''
    };

    if (!srDetails.equipmentName && !srDetails.company) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Please enter at least the Company/Hospital Name or Equipment Name.', true);
        }
        return;
    }

    // Build Activity Type label from checked boxes or complaints
    const checkedLabels = [];
    if (srDetails.chkWarranty) checkedLabels.push('Warranty');
    if (srDetails.chkOutWarranty) checkedLabels.push('Out of Warranty');
    if (srDetails.chkCheckup) checkedLabels.push('Check-up');
    if (srDetails.chkCleaning) checkedLabels.push('Cleaning/Repair');
    if (srDetails.chkContract) checkedLabels.push('Under Contract');
    if (srDetails.chkOrientation) checkedLabels.push('Orientation');
    if (srDetails.chkDelivery) checkedLabels.push('Delivery');

    const activityType = srDetails.complaints || (checkedLabels.length > 0 ? checkedLabels.join(', ') : 'Service & Maintenance Report');
    const combinedNotes = [srDetails.findings, srDetails.actionTaken, srDetails.remarks].filter(Boolean).join(' — ') || 'Service report registered.';
    const displayEqName = srDetails.model && !srDetails.equipmentName.includes(srDetails.model)
        ? `${srDetails.equipmentName} (${srDetails.model})`
        : (srDetails.equipmentName || 'Medical Equipment');

    let commitMessage = '';

    if (currentServiceReportMode === 'register') {
        // Strictly guarantee no duplicate report number on registration
        const finalReportNo = (window.historyLogs || []).some(l => String(l.reportNo) === String(reportNoInput))
            ? getNextAvailableServiceReportNo()
            : reportNoInput;

        const newLog = {
            id: Date.now(),
            reportNo: finalReportNo,
            date: srDetails.date,
            eqName: displayEqName,
            model: srDetails.model,
            serial: srDetails.serial,
            facility: srDetails.company || 'Client Facility',
            type: activityType,
            tech: srDetails.technicianName || (window.currentAccessRole || 'Biomedical Engineer'),
            notes: combinedNotes,
            srDetails: srDetails
        };

        window.historyLogs.unshift(newLog);
        commitMessage = `Register Service Report #${finalReportNo} (${displayEqName})`;
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Registered Service Report #${finalReportNo}!`);
        }
    } else if (currentServiceReportMode === 'edit') {
        const idx = (window.historyLogs || []).findIndex(l => String(l.id) === String(currentEditingLogId));
        if (idx !== -1) {
            const preservedReportNo = window.historyLogs[idx].reportNo || reportNoInput;
            window.historyLogs[idx] = {
                ...window.historyLogs[idx],
                reportNo: preservedReportNo,
                date: srDetails.date,
                eqName: displayEqName,
                model: srDetails.model,
                serial: srDetails.serial,
                facility: srDetails.company || window.historyLogs[idx].facility,
                type: activityType,
                tech: srDetails.technicianName || window.historyLogs[idx].tech,
                notes: combinedNotes,
                srDetails: srDetails
            };
            commitMessage = `Edit Service Report #${preservedReportNo} (${displayEqName})`;
            if (typeof showNotificationToast === 'function') {
                showNotificationToast(`Saved changes to Service Report #${preservedReportNo}!`);
            }
        }
    }

    tempSupervisorAuthorized = false;

    // Sync to localStorage & app.js variable
    localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
    try {
        if (typeof historyLogs !== 'undefined') historyLogs = window.historyLogs;
    } catch (_) {}

    closeServiceReportModal();
    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    upgradeMaintenanceHistoryCertificateButtons();

    if (typeof pushToGitHub === 'function' && commitMessage) {
        await pushToGitHub(commitMessage);
    }
}

function closeServiceReportModal() {
    tempSupervisorAuthorized = false;
    document.getElementById('seiralabServiceReportModal')?.classList.add('hidden');
}

// Upgrade the Maintenance History & Audit Logs table with Series Badge + [Edit] and [Viewing] buttons
function upgradeMaintenanceHistoryCertificateButtons() {
    ensureServiceReportModalExists();
    ensureSequentialReportNumbers();

    // 1. Ensure top "Service Report Form" button opens New Registration with next sequential number
    const historySection = document.getElementById('history');
    if (historySection) {
        const headerContainer = historySection.querySelector('div:first-child');
        if (headerContainer) {
            let blankBtn = document.getElementById('btnOpenBlankServiceReport');
            if (!blankBtn) {
                let btnGroup = headerContainer.querySelector('div:nth-child(2)') || headerContainer;
                blankBtn = document.createElement('button');
                blankBtn.type = 'button';
                blankBtn.id = 'btnOpenBlankServiceReport';
                blankBtn.className = 'inline-flex items-center justify-center px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap cursor-pointer mr-2';
                btnGroup.insertBefore(blankBtn, btnGroup.firstChild);
            }
            blankBtn.onclick = () => openNewServiceReportRegistration();
            blankBtn.innerHTML = `
                <i data-lucide="file-plus-2" class="w-4 h-4"></i>
                <span>Service Report Form</span>
            `;
        }
    }

    window.downloadCertificate = function (logId) {
        openServiceReportForViewing(logId);
    };

    // 2. Upgrade every row in #historyTableBody to show Report Series # + [Edit] + [Service Report (View)]
    const historyTbody = document.getElementById('historyTableBody');
    if (historyTbody) {
        const rows = historyTbody.querySelectorAll('tr');
        rows.forEach((tr, idx) => {
            const actionCell = tr.querySelector('td:last-child');
            const origBtn = actionCell?.querySelector('button');
            if (!actionCell || !origBtn) return;

            // Extract logId from original onclick="downloadCertificate(123)" or match by index
            const onclickAttr = origBtn.getAttribute('onclick') || '';
            const idMatch = onclickAttr.match(/\(([^)]+)\)/);
            const rawLogId = idMatch ? idMatch[1].replace(/['"]/g, '') : (window.historyLogs?.[idx]?.id || '');
            const matchedLog = (window.historyLogs || []).find(l => String(l.id) === String(rawLogId)) || window.historyLogs?.[idx];
            if (!matchedLog) return;

            const safeId = String(matchedLog.id).replace(/'/g, "\\'");
            const seriesNo = matchedLog.reportNo || '05535';

            // Display Series Badge under Service Date in Column 1 if not already added
            const dateCell = tr.querySelector('td:first-child');
            if (dateCell && !dateCell.querySelector('.sr-series-pill')) {
                dateCell.insertAdjacentHTML(
                    'beforeend',
                    `<div class="sr-series-pill mt-1 inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 font-mono text-[11px] font-bold rounded">SR #${seriesNo}</div>`
                );
            }

            // Replace single button with [Edit] (Protected) + [Service Report] (Viewing)
            actionCell.innerHTML = `
                <div class="inline-flex items-center justify-end space-x-1.5">
                    <button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 transition-colors cursor-pointer" title="Edit Service Report (Requires Head Technical or MasterAdmin)">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        <span>Edit</span>
                    </button>
                    <button type="button" onclick="openServiceReportForViewing('${safeId}')" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer" title="View & Print Service Report #${seriesNo}">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                        <span>Service Report</span>
                    </button>
                </div>
            `;
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

window.openServiceReportTemplate = openServiceReportForViewing;
window.openNewServiceReportRegistration = openNewServiceReportRegistration;
window.openServiceReportForViewing = openServiceReportForViewing;
window.requestEditServiceReport = requestEditServiceReport;
window.saveRegisteredServiceReport = saveRegisteredServiceReport;
window.submitSupervisorEditApproval = submitSupervisorEditApproval;
window.closeSupervisorAuthModal = closeSupervisorAuthModal;
window.closeServiceReportModal = closeServiceReportModal;

window.addEventListener('DOMContentLoaded', function () {
    setTimeout(upgradeMaintenanceHistoryCertificateButtons, 250);
});
setTimeout(upgradeMaintenanceHistoryCertificateButtons, 400);
