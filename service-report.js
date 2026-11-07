// ============================================================================
// SEIRALAB CMMS - SERVICE-REPORT.JS
// 6. OFFICIAL SEIRALAB SERVICE REPORT SERIES ENGINE (05535+)
// - Technical: Send Edit Request -> Head/Admin Accept or Decline
// - Head Technical & MasterAdmin: Direct Edit + Accept/Decline + Delete Button
// ============================================================================

let currentServiceReportMode = 'register'; // 'register' | 'view' | 'edit'
let currentEditingLogId = null;

function isHeadOrAdminRole() {
    const role = window.currentAccessRole || sessionStorage.getItem('seiralab_active_session_role') || 'Visitor';
    return role === 'Head Technical' || role === 'MasterAdmin';
}

function ensureSequentialReportNumbers() {
    if (!Array.isArray(window.historyLogs)) {
        window.historyLogs = JSON.parse(localStorage.getItem('seiralab_history') || '[]');
    }

    const usedNumbers = new Set();
    let maxNum = 5534;

    window.historyLogs.forEach(log => {
        if (log.reportNo && /^\d+$/.test(String(log.reportNo).trim())) {
            const num = parseInt(String(log.reportNo).trim(), 10);
            if (!usedNumbers.has(num)) {
                usedNumbers.add(num);
                if (num > maxNum) maxNum = num;
            } else {
                log.reportNo = '';
            }
        }
    });

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
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    <span id="srBtnUnlockEditLabel">Request Edit</span>
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

    <!-- Technical Edit Request Modal -->
    <div id="srEditRequestModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[130] hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center space-x-2.5">
                    <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                        <i data-lucide="send" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-slate-900">Request Permission to Edit</h4>
                        <p id="srEditRequestTargetLabel" class="text-[11px] text-slate-500">Send an edit request to Head Technical or MasterAdmin</p>
                    </div>
                </div>
                <button type="button" onclick="closeEditRequestModal()" class="text-slate-400 hover:text-slate-600 p-1">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <form onsubmit="submitTechnicalEditRequest(event)" class="space-y-4 pt-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Request To Approving Role</label>
                    <select id="srReqTargetRole" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="Head Technical & MasterAdmin">Head Technical / MasterAdmin</option>
                        <option value="Head Technical">Head Technical</option>
                        <option value="MasterAdmin">MasterAdmin</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Requested By (Engineer Name) *</label>
                    <input type="text" id="srReqEngineerName" required placeholder="e.g., Eng. Barzce Barcelona" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Reason for Editing Service Report *</label>
                    <textarea id="srReqReasonInput" rows="3" required placeholder="State what needs to be updated (e.g., update replaced part serial number or findings)..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"></textarea>
                </div>
                <div class="pt-2 flex items-center justify-end space-x-2.5">
                    <button type="button" onclick="closeEditRequestModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center space-x-1.5 cursor-pointer">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        <span>Send Edit Request</span>
                    </button>
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

function openNewServiceReportRegistration() {
    if (typeof isVisitorMode === 'function' && isVisitorMode()) {
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
    document.getElementById('srModalSubtitleText').innerText = 'Read-Only Viewing Mode — Click Edit if changes are needed.';

    document.getElementById('srBtnSaveReport')?.classList.add('hidden');

    const unlockBtn = document.getElementById('srBtnUnlockEdit');
    const unlockLabel = document.getElementById('srBtnUnlockEditLabel');
    const isVis = typeof isVisitorMode === 'function' ? isVisitorMode() : false;
    if (unlockBtn && !isVis) {
        unlockBtn.classList.remove('hidden');
        if (unlockLabel) {
            if (isHeadOrAdminRole() || log.editRequestStatus === 'approved') {
                unlockLabel.innerText = 'Edit Report';
            } else if (log.editRequestStatus === 'pending') {
                unlockLabel.innerText = 'Edit Request Pending';
            } else {
                unlockLabel.innerText = 'Request Edit';
            }
        }
    } else if (unlockBtn) {
        unlockBtn.classList.add('hidden');
    }

    document.getElementById('seiralabServiceReportModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function requestEditServiceReport(logId) {
    if (typeof isVisitorMode === 'function' && isVisitorMode()) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Visitors have view-only access.', true);
        }
        return;
    }

    ensureServiceReportModalExists();
    ensureSequentialReportNumbers();

    const logs = window.historyLogs || [];
    const log = logs.find(l => String(l.id) === String(logId));
    if (!log) return;

    currentEditingLogId = log.id;

    if (isHeadOrAdminRole() || log.editRequestStatus === 'approved') {
        unlockServiceReportEditMode(log);
        return;
    }

    if (log.editRequestStatus === 'pending') {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Edit request for SR #${log.reportNo} is already pending approval from Head Technical / MasterAdmin.`);
        }
        return;
    }

    const targetLabel = document.getElementById('srEditRequestTargetLabel');
    if (targetLabel) {
        targetLabel.innerText = `Service Report #${log.reportNo} — ${log.eqName} (${log.facility})`;
    }
    const engInput = document.getElementById('srReqEngineerName');
    if (engInput && !engInput.value) {
        engInput.value = log.tech || '';
    }
    const reasonInput = document.getElementById('srReqReasonInput');
    if (reasonInput) reasonInput.value = '';

    document.getElementById('srEditRequestModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
    setTimeout(() => reasonInput?.focus(), 60);
}

function closeEditRequestModal() {
    document.getElementById('srEditRequestModal')?.classList.add('hidden');
}

async function submitTechnicalEditRequest(event) {
    event.preventDefault();
    const log = (window.historyLogs || []).find(l => String(l.id) === String(currentEditingLogId));
    if (!log) return;

    const targetRole = document.getElementById('srReqTargetRole')?.value || 'Head Technical / MasterAdmin';
    const requester = (document.getElementById('srReqEngineerName')?.value || 'Technical Engineer').trim();
    const reason = (document.getElementById('srReqReasonInput')?.value || '').trim();

    log.editRequestStatus = 'pending';
    log.editRequestedBy = requester;
    log.editRequestTarget = targetRole;
    log.editRequestReason = reason;
    log.editRequestedAt = new Date().toISOString().split('T')[0];

    localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
    try {
        if (typeof historyLogs !== 'undefined') historyLogs = window.historyLogs;
    } catch (_) {}

    closeEditRequestModal();
    closeServiceReportModal();

    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    upgradeMaintenanceHistoryCertificateButtons();
    if (typeof buildSystemNotifications === 'function') buildSystemNotifications();

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(`Edit request for SR #${log.reportNo} sent to ${targetRole}!`);
    }

    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`Edit Request for SR #${log.reportNo} by ${requester}`);
    }
}

async function resolveServiceReportEditRequest(logId, decision) {
    if (!isHeadOrAdminRole()) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Only Head Technical or MasterAdmin can approve or decline edit requests.', true);
        }
        return;
    }

    const log = (window.historyLogs || []).find(l => String(l.id) === String(logId));
    if (!log) return;

    const approverRole = window.currentAccessRole || 'Supervisor';

    if (decision === 'accept') {
        log.editRequestStatus = 'approved';
        log.editApprovedBy = approverRole;
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Accepted edit request for SR #${log.reportNo}! Technical can now edit this report.`);
        }
    } else {
        log.editRequestStatus = 'declined';
        log.editApprovedBy = approverRole;
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Declined edit request for SR #${log.reportNo}.`);
        }
    }

    localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
    try {
        if (typeof historyLogs !== 'undefined') historyLogs = window.historyLogs;
    } catch (_) {}

    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    upgradeMaintenanceHistoryCertificateButtons();
    if (typeof buildSystemNotifications === 'function') buildSystemNotifications();

    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`${decision === 'accept' ? 'Approved' : 'Declined'} Edit Request for SR #${log.reportNo} by ${approverRole}`);
    }
}

async function deleteServiceReportLog(logId) {
    if (!isHeadOrAdminRole()) {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Only Head Technical and MasterAdmin can delete Service Reports.', true);
        }
        return;
    }

    const logs = window.historyLogs || [];
    const target = logs.find(l => String(l.id) === String(logId));
    if (!target) return;

    if (!confirm(`Delete Service Report #${target.reportNo || ''} for "${target.eqName}" (${target.facility})? This cannot be undone.`)) {
        return;
    }

    window.historyLogs = logs.filter(l => String(l.id) !== String(logId));
    localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
    try {
        if (typeof historyLogs !== 'undefined') historyLogs = window.historyLogs;
    } catch (_) {}

    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    upgradeMaintenanceHistoryCertificateButtons();
    if (typeof buildSystemNotifications === 'function') buildSystemNotifications();

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(`Deleted Service Report #${target.reportNo || target.id}.`);
    }

    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`Delete Service Report #${target.reportNo || target.id} (${target.eqName})`);
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

async function saveRegisteredServiceReport() {
    if (currentServiceReportMode === 'view') return;

    const editingLog = (window.historyLogs || []).find(l => String(l.id) === String(currentEditingLogId));
    if (currentServiceReportMode === 'edit' && !isHeadOrAdminRole() && editingLog?.editRequestStatus !== 'approved') {
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
            srDetails: srDetails,
            editRequestStatus: 'none'
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
                srDetails: srDetails,
                editRequestStatus: 'none',
                editRequestReason: ''
            };
            commitMessage = `Save Edited Service Report #${preservedReportNo} (${displayEqName})`;
            if (typeof showNotificationToast === 'function') {
                showNotificationToast(`Saved changes to Service Report #${preservedReportNo}!`);
            }
        }
    }

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
    document.getElementById('seiralabServiceReportModal')?.classList.add('hidden');
}

function renderPendingEditRequestsBanner() {
    const historySection = document.getElementById('history');
    if (!historySection) return;

    let banner = document.getElementById('srPendingApprovalsBanner');
    const pendingLogs = (window.historyLogs || []).filter(l => l.editRequestStatus === 'pending');

    if (pendingLogs.length === 0) {
        if (banner) banner.remove();
        return;
    }

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'srPendingApprovalsBanner';
        const firstChild = historySection.querySelector('div:first-child');
        if (firstChild && firstChild.nextSibling) {
            historySection.insertBefore(banner, firstChild.nextSibling);
        } else {
            historySection.prepend(banner);
        }
    }

    const canApprove = isHeadOrAdminRole();

    let itemsHTML = '';
    pendingLogs.forEach(log => {
        const safeId = String(log.id).replace(/'/g, "\\'");
        const actionControls = canApprove
            ? `<div class="flex items-center space-x-2 shrink-0">
                    <button type="button" onclick="resolveServiceReportEditRequest('${safeId}', 'accept')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs inline-flex items-center space-x-1 cursor-pointer transition-colors">
                        <i data-lucide="check" class="w-3.5 h-3.5"></i>
                        <span>Accept</span>
                    </button>
                    <button type="button" onclick="resolveServiceReportEditRequest('${safeId}', 'decline')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs inline-flex items-center space-x-1 cursor-pointer transition-colors">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                        <span>Decline</span>
                    </button>
               </div>`
            : `<span class="px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-full text-[11px] font-bold shrink-0">Awaiting Head / Admin Approval</span>`;

        itemsHTML += `
            <div class="bg-white/90 border border-amber-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono text-xs font-bold rounded">SR #${log.reportNo || '05535'}</span>
                        <span class="text-xs font-bold text-slate-900">${log.eqName} — ${log.facility}</span>
                    </div>
                    <p class="text-xs text-slate-600 mt-1">
                        <span class="font-semibold text-slate-800">Requested by ${log.editRequestedBy || 'Technical'}:</span>
                        "${log.editRequestReason || 'Requesting permission to update service report details.'}"
                    </p>
                </div>
                ${actionControls}
            </div>
        `;
    });

    banner.className = 'mb-4 bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xs space-y-2.5';
    banner.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <i data-lucide="bell-ring" class="w-4 h-4 text-amber-600"></i>
                <span>Pending Service Report Edit Requests (${pendingLogs.length})</span>
            </div>
            <span class="text-[11px] text-amber-700 font-medium">${canApprove ? 'Review and Accept or Decline below' : 'Head Technical or MasterAdmin can approve'}</span>
        </div>
        <div class="space-y-2">${itemsHTML}</div>
    `;
}

function upgradeMaintenanceHistoryCertificateButtons() {
    ensureServiceReportModalExists();
    ensureSequentialReportNumbers();
    renderPendingEditRequestsBanner();

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

    const isSupervisor = isHeadOrAdminRole();
    const isVis = typeof isVisitorMode === 'function' ? isVisitorMode() : false;

    const historyTbody = document.getElementById('historyTableBody');
    if (historyTbody) {
        const rows = historyTbody.querySelectorAll('tr');
        rows.forEach((tr, idx) => {
            const actionCell = tr.querySelector('td:last-child');
            if (!actionCell) return;

            const origBtn = actionCell.querySelector('button');
            const onclickAttr = origBtn ? (origBtn.getAttribute('onclick') || '') : '';
            const idMatch = onclickAttr.match(/\(([^)]+)\)/);
            const rawLogId = idMatch ? idMatch[1].replace(/['"]/g, '').split(',')[0].trim() : (window.historyLogs?.[idx]?.id || '');
            const matchedLog = (window.historyLogs || []).find(l => String(l.id) === String(rawLogId)) || window.historyLogs?.[idx];
            if (!matchedLog) return;

            const safeId = String(matchedLog.id).replace(/'/g, "\\'");
            const seriesNo = matchedLog.reportNo || '05535';
            const reqStatus = matchedLog.editRequestStatus || 'none';

            const dateCell = tr.querySelector('td:first-child');
            if (dateCell) {
                dateCell.querySelectorAll('.sr-series-pill').forEach(el => el.remove());
                let statusPill = '';
                if (reqStatus === 'pending') {
                    statusPill = `<span class="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded">Pending Edit</span>`;
                } else if (reqStatus === 'approved') {
                    statusPill = `<span class="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold rounded">Edit Approved</span>`;
                } else if (reqStatus === 'declined') {
                    statusPill = `<span class="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold rounded">Declined</span>`;
                }

                dateCell.insertAdjacentHTML(
                    'beforeend',
                    `<div class="sr-series-pill mt-1 flex flex-wrap items-center gap-1">
                        <span class="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 font-mono text-[11px] font-bold rounded">SR #${seriesNo}</span>
                        ${statusPill}
                     </div>`
                );
            }

            let editButtonsHTML = '';
            if (!isVis) {
                if (isSupervisor) {
                    if (reqStatus === 'pending') {
                        editButtonsHTML = `
                            <button type="button" onclick="resolveServiceReportEditRequest('${safeId}', 'accept')" class="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs inline-flex items-center space-x-1 transition-colors cursor-pointer" title="Accept Edit Request">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                                <span>Accept</span>
                            </button>
                            <button type="button" onclick="resolveServiceReportEditRequest('${safeId}', 'decline')" class="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 transition-colors cursor-pointer" title="Decline Edit Request">
                                <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                <span>Decline</span>
                            </button>
                        `;
                    }
                    editButtonsHTML += `
                        <button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 transition-colors cursor-pointer" title="Edit Service Report #${seriesNo}">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            <span>Edit</span>
                        </button>
                    `;
                } else {
                    if (reqStatus === 'pending') {
                        editButtonsHTML = `
                            <button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer" title="Waiting for Head Technical or MasterAdmin approval">
                                <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                <span>Requested</span>
                            </button>
                        `;
                    } else if (reqStatus === 'approved') {
                        editButtonsHTML = `
                            <button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs inline-flex items-center space-x-1 shadow-xs cursor-pointer" title="Approved! Click to Edit Service Report">
                                <i data-lucide="unlock" class="w-3.5 h-3.5"></i>
                                <span>Edit (Approved)</span>
                            </button>
                        `;
                    } else {
                        editButtonsHTML = `
                            <button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 transition-colors cursor-pointer" title="Send Edit Request to Head Technical / MasterAdmin">
                                <i data-lucide="send" class="w-3.5 h-3.5"></i>
                                <span>Request Edit</span>
                            </button>
                        `;
                    }
                }
            }

            const deleteBtnHTML = isSupervisor ? `
                <button type="button" onclick="deleteServiceReportLog('${safeId}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer" title="Delete Service Report (Head / Admin Only)">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            ` : '';

            actionCell.innerHTML = `
                <div class="inline-flex items-center justify-end space-x-1.5">
                    ${editButtonsHTML}
                    <button type="button" onclick="openServiceReportForViewing('${safeId}')" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer" title="View & Print Service Report #${seriesNo}">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                        <span>Service Report</span>
                    </button>
                    ${deleteBtnHTML}
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

const origSwitchAccessRole = window.switchAccessRole;
if (typeof origSwitchAccessRole === 'function') {
    window.switchAccessRole = function () {
        origSwitchAccessRole.apply(this, arguments);
        upgradeMaintenanceHistoryCertificateButtons();
    };
}

window.openServiceReportTemplate = openServiceReportForViewing;
window.openNewServiceReportRegistration = openNewServiceReportRegistration;
window.openServiceReportForViewing = openServiceReportForViewing;
window.requestEditServiceReport = requestEditServiceReport;
window.closeEditRequestModal = closeEditRequestModal;
window.submitTechnicalEditRequest = submitTechnicalEditRequest;
window.resolveServiceReportEditRequest = resolveServiceReportEditRequest;
window.deleteServiceReportLog = deleteServiceReportLog;
window.saveRegisteredServiceReport = saveRegisteredServiceReport;
window.closeServiceReportModal = closeServiceReportModal;
window.upgradeMaintenanceHistoryCertificateButtons = upgradeMaintenanceHistoryCertificateButtons;

setTimeout(upgradeMaintenanceHistoryCertificateButtons, 250);
