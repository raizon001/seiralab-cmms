// ============================================================================
// SEIRALAB CMMS - COMPLETE FEATURES.JS (ALL-IN-ONE SYNTAX-VERIFIED EDITION)
// ============================================================================

(function () {
    // 0. IMMEDIATE SAFE ID BRIDGE (Prevents app.js renderDashboard() from crashing on null innerText)
    function ensureLegacyIdsNeverNull() {
        if (!document.body) return;
        const requiredIds = [
            'statTotal', 'statTotalAssets', 'statOperational', 'statDue', 'statDueSoon',
            'statOverdue', 'statCritical', 'statComplianceRate', 'statCalTotal', 'statCalDue',
            'statToolsTotal', 'statToolsOut', 'statToolsReturned', 'urgentTableBody', 'recentActivityFeed'
        ];
        let holder = document.getElementById('seiralabSafeIdHolder');
        if (!holder) {
            holder = document.createElement('div');
            holder.id = 'seiralabSafeIdHolder';
            holder.className = 'hidden';
            document.body.appendChild(holder);
        }
        requiredIds.forEach(id => {
            if (!document.getElementById(id)) {
                const el = document.createElement('span');
                el.id = id;
                holder.appendChild(el);
            }
        });
    }
    ensureLegacyIdsNeverNull();

    const DEFAULT_TOOL_LOGS = [
        { id: 501, borrower: "Eng. Barzce Barcelona", toolName: "Fluke ESA612 Electrical Safety Analyzer", toolCode: "TL-SL-001", destination: "Cebu City Medical Center — ICU PM", borrowDate: "2026-10-30", borrowTime: "08:30", returnDateTime: "", status: "Borrowed" },
        { id: 502, borrower: "Eng. Kyle the GREAT", toolName: "Digital Optical Tachometer & Pipette Calibrator", toolCode: "TL-SL-004", destination: "God Care Medical Diagnostic — Centrifuge PM", borrowDate: "2026-10-29", borrowTime: "09:15", returnDateTime: "2026-10-29 (5:40 PM)", status: "Returned" }
    ];

    const DEFAULT_CALIBRATION_LIST = [
        {
            id: "2024-06030010",
            eqName: "FULLY AUTO CHEMISTRY ANALYZER (AGD 2260)",
            instrumentDesc: "FULLY AUTO CHEMISTRY ANALYZER",
            model: "AGD 2260",
            serial: "K3-E2206N108L",
            facility: "SCDL DAVAO",
            address: "Davao City",
            calDate: "2024-06-03",
            nextDue: "2025-06-02",
            accuracy: "PASSED — Within ±2 Standard Deviation (SD)",
            calibratorName: "Randox Calibrator",
            lotNumber: "1262UE",
            expiryDate: "01/2025",
            remarksStatus: "PASSED",
            remarksNote: "The results are within the ±2 Standard Deviation (SD).",
            techName: "HARVY L. AGSALONA",
            techCertNo: "BES NCII Cert. No.: 22013302204066",
            editRequestStatus: "none"
        }
    ];

    const SVG_CLIPBOARD = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>`;
    const SVG_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
    const SVG_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
    const SVG_EYE = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;

    try {
        window.toolLogs = JSON.parse(localStorage.getItem('seiralab_tool_logs') || 'null') || DEFAULT_TOOL_LOGS;
    } catch (_) {
        window.toolLogs = DEFAULT_TOOL_LOGS;
    }

    try {
        window.calibrationList = JSON.parse(localStorage.getItem('seiralab_calibrations') || 'null') || DEFAULT_CALIBRATION_LIST;
        if (!Array.isArray(window.calibrationList) || window.calibrationList.length === 0) {
            window.calibrationList = DEFAULT_CALIBRATION_LIST;
        }
    } catch (_) {
        window.calibrationList = DEFAULT_CALIBRATION_LIST;
    }

    function getActiveRole() {
        return window.currentAccessRole || sessionStorage.getItem('seiralab_active_session_role') || localStorage.getItem('seiralab_access_role') || 'Visitor';
    }

    function isVisitorUser() {
        const r = getActiveRole();
        return !r || r === 'Visitor';
    }

    function isHeadOrAdminUser() {
        const r = getActiveRole();
        return r === 'Head Technical' || r === 'MasterAdmin';
    }

    window.isVisitorMode = isVisitorUser;

    let currentCalCertMode = 'register';
    let currentEditingCalId = null;
    let currentServiceReportMode = 'register';
    let currentEditingLogId = null;
    let searchDebounceTimer = null;
    let lastRenderedMenuRole = null;

    function normalizeStatusLabel(rawStatus) {
        const s = String(rawStatus || 'Operational').trim();
        const low = s.toLowerCase();
        if (low.includes('pull') || low.includes('out of service') || low.includes('decom')) {
            return 'PULL OUT';
        }
        if (low.includes('repair') || low.includes('defective') || low.includes('not functional')) {
            return 'Under Repair';
        }
        if (low.includes('due')) {
            return 'Maintenance Due';
        }
        return 'Operational';
    }

    function enforceInstalledDateAndPullOutUI() {
        document.querySelectorAll('select').forEach(sel => {
            if (sel.id === 'accessRoleSelect') return;
            Array.from(sel.options).forEach(opt => {
                const txt = opt.textContent.trim().toLowerCase();
                const val = opt.value.trim().toLowerCase();
                if (txt.includes('out of service') || txt.includes('decommissioned') || val.includes('out of service') || val.includes('decommissioned')) {
                    opt.value = 'PULL OUT';
                    opt.textContent = 'PULL OUT';
                }
            });
        });

        document.querySelectorAll('#inventory table thead th').forEach(th => {
            const label = th.innerText.trim().toUpperCase();
            if (label.includes('NEXT PM') || label === 'DUE DATE') {
                th.innerText = 'INSTALLED DATE';
            }
        });
    }

    // ========================================================================
    // 1. SELF-HEALING MODALS
    // ========================================================================
    function ensureFeatureModalsExist() {
        if (!document.body) return;
        ensureLegacyIdsNeverNull();

        if (!document.getElementById('seiralabEditEquipmentModal')) {
            const editEqHTML = `
            <div id="seiralabEditEquipmentModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[115] hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 class="font-bold text-slate-900 text-base flex items-center space-x-2">
                            <span class="text-teal-600">${SVG_EDIT}</span>
                            <span>Edit Equipment Asset</span>
                        </h3>
                        <button type="button" onclick="closeInventoryEditModal()" class="text-slate-400 hover:text-slate-600 p-1 text-xl leading-none cursor-pointer">&times;</button>
                    </div>
                    <form onsubmit="saveInventoryEditedAsset(event)" class="space-y-3.5 pt-4 text-xs sm:text-sm">
                        <input type="hidden" id="editAssetTargetId" value="">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Equipment Name *</label>
                                <input type="text" id="editAssetName" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Model *</label>
                                <input type="text" id="editAssetModel" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Serial / ID *</label>
                                <input type="text" id="editAssetSerial" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Installed Date *</label>
                                <input type="date" id="editAssetInstalledDate" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Hospital / Laboratory Facility *</label>
                            <input type="text" id="editAssetFacility" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Department / Section *</label>
                                <input type="text" id="editAssetDept" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Status *</label>
                                <select id="editAssetStatus" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold">
                                    <option value="Operational">Operational</option>
                                    <option value="Maintenance Due">Maintenance Due</option>
                                    <option value="Under Repair">Under Repair</option>
                                    <option value="PULL OUT">PULL OUT</option>
                                </select>
                            </div>
                        </div>
                        <div class="pt-3 flex items-center justify-end space-x-2.5 border-t border-slate-100">
                            <button type="button" onclick="closeInventoryEditModal()" class="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-teal-600 text-white font-semibold text-xs rounded-lg cursor-pointer">Save Equipment Changes</button>
                        </div>
                    </form>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', editEqHTML);
        }

        if (!document.getElementById('borrowToolModal')) {
            const toolModalHTML = `
            <div id="borrowToolModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                        <h3 class="font-bold text-slate-900 text-lg">Borrow Tool / Test Kit from Biomed Office</h3>
                        <button type="button" onclick="closeBorrowToolModal()" class="text-slate-400 hover:text-slate-600 p-1 text-xl leading-none cursor-pointer">&times;</button>
                    </div>
                    <form id="borrowToolForm" onsubmit="saveToolBorrow(event)" class="space-y-4 pt-4">
                        <input type="hidden" id="editToolLogId" value="">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Borrower Name *</label>
                            <input type="text" id="toolBorrower" required placeholder="e.g., Eng. Barzce Barcelona" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Tool / Kit Name *</label>
                                <input type="text" id="toolName" required placeholder="e.g., Fluke 87V Multimeter" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Tool ID / Serial No. *</label>
                                <input type="text" id="toolCode" required placeholder="e.g., TL-SL-004" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Destination Hospital / Lab & Purpose *</label>
                            <input type="text" id="toolDestination" required placeholder="e.g., Cebu City Medical Center - PM" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Date Borrowed *</label>
                                <input type="date" id="toolBorrowDate" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Time Borrowed *</label>
                                <input type="time" id="toolBorrowTime" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                        </div>
                        <div class="pt-4 flex items-center justify-end space-x-3">
                            <button type="button" onclick="closeBorrowToolModal()" class="px-4 py-2 bg-slate-100 text-slate-700 font-medium text-sm rounded-lg cursor-pointer">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-teal-600 text-white font-medium text-sm rounded-lg cursor-pointer">Record Check-Out</button>
                        </div>
                    </form>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', toolModalHTML);
        }

        if (!document.getElementById('seiralabCalibrationCertModal')) {
            if (!document.getElementById('seiralabCalCertPrintStyle')) {
                const printStyle = document.createElement('style');
                printStyle.id = 'seiralabCalCertPrintStyle';
                printStyle.textContent = `
                    #calCertPaperSheet { font-family: Arial, Helvetica, sans-serif; color: #111827; }
                    #calCertPaperSheet.cal-readonly-mode input { pointer-events: none; border-bottom-color: transparent !important; }
                    @media print {
                        body:has(#seiralabCalibrationCertModal:not(.hidden)) * { visibility: hidden !important; }
                        #seiralabCalibrationCertModal:not(.hidden), #seiralabCalibrationCertModal:not(.hidden) #calCertPaperSheet, #seiralabCalibrationCertModal:not(.hidden) #calCertPaperSheet * { visibility: visible !important; }
                        #seiralabCalibrationCertModal:not(.hidden) { position: absolute !important; inset: 0 !important; background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
                        #calCertToolbar { display: none !important; }
                        #calCertPaperSheet { box-shadow: none !important; border: none !important; margin: 0 auto !important; width: 100% !important; max-width: 100% !important; padding: 12mm 18mm !important; }
                    }
                `;
                document.head.appendChild(printStyle);
            }

            const calCertModalHTML = `
            <div id="seiralabCalibrationCertModal" class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-[120] hidden overflow-y-auto p-3 sm:p-6 flex flex-col items-center">
                <div id="calCertToolbar" class="w-full max-w-3xl bg-slate-900 text-white rounded-t-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border border-slate-700 shadow-xl">
                    <div>
                        <div class="flex items-center space-x-2">
                            <h3 class="text-sm font-bold">Official Certificate of Calibration</h3>
                            <span id="calCertModeBadge" class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">New</span>
                        </div>
                        <p class="text-[11px] text-slate-400">Official Metrology Compliance Certificate</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button type="button" id="calBtnRequestEdit" onclick="openEditCalibrationModal(window._activeCalId)" class="hidden px-3.5 py-2 bg-amber-600 text-white font-semibold text-xs rounded-lg cursor-pointer"><span id="calBtnRequestEditLabel">Request Edit</span></button>
                        <button type="button" id="calBtnSaveCert" onclick="saveCalibrationCertificateFromTemplate()" class="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg cursor-pointer"><span id="calBtnSaveCertLabel">Register Certificate</span></button>
                        <button type="button" onclick="window.print()" class="px-3.5 py-2 bg-teal-600 text-white font-semibold text-xs rounded-lg cursor-pointer">Print / PDF</button>
                        <button type="button" onclick="document.getElementById('seiralabCalibrationCertModal').classList.add('hidden')" class="px-3 py-2 bg-slate-800 text-slate-200 text-xs rounded-lg cursor-pointer">Close</button>
                    </div>
                </div>

                <div id="calCertPaperSheet" class="w-full max-w-3xl bg-white shadow-2xl border border-slate-300 rounded-b-2xl px-8 sm:px-14 py-10 text-sm text-slate-900 mb-10 flex flex-col justify-between min-h-[860px]">
                    <div>
                        <div class="flex justify-center mb-6">
                            <img src="./seiralab-logo.jpg" alt="Seiralab" class="h-20 sm:h-24 w-auto object-contain" onerror="this.style.display='none'">
                        </div>
                        <h1 class="text-xl sm:text-2xl font-bold text-center tracking-[0.28em] uppercase text-black my-7">CERTIFICATE OF CALIBRATION</h1>
                        <div class="space-y-1.5 text-sm max-w-xl">
                            <div class="grid grid-cols-12 items-center"><span class="col-span-5">Certificate Number:</span><input type="text" id="tplCalCertNo" readonly class="col-span-7 font-bold text-red-600 text-base focus:outline-none bg-transparent"></div>
                            <div class="grid grid-cols-12 items-center"><span class="col-span-5">Date Issued:</span><input type="text" id="tplCalDateIssued" class="col-span-7 border-b border-slate-300 py-0.5 focus:outline-none"></div>
                            <div class="grid grid-cols-12 items-center"><span class="col-span-5">Valid Until:</span><input type="text" id="tplCalValidUntil" class="col-span-7 border-b border-slate-300 py-0.5 focus:outline-none"></div>
                        </div>
                        <div class="space-y-1.5 text-sm max-w-xl mt-6">
                            <div class="grid grid-cols-12 items-center"><span class="col-span-5">Company Name:</span><input type="text" id="tplCalCompany" class="col-span-7 font-bold uppercase border-b border-slate-300 py-0.5 focus:outline-none"></div>
                            <div class="grid grid-cols-12 items-center"><span class="col-span-5">Company Address:</span><input type="text" id="tplCalAddress" class="col-span-7 border-b border-slate-300 py-0.5 focus:outline-none"></div>
                        </div>
                        <div class="space-y-1.5 text-sm max-w-xl mt-6">
                            <div class="grid grid-cols-12 items-center"><span class="col-span-5">Instrument Description:</span><input type="text" id="tplCalInstDesc" class="col-span-7 uppercase border-b border-slate-300 py-0.5 focus:outline-none"></div>
                            <div class="grid grid-cols-12 items-center"><span class="col-span-5">Instrument Model:</span><input type="text" id="tplCalModel" class="col-span-7 uppercase border-b border-slate-300 py-0.5 focus:outline-none"></div>
                            <div class="grid grid-cols-12 items-center"><span class="col-span-5">Instrument Serial No.:</span><input type="text" id="tplCalSerial" class="col-span-7 uppercase font-mono border-b border-slate-300 py-0.5 focus:outline-none"></div>
                        </div>
                        <div class="space-y-1.5 text-sm max-w-2xl mt-6">
                            <div class="grid grid-cols-12 items-start"><span class="col-span-5">Calibration Procedure:</span><div class="col-span-7 leading-relaxed">The instrument was stabilized at ambient (room) temperature, then calibrated using the <input type="text" id="tplCalCalibrator" value="Randox Calibrator" class="w-44 border-b border-slate-400 px-1 font-semibold focus:outline-none"></div></div>
                            <div class="flex items-center space-x-2 pt-1"><span>Lot Number:</span><input type="text" id="tplCalLotNo" value="1262UE" oninput="syncCalLotFooter()" class="w-36 border-b border-slate-400 px-1 font-semibold focus:outline-none"></div>
                            <div class="flex items-center space-x-2"><span>Expiry Date:</span><input type="text" id="tplCalExpiry" value="01/2025" oninput="syncCalLotFooter()" class="w-36 border-b border-slate-400 px-1 font-semibold focus:outline-none"></div>
                        </div>
                        <div class="grid grid-cols-12 items-start max-w-2xl mt-6">
                            <span class="col-span-5">Remarks:</span>
                            <div class="col-span-7">
                                <input type="text" id="tplCalRemarksStatus" value="PASSED" class="text-lg font-extrabold text-blue-600 uppercase focus:outline-none w-40">
                                <input type="text" id="tplCalRemarksNote" value="The results are within the ±2 Standard Deviation (SD)." class="w-full italic text-slate-800 border-b border-slate-300 py-0.5 mt-0.5 focus:outline-none">
                            </div>
                        </div>
                        <div class="grid grid-cols-12 items-end max-w-2xl mt-8 pb-2 border-b-2 border-slate-800">
                            <span class="col-span-5">Calibration Technician:</span>
                            <div class="col-span-7">
                                <input type="text" id="tplCalTechName" value="HARVY L. AGSALONA" class="w-full font-semibold uppercase border-b border-slate-300 py-0.5 focus:outline-none">
                                <input type="text" id="tplCalTechCert" value="BES NCII Cert. No.: 22013302204066" class="w-full text-xs text-slate-800 py-0.5 focus:outline-none">
                            </div>
                        </div>
                        <div class="mt-4 space-y-3 text-xs sm:text-[13px] leading-relaxed text-slate-900">
                            <p>The results were obtained by recording the result of the Randox Calibrator with Lot Number: <span id="tplFooterLotSpan" class="font-semibold">1262UE</span> and Expiry Date: <span id="tplFooterExpSpan" class="font-semibold">01/2025</span>.</p>
                            <p>This certificate is issued in accordance with the requirements of Department of Health (DOH). This certificate may not be reproduced other than in full, except with the prior written approval of the issuing laboratory.</p>
                        </div>
                    </div>
                    <div class="pt-8 mt-6 text-center text-[11px] text-slate-600 leading-tight">
                        <p>Ground Floor, Unit 2-3, Cinton Bldg., Abad Santos St., Zone IV, Koronadal City, 9506 South Cotabato, Philippines</p>
                        <p><span class="underline text-blue-700">seiralab.inc@gmail.com</span>, (082) 228 - 2747</p>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', calCertModalHTML);
        }

        if (!document.getElementById('calEditRequestModal')) {
            const modalHtml = `
            <div id="calEditRequestModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[130] hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h4 class="text-sm font-bold text-slate-900">Request Calibration Edit</h4>
                            <p id="calEditReqLabel" class="text-[11px] text-slate-500">Send edit request to Head Technical / MasterAdmin</p>
                        </div>
                        <button type="button" onclick="document.getElementById('calEditRequestModal').classList.add('hidden')" class="text-slate-400 p-1">&times;</button>
                    </div>
                    <form onsubmit="submitCalibrationEditRequest(event)" class="space-y-4 pt-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Requested By *</label>
                            <input type="text" id="calReqTechName" required placeholder="e.g., Eng. Barzce Barcelona" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason for Editing *</label>
                            <textarea id="calReqReason" rows="3" required placeholder="Reason..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"></textarea>
                        </div>
                        <div class="pt-2 flex items-center justify-end space-x-2.5">
                            <button type="button" onclick="document.getElementById('calEditRequestModal').classList.add('hidden')" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Send Request</button>
                        </div>
                    </form>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        if (!document.getElementById('seiralabServiceReportModal')) {
            if (!document.getElementById('seiralabServiceReportPrintStyle')) {
                const style = document.createElement('style');
                style.id = 'seiralabServiceReportPrintStyle';
                style.textContent = `
                    #srPaperSheet { font-family: 'Times New Roman', Times, serif; color: #111827; }
                    #srPaperSheet input[type="text"], #srPaperSheet textarea { font-family: 'Inter', Arial, sans-serif; color: #0f172a; font-weight: 600; }
                    #srPaperSheet.sr-readonly-mode input[type="text"], #srPaperSheet.sr-readonly-mode textarea { pointer-events: none; user-select: text; }
                    #srPaperSheet.sr-readonly-mode input[type="checkbox"] { pointer-events: none; }
                    @media print {
                        body:has(#seiralabServiceReportModal:not(.hidden)) * { visibility: hidden !important; }
                        #seiralabServiceReportModal:not(.hidden), #seiralabServiceReportModal:not(.hidden) #srPaperSheet, #seiralabServiceReportModal:not(.hidden) #srPaperSheet * { visibility: visible !important; }
                        #seiralabServiceReportModal:not(.hidden) { position: absolute !important; inset: 0 !important; background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
                        #srModalToolbar { display: none !important; }
                        #srPaperSheet { box-shadow: none !important; border: none !important; margin: 0 auto !important; width: 100% !important; max-width: 100% !important; padding: 8mm 12mm !important; }
                    }
                `;
                document.head.appendChild(style);
            }

            const srModalHTML = `
            <div id="seiralabServiceReportModal" class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-[120] hidden overflow-y-auto p-3 sm:p-6 flex flex-col items-center">
                <div id="srModalToolbar" class="w-full max-w-4xl bg-slate-900 text-white rounded-t-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border border-slate-700 shadow-xl">
                    <div>
                        <div class="flex items-center space-x-2">
                            <h3 class="text-sm font-bold">Seiralab Official Service Report</h3>
                            <span id="srModeBadge" class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">New</span>
                        </div>
                        <p id="srModalSubtitleText" class="text-[11px] text-slate-400">Fill out details below and click Register</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button type="button" id="srBtnUnlockEdit" onclick="requestEditServiceReport(window._activeSrLogId)" class="hidden px-3.5 py-2 bg-amber-600 text-white font-semibold text-xs rounded-lg cursor-pointer"><span id="srBtnUnlockEditLabel">Request Edit</span></button>
                        <button type="button" id="srBtnSaveReport" onclick="saveRegisteredServiceReport()" class="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg cursor-pointer"><span id="srBtnSaveLabel">Register Service Report</span></button>
                        <button type="button" onclick="window.print()" class="px-3.5 py-2 bg-teal-600 text-white font-semibold text-xs rounded-lg cursor-pointer">Print / PDF</button>
                        <button type="button" onclick="closeServiceReportModal()" class="px-3 py-2 bg-slate-800 text-slate-200 text-xs rounded-lg cursor-pointer">Close</button>
                    </div>
                </div>

                <div id="srPaperSheet" class="w-full max-w-4xl bg-white shadow-2xl border border-slate-300 rounded-b-2xl p-6 sm:p-10 text-sm leading-snug mb-10">
                    <div class="flex flex-col items-center justify-center text-center pb-1">
                        <img src="./seiralab-logo.jpg" alt="Seiralab" class="h-20 sm:h-24 w-auto object-contain mx-auto" onerror="this.style.display='none'">
                        <p class="text-xs sm:text-[13px] text-slate-900 mt-1.5">Unit 1-6, Level 2, MGM Bldg., Gensan Drive, Brgy. Sto. Niño,<br>City of Koronadal, South Cotabato, 9506</p>
                    </div>
                    <div class="relative flex items-center justify-center my-4">
                        <h2 class="text-xl sm:text-2xl font-bold tracking-wider uppercase text-slate-900">SERVICE REPORT</h2>
                        <div class="absolute right-0 sm:right-6 top-0">
                            <input type="text" id="srReportNo" value="05535" readonly class="w-24 sm:w-28 text-right text-xl sm:text-2xl font-mono font-bold text-slate-900 focus:outline-none bg-transparent cursor-not-allowed">
                        </div>
                    </div>
                    <div class="space-y-1.5 text-[13px]">
                        <div class="flex items-end w-full sm:w-1/2 pr-4"><span class="font-semibold shrink-0 mr-2">Date:</span><input type="text" id="srDate" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none"></div>
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-x-6 gap-y-1.5">
                            <div class="sm:col-span-7 flex items-end"><span class="font-semibold shrink-0 mr-2">Company Name:</span><input type="text" id="srCompany" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none"></div>
                            <div class="sm:col-span-5 flex items-end"><span class="font-semibold shrink-0 mr-2">Tel. No./Fax:</span><input type="text" id="srTel" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none"></div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-x-6 gap-y-1.5">
                            <div class="sm:col-span-7 flex items-end"><span class="font-semibold shrink-0 mr-2">Contact Person:</span><input type="text" id="srContact" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none"></div>
                            <div class="sm:col-span-5 flex items-end"><span class="font-semibold shrink-0 mr-2">Department:</span><input type="text" id="srDepartment" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none"></div>
                        </div>
                        <div class="flex items-end"><span class="font-semibold shrink-0 mr-2">Address:</span><input type="text" id="srAddress" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none"></div>
                        <div class="flex items-end pt-2"><span class="font-bold uppercase shrink-0 mr-2">COMPLAINTS:</span><input type="text" id="srComplaints" class="w-full border-b border-slate-800 px-1 py-0.5 text-xs focus:outline-none"></div>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-2 my-3 text-xs font-semibold text-slate-900 px-1">
                        <label class="inline-flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" id="srChkWarranty" class="w-3.5 h-3.5 accent-slate-900"><span>Warranty</span></label>
                        <label class="inline-flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" id="srChkOutWarranty" class="w-3.5 h-3.5 accent-slate-900"><span>Out or Warranty</span></label>
                        <label class="inline-flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" id="srChkCheckup" class="w-3.5 h-3.5 accent-slate-900"><span>Check-up</span></label>
                        <label class="inline-flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" id="srChkCleaning" class="w-3.5 h-3.5 accent-slate-900"><span>Cleaning Repair</span></label>
                        <label class="inline-flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" id="srChkContract" class="w-3.5 h-3.5 accent-slate-900"><span>Under Contract</span></label>
                        <label class="inline-flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" id="srChkOrientation" class="w-3.5 h-3.5 accent-slate-900"><span>Orientation</span></label>
                        <label class="inline-flex items-center space-x-1.5 cursor-pointer"><input type="checkbox" id="srChkDelivery" class="w-3.5 h-3.5 accent-slate-900"><span>Delivery</span></label>
                    </div>
                    <div class="border-2 border-slate-900 p-2.5 mb-3 space-y-2 text-xs">
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div class="sm:col-span-5 flex items-end"><span class="font-bold shrink-0 mr-1.5">Equipment:</span><input type="text" id="srEquipmentName" class="w-full border-b border-slate-800 px-1 py-0.5 focus:outline-none"></div>
                            <div class="sm:col-span-3 flex items-end"><span class="font-bold shrink-0 mr-1.5">Model:</span><input type="text" id="srModel" class="w-full border-b border-slate-800 px-1 py-0.5 focus:outline-none"></div>
                            <div class="sm:col-span-4 flex items-end"><span class="font-bold shrink-0 mr-1.5">Serial No.:</span><input type="text" id="srSerial" class="w-full border-b border-slate-800 px-1 py-0.5 font-mono focus:outline-none"></div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div class="sm:col-span-6 flex items-end"><span class="font-bold shrink-0 mr-1.5">Address / Area:</span><input type="text" id="srEqArea1" class="w-full border-b border-slate-800 px-1 py-0.5 focus:outline-none"></div>
                            <div class="sm:col-span-6 flex items-end"><span class="font-bold shrink-0 mr-1.5">Installed / Status:</span><input type="text" id="srEqArea2" class="w-full border-b border-slate-800 px-1 py-0.5 focus:outline-none"></div>
                        </div>
                    </div>
                    <div class="border-2 border-slate-900 mb-3">
                        <div class="grid grid-cols-12 border-b border-slate-900 text-xs font-bold text-center bg-slate-50/50">
                            <div class="col-span-4 py-1 border-r border-slate-900">Findings</div>
                            <div class="col-span-5 py-1 border-r border-slate-900">Action Taken</div>
                            <div class="col-span-3 py-1">Amount</div>
                        </div>
                        <div class="grid grid-cols-12 h-28">
                            <div class="col-span-4 border-r border-slate-900 p-1.5"><textarea id="srFindings" class="w-full h-full text-xs focus:outline-none bg-transparent"></textarea></div>
                            <div class="col-span-5 border-r border-slate-900 p-1.5"><textarea id="srActionTaken" class="w-full h-full text-xs focus:outline-none bg-transparent"></textarea></div>
                            <div class="col-span-3 p-1.5"><textarea id="srServiceAmount" class="w-full h-full text-xs text-center focus:outline-none bg-transparent"></textarea></div>
                        </div>
                    </div>
                    <div class="border-2 border-slate-900 mb-3">
                        <div class="grid grid-cols-12 border-b border-slate-900 text-xs font-bold text-center bg-slate-50/50">
                            <div class="col-span-9 py-1 border-r border-slate-900">Parts for Replacement</div>
                            <div class="col-span-3 py-1">Amount</div>
                        </div>
                        <div class="grid grid-cols-12 h-24">
                            <div class="col-span-9 border-r border-slate-900 p-1.5"><textarea id="srParts" class="w-full h-full text-xs focus:outline-none bg-transparent"></textarea></div>
                            <div class="col-span-3 p-1.5"><textarea id="srPartsAmount" class="w-full h-full text-xs text-center focus:outline-none bg-transparent"></textarea></div>
                        </div>
                    </div>
                    <div class="border-2 border-slate-900 mb-3 h-16 p-1.5"><textarea id="srRemarks" class="w-full h-full text-xs focus:outline-none bg-transparent"></textarea></div>
                    <div class="border-2 border-slate-900 grid grid-cols-1 sm:grid-cols-12 text-xs">
                        <div class="sm:col-span-6 border-b sm:border-b-0 sm:border-r border-slate-900 p-2.5 flex flex-col justify-between min-h-[90px]">
                            <div class="pt-5 text-center"><input type="text" id="srTechnicianName" class="w-4/5 mx-auto text-center border-b border-slate-900 font-bold text-xs py-0.5 focus:outline-none"><div class="font-semibold text-slate-900 mt-0.5">Attending Engineer/Technician</div></div>
                            <div class="flex items-end mt-2"><span class="font-semibold mr-1.5">Date:</span><input type="text" id="srTechDate" class="w-40 border-b border-slate-800 px-1 text-xs focus:outline-none"></div>
                        </div>
                        <div class="sm:col-span-6 p-2.5 flex flex-col justify-between min-h-[90px]">
                            <div class="text-[11px] font-semibold text-slate-900">I hereby acknowledged the above service/s rendered:</div>
                            <div class="pt-3 text-center"><input type="text" id="srCustomerSign" class="w-4/5 mx-auto text-center border-b border-slate-900 font-bold text-xs py-0.5 focus:outline-none"><div class="font-semibold text-slate-900 mt-0.5">Customer Signature Over Printed Name</div></div>
                            <div class="flex items-end mt-1"><span class="font-semibold mr-1.5">Date:</span><input type="text" id="srCustomerDate" class="w-40 border-b border-slate-800 px-1 text-xs focus:outline-none"></div>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', srModalHTML);
        }

        if (!document.getElementById('srEditRequestModal')) {
            const modalHtml = `
            <div id="srEditRequestModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[130] hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h4 class="text-sm font-bold text-slate-900">Request Permission to Edit</h4>
                            <p id="srEditRequestTargetLabel" class="text-[11px] text-slate-500">Send request to Head Technical / MasterAdmin</p>
                        </div>
                        <button type="button" onclick="closeEditRequestModal()" class="text-slate-400 p-1">&times;</button>
                    </div>
                    <form onsubmit="submitTechnicalEditRequest(event)" class="space-y-4 pt-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Requested By (Engineer) *</label>
                            <input type="text" id="srReqEngineerName" required placeholder="e.g., Eng. Barzce Barcelona" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason for Editing *</label>
                            <textarea id="srReqReasonInput" rows="3" required placeholder="State what needs to be updated..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"></textarea>
                        </div>
                        <div class="pt-2 flex items-center justify-end space-x-2.5">
                            <button type="button" onclick="closeEditRequestModal()" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Send Edit Request</button>
                        </div>
                    </form>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        enforceInstalledDateAndPullOutUI();
    }

    function syncCalLotFooter() {
        const lot = document.getElementById('tplCalLotNo')?.value || '1262UE';
        const exp = document.getElementById('tplCalExpiry')?.value || '01/2025';
        const lotSpan = document.getElementById('tplFooterLotSpan');
        const expSpan = document.getElementById('tplFooterExpSpan');
        if (lotSpan) lotSpan.innerText = lot;
        if (expSpan) expSpan.innerText = exp;
    }
    window.syncCalLotFooter = syncCalLotFooter;

    // ========================================================================
    // 2. NOTIFICATIONS
    // ========================================================================
    function buildSystemNotifications() {
        const list = document.getElementById('notificationList');
        const badge = document.getElementById('notificationBadge');
        if (!list) return;

        const alerts = [];
        (window.historyLogs || []).forEach(log => {
            if (log.editRequestStatus === 'pending') {
                alerts.push({ type: 'editreq', title: `Service Report Edit Request: SR #${log.reportNo || '05535'}`, desc: `${log.editRequestedBy || 'Technical'}: "${log.editRequestReason || 'Requests edit approval'}"`, tab: 'history' });
            }
        });
        (window.calibrationList || []).forEach(cal => {
            if (cal.editRequestStatus === 'pending') {
                alerts.push({ type: 'editreq', title: `Calibration Edit Request: Cert #${cal.id}`, desc: `${cal.editRequestedBy || 'Technical'}: "${cal.editRequestReason || 'Requests edit approval'}"`, tab: 'calibration' });
            }
        });
        (window.toolLogs || []).forEach(tool => {
            if (tool.status === 'Borrowed') {
                alerts.push({ type: 'tool', title: `Tool Out: ${tool.toolName}`, desc: `Borrowed by ${tool.borrower} (${tool.borrowDate})`, tab: 'tools' });
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

        if (alerts.length === 0) {
            list.innerHTML = `<div class="py-8 text-center text-xs text-slate-400">All clear! No urgent alerts.</div>`;
            return;
        }

        list.innerHTML = alerts.slice(0, 20).map(a => {
            const boxStyle = a.type === 'overdue' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900';
            return `<div onclick="jumpFromNotification('${a.tab}')" class="p-3 rounded-xl border ${boxStyle} flex items-start justify-between cursor-pointer transition-colors mb-2">
                <div><p class="text-xs font-bold">${a.title}</p><p class="text-[11px] opacity-80 mt-0.5">${a.desc}</p></div>
                <span class="text-[10px] font-semibold underline ml-2 shrink-0">View &rarr;</span>
            </div>`;
        }).join('');
    }

    function openNotificationModal() { buildSystemNotifications(); document.getElementById('notificationModal')?.classList.remove('hidden'); }
    function closeNotificationModal() { document.getElementById('notificationModal')?.classList.add('hidden'); }
    function jumpFromNotification(tabId) { closeNotificationModal(); masterSwitchTab(tabId); }

    // ========================================================================
    // 3. CALIBRATION REPORTS & OFFICIAL CERTIFICATE OF CALIBRATION
    // ========================================================================
    function upgradeCalibrationToolbarUI() {
        ensureFeatureModalsExist();
        const calHeader = document.querySelector('#calibration > div:first-child');
        if (!calHeader) return;
        const calToolbar = calHeader.querySelector('div:nth-child(2)');
        if (!calToolbar) return;

        if (!calToolbar.querySelector('#btnAddCalibrationReport')) {
            calToolbar.className = 'flex items-center space-x-2.5 shrink-0 flex-wrap gap-2';
            calToolbar.innerHTML = `
                <button type="button" id="btnAddCalibrationReport" onclick="openAddCalibrationModal()" class="inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap cursor-pointer">
                    <span>+ Add Calibration Report</span>
                </button>
                <button type="button" id="btnPrintCalibrationReport" onclick="openLatestCalibrationCertForPrint()" class="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap cursor-pointer">
                    <span>Print Calibration Report</span>
                </button>
            `;
        }
    }

    function renderCalibrationTable() {
        upgradeCalibrationToolbarUI();
        const tbody = document.getElementById('calibrationTableBody');
        if (!tbody) return;

        const today = new Date();
        let dueSoonCount = 0;
        (window.calibrationList || []).forEach(item => {
            const diffDays = Math.ceil((new Date(item.nextDue) - today) / 86400000);
            if (diffDays <= 30) dueSoonCount++;
        });

        const elTotal = document.getElementById('statCalTotal');
        const elDue = document.getElementById('statCalDue');
        if (elTotal) elTotal.innerText = window.calibrationList.length;
        if (elDue) elDue.innerText = dueSoonCount;

        if (window.calibrationList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No calibration records found.</td></tr>`;
            return;
        }

        const isVis = isVisitorUser();
        const isSup = isHeadOrAdminUser();

        tbody.innerHTML = window.calibrationList.slice(0, 80).map(item => {
            const diffDays = Math.ceil((new Date(item.nextDue) - today) / 86400000);
            const dueColor = diffDays < 0 ? 'text-rose-600 font-semibold' : (diffDays <= 30 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-medium');
            const safeId = String(item.id).replace(/'/g, "\\'");
            const reqStatus = item.editRequestStatus || 'none';

            let editBtnHTML = '';
            if (!isVis) {
                if (isSup) {
                    if (reqStatus === 'pending') {
                        editBtnHTML += `<button type="button" onclick="resolveCalibrationEditRequest('${safeId}', 'accept')" class="px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Accept</button>`;
                    }
                    editBtnHTML += `<button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer"><span>Edit</span></button>`;
                } else {
                    if (reqStatus === 'pending') {
                        editBtnHTML = `<button type="button" class="px-2.5 py-1.5 bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold">Requested</button>`;
                    } else if (reqStatus === 'approved') {
                        editBtnHTML = `<button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Edit (Approved)</button>`;
                    } else {
                        editBtnHTML = `<button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer">Request Edit</button>`;
                    }
                }
            }

            const deleteBtnHTML = isSup ? `<button type="button" onclick="deleteCalibrationReport('${safeId}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer">${SVG_TRASH}</button>` : '';

            return `<tr class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4 font-mono font-bold text-red-600">${item.id}</td>
                <td class="p-4 font-semibold text-slate-900">${item.eqName}<br><span class="text-[11px] font-normal text-slate-500">SN: ${item.serial}</span></td>
                <td class="p-4 text-slate-700 font-medium">${item.facility}</td>
                <td class="p-4 text-slate-600">${item.calDate}</td>
                <td class="p-4 ${dueColor}">${item.nextDue}</td>
                <td class="p-4 text-xs font-semibold text-blue-700">${item.accuracy}</td>
                <td class="p-4 text-right">
                    <div class="inline-flex items-center justify-end space-x-1.5">
                        ${editBtnHTML}
                        <button type="button" onclick="downloadCalibrationCert('${safeId}')" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1.5 cursor-pointer">
                            <span>Certificate</span>
                        </button>
                        ${deleteBtnHTML}
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    function setCalCertReadOnlyState(isReadOnly) {
        const sheet = document.getElementById('calCertPaperSheet');
        if (!sheet) return;
        sheet.classList.toggle('cal-readonly-mode', isReadOnly);
        const fields = ['tplCalDateIssued', 'tplCalValidUntil', 'tplCalCompany', 'tplCalAddress', 'tplCalInstDesc', 'tplCalModel', 'tplCalSerial', 'tplCalCalibrator', 'tplCalLotNo', 'tplCalExpiry', 'tplCalRemarksStatus', 'tplCalRemarksNote', 'tplCalTechName', 'tplCalTechCert'];
        fields.forEach(id => { const el = document.getElementById(id); if (el) el.readOnly = isReadOnly; });
    }

    function formatLongDateDisplay(isoDate) {
        if (!isoDate) return '';
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return isoDate;
        return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
    }

    function populateCalibrationTemplateFields(item, certNumber) {
        const today = new Date();
        const nextYr = new Date(); nextYr.setFullYear(nextYr.getFullYear() + 1);

        document.getElementById('tplCalCertNo').value = certNumber;
        document.getElementById('tplCalDateIssued').value = item?.dateIssuedText || formatLongDateDisplay(item?.calDate || today.toISOString().split('T')[0]);
        document.getElementById('tplCalValidUntil').value = item?.validUntilText || formatLongDateDisplay(item?.nextDue || nextYr.toISOString().split('T')[0]);
        document.getElementById('tplCalCompany').value = item?.facility || '';
        document.getElementById('tplCalAddress').value = item?.address || '';
        document.getElementById('tplCalInstDesc').value = item?.instrumentDesc || (item?.eqName ? item.eqName.split('(')[0].trim() : '');
        document.getElementById('tplCalModel').value = item?.model || '';
        document.getElementById('tplCalSerial').value = item?.serial || '';
        document.getElementById('tplCalCalibrator').value = item?.calibratorName || 'Randox Calibrator';
        document.getElementById('tplCalLotNo').value = item?.lotNumber || '1262UE';
        document.getElementById('tplCalExpiry').value = item?.expiryDate || '01/2025';
        document.getElementById('tplCalRemarksStatus').value = item?.remarksStatus || 'PASSED';
        document.getElementById('tplCalRemarksNote').value = item?.remarksNote || 'The results are within the ±2 Standard Deviation (SD).';
        document.getElementById('tplCalTechName').value = item?.techName || 'HARVY L. AGSALONA';
        document.getElementById('tplCalTechCert').value = item?.techCertNo || 'BES NCII Cert. No.: 22013302204066';
        syncCalLotFooter();
    }

    function getNextCalibrationCertNumber(dateStr) {
        const d = dateStr ? new Date(dateStr) : new Date();
        const validDate = isNaN(d.getTime()) ? new Date() : d;
        const yyyy = validDate.getFullYear();
        const mm = String(validDate.getMonth() + 1).padStart(2, '0');
        const dd = String(validDate.getDate()).padStart(2, '0');
        let maxSeq = 9;
        (window.calibrationList || []).forEach(c => {
            const match = String(c.id || '').match(/(\d{4})$/);
            if (match) { const num = parseInt(match[1], 10); if (!isNaN(num) && num > maxSeq) maxSeq = num; }
        });
        return `${yyyy}-${mm}${dd}${String(maxSeq + 1).padStart(4, '0')}`;
    }

    function openAddCalibrationModal() {
        if (isVisitorUser()) { if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true); return; }
        ensureFeatureModalsExist();
        currentCalCertMode = 'register';
        currentEditingCalId = null;
        window._activeCalId = null;

        const nextCertNo = getNextCalibrationCertNumber();
        populateCalibrationTemplateFields(null, nextCertNo);
        setCalCertReadOnlyState(false);

        document.getElementById('calCertModeBadge').innerText = `New #${nextCertNo}`;
        document.getElementById('calBtnSaveCert')?.classList.remove('hidden');
        document.getElementById('calBtnSaveCertLabel').innerText = 'Register Certificate';
        document.getElementById('calBtnRequestEdit')?.classList.add('hidden');
        document.getElementById('seiralabCalibrationCertModal')?.classList.remove('hidden');
    }

    function downloadCalibrationCert(certId) {
        ensureFeatureModalsExist();
        const item = (window.calibrationList || []).find(c => String(c.id) === String(certId)) || window.calibrationList?.[0];
        if (!item) { openAddCalibrationModal(); return; }

        currentCalCertMode = 'view';
        currentEditingCalId = item.id;
        window._activeCalId = item.id;
        populateCalibrationTemplateFields(item, item.id);
        setCalCertReadOnlyState(true);

        document.getElementById('calCertModeBadge').innerText = `Viewing #${item.id}`;
        document.getElementById('calBtnSaveCert')?.classList.add('hidden');

        const reqBtn = document.getElementById('calBtnRequestEdit');
        const reqLabel = document.getElementById('calBtnRequestEditLabel');
        if (reqBtn && !isVisitorUser()) {
            reqBtn.classList.remove('hidden');
            if (reqLabel) reqLabel.innerText = (isHeadOrAdminUser() || item.editRequestStatus === 'approved') ? 'Edit Certificate' : 'Request Edit';
        } else if (reqBtn) { reqBtn.classList.add('hidden'); }

        document.getElementById('seiralabCalibrationCertModal')?.classList.remove('hidden');
    }

    function openLatestCalibrationCertForPrint() {
        if (window.calibrationList && window.calibrationList.length > 0) downloadCalibrationCert(window.calibrationList[0].id);
        else openAddCalibrationModal();
    }

    function openEditCalibrationModal(certId) {
        if (isVisitorUser()) return;
        ensureFeatureModalsExist();
        const item = (window.calibrationList || []).find(c => String(c.id) === String(certId));
        if (!item) return;

        currentEditingCalId = item.id;
        window._activeCalId = item.id;
        if (isHeadOrAdminUser() || item.editRequestStatus === 'approved') {
            currentCalCertMode = 'edit';
            populateCalibrationTemplateFields(item, item.id);
            setCalCertReadOnlyState(false);
            document.getElementById('calCertModeBadge').innerText = `Editing #${item.id} (Authorized)`;
            document.getElementById('calBtnSaveCert')?.classList.remove('hidden');
            document.getElementById('calBtnSaveCertLabel').innerText = 'Save Edited Certificate';
            document.getElementById('calBtnRequestEdit')?.classList.add('hidden');
            document.getElementById('seiralabCalibrationCertModal')?.classList.remove('hidden');
            return;
        }

        document.getElementById('calEditReqLabel').innerText = `Certificate #${item.id} — ${item.eqName}`;
        document.getElementById('calReqReason').value = '';
        document.getElementById('calEditRequestModal')?.classList.remove('hidden');
    }

    async function submitCalibrationEditRequest(event) {
        event.preventDefault();
        const item = (window.calibrationList || []).find(c => String(c.id) === String(currentEditingCalId));
        if (!item) return;

        item.editRequestStatus = 'pending';
        item.editRequestedBy = (document.getElementById('calReqTechName')?.value || 'Technical').trim();
        item.editRequestReason = (document.getElementById('calReqReason')?.value || '').trim();

        localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
        document.getElementById('calEditRequestModal')?.classList.add('hidden');
        document.getElementById('seiralabCalibrationCertModal')?.classList.add('hidden');
        renderCalibrationTable();
        buildSystemNotifications();
        if (typeof showNotificationToast === 'function') showNotificationToast(`Sent edit request for Certificate #${item.id}!`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(`Request Edit on Calibration Cert #${item.id}`);
    }

    async function resolveCalibrationEditRequest(certId, decision) {
        if (!isHeadOrAdminUser()) return;
        const item = (window.calibrationList || []).find(c => String(c.id) === String(certId));
        if (!item) return;

        item.editRequestStatus = decision === 'accept' ? 'approved' : 'declined';
        localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
        renderCalibrationTable();
        buildSystemNotifications();
        if (typeof showNotificationToast === 'function') showNotificationToast(decision === 'accept' ? `Approved edit for Cert #${item.id}!` : `Declined edit.`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(`${decision === 'accept' ? 'Approved' : 'Declined'} Calibration Edit #${item.id}`);
    }

    async function saveCalibrationCertificateFromTemplate() {
        if (currentCalCertMode === 'view') return;
        const certNo = document.getElementById('tplCalCertNo')?.value.trim() || getNextCalibrationCertNumber();
        const dateIssuedText = document.getElementById('tplCalDateIssued')?.value.trim() || '';
        const validUntilText = document.getElementById('tplCalValidUntil')?.value.trim() || '';
        const facility = document.getElementById('tplCalCompany')?.value.trim() || 'Client Facility';
        const address = document.getElementById('tplCalAddress')?.value.trim() || '';
        const instrumentDesc = document.getElementById('tplCalInstDesc')?.value.trim() || 'MEDICAL ANALYZER';
        const model = document.getElementById('tplCalModel')?.value.trim() || '';
        const serial = document.getElementById('tplCalSerial')?.value.trim() || '';
        const calibratorName = document.getElementById('tplCalCalibrator')?.value.trim() || 'Randox Calibrator';
        const lotNumber = document.getElementById('tplCalLotNo')?.value.trim() || '1262UE';
        const expiryDate = document.getElementById('tplCalExpiry')?.value.trim() || '01/2025';
        const remarksStatus = document.getElementById('tplCalRemarksStatus')?.value.trim() || 'PASSED';
        const remarksNote = document.getElementById('tplCalRemarksNote')?.value.trim() || '';
        const techName = document.getElementById('tplCalTechName')?.value.trim() || 'HARVY L. AGSALONA';
        const techCertNo = document.getElementById('tplCalTechCert')?.value.trim() || 'BES NCII Cert. No.: 22013302204066';

        const parsedCalDate = new Date(dateIssuedText);
        const parsedDueDate = new Date(validUntilText);
        const calDateISO = !isNaN(parsedCalDate.getTime()) ? parsedCalDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const nextDueISO = !isNaN(parsedDueDate.getTime()) ? parsedDueDate.toISOString().split('T')[0] : calDateISO;
        const eqName = model ? `${instrumentDesc} (${model})` : instrumentDesc;
        const accuracy = `${remarksStatus} — ${remarksNote}`;

        const recordPayload = { id: certNo, eqName, instrumentDesc, model, serial, facility, address, calDate: calDateISO, nextDue: nextDueISO, dateIssuedText, validUntilText, accuracy, calibratorName, lotNumber, expiryDate, remarksStatus, remarksNote, techName, techCertNo, editRequestStatus: 'none' };

        let commitAction = '';
        if (currentCalCertMode === 'edit' && currentEditingCalId) {
            const idx = window.calibrationList.findIndex(c => String(c.id) === String(currentEditingCalId));
            if (idx !== -1) {
                window.calibrationList[idx] = { ...window.calibrationList[idx], ...recordPayload, id: currentEditingCalId };
                commitAction = `Save Edited Calibration Certificate #${currentEditingCalId}`;
            }
        } else {
            const uniqueNo = window.calibrationList.some(c => String(c.id) === String(certNo)) ? getNextCalibrationCertNumber() : certNo;
            recordPayload.id = uniqueNo;
            window.calibrationList.unshift(recordPayload);
            commitAction = `Register Calibration Certificate #${uniqueNo}`;
        }

        localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
        document.getElementById('seiralabCalibrationCertModal')?.classList.add('hidden');
        renderCalibrationTable();
        renderReportsAnalyticsSection();
        buildSystemNotifications();
        if (typeof showNotificationToast === 'function') showNotificationToast(`Saved Calibration Certificate #${recordPayload.id}!`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(commitAction);
    }

    async function deleteCalibrationReport(certId) {
        if (!isHeadOrAdminUser()) { if (typeof showNotificationToast === 'function') showNotificationToast('Only Head Technical & MasterAdmin can delete certificates.', true); return; }
        const target = window.calibrationList.find(c => String(c.id) === String(certId));
        if (!target) return;
        if (confirm(`Delete Calibration Certificate #${target.id}?`)) {
            window.calibrationList = window.calibrationList.filter(c => String(c.id) !== String(certId));
            localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
            renderCalibrationTable();
            renderReportsAnalyticsSection();
            buildSystemNotifications();
            if (typeof showNotificationToast === 'function') showNotificationToast(`Deleted Cert #${target.id}`);
            if (typeof pushToGitHub === 'function') await pushToGitHub(`Delete Calibration Cert #${target.id}`);
        }
    }

    // ========================================================================
    // 4. BIOMED OFFICE TOOL LOGBOOK
    // ========================================================================
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

        const filtered = (window.toolLogs || []).filter(t => {
            const matchSearch = t.borrower.toLowerCase().includes(search) || t.toolName.toLowerCase().includes(search) || t.toolCode.toLowerCase().includes(search);
            const matchStatus = !statusFilter || t.status === statusFilter;
            return matchSearch && matchStatus;
        });

        if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No tool records found.</td></tr>`; return; }

        const isVis = isVisitorUser();
        tbody.innerHTML = filtered.map(log => {
            const statusBadge = log.status === 'Borrowed' ? `<span class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">Borrowed (Out)</span>` : `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Returned</span>`;
            let actionBtns = `<span class="text-xs text-slate-400 italic">View Only</span>`;
            if (!isVis) {
                const returnBtn = log.status === 'Borrowed' ? `<button type="button" onclick="markToolReturned(${log.id})" class="px-2.5 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium cursor-pointer">Return</button>` : '';
                actionBtns = `<div class="inline-flex items-center space-x-1.5">${returnBtn}<button type="button" onclick="deleteToolLog(${log.id})" class="p-1.5 bg-rose-50 text-rose-600 rounded-lg cursor-pointer">${SVG_TRASH}</button></div>`;
            }
            return `<tr class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4 font-semibold text-slate-900">${log.borrower}</td>
                <td class="p-4 font-medium text-slate-800">${log.toolName}<br><span class="text-xs font-mono text-slate-400">ID: ${log.toolCode}</span></td>
                <td class="p-4 text-xs text-slate-600">${log.destination}</td>
                <td class="p-4 text-xs font-medium text-slate-800">${log.borrowDate}<br><span class="text-teal-600 font-semibold">${formatTime12Hr(log.borrowTime)}</span></td>
                <td class="p-4 text-xs text-slate-600">${log.returnDateTime || '<span class="text-amber-600 italic">Still out</span>'}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4 text-right">${actionBtns}</td>
            </tr>`;
        }).join('');
    }

    function openBorrowToolModal() {
        if (isVisitorUser()) return;
        ensureFeatureModalsExist();
        document.getElementById('borrowToolForm')?.reset();
        document.getElementById('editToolLogId').value = '';
        const now = new Date();
        document.getElementById('toolBorrowDate').value = now.toISOString().split('T')[0];
        document.getElementById('toolBorrowTime').value = now.toTimeString().slice(0, 5);
        document.getElementById('borrowToolModal')?.classList.remove('hidden');
    }

    function closeBorrowToolModal() { document.getElementById('borrowToolModal')?.classList.add('hidden'); }

    async function saveToolBorrow(event) {
        event.preventDefault();
        if (isVisitorUser()) return;
        const borrower = document.getElementById('toolBorrower').value.trim();
        const toolName = document.getElementById('toolName').value.trim();
        const toolCode = document.getElementById('toolCode').value.trim();
        const destination = document.getElementById('toolDestination').value.trim();
        const borrowDate = document.getElementById('toolBorrowDate').value;
        const borrowTime = document.getElementById('toolBorrowTime').value;

        window.toolLogs.unshift({ id: Date.now(), borrower, toolName, toolCode, destination, borrowDate, borrowTime, returnDateTime: "", status: "Borrowed" });
        localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
        closeBorrowToolModal();
        renderToolLogsTable();
        buildSystemNotifications();
        if (typeof pushToGitHub === 'function') await pushToGitHub(`Tool Check-Out: ${toolName}`);
    }

    async function deleteToolLog(logId) {
        if (isVisitorUser()) return;
        window.toolLogs = window.toolLogs.filter(t => t.id != logId);
        localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
        renderToolLogsTable();
        buildSystemNotifications();
    }

    async function markToolReturned(logId) {
        if (isVisitorUser()) return;
        const log = window.toolLogs.find(t => t.id == logId);
        if (!log) return;
        const now = new Date();
        log.returnDateTime = `${now.toISOString().split('T')[0]} (${formatTime12Hr(now.toTimeString().slice(0, 5))})`;
        log.status = "Returned";
        localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
        renderToolLogsTable();
        buildSystemNotifications();
    }

    // ========================================================================
    // 5. EXACT installation.xls PARSER + ZERO-LAG INVENTORY SEARCH & ACTIONS
    // ========================================================================
    function ensureSheetJSLoaded() {
        return new Promise((resolve, reject) => {
            if (window.XLSX) return resolve(window.XLSX);
            const existing = document.getElementById('sheetjs-cdn-script');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.XLSX));
                return;
            }
            const script = document.createElement('script');
            script.id = 'sheetjs-cdn-script';
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            script.onload = () => resolve(window.XLSX);
            script.onerror = () => reject(new Error('Failed to load SheetJS'));
            document.head.appendChild(script);
        });
    }

    const MODEL_REPAIR_DICTIONARY = {
        's12': { name: 'Biolight Patient Monitor', dept: 'ICU / Patient Monitoring', region: 'ILOILO' },
        'q5': { name: 'Biolight Patient Monitor', dept: 'ICU / Patient Monitoring', region: 'ILOILO' },
        'e65': { name: 'Biolight ECG Monitor', dept: 'Cardiology / Diagnostics', region: 'CEBU' },
        'boaray700d': { name: 'Prunus Anesthesia Machine', dept: 'Operating Room / Anesthesia', region: 'ILOILO' },
        'boaray700': { name: 'Prunus Anesthesia Machine', dept: 'Operating Room / Anesthesia', region: 'SOCCSKSARGEN' },
        'dm7000': { name: 'M&B Defibrillator', dept: 'Emergency / Critical Care', region: 'ILOILO' },
        'as380': { name: 'Bioelab Chemistry Analyzer', dept: 'Clinical Chemistry Lab', region: 'VISAYAS' },
        'ab380': { name: 'Flexor Chemistry Analyzer', dept: 'Clinical Chemistry Lab', region: 'CEBU' },
        'ab480': { name: 'Flexor Chemistry Analyzer', dept: 'Clinical Chemistry Lab', region: 'CEBU' },
        'as280': { name: 'Flexor Chemistry Analyzer', dept: 'Clinical Chemistry Lab', region: 'BUKIDNON' },
        'abh650': { name: 'Alexis Hematology Analyzer', dept: 'Hematology Section', region: 'SOCCSKSARGEN' },
        'abh630': { name: 'Alexis Hematology Analyzer', dept: 'Hematology Section', region: 'DAVAO' },
        'abh530plus': { name: 'Alexis Hematology Analyzer', dept: 'Hematology Section', region: 'CEBU' },
        'rd171': { name: 'Horron Semi-Auto Chemistry Analyzer', dept: 'Clinical Chemistry Lab', region: 'SOCCSKSARGEN' },
        'h900': { name: 'Horron Electrolyte Analyzer', dept: 'Clinical Pathology Lab', region: 'MINDANAO' },
        'rt9200': { name: 'Rayto Chemistry Analyzer', dept: 'Clinical Chemistry Lab', region: 'SOCCSKSARGEN' },
        'bc5000': { name: 'Mindray Hematology Analyzer', dept: 'Hematology Section', region: 'SOCCSKSARGEN' },
        'cx23': { name: 'Olympus Biological Microscope', dept: 'Clinical Microscopy', region: 'SOCCSKSARGEN' },
        'cx21': { name: 'Olympus Biological Microscope', dept: 'Clinical Microscopy', region: 'MINDANAO' },
        'dgt23a': { name: 'Dengguan Autoclave Sterilizer', dept: 'Central Sterilization', region: 'VISAYAS' },
        'tgm12': { name: 'Yingtai Hematocrit Centrifuge', dept: 'Hematology Section', region: 'VISAYAS' },
        'mpc5v226': { name: 'Anhui Pharmacy Refrigerator', dept: 'Pharmacy / Blood Bank', region: 'VISAYAS' },
        'ihopers300': { name: 'Resvent Mechanical Ventilator', dept: 'ICU / Respiratory Care', region: 'SOCCSKSARGEN' },
        'msl06': { name: 'Iray Flat Panel Detector', dept: 'Radiology & Imaging', region: 'SOCCSKSARGEN' },
        'pld6500e': { name: 'Perlove X-Ray Machine', dept: 'Radiology & Imaging', region: 'SOCCSKSARGEN' },
        'pld5600a': { name: 'Perlove X-Ray Machine', dept: 'Radiology & Imaging', region: 'SOCCSKSARGEN' },
        'mft1000': { name: 'Fluorecare Immunoassay Analyzer', dept: 'Immunology / Serology', region: 'CEBU' },
        'ls1100': { name: 'Lansion Bio Immunoassay Analyzer', dept: 'Immunology / Serology', region: 'MAGUINDANAO' },
        'agd2260': { name: 'AGD Biomedicals Chemistry Analyzer', dept: 'Clinical Chemistry Lab', region: 'ILOILO' },
        'agd2020': { name: 'AGD Biomedicals Semi-Auto Chemistry', dept: 'Clinical Chemistry Lab', region: 'DAVAO' },
        'en102': { name: 'Eaglenos Blood Gas Analyzer', dept: 'ICU / Respiratory Care', region: 'CEBU' },
        'bga102': { name: 'Wondfo Blood Gas Analyzer', dept: 'ICU / Respiratory Care', region: 'CEBU' }
    };

    const EQUIPMENT_KEYWORDS = [
        'analyzer', 'centrifuge', 'microscope', 'monitor', 'ventilator', 'anesthesia',
        'defibrillator', 'autoclave', 'refrigerator', 'incubator', 'x-ray', 'xray',
        'ultrasound', 'spirometer', 'suction', 'light', 'detector', 'hplc', 'coagulation',
        'electrolyte', 'chemistry', 'hematology', 'immunoassay', 'generator', 'pipette',
        'sterilizer', 'water bath', 'rotator', 'shaker', 'freezer', 'machine', 'system'
    ];

    const FACILITY_KEYWORDS = [
        'hospital', 'medical', 'clinic', 'diagnostic', 'laboratory', 'lab', 'health',
        'center', 'sanitarium', 'rhu', 'infirmary', 'doctors', 'provincial', 'district',
        'memorial', 'city health', 'super health', 'cupsi', 'ipho', 'avmsci', 'scdl', 'genlab'
    ];

    function looksLikeHospitalOrLabName(text) {
        const t = String(text || '').toLowerCase();
        if (!t) return false;
        if (EQUIPMENT_KEYWORDS.some(k => t.includes(k))) return false;
        return FACILITY_KEYWORDS.some(k => t.includes(k));
    }

    function inferDepartmentFromEquipmentText(text, model) {
        const p = `${text || ''} ${model || ''}`.toLowerCase();
        if (p.includes('hematology') || p.includes('hematocrit') || p.includes('coagulation')) return 'Hematology Section';
        if (p.includes('chemistry') || p.includes('electrolyte') || p.includes('urine') || p.includes('hplc') || p.includes('a1c')) return 'Clinical Chemistry Lab';
        if (p.includes('immunoassay') || p.includes('elisa')) return 'Immunology / Serology';
        if (p.includes('blood gas') || p.includes('ventilator') || p.includes('highflow') || p.includes('oxygen') || p.includes('spirometer')) return 'ICU / Respiratory Care';
        if (p.includes('anesthesia') || p.includes('or light') || p.includes('suction')) return 'Operating Room';
        if (p.includes('defibrillator') || p.includes('patient monitor') || p.includes('ecg')) return 'ICU / Emergency Care';
        if (p.includes('x-ray') || p.includes('xray') || p.includes('detector') || p.includes('ultrasound')) return 'Radiology & Imaging';
        if (p.includes('microscope')) return 'Clinical Microscopy';
        if (p.includes('refrigerator') || p.includes('blood bank') || p.includes('incubator') || p.includes('card')) return 'Blood Bank / Pharmacy';
        if (p.includes('autoclave') || p.includes('sterilizer')) return 'Central Sterilization';
        return 'Clinical Laboratory';
    }

    function autoRepairScrambledInventoryData() {
        let list = window.equipmentList;
        try {
            const stored = JSON.parse(localStorage.getItem('seiralab_equipment') || 'null');
            if (Array.isArray(stored) && stored.length > 0) list = stored;
        } catch (_) {}

        if (!Array.isArray(list) || list.length === 0) return;

        let changed = false;
        list.forEach(item => {
            const rawName = String(item.name || '').trim();
            const rawModel = String(item.model || '').trim();
            const rawFacility = String(item.facility || '').trim();
            const modelKey = rawModel.toLowerCase().replace(/[^a-z0-9]/g, '');
            const repairInfo = MODEL_REPAIR_DICTIONARY[modelKey];

            const isScrambledRow =
                looksLikeHospitalOrLabName(rawName) ||
                (rawFacility === 'Cebu City Medical Center' && !rawName.toLowerCase().includes('flexor') && !rawName.toLowerCase().includes('alexis') && !rawName.toLowerCase().includes('eaglenos') && !rawName.toLowerCase().includes('biolight') && repairInfo);

            if (isScrambledRow && rawName) {
                item.facility = rawName;
                if (repairInfo) {
                    item.name = repairInfo.name;
                    item.department = repairInfo.dept;
                    item.dept = repairInfo.dept;
                    item.location = `${repairInfo.region} — ${item.facility}`;
                } else {
                    item.name = rawModel && rawModel !== 'Standard' ? `Medical Analyzer (${rawModel})` : 'Medical Diagnostic Equipment';
                    const dept = inferDepartmentFromEquipmentText(item.name, rawModel);
                    item.department = dept;
                    item.dept = dept;
                    item.location = item.facility;
                }
                changed = true;
            }

            const normalizedSt = normalizeStatusLabel(item.status);
            if (item.status !== normalizedSt) {
                item.status = normalizedSt;
                changed = true;
            }
            if (!item.installDate) {
                item.installDate = item.lastPM || '2025-01-01';
            }

            const validDept = (item.department && item.department !== 'undefined')
                ? item.department
                : ((item.dept && item.dept !== 'undefined') ? item.dept : inferDepartmentFromEquipmentText(item.name, item.model));
            item.department = validDept;
            item.dept = validDept;
            if (!item.location || item.location.includes('undefined')) {
                item.location = validDept;
            }
        });

        window.equipmentList = list;
        try { if (typeof equipmentList !== 'undefined') equipmentList = list; } catch (_) {}
        if (changed) {
            localStorage.setItem('seiralab_equipment', JSON.stringify(list));
        }
    }

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
            const str = String(val).trim().replace(/\s+/g, ' ').replace(/,(\d{4})/, ', $1');
            if (str && str.toUpperCase() !== 'N/A' && str.toUpperCase() !== 'NAT' && str !== '-') {
                const parsed = new Date(str);
                if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1995 && parsed.getFullYear() <= 2035) {
                    return parsed.toISOString().split('T')[0];
                }
            }
        }
        return 'N/A';
    }

    function computeNextPMFromInstall(installDateStr) {
        const base = new Date(installDateStr);
        const next = isNaN(base.getTime()) ? new Date() : new Date(base);
        next.setMonth(next.getMonth() + 6);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 2);
        while (next < cutoff) {
            next.setMonth(next.getMonth() + 6);
        }
        return next.toISOString().split('T')[0];
    }

    function normalizeSnForDedup(sn) {
        const clean = String(sn || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
        if (!clean || clean === 'na' || clean === 'n/a' || clean === 'nan' || clean === 'none' || clean.startsWith('sn') || clean.startsWith('sli')) {
            return '';
        }
        return clean;
    }

    function parseWorksheetToEquipment(worksheet, sheetName, XLSX) {
        const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!matrix || matrix.length < 2) return [];

        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(matrix.length, 10); r++) {
            const rowStr = (matrix[r] || []).slice(0, 10).map(c => String(c).trim().toLowerCase()).join(' | ');
            if ((rowStr.includes('account') || rowStr.includes('hospital') || rowStr.includes('facility')) &&
                (rowStr.includes('desc') || rowStr.includes('model') || rowStr.includes('mfg') || rowStr.includes('serial') || rowStr.includes('sn'))) {
                headerRowIdx = r;
                break;
            }
        }

        const headers = (matrix[headerRowIdx] || []).slice(0, 15).map(h =>
            String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
        );

        const findExactOrPartial = (exactArr, partialArr, defaultIdx) => {
            for (const ex of exactArr) {
                const i = headers.indexOf(ex);
                if (i !== -1) return i;
            }
            for (const p of partialArr) {
                const i = headers.findIndex(h => h.includes(p));
                if (i !== -1) return i;
            }
            return defaultIdx;
        };

        const colAccount = findExactOrPartial(['accountname', 'hospital', 'facility', 'client'], ['account', 'hospital', 'facility'], 0);
        const colDesc    = findExactOrPartial(['desc', 'description', 'producttype', 'equipmentname', 'equipment'], ['desc', 'producttype', 'equipment'], 1);
        const colMfg     = findExactOrPartial(['mfg', 'brand', 'manufacturer', 'make'], ['mfg', 'brand', 'maker'], 2);
        const colModel   = findExactOrPartial(['model', 'modelno'], ['model'], 3);
        const colSn      = findExactOrPartial(['sn', 'serialno', 'serialnumber', 'serial'], ['serial', 'sn'], 4);
        const colDate    = findExactOrPartial(['installdate', 'dateinstalled', 'lastpm'], ['install', 'lastpm', 'date'], 5);
        const colStatus  = findExactOrPartial(['status', 'condition'], ['status'], 6);

        const regionLabel = (sheetName === 'Sheet1' || sheetName === 'Sheet2') ? '' : sheetName.toUpperCase();
        const extracted = [];
        let lastFacility = '';

        for (let r = headerRowIdx + 1; r < matrix.length; r++) {
            const row = matrix[r] || [];
            const firstCols = row.slice(0, 8).map(c => String(c ?? '').trim());
            if (firstCols.filter(Boolean).length < 2) continue;

            let accountName = String(row[colAccount] ?? '').trim();
            const desc      = String(row[colDesc] ?? '').trim();
            const mfg       = String(row[colMfg] ?? '').trim();
            const model     = String(row[colModel] ?? '').trim();
            const rawSn     = String(row[colSn] ?? '').trim();
            const rawDate   = row[colDate];
            const rawStatus = colStatus !== -1 ? String(row[colStatus] ?? '').trim() : '';

            if (accountName.toLowerCase().includes('account') && desc.toLowerCase().includes('desc')) continue;
            if (!accountName && !desc && !model && !mfg) continue;

            if (accountName) {
                lastFacility = accountName;
            } else if (lastFacility && (desc || model || mfg)) {
                accountName = lastFacility;
            }

            if (!accountName && !desc && !model) continue;

            const cleanMfg = (mfg && mfg.toUpperCase() !== 'NAN' && mfg.toUpperCase() !== 'N/A') ? mfg : '';
            const cleanDesc = (desc && desc.toUpperCase() !== 'NAN' && desc.toUpperCase() !== 'N/A') ? desc : '';
            const cleanModel = (model && model.toUpperCase() !== 'NAN' && model.toUpperCase() !== 'N/A') ? model : (cleanMfg || 'Standard');

            let equipmentName = '';
            if (cleanMfg && cleanDesc) {
                equipmentName = cleanDesc.toLowerCase().includes(cleanMfg.toLowerCase())
                    ? cleanDesc
                    : `${cleanMfg} ${cleanDesc}`;
            } else {
                equipmentName = cleanDesc || cleanMfg || cleanModel || 'Medical Diagnostic Equipment';
            }

            const department = inferDepartmentFromEquipmentText(equipmentName, cleanModel);
            const installedDate = parseFlexibleInstallDate(rawDate);
            const lastPM = installedDate !== 'N/A' ? installedDate : new Date().toISOString().split('T')[0];
            const nextDue = computeNextPMFromInstall(lastPM);
            const status = normalizeStatusLabel(rawStatus);

            const hasValidSn = rawSn && rawSn.toUpperCase() !== 'N/A' && rawSn.toUpperCase() !== 'NAN' && rawSn !== '-';
            const serial = hasValidSn
                ? rawSn
                : `SLI-${cleanModel.replace(/[^A-Za-z0-9]/g, '') || 'EQ'}-${String(r).padStart(3, '0')}`;

            const locationText = regionLabel ? `${regionLabel} — ${department}` : department;

            extracted.push({
                id: Date.now() + r + Math.floor(Math.random() * 100000),
                name: equipmentName,
                desc: cleanDesc,
                mfg: cleanMfg,
                model: cleanModel,
                serial: serial,
                facility: accountName || 'Client Medical Facility',
                department: department,
                dept: department,
                region: regionLabel,
                location: locationText,
                risk: 'High',
                status: status,
                installDate: installedDate,
                lastPM: lastPM,
                nextDue: nextDue,
                interval: 'Semi-Annual (6 Mos)'
            });
        }

        return extracted;
    }

    async function handleAssetDataFileImport(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const XLSX = await ensureSheetJSLoaded();
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

            const regionalSheets = workbook.SheetNames.filter(n => !/^sheet\d+$/i.test(n.trim()));
            const genericSheets = workbook.SheetNames.filter(n => /^sheet\d+$/i.test(n.trim()));
            const orderedSheets = [...regionalSheets, ...genericSheets];

            const dedupMap = new Map();
            let noSnCounter = 0;

            orderedSheets.forEach(sheetName => {
                const ws = workbook.Sheets[sheetName];
                if (!ws) return;
                const items = parseWorksheetToEquipment(ws, sheetName.trim(), XLSX);

                items.forEach(item => {
                    const snKey = normalizeSnForDedup(item.serial);
                    const facKey = item.facility.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const modKey = item.model.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const descKey = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');

                    if (snKey) {
                        const key = `sn:${snKey}`;
                        if (!dedupMap.has(key)) {
                            dedupMap.set(key, item);
                        } else if (item.region && !dedupMap.get(key).region) {
                            dedupMap.get(key).region = item.region;
                            dedupMap.get(key).location = item.location;
                        }
                    } else {
                        const compBase = `comp:${facKey}|${modKey}|${descKey}|${item.installDate}`;
                        if (!dedupMap.has(compBase)) {
                            dedupMap.set(compBase, item);
                        } else {
                            noSnCounter++;
                            dedupMap.set(`${compBase}#${noSnCounter}`, item);
                        }
                    }
                });
            });

            const importedList = Array.from(dedupMap.values());
            if (importedList.length === 0) {
                if (typeof showNotificationToast === 'function') {
                    showNotificationToast('No valid equipment rows found in the file.', true);
                }
                return;
            }

            window.equipmentList = importedList;
            try { if (typeof equipmentList !== 'undefined') equipmentList = importedList; } catch (_) {}
            localStorage.setItem('seiralab_equipment', JSON.stringify(importedList));

            rebuildHospitalAndDeptFilters();
            renderFullSearchableInventoryTable();
            syncDashboardCountersAndTables();
            renderFullPMScheduleCards();
            renderReportsAnalyticsSection();
            buildSystemNotifications();

            const siteCount = new Set(importedList.map(e => e.facility).filter(Boolean)).size;
            if (typeof showNotificationToast === 'function') {
                showNotificationToast(`Imported ${importedList.length} machines across ${siteCount} Hospitals/Labs!`);
            }
            if (typeof pushToGitHub === 'function') {
                await pushToGitHub(`Import installation.xls: ${importedList.length} machines across ${siteCount} facilities`);
            }
        } catch (err) {
            if (typeof showNotificationToast === 'function') {
                showNotificationToast('Error reading Excel file. Please try again.', true);
            }
        }
    }

    function rebuildHospitalAndDeptFilters() {
        const list = window.equipmentList || [];
        enforceInstalledDateAndPullOutUI();

        const facilitySelect = document.getElementById('facilityFilter');
        if (facilitySelect) {
            const prevFac = facilitySelect.value;
            const facilities = Array.from(new Set(list.map(i => String(i.facility || '').trim()).filter(Boolean)))
                .sort((a, b) => a.localeCompare(b));
            facilitySelect.innerHTML = `<option value="">All Hospitals / Labs (${facilities.length} Sites)</option>` +
                facilities.map(f => `<option value="${f.replace(/"/g, '&quot;')}">${f}</option>`).join('');
            if (facilities.includes(prevFac)) facilitySelect.value = prevFac;
        }

        const deptSelect = document.getElementById('deptFilter') || document.getElementById('departmentFilter');
        if (deptSelect) {
            const prevDept = deptSelect.value;
            const depts = Array.from(new Set(list.map(i => String(i.department || i.dept || '').trim()).filter(Boolean)))
                .sort((a, b) => a.localeCompare(b));
            deptSelect.innerHTML = `<option value="">All Departments</option>` +
                depts.map(d => `<option value="${d.replace(/"/g, '&quot;')}">${d}</option>`).join('');
            if (depts.includes(prevDept)) deptSelect.value = prevDept;
        }
    }

    function renderFullSearchableInventoryTable() {
        const invSection = document.getElementById('inventory');
        if (!invSection) return;
        const tbody = document.getElementById('inventoryTableBody') || invSection.querySelector('tbody');
        if (!tbody) return;

        enforceInstalledDateAndPullOutUI();

        const list = window.equipmentList || [];
        const searchInput = document.getElementById('inventorySearch') ||
                            document.getElementById('searchInput') ||
                            invSection.querySelector('input[type="text"], input[type="search"]');
        const selects = invSection.querySelectorAll('select');
        const facilitySelect = document.getElementById('facilityFilter') || selects[0];
        const deptSelect = document.getElementById('deptFilter') || document.getElementById('departmentFilter') || selects[1];
        const statusSelect = document.getElementById('statusFilter') || selects[2];

        const query = (searchInput?.value || '').trim().toLowerCase();
        const facFilter = (facilitySelect?.value || '').trim().toLowerCase();
        const deptFilter = (deptSelect?.value || '').trim().toLowerCase();
        const statusFilter = (statusSelect?.value || '').trim().toLowerCase();

        const filtered = list.filter(item => {
            const st = normalizeStatusLabel(item.status).toLowerCase();
            if (facFilter && String(item.facility || '').toLowerCase() !== facFilter) return false;
            if (deptFilter && String(item.department || item.dept || '').toLowerCase() !== deptFilter) return false;
            if (statusFilter && st !== statusFilter) return false;

            if (!query) return true;
            return String(item.name || '').toLowerCase().includes(query) ||
                   String(item.model || '').toLowerCase().includes(query) ||
                   String(item.serial || '').toLowerCase().includes(query) ||
                   String(item.facility || '').toLowerCase().includes(query) ||
                   String(item.department || item.dept || '').toLowerCase().includes(query) ||
                   String(item.location || '').toLowerCase().includes(query);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="py-10 text-center text-slate-400 text-sm">No equipment matches your search filter.</td></tr>`;
            return;
        }

        const displayLimit = query ? 150 : 80;
        tbody.innerHTML = filtered.slice(0, displayLimit).map(item => {
            const deptName = item.department || item.dept || 'Clinical Laboratory';
            const locName = item.location || deptName;
            const status = normalizeStatusLabel(item.status);
            const installedDate = item.installDate || item.lastPM || 'N/A';

            let statusBadge = '';
            if (status === 'Operational') {
                statusBadge = `<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Operational</span></span>`;
            } else if (status === 'PULL OUT') {
                statusBadge = `<span class="px-2.5 py-1 bg-slate-200 text-slate-800 border border-slate-300 rounded-full text-xs font-bold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>PULL OUT</span></span>`;
            } else if (status === 'Under Repair') {
                statusBadge = `<span class="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span>Under Repair</span></span>`;
            } else {
                statusBadge = `<span class="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>${status}</span></span>`;
            }

            const safeId = String(item.id).replace(/'/g, "\\'");

            return `<tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-none">
                <td class="p-4">
                    <div class="font-bold text-slate-900 text-sm">${item.name}</div>
                    <div class="text-xs text-slate-500">Model: ${item.model || 'Standard'}</div>
                </td>
                <td class="p-4 font-mono text-xs font-semibold text-slate-700">${item.serial}</td>
                <td class="p-4 font-semibold text-slate-800 text-xs sm:text-sm">${item.facility}</td>
                <td class="p-4">
                    <div class="text-xs font-semibold text-slate-700">${deptName}</div>
                    <div class="text-[11px] text-slate-400">${locName}</div>
                </td>
                <td class="p-4 hidden">${item.risk || 'High'}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4 font-mono text-xs font-semibold text-slate-700">${installedDate}</td>
                <td class="p-4 text-right">
                    <div class="inline-flex items-center justify-end space-x-1.5">
                        <button type="button" onclick="openInventoryServiceReport('${safeId}')" class="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition-colors cursor-pointer" title="Create Service Report">
                            ${SVG_CLIPBOARD}
                        </button>
                        <button type="button" onclick="openInventoryEditModal('${safeId}')" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer" title="Edit Equipment">
                            ${SVG_EDIT}
                        </button>
                        <button type="button" onclick="deleteInventoryAsset('${safeId}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer" title="Delete Equipment">
                            ${SVG_TRASH}
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    function openInventoryServiceReport(eqId) {
        if (isVisitorUser()) {
            if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true);
            return;
        }
        const item = (window.equipmentList || []).find(e => String(e.id) === String(eqId));
        openNewServiceReportRegistration();
        if (!item) return;

        document.getElementById('srCompany').value = item.facility || '';
        document.getElementById('srDepartment').value = item.department || item.dept || '';
        document.getElementById('srAddress').value = item.location || item.facility || '';
        document.getElementById('srEquipmentName').value = item.name || '';
        document.getElementById('srModel').value = item.model || '';
        document.getElementById('srSerial').value = item.serial || '';
        document.getElementById('srEqArea1').value = item.facility || '';
        document.getElementById('srEqArea2').value = `Installed: ${item.installDate || item.lastPM || 'N/A'} (${normalizeStatusLabel(item.status)})`;
    }

    function openInventoryEditModal(eqId) {
        if (isVisitorUser()) {
            if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true);
            return;
        }
        ensureFeatureModalsExist();
        const item = (window.equipmentList || []).find(e => String(e.id) === String(eqId));
        if (!item) return;

        document.getElementById('editAssetTargetId').value = item.id;
        document.getElementById('editAssetName').value = item.name || '';
        document.getElementById('editAssetModel').value = item.model || '';
        document.getElementById('editAssetSerial').value = item.serial || '';
        const instDate = item.installDate && item.installDate !== 'N/A' ? item.installDate : (item.lastPM || new Date().toISOString().split('T')[0]);
        document.getElementById('editAssetInstalledDate').value = instDate;
        document.getElementById('editAssetFacility').value = item.facility || '';
        document.getElementById('editAssetDept').value = item.department || item.dept || 'Clinical Laboratory';
        document.getElementById('editAssetStatus').value = normalizeStatusLabel(item.status);

        document.getElementById('seiralabEditEquipmentModal')?.classList.remove('hidden');
    }

    function closeInventoryEditModal() {
        document.getElementById('seiralabEditEquipmentModal')?.classList.add('hidden');
    }

    async function saveInventoryEditedAsset(event) {
        event.preventDefault();
        if (isVisitorUser()) return;

        const targetId = document.getElementById('editAssetTargetId').value;
        const list = window.equipmentList || [];
        const idx = list.findIndex(e => String(e.id) === String(targetId));
        if (idx === -1) return;

        const updatedName = document.getElementById('editAssetName').value.trim();
        const updatedModel = document.getElementById('editAssetModel').value.trim();
        const updatedSerial = document.getElementById('editAssetSerial').value.trim();
        const updatedInstallDate = document.getElementById('editAssetInstalledDate').value;
        const updatedFacility = document.getElementById('editAssetFacility').value.trim();
        const updatedDept = document.getElementById('editAssetDept').value.trim();
        const updatedStatus = normalizeStatusLabel(document.getElementById('editAssetStatus').value);

        list[idx] = {
            ...list[idx],
            name: updatedName,
            model: updatedModel,
            serial: updatedSerial,
            installDate: updatedInstallDate,
            lastPM: updatedInstallDate,
            nextDue: computeNextPMFromInstall(updatedInstallDate),
            facility: updatedFacility,
            department: updatedDept,
            dept: updatedDept,
            status: updatedStatus
        };

        window.equipmentList = list;
        try { if (typeof equipmentList !== 'undefined') equipmentList = list; } catch (_) {}
        localStorage.setItem('seiralab_equipment', JSON.stringify(list));

        closeInventoryEditModal();
        rebuildHospitalAndDeptFilters();
        renderFullSearchableInventoryTable();
        syncDashboardCountersAndTables();
        renderFullPMScheduleCards();
        renderReportsAnalyticsSection();

        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Updated ${updatedName} (${updatedModel})!`);
        }
        if (typeof pushToGitHub === 'function') {
            await pushToGitHub(`Edit Equipment: ${updatedName} (${updatedSerial}) — Status: ${updatedStatus}`);
        }
    }

    async function deleteInventoryAsset(eqId) {
        if (!isHeadOrAdminUser()) {
            if (typeof showNotificationToast === 'function') showNotificationToast('Only Head Technical & MasterAdmin can delete equipment.', true);
            return;
        }
        const list = window.equipmentList || [];
        const target = list.find(e => String(e.id) === String(eqId));
        if (!target) return;
        if (!confirm(`Delete "${target.name} (${target.model})" at ${target.facility}?`)) return;

        window.equipmentList = list.filter(e => String(e.id) !== String(eqId));
        try { if (typeof equipmentList !== 'undefined') equipmentList = window.equipmentList; } catch (_) {}
        localStorage.setItem('seiralab_equipment', JSON.stringify(window.equipmentList));

        rebuildHospitalAndDeptFilters();
        renderFullSearchableInventoryTable();
        syncDashboardCountersAndTables();
        renderFullPMScheduleCards();
        renderReportsAnalyticsSection();
        if (typeof showNotificationToast === 'function') showNotificationToast(`Deleted ${target.name}.`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(`Delete Equipment: ${target.name} (${target.serial})`);
    }

    function bindInventorySearchAndFilterListeners() {
        const invSection = document.getElementById('inventory');
        if (!invSection) return;

        const searchInput = document.getElementById('inventorySearch') ||
                            document.getElementById('searchInput') ||
                            invSection.querySelector('input[type="text"], input[type="search"]');
        if (searchInput && !searchInput.dataset.boundDebouncedSearch) {
            searchInput.dataset.boundDebouncedSearch = 'true';
            searchInput.placeholder = 'Search by equipment, model, serial, or hospital...';
            searchInput.removeAttribute('onkeyup');
            searchInput.removeAttribute('oninput');
            searchInput.addEventListener('input', () => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(renderFullSearchableInventoryTable, 120);
            });
        }

        invSection.querySelectorAll('select').forEach(sel => {
            if (!sel.dataset.boundEnhancedFilter) {
                sel.dataset.boundEnhancedFilter = 'true';
                sel.removeAttribute('onchange');
                sel.addEventListener('change', renderFullSearchableInventoryTable);
            }
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
        invSection.querySelectorAll('button').forEach(btn => { if (btn.innerText.includes('Add Equipment')) addEqBtn = btn; });

        if (addEqBtn && !document.getElementById('btnInventoryImportAsset')) {
            const parentDiv = addEqBtn.parentElement;
            parentDiv.className = 'flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2';
            const importBtn = document.createElement('button');
            importBtn.type = 'button';
            importBtn.id = 'btnInventoryImportAsset';
            importBtn.onclick = triggerAssetImportPicker;
            importBtn.className = 'inline-flex items-center justify-center px-3.5 py-2 bg-white border border-slate-300 hover:border-teal-600 text-slate-700 rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-all space-x-1.5 cursor-pointer';
            importBtn.innerHTML = `<span>Import Asset Data (.xlsx / .xls / .csv)</span>`;
            parentDiv.insertBefore(importBtn, addEqBtn);
        }

        if (document.body && !document.getElementById('seiralabAssetFileInput')) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'seiralabAssetFileInput';
            fileInput.accept = '.xlsx,.xls,.csv,.json,.txt';
            fileInput.className = 'hidden';
            fileInput.addEventListener('change', handleAssetDataFileImport);
            document.body.appendChild(fileInput);
        }

        bindInventorySearchAndFilterListeners();
    }

    function triggerAssetImportPicker() {
        if (isVisitorUser()) return;
        relocateImportAssetButtonAndFixInput();
        const fileInput = document.getElementById('seiralabAssetFileInput');
        if (fileInput) { fileInput.value = ''; fileInput.click(); }
    }

    function removeRiskFromAllUI() {
        if (!document.getElementById('hideAllRiskColumnsStyle')) {
            const style = document.createElement('style');
            style.id = 'hideAllRiskColumnsStyle';
            style.textContent = `#dashboard table th:nth-child(3), #dashboard table td:nth-child(3), #inventory table th:nth-child(5), #inventory table td:nth-child(5) { display: none !important; }`;
            document.head.appendChild(style);
        }
    }


    // ========================================================================
    // 6. OFFICIAL SERVICE REPORT SERIES ENGINE (05535+) & EDIT WORKFLOW
    // ========================================================================
    function ensureSequentialReportNumbers() {
        if (!Array.isArray(window.historyLogs)) {
            try { window.historyLogs = JSON.parse(localStorage.getItem('seiralab_history') || '[]'); } catch (_) { window.historyLogs = []; }
        }
        let maxNum = 5534;
        const used = new Set();
        window.historyLogs.forEach(l => {
            if (l.reportNo && /^\d+$/.test(String(l.reportNo))) {
                const n = parseInt(l.reportNo, 10);
                if (!used.has(n)) { used.add(n); if (n > maxNum) maxNum = n; } else { l.reportNo = ''; }
            }
        });
        let changed = false;
        for (let i = window.historyLogs.length - 1; i >= 0; i--) {
            const l = window.historyLogs[i];
            if (!l.reportNo || !/^\d+$/.test(String(l.reportNo))) {
                maxNum++;
                while (used.has(maxNum)) maxNum++;
                l.reportNo = String(maxNum).padStart(5, '0');
                used.add(maxNum);
                changed = true;
            }
        }
        if (changed) localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
    }

    function getNextAvailableServiceReportNo() {
        ensureSequentialReportNumbers();
        let maxNum = 5534;
        (window.historyLogs || []).forEach(l => { const n = parseInt(l.reportNo || '0', 10); if (!isNaN(n) && n > maxNum) maxNum = n; });
        return String(maxNum + 1).padStart(5, '0');
    }

    function setServiceReportReadOnlyState(isReadOnly) {
        const sheet = document.getElementById('srPaperSheet');
        if (!sheet) return;
        sheet.classList.toggle('sr-readonly-mode', isReadOnly);
        const ids = ['srDate', 'srCompany', 'srTel', 'srContact', 'srDepartment', 'srAddress', 'srComplaints', 'srEquipmentName', 'srModel', 'srSerial', 'srEqArea1', 'srEqArea2', 'srFindings', 'srActionTaken', 'srServiceAmount', 'srParts', 'srPartsAmount', 'srRemarks', 'srTechnicianName', 'srTechDate', 'srCustomerSign', 'srCustomerDate'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.readOnly = isReadOnly; });
        ['srChkWarranty', 'srChkOutWarranty', 'srChkCheckup', 'srChkCleaning', 'srChkContract', 'srChkOrientation', 'srChkDelivery'].forEach(id => {
            const chk = document.getElementById(id); if (chk) chk.disabled = isReadOnly;
        });
    }

    function populateServiceReportFields(log, reportNumber) {
        const todayStr = new Date().toISOString().split('T')[0];
        const details = log?.srDetails || {};
        document.getElementById('srReportNo').value = reportNumber;
        document.getElementById('srDate').value = details.date ?? log?.date ?? todayStr;
        document.getElementById('srCompany').value = details.company ?? log?.facility ?? '';
        document.getElementById('srTel').value = details.tel ?? '';
        document.getElementById('srContact').value = details.contact ?? '';
        document.getElementById('srDepartment').value = details.department ?? '';
        document.getElementById('srAddress').value = details.address ?? '';
        document.getElementById('srComplaints').value = details.complaints ?? log?.type ?? '';
        document.getElementById('srEquipmentName').value = details.equipmentName ?? log?.eqName ?? '';
        document.getElementById('srModel').value = details.model ?? log?.model ?? '';
        document.getElementById('srSerial').value = details.serial ?? log?.serial ?? '';
        document.getElementById('srEqArea1').value = details.eqArea1 ?? '';
        document.getElementById('srEqArea2').value = details.eqArea2 ?? '';
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
        if (isVisitorUser()) { if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access.', true); return; }
        ensureFeatureModalsExist();
        ensureSequentialReportNumbers();
        currentServiceReportMode = 'register';
        currentEditingLogId = null;
        window._activeSrLogId = null;

        const nextSeriesNo = getNextAvailableServiceReportNo();
        populateServiceReportFields(null, nextSeriesNo);
        setServiceReportReadOnlyState(false);

        document.getElementById('srModeBadge').innerText = `New #${nextSeriesNo}`;
        document.getElementById('srBtnSaveReport')?.classList.remove('hidden');
        document.getElementById('srBtnSaveLabel').innerText = 'Register Service Report';
        document.getElementById('srBtnUnlockEdit')?.classList.add('hidden');
        document.getElementById('seiralabServiceReportModal')?.classList.remove('hidden');
    }

    function openServiceReportForViewing(logId) {
        ensureFeatureModalsExist();
        ensureSequentialReportNumbers();
        const log = (window.historyLogs || []).find(l => String(l.id) === String(logId));
        if (!log) { openNewServiceReportRegistration(); return; }

        currentServiceReportMode = 'view';
        currentEditingLogId = log.id;
        window._activeSrLogId = log.id;
        populateServiceReportFields(log, log.reportNo || '05535');
        setServiceReportReadOnlyState(true);

        document.getElementById('srModeBadge').innerText = `Viewing #${log.reportNo}`;
        document.getElementById('srBtnSaveReport')?.classList.add('hidden');

        const unlockBtn = document.getElementById('srBtnUnlockEdit');
        const unlockLabel = document.getElementById('srBtnUnlockEditLabel');
        if (unlockBtn && !isVisitorUser()) {
            unlockBtn.classList.remove('hidden');
            if (unlockLabel) unlockLabel.innerText = (isHeadOrAdminUser() || log.editRequestStatus === 'approved') ? 'Edit Report' : 'Request Edit';
        } else if (unlockBtn) { unlockBtn.classList.add('hidden'); }

        document.getElementById('seiralabServiceReportModal')?.classList.remove('hidden');
    }

    function requestEditServiceReport(logId) {
        if (isVisitorUser()) return;
        ensureFeatureModalsExist();
        const log = (window.historyLogs || []).find(l => String(l.id) === String(logId));
        if (!log) return;

        currentEditingLogId = log.id;
        window._activeSrLogId = log.id;
        if (isHeadOrAdminUser() || log.editRequestStatus === 'approved') {
            currentServiceReportMode = 'edit';
            populateServiceReportFields(log, log.reportNo || '05535');
            setServiceReportReadOnlyState(false);
            document.getElementById('srModeBadge').innerText = `Editing #${log.reportNo} (Authorized)`;
            document.getElementById('srBtnSaveReport')?.classList.remove('hidden');
            document.getElementById('srBtnSaveLabel').innerText = 'Save Edited Report';
            document.getElementById('srBtnUnlockEdit')?.classList.add('hidden');
            document.getElementById('seiralabServiceReportModal')?.classList.remove('hidden');
            return;
        }

        if (log.editRequestStatus === 'pending') {
            if (typeof showNotificationToast === 'function') showNotificationToast(`Edit request for SR #${log.reportNo} is already awaiting Head / Admin approval.`);
            return;
        }

        document.getElementById('srEditRequestTargetLabel').innerText = `SR #${log.reportNo} — ${log.eqName}`;
        document.getElementById('srReqReasonInput').value = '';
        document.getElementById('srEditRequestModal')?.classList.remove('hidden');
    }

    function closeEditRequestModal() { document.getElementById('srEditRequestModal')?.classList.add('hidden'); }

    async function submitTechnicalEditRequest(event) {
        event.preventDefault();
        const log = (window.historyLogs || []).find(l => String(l.id) === String(currentEditingLogId));
        if (!log) return;

        log.editRequestStatus = 'pending';
        log.editRequestedBy = (document.getElementById('srReqEngineerName')?.value || 'Technical').trim();
        log.editRequestReason = (document.getElementById('srReqReasonInput')?.value || '').trim();

        localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
        closeEditRequestModal();
        closeServiceReportModal();
        upgradeMaintenanceHistoryCertificateButtons();
        buildSystemNotifications();
        if (typeof showNotificationToast === 'function') showNotificationToast(`Sent edit request for SR #${log.reportNo}!`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(`Request Edit on SR #${log.reportNo}`);
    }

    async function resolveServiceReportEditRequest(logId, decision) {
        if (!isHeadOrAdminUser()) return;
        const log = (window.historyLogs || []).find(l => String(l.id) === String(logId));
        if (!log) return;

        log.editRequestStatus = decision === 'accept' ? 'approved' : 'declined';
        localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
        upgradeMaintenanceHistoryCertificateButtons();
        buildSystemNotifications();
        if (typeof showNotificationToast === 'function') showNotificationToast(decision === 'accept' ? `Approved edit for SR #${log.reportNo}!` : `Declined edit.`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(`${decision === 'accept' ? 'Approved' : 'Declined'} SR Edit #${log.reportNo}`);
    }

    async function saveRegisteredServiceReport() {
        if (currentServiceReportMode === 'view') return;
        const reportNo = document.getElementById('srReportNo')?.value.trim() || getNextAvailableServiceReportNo();
        const srDetails = {
            date: document.getElementById('srDate')?.value.trim() || new Date().toISOString().split('T')[0],
            company: document.getElementById('srCompany')?.value.trim() || '',
            tel: document.getElementById('srTel')?.value.trim() || '',
            contact: document.getElementById('srContact')?.value.trim() || '',
            department: document.getElementById('srDepartment')?.value.trim() || '',
            address: document.getElementById('srAddress')?.value.trim() || '',
            complaints: document.getElementById('srComplaints')?.value.trim() || '',
            equipmentName: document.getElementById('srEquipmentName')?.value.trim() || 'Medical Equipment',
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
            technicianName: document.getElementById('srTechnicianName')?.value.trim() || ''
        };

        const payload = {
            id: currentEditingLogId || Date.now(),
            reportNo,
            date: srDetails.date,
            eqName: srDetails.equipmentName,
            model: srDetails.model,
            serial: srDetails.serial,
            facility: srDetails.company || 'Client Facility',
            type: srDetails.complaints || 'Service & Maintenance Report',
            tech: srDetails.technicianName || 'Biomedical Engineer',
            notes: [srDetails.findings, srDetails.actionTaken, srDetails.remarks].filter(Boolean).join(' — ') || 'Service report logged.',
            srDetails,
            editRequestStatus: 'none'
        };

        let commitMsg = '';
        if (currentServiceReportMode === 'edit' && currentEditingLogId) {
            const idx = window.historyLogs.findIndex(l => String(l.id) === String(currentEditingLogId));
            if (idx !== -1) {
                payload.reportNo = window.historyLogs[idx].reportNo || reportNo;
                window.historyLogs[idx] = { ...window.historyLogs[idx], ...payload };
                commitMsg = `Save Edited Service Report #${payload.reportNo}`;
            }
        } else {
            window.historyLogs.unshift(payload);
            commitMsg = `Register Service Report #${reportNo}`;
        }

        localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
        closeServiceReportModal();
        if (typeof window.renderHistoryTable === 'function') window.renderHistoryTable();
        upgradeMaintenanceHistoryCertificateButtons();
        syncDashboardCountersAndTables();
        if (typeof showNotificationToast === 'function') showNotificationToast(`Saved Service Report #${payload.reportNo}!`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(commitMsg);
    }

    function closeServiceReportModal() { document.getElementById('seiralabServiceReportModal')?.classList.add('hidden'); }

    async function deleteServiceReportLog(logId) {
        if (!isHeadOrAdminUser()) { if (typeof showNotificationToast === 'function') showNotificationToast('Only Head Technical & MasterAdmin can delete Service Reports.', true); return; }
        const target = (window.historyLogs || []).find(l => String(l.id) === String(logId));
        if (!target) return;
        if (confirm(`Delete Service Report #${target.reportNo || target.id}?`)) {
            window.historyLogs = window.historyLogs.filter(l => String(l.id) !== String(logId));
            localStorage.setItem('seiralab_history', JSON.stringify(window.historyLogs));
            if (typeof window.renderHistoryTable === 'function') window.renderHistoryTable();
            upgradeMaintenanceHistoryCertificateButtons();
            buildSystemNotifications();
            if (typeof showNotificationToast === 'function') showNotificationToast(`Deleted SR #${target.reportNo}`);
            if (typeof pushToGitHub === 'function') await pushToGitHub(`Delete SR #${target.reportNo}`);
        }
    }

    function renderPendingEditRequestsBanner() {
        const historySection = document.getElementById('history');
        if (!historySection) return;
        let banner = document.getElementById('srPendingApprovalsBanner');
        const pendingLogs = (window.historyLogs || []).filter(l => l.editRequestStatus === 'pending');

        if (pendingLogs.length === 0) { if (banner) banner.remove(); return; }

        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'srPendingApprovalsBanner';
            const firstChild = historySection.querySelector('div:first-child');
            if (firstChild && firstChild.nextSibling) historySection.insertBefore(banner, firstChild.nextSibling);
            else historySection.prepend(banner);
        }

        const canApprove = isHeadOrAdminUser();
        const rowsHTML = pendingLogs.map(log => {
            const safeId = String(log.id).replace(/'/g, "\\'");
            const controls = canApprove
                ? `<div class="flex items-center space-x-2 shrink-0"><button type="button" onclick="resolveServiceReportEditRequest('${safeId}', 'accept')" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Accept</button><button type="button" onclick="resolveServiceReportEditRequest('${safeId}', 'decline')" class="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer">Decline</button></div>`
                : `<span class="px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-full text-[11px] font-bold">Awaiting Head / Admin Approval</span>`;

            return `<div class="bg-white border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3"><div><span class="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono text-xs font-bold rounded">SR #${log.reportNo || '05535'}</span><span class="text-xs font-bold text-slate-900 ml-2">${log.eqName}</span><p class="text-xs text-slate-600 mt-1"><strong>${log.editRequestedBy || 'Technical'}:</strong> "${log.editRequestReason || 'Requesting edit'}"</p></div>${controls}</div>`;
        }).join('');

        banner.className = 'mb-4 bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2';
        banner.innerHTML = `<div class="text-xs font-bold uppercase tracking-wider text-amber-900">Pending Service Report Edit Requests (${pendingLogs.length})</div><div class="space-y-2">${rowsHTML}</div>`;
    }

    function upgradeMaintenanceHistoryCertificateButtons() {
        ensureFeatureModalsExist();
        ensureSequentialReportNumbers();
        renderPendingEditRequestsBanner();

        const historySection = document.getElementById('history');
        if (historySection) {
            const exportBtn = Array.from(historySection.querySelectorAll('button')).find(b => b.innerText.includes('Export'));
            const headerBtnContainer = exportBtn ? exportBtn.parentElement : historySection.querySelector('div:first-child');
            if (headerBtnContainer && !document.getElementById('btnOpenBlankServiceReport')) {
                const blankBtn = document.createElement('button');
                blankBtn.type = 'button';
                blankBtn.id = 'btnOpenBlankServiceReport';
                blankBtn.onclick = openNewServiceReportRegistration;
                blankBtn.className = 'inline-flex items-center justify-center px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap cursor-pointer mr-2';
                blankBtn.innerHTML = `<span>+ Service Report Form</span>`;
                headerBtnContainer.insertBefore(blankBtn, headerBtnContainer.firstChild);
            }
        }

        window.downloadCertificate = function (logId) { openServiceReportForViewing(logId); };

        const isSup = isHeadOrAdminUser();
        const isVis = isVisitorUser();
        const historyTbody = document.getElementById('historyTableBody');
        if (!historyTbody) return;

        historyTbody.querySelectorAll('tr').forEach((tr, idx) => {
            const actionCell = tr.querySelector('td:last-child');
            if (!actionCell) return;

            const existingRoleTag = actionCell.getAttribute('data-upgraded-role');
            const currentRoleKey = `${getActiveRole()}-${(window.historyLogs?.[idx]?.editRequestStatus || 'none')}`;
            if (existingRoleTag === currentRoleKey && !actionCell.innerText.includes('Certificate')) return;

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
                if (reqStatus === 'pending') statusPill = `<span class="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">Pending</span>`;
                else if (reqStatus === 'approved') statusPill = `<span class="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">Approved</span>`;

                dateCell.insertAdjacentHTML('beforeend', `<div class="sr-series-pill mt-1 flex items-center gap-1"><span class="px-2 py-0.5 bg-slate-100 border border-slate-300 font-mono text-[11px] font-bold rounded">SR #${seriesNo}</span>${statusPill}</div>`);
            }

            let editBtns = '';
            if (!isVis) {
                if (isSup) {
                    if (reqStatus === 'pending') {
                        editBtns += `<button type="button" onclick="resolveServiceReportEditRequest('${safeId}', 'accept')" class="px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Accept</button>`;
                    }
                    editBtns += `<button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer"><span>Edit</span></button>`;
                } else {
                    if (reqStatus === 'pending') editBtns = `<button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer">Requested</button>`;
                    else if (reqStatus === 'approved') editBtns = `<button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Edit (Approved)</button>`;
                    else editBtns = `<button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs cursor-pointer">Request Edit</button>`;
                }
            }

            const deleteBtn = isSup ? `<button type="button" onclick="deleteServiceReportLog('${safeId}')" class="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg cursor-pointer">${SVG_TRASH}</button>` : '';

            actionCell.setAttribute('data-upgraded-role', currentRoleKey);
            actionCell.innerHTML = `
                <div class="inline-flex items-center justify-end space-x-1.5">
                    ${editBtns}
                    <button type="button" onclick="openServiceReportForViewing('${safeId}')" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1.5 cursor-pointer">
                        ${SVG_EYE}
                        <span>Service Report</span>
                    </button>
                    ${deleteBtn}
                </div>`;
        });
    }

   // ========================================================================
    // UPGRADED SECTION 7:
    // - Circular Biomedical Team Favicon in Browser Tab (Screenshot 2)
    // - Top-Left Seiralab Logo & "About Us" Modal on Login Screen (Screenshot 1)
    // - Fixed Visible Role Name Next to Dropdown Arrow (Screenshot 3)
    // - Full Visual Charts & Progress Bars in Reports & Analytics (Screenshot 3)
    // ========================================================================

    function applyCircularTeamFaviconAndLoginLayout() {
        // 1. Set Browser Tab Icon to Circular Biomedical Technical Team Emblem (./team.png.jpg)
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        if (!link.dataset.biomedEmblemApplied) {
            link.dataset.biomedEmblemApplied = 'true';
            link.href = './team.png.jpg';

            // Crop into a crisp circular favicon via offscreen canvas
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                try {
                    const c = document.createElement('canvas');
                    c.width = 64;
                    c.height = 64;
                    const ctx = c.getContext('2d');
                    ctx.beginPath();
                    ctx.arc(32, 32, 30, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(img, 0, 0, 64, 64);
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = '#14b8a6';
                    ctx.stroke();
                    link.type = 'image/png';
                    link.href = c.toDataURL('image/png');
                } catch (_) {}
            };
            img.src = './team.png.jpg';
        }

        // 2. Ensure Seiralab Logo on Login Portal is pinned to Top-Left & bottom link says "About Us"
        const overlay = document.getElementById('loginPortalOverlay');
        if (overlay && !overlay.dataset.layoutUpgraded) {
            overlay.dataset.layoutUpgraded = 'true';

            // Move logo out of center card into top-left corner if still inside card
            const cardLogoImg = overlay.querySelector('.max-w-md img[src*="seiralab-logo"]');
            if (cardLogoImg && cardLogoImg.parentElement) {
                cardLogoImg.parentElement.remove();
            }

            if (!document.getElementById('loginTopLeftLogo')) {
                const topLeftLogo = document.createElement('div');
                topLeftLogo.id = 'loginTopLeftLogo';
                topLeftLogo.className = 'fixed top-4 left-4 sm:top-6 sm:left-6 z-20 inline-flex items-center bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2 shadow-xl border border-slate-200/80';
                topLeftLogo.innerHTML = `<img src="./seiralab-logo.jpg" alt="Seiralab Incorporated" class="h-8 sm:h-10 w-auto object-contain" onerror="this.onerror=null; this.src='./seiralab-logo.gIH9ySyn.jpg';">`;
                overlay.appendChild(topLeftLogo);
            }

            // Replace "Continue as Visitor" button with "About Us"
            const visitorBtn = overlay.querySelector('button[onclick*="enterVisitorModeDirect"]');
            if (visitorBtn) {
                visitorBtn.setAttribute('onclick', 'openAboutUsModal()');
                visitorBtn.className = 'inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 underline cursor-pointer';
                visitorBtn.innerHTML = `<span>About Us</span>`;
            }
        }

        // 3. Create "About Us" Modal if not present
        if (document.body && !document.getElementById('seiralabAboutUsModal')) {
            const aboutHTML = `
            <div id="seiralabAboutUsModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] hidden flex items-center justify-center p-4">
                <div class="bg-slate-900 border border-slate-700/80 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-center">
                    <button type="button" onclick="closeAboutUsModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl leading-none p-1 cursor-pointer">&times;</button>
                    <div class="w-20 h-20 mx-auto mb-3 rounded-full p-1 bg-gradient-to-tr from-teal-500 to-emerald-400 shadow-lg">
                        <img src="./team.png.jpg" alt="Biomedical Team" class="w-full h-full object-cover rounded-full bg-slate-900">
                    </div>
                    <h3 class="text-lg sm:text-xl font-extrabold tracking-wide uppercase text-teal-400">Seiralab Incorporated</h3>
                    <p class="text-xs font-semibold text-slate-300 mt-0.5">Diagnostic &amp; Medical Equipment &bull; "Committed to Care"</p>
                    <div class="mt-4 text-xs sm:text-sm text-slate-300 space-y-3 text-left bg-slate-950/70 border border-slate-800 rounded-2xl p-4 leading-relaxed">
                        <p><strong class="text-white">ATLAS Biomedical CMMS</strong> is the official Computerized Maintenance Management System engineered for the <strong class="text-teal-400">Seiralab Biomedical Technical Team</strong>.</p>
                        <p>Our engineering division provides preventive maintenance, ISO/DOH-traceable calibration, and rapid field service for clinical chemistry, hematology, electrolyte, immunoassay, and critical care equipment across <strong class="text-white">150+ partner hospitals and laboratories</strong> in Mindanao and Visayas.</p>
                        <div class="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                            <div><strong class="text-slate-200">Head Office:</strong> Unit 1-6, Level 2, MGM Bldg., Gensan Drive, Brgy. Sto. Niño, City of Koronadal, South Cotabato 9506</div>
                            <div><strong class="text-slate-200">Regional Hubs:</strong> Koronadal &bull; Davao &bull; Cebu &bull; Iloilo &bull; Cagayan de Oro &bull; General Santos</div>
                        </div>
                    </div>
                    <div class="mt-5">
                        <button type="button" onclick="closeAboutUsModal()" class="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                            Back to ATLAS Login
                        </button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', aboutHTML);
        }
    }

    function openAboutUsModal() {
        applyCircularTeamFaviconAndLoginLayout();
        document.getElementById('seiralabAboutUsModal')?.classList.remove('hidden');
    }

    function closeAboutUsModal() {
        document.getElementById('seiralabAboutUsModal')?.classList.add('hidden');
    }

    window.openAboutUsModal = openAboutUsModal;
    window.closeAboutUsModal = closeAboutUsModal;

    function enforceRoleNavigationAndMenuUI(forceRebuildMenu = false) {
        applyCircularTeamFaviconAndLoginLayout();
        const role = getActiveRole();
        const isSupervisor = (role === 'Head Technical' || role === 'MasterAdmin');
        const isVisitor = (!role || role === 'Visitor');

        const tabInventory = document.getElementById('tab-inventory');
        const tabReports = document.getElementById('tab-reports');
        const ghBtn = document.getElementById('ghStatusBtn');

        if (tabInventory) tabInventory.classList.toggle('hidden', !isSupervisor);
        if (tabReports) tabReports.classList.toggle('hidden', !isSupervisor);
        if (ghBtn) ghBtn.classList.toggle('hidden', !isSupervisor);

        const invSection = document.getElementById('inventory');
        const repSection = document.getElementById('reports');
        if (!isSupervisor && ((invSection && invSection.classList.contains('active')) || (repSection && repSection.classList.contains('active')))) {
            masterSwitchTab('dashboard');
        }

        // Fix Blank Role Text next to Dropdown Arrow (Screenshot 3):
        // Use `currentOpt.value = role` so even if app.js sets `roleSelect.value = role`, the text never turns blank!
        const roleSelect = document.getElementById('accessRoleSelect');
        if (roleSelect && (forceRebuildMenu || lastRenderedMenuRole !== role || roleSelect.options.length <= 1 || roleSelect.selectedIndex === -1)) {
            lastRenderedMenuRole = role;
            roleSelect.innerHTML = '';

            const currentOpt = document.createElement('option');
            currentOpt.value = role;
            currentOpt.textContent = role;
            currentOpt.selected = true;
            roleSelect.appendChild(currentOpt);

            if (isVisitor) {
                const signInOpt = document.createElement('option');
                signInOpt.value = '__SIGN_IN__';
                signInOpt.textContent = '🔑 Sign In to Account...';
                roleSelect.appendChild(signInOpt);
            } else {
                const switchOpt = document.createElement('option');
                switchOpt.value = '__SWITCH_ACCOUNT__';
                switchOpt.textContent = '🔄 Switch Other Account...';
                roleSelect.appendChild(switchOpt);

                const logoutOpt = document.createElement('option');
                logoutOpt.value = '__LOG_OUT__';
                logoutOpt.textContent = '🚪 Log Out';
                roleSelect.appendChild(logoutOpt);
            }

            roleSelect.value = role;

            const subtext = document.getElementById('accessRoleSubtext');
            if (subtext) {
                subtext.innerText = isVisitor ? 'View-Only Mode' : `Welcome, ${role}`;
            }

            roleSelect.onchange = async function () {
                const action = this.value;
                this.value = role;

                if (action === '__SIGN_IN__' || action === '__SWITCH_ACCOUNT__') {
                    const overlay = document.getElementById('loginPortalOverlay');
                    const passInput = document.getElementById('portalPasswordInput');
                    const errEl = document.getElementById('portalErrorMsg');
                    if (passInput) passInput.value = '';
                    if (errEl) errEl.classList.add('hidden');
                    if (overlay) overlay.classList.remove('hidden');
                    if (typeof window.startBiomedLiveWallpaper === 'function') {
                        window.startBiomedLiveWallpaper();
                    }
                } else if (action === '__LOG_OUT__') {
                    try { await fetch('/api/logout', { method: 'POST' }); } catch (_) {}
                    localStorage.removeItem('seiralab_session_token');
                    window.currentAccessRole = 'Visitor';
                    sessionStorage.setItem('seiralab_active_session_role', 'Visitor');
                    localStorage.setItem('seiralab_access_role', 'Visitor');

                    enforceRoleNavigationAndMenuUI(true);
                    upgradeMaintenanceHistoryCertificateButtons();
                    renderCalibrationTable();

                    const overlay = document.getElementById('loginPortalOverlay');
                    const passInput = document.getElementById('portalPasswordInput');
                    if (passInput) passInput.value = '';
                    if (overlay) overlay.classList.remove('hidden');
                    if (typeof window.startBiomedLiveWallpaper === 'function') {
                        window.startBiomedLiveWallpaper();
                    }
                }
            };
        }
    }

    function renderFullPMScheduleCards() {
        const grid = document.getElementById('scheduleCardsGrid') ||
                     document.getElementById('scheduleGrid') ||
                     document.querySelector('#schedule .grid');
        if (!grid) return;

        const filterVal = document.getElementById('scheduleFilter')?.value || 'all';
        const list = (window.equipmentList || []).filter(item => normalizeStatusLabel(item.status) !== 'PULL OUT');
        const today = new Date();

        const enriched = list.map(item => {
            const dueStr = item.nextDue || computeNextPMFromInstall(item.installDate || item.lastPM);
            const dueDate = new Date(dueStr);
            const diffDays = isNaN(dueDate.getTime()) ? 30 : Math.ceil((dueDate - today) / 86400000);
            return { ...item, nextDue: dueStr, diffDays };
        });

        enriched.sort((a, b) => a.diffDays - b.diffDays);

        const filtered = enriched.filter(item => {
            if (filterVal === 'overdue') return item.diffDays < 0;
            if (filterVal === 'due-soon') return item.diffDays >= 0 && item.diffDays <= 30;
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="col-span-full bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">No preventive maintenance tasks match the selected filter.</div>`;
            return;
        }

        const isVis = isVisitorUser();

        grid.innerHTML = filtered.slice(0, 60).map(item => {
            const isOverdue = item.diffDays < 0;
            const isSoon = item.diffDays >= 0 && item.diffDays <= 30;
            const badgeClass = isOverdue
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : (isSoon ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200');
            const badgeText = isOverdue
                ? `Overdue by ${Math.abs(item.diffDays)}d`
                : (item.diffDays === 0 ? 'Due Today' : `Due in ${item.diffDays}d`);

            const safeId = String(item.id).replace(/'/g, "\\'");
            const actionBtn = isVis
                ? `<span class="text-[11px] text-slate-400 italic mt-3 block">Sign in to log PM</span>`
                : `<button type="button" onclick="openInventoryServiceReport('${safeId}')" class="w-full mt-3 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5">
                       ${SVG_CLIPBOARD}
                       <span>Execute PM &amp; Service Report</span>
                   </button>`;

            return `
                <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between gap-2 mb-2">
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}">${badgeText}</span>
                            <span class="font-mono text-[11px] text-slate-400">SN: ${item.serial}</span>
                        </div>
                        <h4 class="font-bold text-slate-900 text-sm sm:text-base">${item.name}</h4>
                        <p class="text-xs font-semibold text-teal-700 mt-0.5">Model: ${item.model || 'Standard'}</p>
                        <div class="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                            <div><strong class="text-slate-800">Facility:</strong> ${item.facility}</div>
                            <div><strong class="text-slate-800">Section:</strong> ${item.department || item.dept || 'Clinical Lab'}</div>
                            <div class="flex items-center justify-between pt-1">
                                <span><strong class="text-slate-800">Installed:</strong> ${item.installDate || item.lastPM || 'N/A'}</span>
                                <span><strong class="text-slate-800">Next PM:</strong> <span class="font-mono font-bold">${item.nextDue}</span></span>
                            </div>
                        </div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        }).join('');
    }

    // Comprehensive Visual Reports & Fleet Analytics (Fixes Sparse/Empty Space in Screenshot 3)
    function renderReportsAnalyticsSection() {
        const container = document.getElementById('reportsContainer');
        if (!container) return;

        const allItems = window.equipmentList || [];
        const totalAll = allItems.length || 1;
        const today = new Date();

        let opCount = 0;
        let dueCount = 0;
        let repairCount = 0;
        let pullOutCount = 0;
        const deptCounts = {};
        const facCounts = {};

        allItems.forEach(item => {
            const st = normalizeStatusLabel(item.status);
            const dueStr = item.nextDue || computeNextPMFromInstall(item.installDate || item.lastPM);
            const diffDays = Math.ceil((new Date(dueStr) - today) / 86400000);

            if (st === 'PULL OUT') {
                pullOutCount++;
            } else if (st === 'Under Repair') {
                repairCount++;
            } else if (st === 'Maintenance Due' || diffDays <= 30) {
                dueCount++;
            } else {
                opCount++;
            }

            const d = item.department || item.dept || 'Clinical Laboratory';
            deptCounts[d] = (deptCounts[d] || 0) + 1;

            const f = item.facility || 'Unspecified Facility';
            facCounts[f] = (facCounts[f] || 0) + 1;
        });

        const totalSites = Object.keys(facCounts).length;
        const totalServiceLogs = (window.historyLogs || []).length;
        const totalCalCerts = (window.calibrationList || []).length;
        const activeFleet = Math.max(1, allItems.length - pullOutCount);
        const compliancePct = Math.round(((opCount + dueCount) / activeFleet) * 100);

        const statusRows = [
            { label: 'Operational (Verified)', count: opCount, pct: Math.round((opCount / totalAll) * 100), bar: 'bg-emerald-500', text: 'text-emerald-700' },
            { label: 'PM Due / Scheduled (Within 30d)', count: dueCount, pct: Math.round((dueCount / totalAll) * 100), bar: 'bg-amber-500', text: 'text-amber-700' },
            { label: 'Under Repair / Corrective Service', count: repairCount, pct: Math.round((repairCount / totalAll) * 100), bar: 'bg-rose-500', text: 'text-rose-700' },
            { label: 'PULL OUT (Inactive / Pulled Out)', count: pullOutCount, pct: Math.round((pullOutCount / totalAll) * 100), bar: 'bg-slate-500', text: 'text-slate-700' }
        ];

        const topDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const topFacs = Object.entries(facCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const maxFacCount = topFacs[0]?.[1] || 1;

        container.className = 'space-y-6';
        container.innerHTML = `
            <!-- Top Executive Summary KPI Row -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Partner Hospitals &amp; Labs</p>
                    <p class="text-2xl font-extrabold text-slate-900 mt-1">${totalSites}</p>
                    <p class="text-xs text-teal-600 font-medium mt-0.5">Active regional client sites</p>
                </div>
                <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fleet Availability Rate</p>
                    <p class="text-2xl font-extrabold text-emerald-600 mt-1">${compliancePct}%</p>
                    <p class="text-xs text-slate-500 mt-0.5">${opCount + dueCount} of ${activeFleet} active machines</p>
                </div>
                <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Registered Service Reports</p>
                    <p class="text-2xl font-extrabold text-slate-900 mt-1">${totalServiceLogs}</p>
                    <p class="text-xs text-teal-600 font-medium mt-0.5">Official SR #05535+ series</p>
                </div>
                <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Calibration Certificates</p>
                    <p class="text-2xl font-extrabold text-blue-600 mt-1">${totalCalCerts}</p>
                    <p class="text-xs text-slate-500 mt-0.5">DOH / ISO 17025 traceable</p>
                </div>
            </div>

            <!-- 2-Column Visual Breakdown Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Left Column: Equipment by Status + Departmental Modality Breakdown -->
                <div class="space-y-6">
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-slate-900 text-sm">Equipment Fleet by Operational Status</h3>
                            <span class="text-xs font-semibold text-slate-400">${allItems.length} Total Units</span>
                        </div>
                        <div class="space-y-3.5">
                            ${statusRows.map(s => `
                                <div>
                                    <div class="flex items-center justify-between text-xs mb-1">
                                        <span class="font-semibold text-slate-700">${s.label}</span>
                                        <span class="font-bold ${s.text}">${s.count} units (${s.pct}%)</span>
                                    </div>
                                    <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div class="${s.bar} h-full rounded-full transition-all" style="width: ${Math.max(s.count > 0 ? 4 : 0, s.pct)}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-slate-900 text-sm">Departmental &amp; Laboratory Section Distribution</h3>
                            <span class="text-xs font-semibold text-teal-600">By Modality</span>
                        </div>
                        <div class="space-y-3">
                            ${topDepts.map(([dept, count]) => {
                                const pct = Math.round((count / totalAll) * 100);
                                return `
                                    <div>
                                        <div class="flex items-center justify-between text-xs mb-1">
                                            <span class="font-semibold text-slate-700">${dept}</span>
                                            <span class="font-bold text-slate-900">${count} units (${pct}%)</span>
                                        </div>
                                        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div class="bg-teal-600 h-full rounded-full" style="width: ${Math.max(5, pct)}%"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Right Column: Top Client Hospitals & Laboratories Density -->
                <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-slate-900 text-sm">Top Client Hospitals &amp; Laboratories</h3>
                            <span class="text-xs font-semibold text-slate-400">Highest Installed Base</span>
                        </div>
                        <div class="space-y-3">
                            ${topFacs.map(([fac, count], idx) => {
                                const relWidth = Math.round((count / maxFacCount) * 100);
                                return `
                                    <div class="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
                                        <div class="flex items-center justify-between text-xs mb-1.5">
                                            <span class="font-bold text-slate-800 truncate pr-3">${idx + 1}. ${fac}</span>
                                            <span class="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md font-bold shrink-0">${count} units</span>
                                        </div>
                                        <div class="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                                            <div class="bg-gradient-to-r from-teal-600 to-emerald-500 h-full rounded-full" style="width: ${relWidth}%"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Showing top ${topFacs.length} of ${totalSites} partner facilities</span>
                        <button type="button" onclick="switchTab('inventory')" class="font-semibold text-teal-600 hover:text-teal-700 cursor-pointer">View All Assets &rarr;</button>
                    </div>
                </div>
            </div>
        `;
    }

    function masterSwitchTab(tabId) {
        const role = getActiveRole();
        const isSupervisor = (role === 'Head Technical' || role === 'MasterAdmin');
        if ((tabId === 'inventory' || tabId === 'reports') && !isSupervisor) {
            if (typeof window.showNotificationToast === 'function') {
                window.showNotificationToast('Access restricted to Head Technical & MasterAdmin.', true);
            }
            return;
        }

        document.querySelectorAll('.tab-content').forEach(sec => {
            if (sec.id === tabId) {
                sec.classList.add('active');
                sec.style.display = 'block';
            } else {
                sec.classList.remove('active');
                sec.style.display = 'none';
            }
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.id === `tab-${tabId}`) {
                btn.className = 'tab-btn border-b-2 border-teal-600 text-teal-600 py-3 px-1 text-xs sm:text-sm font-semibold flex items-center space-x-2 whitespace-nowrap cursor-pointer';
            } else {
                btn.className = 'tab-btn border-b-2 border-transparent text-slate-500 hover:text-slate-800 py-3 px-1 text-xs sm:text-sm font-medium flex items-center space-x-2 whitespace-nowrap cursor-pointer';
            }
        });

        enforceRoleNavigationAndMenuUI(false);

        if (tabId === 'dashboard') syncDashboardCountersAndTables();
        if (tabId === 'inventory') renderFullSearchableInventoryTable();
        if (tabId === 'schedule') renderFullPMScheduleCards();
        if (tabId === 'history') {
            if (typeof window.renderHistoryTable === 'function') {
                try { window.renderHistoryTable(); } catch (_) {}
            }
            upgradeMaintenanceHistoryCertificateButtons();
        }
        if (tabId === 'reports') renderReportsAnalyticsSection();
        if (tabId === 'calibration') renderCalibrationTable();
        if (tabId === 'tools') renderToolLogsTable();
    }

    window.switchTab = masterSwitchTab;
