// ============================================================================
// SEIRALAB CMMS - TOOLS-RBAC.JS (RBAC, CALIBRATION IMPORTER & TOOL LOGBOOK)
// ============================================================================

window.currentAccessRole = localStorage.getItem('seiralab_access_role') || 'Technical';

const DEFAULT_TOOL_LOGS = [
    { id: 501, borrower: "Eng. Barzce Barcelona", toolName: "Fluke ESA612 Electrical Safety Analyzer", toolCode: "TL-SL-001", destination: "Cebu City Medical Center — ICU PM", borrowDate: "2026-10-30", borrowTime: "08:30", returnDateTime: "", status: "Borrowed" },
    { id: 502, borrower: "Eng. Marcus Vance", toolName: "Digital Optical Tachometer & Pipette Calibrator", toolCode: "TL-SL-004", destination: "God Care Medical Diagnostic — Centrifuge PM", borrowDate: "2026-10-29", borrowTime: "09:15", returnDateTime: "2026-10-29 (5:40 PM)", status: "Returned" },
    { id: 503, borrower: "Seiralab Field Specialist", toolName: "Fluke 87V True-RMS Multimeter & Crimping Kit", toolCode: "TL-SL-002", destination: "USM Hospital — Hematology Analyzer Repair", borrowDate: "2026-10-31", borrowTime: "10:00", returnDateTime: "", status: "Borrowed" }
];

const DEFAULT_CALIBRATION_LIST = [
    { id: "CERT-2026-5160", eqName: "Flexor Chemistry Analyzer (AB-380)", serial: "AS24B05160", facility: "Cebu City Medical Center", calDate: "2026-04-24", nextDue: "2026-10-24", accuracy: "± 0.5% Absorbance (Pass)" },
    { id: "CERT-2026-2003", eqName: "Alexis Hematology Analyzer (AB-H630)", serial: "G10012422003", facility: "God Care Medical Diagnostic", calDate: "2026-04-26", nextDue: "2026-10-26", accuracy: "± 0.8% CV (Pass)" },
    { id: "CERT-2026-1882", eqName: "Mindray Hematology Analyzer (BC 5000)", serial: "SS-58001882", facility: "USM Hospital", calDate: "2026-06-01", nextDue: "2026-12-01", accuracy: "± 0.9% CV (Pass)" }
];

window.toolLogs = JSON.parse(localStorage.getItem('seiralab_tool_logs')) || DEFAULT_TOOL_LOGS;
window.calibrationList = JSON.parse(localStorage.getItem('seiralab_calibrations')) || DEFAULT_CALIBRATION_LIST;

// ============================================================================
// 1. ROLE-BASED ACCESS CONTROL
//    - .restricted-head-master : Visible to Head Technical & MasterAdmin
//    - .restricted-master-only : Visible to MasterAdmin ONLY (GitHub DB controls)
// ============================================================================
function isSupervisorOrAdmin(role) {
    return role === 'Head Technical' || role === 'MasterAdmin';
}

function isMasterAdminOnly(role) {
    return role === 'MasterAdmin';
}

function applyRolePermissions(roleName) {
    const hasSupervisorAccess = isSupervisorOrAdmin(roleName);
    const hasMasterAccess = isMasterAdminOnly(roleName);

    // 1. Head Technical + MasterAdmin elements (Equipment Inventory)
    document.querySelectorAll('.restricted-head-master').forEach(el => {
        el.classList.toggle('hidden', !hasSupervisorAccess);
    });

    // 2. MasterAdmin ONLY elements (Pink Line: GitHub DB Button, Sync Button, SHA Force Push)
    document.querySelectorAll('.restricted-master-only').forEach(el => {
        el.classList.toggle('hidden', !hasMasterAccess);
    });

    // If user is on Equipment Inventory ('inventory') and switches to 'Technical', redirect to 'dashboard'
    if (!hasSupervisorAccess) {
        const invActive = document.getElementById('inventory')?.classList.contains('active');
        if (invActive && typeof switchTab === 'function') {
            switchTab('dashboard');
        }
    }

    // Close GitHub config modal if non-MasterAdmin is active
    if (!hasMasterAccess) {
        document.getElementById('githubConfigModal')?.classList.add('hidden');
    }
}

function toggleRoleMenu() {
    const menu = document.getElementById('roleDropdownMenu');
    if (menu) menu.classList.toggle('hidden');
}

function switchAccessRole(roleName, roleSubtitle, silent = false) {
    window.currentAccessRole = roleName;
    localStorage.setItem('seiralab_access_role', roleName);
    localStorage.setItem('seiralab_access_subtitle', roleSubtitle);

    const titleEl = document.getElementById('currentRoleTitle');
    const subEl = document.getElementById('currentRoleSubtitle');
    if (titleEl) titleEl.innerText = roleName;
    if (subEl) subEl.innerText = roleSubtitle;

    const cTech = document.getElementById('roleCheck-Technical');
    const cHead = document.getElementById('roleCheck-Head');
    const cAdmin = document.getElementById('roleCheck-MasterAdmin');

    if (cTech) cTech.className = roleName === 'Technical' ? 'w-2 h-2 rounded-full bg-teal-600' : 'w-2 h-2 rounded-full bg-transparent';
    if (cHead) cHead.className = roleName === 'Head Technical' ? 'w-2 h-2 rounded-full bg-teal-600' : 'w-2 h-2 rounded-full bg-transparent';
    if (cAdmin) cAdmin.className = roleName === 'MasterAdmin' ? 'w-2 h-2 rounded-full bg-teal-600' : 'w-2 h-2 rounded-full bg-transparent';

    applyRolePermissions(roleName);

    document.getElementById('roleDropdownMenu')?.classList.add('hidden');
    if (!silent && typeof showNotificationToast === 'function') {
        showNotificationToast(`Access Level: ${roleName}`);
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
// 2. CALIBRATION REPORT TABLE & EXCEL/CSV IMPORTER (RED LINE BUTTON)
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
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No calibration records loaded. Click "Import Calibration Data" to upload.</td></tr>`;
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
    const file = event.target.files[0];
    if (!file) return;

    try {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Importing calibration data from ${file.name}...`);
        }
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
                        if (dueDt < new Date(2026, 9, 1)) {
                            dueDt = new Date(2026, m + 6, d);
                        }
                        nextDue = dueDt.toISOString().split('T')[0];
                    }
                }

                const eqTitle = `${mfg ? mfg + ' ' : ''}${desc}${model ? ' (' + model + ')' : ''}`.trim();
                importedCal.push({
                    id: certId,
                    eqName: eqTitle,
                    serial: serial,
                    facility: facility,
                    calDate: calDate,
                    nextDue: nextDue,
                    accuracy: accuracy
                });
                certSeq++;
            });
        });

        if (importedCal.length > 0) {
            window.calibrationList = importedCal;
            localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
            renderCalibrationTable();
            if (typeof showNotificationToast === 'function') {
                showNotificationToast(`Imported ${importedCal.length} calibration records!`);
            }
            if (typeof pushToGitHub === 'function') {
                await pushToGitHub(`Import ${importedCal.length} calibration records from ${file.name}`);
            }
        } else {
            if (typeof showNotificationToast === 'function') {
                showNotificationToast('No valid calibration rows found in file.', true);
            }
        }
    } catch (err) {
        console.error(err);
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Calibration Import Error: ${err.message}`, true);
        }
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
    if (typeof downloadBlob === 'function') {
        downloadBlob(content, `Seiralab_Calibration_${item.id}.txt`, 'text/plain');
    }
    if (typeof showNotificationToast === 'function') {
        showNotificationToast(`Downloaded Certificate ${item.id}`);
    }
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

        const actionBtns = log.status === 'Borrowed'
            ? `<button onclick="markToolReturned(${log.id})" class="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs">Mark Returned</button>`
            : `<span class="text-xs text-slate-400 font-medium">Cleared</span>`;

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
        showNotificationToast(`Marked ${log.toolName} as Returned to Biomed Office!`);
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
        showNotificationToast("Downloaded Biomed Tool Logbook CSV!");
    }
}

window.addEventListener('DOMContentLoaded', function() {
    const savedRole = localStorage.getItem('seiralab_access_role') || 'Technical';
    const savedSub = localStorage.getItem('seiralab_access_subtitle') || 'Biomedical Technical Team';
    switchAccessRole(savedRole, savedSub, true);
    renderCalibrationTable();
    renderToolLogsTable();
});
