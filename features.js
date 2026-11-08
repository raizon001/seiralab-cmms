// ============================================================================
// SEIRALAB CMMS - FEATURES.JS (BULLETPROOF SELF-HEALING EDITION)
// Zero scope conflicts with login-portal.js / app.js + Continuous DOM Watchdog
// ============================================================================

(function () {
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

    // ========================================================================
    // 0. SELF-HEALING MODALS (Waits until document.body is ready)
    // ========================================================================
    function ensureFeatureModalsExist() {
        if (!document.body) return;

        // 1. Borrow Tool Modal
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
                            <input type="text" id="toolBorrower" required placeholder="e.g., Eng. Barzce Barcelona" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Tool / Kit Name *</label>
                                <input type="text" id="toolName" required placeholder="e.g., Fluke 87V Multimeter" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Tool ID / Serial No. *</label>
                                <input type="text" id="toolCode" required placeholder="e.g., TL-SL-004" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Destination Hospital / Lab & Purpose *</label>
                            <input type="text" id="toolDestination" required placeholder="e.g., Cebu City Medical Center - PM" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Date Borrowed *</label>
                                <input type="date" id="toolBorrowDate" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Time Borrowed *</label>
                                <input type="time" id="toolBorrowTime" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            </div>
                        </div>
                        <div class="pt-4 flex items-center justify-end space-x-3">
                            <button type="button" onclick="closeBorrowToolModal()" class="px-4 py-2 bg-slate-100 text-slate-700 font-medium text-sm rounded-lg">Cancel</button>
                            <button type="submit" id="borrowToolSubmitBtn" class="px-4 py-2 bg-teal-600 text-white font-medium text-sm rounded-lg">Record Check-Out</button>
                        </div>
                    </form>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', toolModalHTML);
        }

        // 2. Official Certificate of Calibration Modal
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
                    <div class="flex items-center space-x-2.5">
                        <i data-lucide="award" class="w-5 h-5 text-teal-400"></i>
                        <div>
                            <div class="flex items-center space-x-2">
                                <h3 class="text-sm font-bold">Official Certificate of Calibration</h3>
                                <span id="calCertModeBadge" class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">New</span>
                            </div>
                            <p class="text-[11px] text-slate-400">Official Metrology Compliance Certificate</p>
                        </div>
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
                            <img src="./seiralab-logo.jpg" alt="Seiralab" class="h-20 sm:h-24 w-auto object-contain" onerror="this.onerror=null; this.src='./seiralab-logo.gIH9ySyn.jpg';">
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

        // 3. Calibration Edit Request Modal
        if (!document.getElementById('calEditRequestModal')) {
            const modalHtml = `
            <div id="calEditRequestModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[130] hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div class="flex items-center space-x-2.5">
                            <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><i data-lucide="send" class="w-5 h-5"></i></div>
                            <div>
                                <h4 class="text-sm font-bold text-slate-900">Request Calibration Edit</h4>
                                <p id="calEditReqLabel" class="text-[11px] text-slate-500">Send edit request to Head Technical / MasterAdmin</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('calEditRequestModal').classList.add('hidden')" class="text-slate-400 p-1"><i data-lucide="x" class="w-4 h-4"></i></button>
                    </div>
                    <form onsubmit="submitCalibrationEditRequest(event)" class="space-y-4 pt-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Requested By *</label>
                            <input type="text" id="calReqTechName" required placeholder="e.g., Eng. Barzce Barcelona" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Reason for Editing *</label>
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

        // 4. Official Seiralab Service Report Modal
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
                    <div class="flex items-center space-x-2.5">
                        <i data-lucide="file-text" class="w-5 h-5 text-teal-400"></i>
                        <div>
                            <div class="flex items-center space-x-2">
                                <h3 class="text-sm font-bold">Seiralab Official Service Report</h3>
                                <span id="srModeBadge" class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">New</span>
                            </div>
                            <p id="srModalSubtitleText" class="text-[11px] text-slate-400">Fill out details below and click Register</p>
                        </div>
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
                        <img src="./seiralab-logo.jpg" alt="Seiralab" class="h-20 sm:h-24 w-auto object-contain mx-auto" onerror="this.onerror=null; this.src='./seiralab-logo.gIH9ySyn.jpg';">
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
                            <div class="sm:col-span-6 flex items-end"><span class="font-bold shrink-0 mr-1.5">Next Due / Status:</span><input type="text" id="srEqArea2" class="w-full border-b border-slate-800 px-1 py-0.5 focus:outline-none"></div>
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

        // 5. Service Report Edit Request Modal
        if (!document.getElementById('srEditRequestModal')) {
            const modalHtml = `
            <div id="srEditRequestModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[130] hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div class="flex items-center space-x-2.5">
                            <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><i data-lucide="send" class="w-5 h-5"></i></div>
                            <div>
                                <h4 class="text-sm font-bold text-slate-900">Request Permission to Edit</h4>
                                <p id="srEditRequestTargetLabel" class="text-[11px] text-slate-500">Send request to Head Technical / MasterAdmin</p>
                            </div>
                        </div>
                        <button type="button" onclick="closeEditRequestModal()" class="text-slate-400 p-1"><i data-lucide="x" class="w-4 h-4"></i></button>
                    </div>
                    <form onsubmit="submitTechnicalEditRequest(event)" class="space-y-4 pt-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Requested By (Engineer) *</label>
                            <input type="text" id="srReqEngineerName" required placeholder="e.g., Eng. Barzce Barcelona" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Reason for Editing *</label>
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
    // 1. NOTIFICATIONS
    // ========================================================================
    function buildSystemNotifications() {
        const list = document.getElementById('notificationList');
        const badge = document.getElementById('notificationBadge');
        if (!list) return;

        const today = new Date();
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
            const diffDays = Math.ceil((new Date(cal.nextDue) - today) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
                alerts.push({ type: diffDays < 0 ? 'overdue' : 'upcoming', title: `${diffDays < 0 ? 'Recalibration Overdue' : 'Recalibration Due'}: ${cal.eqName}`, desc: `Cert ${cal.id} at ${cal.facility} — Due ${cal.nextDue}`, tab: 'calibration' });
            }
        });
        (window.equipmentList || []).forEach(eq => {
            const diffDays = Math.ceil((new Date(eq.nextDue) - today) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                alerts.push({ type: 'overdue', title: `Overdue PM: ${eq.name}`, desc: `${eq.facility} (${eq.model}) — Overdue by ${Math.abs(diffDays)} days (Due: ${eq.nextDue})`, tab: 'schedule' });
            } else if (diffDays <= 14) {
                alerts.push({ type: 'upcoming', title: `Upcoming PM Due in ${diffDays}d: ${eq.name}`, desc: `${eq.facility} (${eq.model}) — Scheduled for ${eq.nextDue}`, tab: 'schedule' });
            }
        });
        (window.toolLogs || []).forEach(tool => {
            if (tool.status === 'Borrowed') {
                alerts.push({ type: 'tool', title: `Tool Currently Out: ${tool.toolName}`, desc: `Borrowed by ${tool.borrower} for ${tool.destination} (${tool.borrowDate})`, tab: 'tools' });
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

        alerts.slice(0, 30).forEach(a => {
            const boxStyle = a.type === 'overdue' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900';
            list.innerHTML += `
                <div onclick="jumpFromNotification('${a.tab}')" class="p-3 rounded-xl border ${boxStyle} flex items-start justify-between cursor-pointer transition-colors mb-2">
                    <div><p class="text-xs font-bold">${a.title}</p><p class="text-[11px] opacity-80 mt-0.5">${a.desc}</p></div>
                    <span class="text-[10px] font-semibold underline ml-2 shrink-0">View &rarr;</span>
                </div>`;
        });
    }

    function openNotificationModal() { buildSystemNotifications(); document.getElementById('notificationModal')?.classList.remove('hidden'); }
    function closeNotificationModal() { document.getElementById('notificationModal')?.classList.add('hidden'); }
    function jumpFromNotification(tabId) { closeNotificationModal(); if (typeof window.switchTab === 'function') window.switchTab(tabId); }

    // ========================================================================
    // 2. CALIBRATION REPORTS & OFFICIAL CERTIFICATE OF CALIBRATION
    // ========================================================================
    function upgradeCalibrationToolbarUI() {
        ensureFeatureModalsExist();
        const calHeader = document.querySelector('#calibration > div:first-child');
        if (!calHeader) return;
        let calToolbar = calHeader.querySelector('div:nth-child(2)');
        if (!calToolbar) return;

        if (!calToolbar.querySelector('#btnAddCalibrationReport')) {
            calToolbar.className = 'flex items-center space-x-2.5 shrink-0 flex-wrap gap-2';
            calToolbar.innerHTML = `
                <button type="button" id="btnAddCalibrationReport" onclick="openAddCalibrationModal()" class="inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap cursor-pointer">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    <span>Add Calibration Report</span>
                </button>
                <button type="button" id="btnPrintCalibrationReport" onclick="openLatestCalibrationCertForPrint()" class="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold text-xs sm:text-sm shadow-xs transition-all space-x-1.5 whitespace-nowrap cursor-pointer">
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
        (window.calibrationList || []).forEach(item => {
            const diffDays = Math.ceil((new Date(item.nextDue) - today) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) dueSoonCount++;
        });

        const elTotal = document.getElementById('statCalTotal');
        const elDue = document.getElementById('statCalDue');
        if (elTotal) elTotal.innerText = window.calibrationList.length;
        if (elDue) elDue.innerText = dueSoonCount;

        tbody.innerHTML = '';
        if (window.calibrationList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No calibration records found.</td></tr>`;
            return;
        }

        const isVis = isVisitorUser();
        const isSup = isHeadOrAdminUser();

        window.calibrationList.slice(0, 100).forEach(item => {
            const diffDays = Math.ceil((new Date(item.nextDue) - today) / (1000 * 60 * 60 * 24));
            const dueColor = diffDays < 0 ? 'text-rose-600 font-semibold' : (diffDays <= 30 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-medium');
            const safeId = String(item.id).replace(/'/g, "\\'");
            const reqStatus = item.editRequestStatus || 'none';

            let editBtnHTML = '';
            if (!isVis) {
                if (isSup) {
                    if (reqStatus === 'pending') {
                        editBtnHTML += `<button type="button" onclick="resolveCalibrationEditRequest('${safeId}', 'accept')" class="px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Accept</button>`;
                    }
                    editBtnHTML += `<button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i><span>Edit</span></button>`;
                } else {
                    if (reqStatus === 'pending') {
                        editBtnHTML = `<button type="button" class="px-2.5 py-1.5 bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold">Requested</button>`;
                    } else if (reqStatus === 'approved') {
                        editBtnHTML = `<button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">Edit (Approved)</button>`;
                    } else {
                        editBtnHTML = `<button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold">Request Edit</button>`;
                    }
                }
            }

            const deleteBtnHTML = isSup ? `<button type="button" onclick="deleteCalibrationReport('${safeId}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : '';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50/50 transition-colors">
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
                                <i data-lucide="award" class="w-3.5 h-3.5"></i>
                                <span>Certificate</span>
                            </button>
                            ${deleteBtnHTML}
                        </div>
                    </td>
                </tr>`;
        });
        if (window.lucide) lucide.createIcons();
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
        if (window.lucide) lucide.createIcons();
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
        if (window.lucide) lucide.createIcons();
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
            if (window.lucide) lucide.createIcons();
            return;
        }

        document.getElementById('calEditReqLabel').innerText = `Certificate #${item.id} — ${item.eqName}`;
        document.getElementById('calReqReason').value = '';
        document.getElementById('calEditRequestModal')?.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
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
            buildSystemNotifications();
            if (typeof showNotificationToast === 'function') showNotificationToast(`Deleted Cert #${target.id}`);
            if (typeof pushToGitHub === 'function') await pushToGitHub(`Delete Calibration Cert #${target.id}`);
        }
    }

    // ========================================================================
    // 3. BIOMED OFFICE TOOL LOGBOOK
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

        tbody.innerHTML = '';
        if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No tool records found.</td></tr>`; return; }

        const isVis = isVisitorUser();
        filtered.forEach(log => {
            const statusBadge = log.status === 'Borrowed' ? `<span class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">Borrowed (Out)</span>` : `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Returned</span>`;
            let actionBtns = `<span class="text-xs text-slate-400 italic">View Only</span>`;
            if (!isVis) {
                const returnBtn = log.status === 'Borrowed' ? `<button type="button" onclick="markToolReturned(${log.id})" class="px-2.5 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium">Return</button>` : '';
                actionBtns = `<div class="inline-flex items-center space-x-1.5">${returnBtn}<button type="button" onclick="deleteToolLog(${log.id})" class="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
            }
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="p-4 font-semibold text-slate-900">${log.borrower}</td>
                    <td class="p-4 font-medium text-slate-800">${log.toolName}<br><span class="text-xs font-mono text-slate-400">ID: ${log.toolCode}</span></td>
                    <td class="p-4 text-xs text-slate-600">${log.destination}</td>
                    <td class="p-4 text-xs font-medium text-slate-800">${log.borrowDate}<br><span class="text-teal-600 font-semibold">${formatTime12Hr(log.borrowTime)}</span></td>
                    <td class="p-4 text-xs text-slate-600">${log.returnDateTime || '<span class="text-amber-600 italic">Still out</span>'}</td>
                    <td class="p-4">${statusBadge}</td>
                    <td class="p-4 text-right">${actionBtns}</td>
                </tr>`;
        });
        if (window.lucide) lucide.createIcons();
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
        if (window.lucide) lucide.createIcons();
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
    // 4. MULTI-SHEET EXCEL (.XLS / .XLSX) IMPORTER (FIXED FOR installation.xls)
    // ========================================================================
    function ensureSheetJSLoaded() {
        return new Promise((resolve, reject) => {
            if (window.XLSX) return resolve(window.XLSX);
            const script = document.createElement('script');
            script.id = 'sheetjs-cdn-script';
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            script.onload = () => resolve(window.XLSX);
            script.onerror = () => reject(new Error('Failed to load SheetJS'));
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
        invSection.querySelectorAll('button').forEach(btn => { if (btn.innerText.includes('Add Equipment')) addEqBtn = btn; });

        if (addEqBtn && !document.getElementById('btnInventoryImportAsset')) {
            const parentDiv = addEqBtn.parentElement;
            parentDiv.className = 'flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2';
            const importBtn = document.createElement('button');
            importBtn.type = 'button';
            importBtn.id = 'btnInventoryImportAsset';
            importBtn.onclick = triggerAssetImportPicker;
            importBtn.className = 'inline-flex items-center justify-center px-3.5 py-2 bg-white border border-slate-300 hover:border-teal-600 text-slate-700 rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-all space-x-1.5 cursor-pointer';
            importBtn.innerHTML = `<i data-lucide="file-spreadsheet" class="w-4 h-4 text-teal-600"></i><span>Import Asset Data (.xlsx / .xls / .csv)</span>`;
            parentDiv.insertBefore(importBtn, addEqBtn);
            if (window.lucide) lucide.createIcons();
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
    }

    function triggerAssetImportPicker() {
        if (isVisitorUser()) return;
        relocateImportAssetButtonAndFixInput();
        const fileInput = document.getElementById('seiralabAssetFileInput');
        if (fileInput) { fileInput.value = ''; fileInput.click(); }
    }

    function parseFlexibleInstallDate(val) {
        if (val !== undefined && val !== null && val !== '') {
            if (typeof val === 'number' && val > 20000 && val < 80000) {
                const utcDays = Math.floor(val - 25569);
                const d = new Date(utcDays * 86400 * 1000);
                if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            }
            if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().split('T')[0];
            let str = String(val).trim().replace(/\s+/g, ' ').replace(/,(\d{4})/, ', $1');
            const parsed = new Date(str);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1995 && parsed.getFullYear() <= 2035) {
                return parsed.toISOString().split('T')[0];
            }
        }
        return new Date().toISOString().split('T')[0];
    }

    function computeNextPMFromInstall(installDateStr) {
        const base = new Date(installDateStr);
        const next = isNaN(base.getTime()) ? new Date() : new Date(base);
        next.setMonth(next.getMonth() + 6);
        const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 2);
        while (next < cutoff) next.setMonth(next.getMonth() + 6);
        return next.toISOString().split('T')[0];
    }

    function inferDepartmentFromProduct(productType, brand) {
        const p = `${productType || ''} ${brand || ''}`.toLowerCase();
        if (p.includes('hematology') || p.includes('coagulation')) return 'Hematology Section';
        if (p.includes('chemistry') || p.includes('electrolyte') || p.includes('immunoassay') || p.includes('urine')) return 'Clinical Pathology Lab';
        if (p.includes('blood gas') || p.includes('ventilator') || p.includes('anesthesia')) return 'ICU / Respiratory Care';
        if (p.includes('ecg') || p.includes('monitor') || p.includes('ultrasound') || p.includes('xray')) return 'Diagnostic Imaging & Cardio';
        return 'Clinical Laboratory';
    }

    function parseWorksheetToEquipment(worksheet, sheetName, XLSX) {
        const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!matrix || matrix.length === 0) return [];

        let headerRowIndex = -1;
        for (let r = 0; r < Math.min(matrix.length, 15); r++) {
            const rowCells = (matrix[r] || []).map(c => String(c).trim().toLowerCase());
            const hasAccount = rowCells.some(c => c.includes('account name') || c.includes('hospital') || c.includes('facility'));
            const hasModel = rowCells.some(c => c.includes('model') || c.includes('serial') || c.includes('product type') || c.includes('brand'));
            if (hasAccount && hasModel) { headerRowIndex = r; break; }
        }
        if (headerRowIndex === -1) headerRowIndex = 0;

        const rawHeaders = (matrix[headerRowIndex] || []).map(h => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
        const findCol = (list) => rawHeaders.findIndex(h => list.some(k => h.includes(k)));

        const colFacility = findCol(['accountname', 'hospital', 'facility', 'account']);
        const colAddress  = findCol(['address', 'location']);
        const colBrand    = findCol(['brand', 'maker']);
        const colProdType = findCol(['producttype', 'equipment', 'machine']);
        const colModel    = findCol(['model']);
        const colSerial   = findCol(['serial', 'sn']);
        const colDate     = findCol(['dateinstalled', 'install', 'lastpm']);

        const extracted = [];
        let lastFacility = '';
        let lastAddress = '';

        for (let r = headerRowIndex + 1; r < matrix.length; r++) {
            const row = matrix[r] || [];
            if (row.filter(c => String(c).trim() !== '').length < 2) continue;

            let facility = colFacility !== -1 ? String(row[colFacility] || '').trim() : '';
            let address  = colAddress !== -1 ? String(row[colAddress] || '').trim() : '';
            const brand    = colBrand !== -1 ? String(row[colBrand] || '').trim() : '';
            const prodType = colProdType !== -1 ? String(row[colProdType] || '').trim() : '';
            const model    = colModel !== -1 ? String(row[colModel] || '').trim() : '';
            const rawSn    = colSerial !== -1 ? String(row[colSerial] || '').trim() : '';
            const rawDate  = colDate !== -1 ? row[colDate] : '';

            if (facility.toLowerCase() === 'account name' || model.toLowerCase() === 'model') continue;
            if (facility) { lastFacility = facility; if (address) lastAddress = address; }
            else if (lastFacility && (prodType || model || brand)) { facility = lastFacility; if (!address) address = lastAddress; }
            if (!facility && !prodType && !model) continue;

            const eqName = (brand && prodType && !prodType.toLowerCase().includes(brand.toLowerCase())) ? `${brand} ${prodType}` : (prodType || brand || model || 'Medical Equipment');
            const cleanModel = (model && model.toUpperCase() !== 'N/A') ? model : (brand || 'Standard');
            const cleanDept = inferDepartmentFromProduct(prodType, brand);
            const lastPM = parseFlexibleInstallDate(rawDate);
            const isMissingSn = !rawSn || rawSn.toUpperCase() === 'N/A' || rawSn === '-';
            const cleanSerial = isMissingSn ? `${sheetName.slice(0, 3).toUpperCase()}-${cleanModel.replace(/[^A-Za-z0-9]/g, '')}-${r}` : rawSn;

            extracted.push({
                id: Date.now() + r + Math.floor(Math.random() * 10000),
                name: eqName,
                model: cleanModel,
                serial: cleanSerial,
                facility: facility || `${sheetName} Facility`,
                department: cleanDept,
                dept: cleanDept,
                location: address ? `${sheetName} - ${address}` : `${sheetName} - Clinical Lab`,
                risk: 'High',
                status: 'Operational',
                lastPM,
                nextDue: computeNextPMFromInstall(lastPM),
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
            const allItems = [];
            workbook.SheetNames.forEach(sheetName => {
                allItems.push(...parseWorksheetToEquipment(workbook.Sheets[sheetName], sheetName.trim(), XLSX));
            });

            if (allItems.length > 0) {
                window.equipmentList = allItems;
                localStorage.setItem('seiralab_equipment', JSON.stringify(window.equipmentList));
                if (typeof populateFacilityFilter === 'function') populateFacilityFilter();
                if (typeof renderInventoryTable === 'function') renderInventoryTable();
                if (typeof renderDashboard === 'function') renderDashboard();
                if (typeof renderScheduleCards === 'function') renderScheduleCards();
                if (typeof showNotificationToast === 'function') showNotificationToast(`Imported ${allItems.length} machines across ${workbook.SheetNames.length} regional sheets!`);
                if (typeof pushToGitHub === 'function') await pushToGitHub(`Import installation.xls (${allItems.length} machines)`);
            }
        } catch (err) {
            if (typeof showNotificationToast === 'function') showNotificationToast('Error reading Excel file.', true);
        }
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
        if (window.lucide) lucide.createIcons();
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
        if (window.lucide) lucide.createIcons();
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
            if (window.lucide) lucide.createIcons();
            return;
        }

        if (log.editRequestStatus === 'pending') {
            if (typeof showNotificationToast === 'function') showNotificationToast(`Edit request for SR #${log.reportNo} is already awaiting Head / Admin approval.`);
            return;
        }

        document.getElementById('srEditRequestTargetLabel').innerText = `SR #${log.reportNo} — ${log.eqName}`;
        document.getElementById('srReqReasonInput').value = '';
        document.getElementById('srEditRequestModal')?.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
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
            notes: [srDetails.findings, srDetails.actionTaken, srDetails.remarks].filter(Boolean).join(' — '),
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
        let rowsHTML = '';
        pendingLogs.forEach(log => {
            const safeId = String(log.id).replace(/'/g, "\\'");
            const controls = canApprove
                ? `<div class="flex items-center space-x-2 shrink-0"><button type="button" onclick="resolveServiceReportEditRequest('${safeId}', 'accept')" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer">Accept</button><button type="button" onclick="resolveServiceReportEditRequest('${safeId}', 'decline')" class="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer">Decline</button></div>`
                : `<span class="px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-full text-[11px] font-bold">Awaiting Head / Admin Approval</span>`;

            rowsHTML += `<div class="bg-white border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3"><div><span class="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono text-xs font-bold rounded">SR #${log.reportNo || '05535'}</span><span class="text-xs font-bold text-slate-900 ml-2">${log.eqName}</span><p class="text-xs text-slate-600 mt-1"><strong>${log.editRequestedBy || 'Technical'}:</strong> "${log.editRequestReason || 'Requesting edit'}"</p></div>${controls}</div>`;
        });

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
                blankBtn.innerHTML = `<i data-lucide="file-plus-2" class="w-4 h-4"></i><span>Service Report Form</span>`;
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

            // Skip if already upgraded for current role state
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
                    editBtns += `<button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i><span>Edit</span></button>`;
                } else {
                    if (reqStatus === 'pending') editBtns = `<button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer">Requested</button>`;
                    else if (reqStatus === 'approved') editBtns = `<button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Edit (Approved)</button>`;
                    else editBtns = `<button type="button" onclick="requestEditServiceReport('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs cursor-pointer">Request Edit</button>`;
                }
            }

            const deleteBtn = isSup ? `<button type="button" onclick="deleteServiceReportLog('${safeId}')" class="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : '';

            actionCell.setAttribute('data-upgraded-role', currentRoleKey);
            actionCell.innerHTML = `
                <div class="inline-flex items-center justify-end space-x-1.5">
                    ${editBtns}
                    <button type="button" onclick="openServiceReportForViewing('${safeId}')" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1.5 cursor-pointer">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                        <span>Service Report</span>
                    </button>
                    ${deleteBtn}
                </div>`;
        });
        if (window.lucide) lucide.createIcons();
    }

    // Export all handlers globally
    window.openNotificationModal = openNotificationModal;
    window.closeNotificationModal = closeNotificationModal;
    window.buildSystemNotifications = buildSystemNotifications;
    window.renderNotifications = buildSystemNotifications;

    window.renderCalibrationTable = renderCalibrationTable;
    window.openAddCalibrationModal = openAddCalibrationModal;
    window.downloadCalibrationCert = downloadCalibrationCert;
    window.openLatestCalibrationCertForPrint = openLatestCalibrationCertForPrint;
    window.openEditCalibrationModal = openEditCalibrationModal;
    window.submitCalibrationEditRequest = submitCalibrationEditRequest;
    window.resolveCalibrationEditRequest = resolveCalibrationEditRequest;
    window.saveCalibrationCertificateFromTemplate = saveCalibrationCertificateFromTemplate;
    window.deleteCalibrationReport = deleteCalibrationReport;

    window.renderToolLogsTable = renderToolLogsTable;
    window.openBorrowToolModal = openBorrowToolModal;
    window.closeBorrowToolModal = closeBorrowToolModal;
    window.saveToolBorrow = saveToolBorrow;
    window.deleteToolLog = deleteToolLog;
    window.markToolReturned = markToolReturned;

    window.triggerAssetImportPicker = triggerAssetImportPicker;
    window.importAssetData = triggerAssetImportPicker;
    window.triggerImport = triggerAssetImportPicker;
    window.handleImportFile = handleAssetDataFileImport;

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

    function bootAllSeiralabFeatures() {
        ensureFeatureModalsExist();
        removeRiskFromAllUI();
        relocateImportAssetButtonAndFixInput();
        upgradeCalibrationToolbarUI();
        renderCalibrationTable();
        renderToolLogsTable();
        upgradeMaintenanceHistoryCertificateButtons();
        buildSystemNotifications();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootAllSeiralabFeatures);
    } else {
        bootAllSeiralabFeatures();
    }

    // Continuous self-healing watchdog (runs every 800ms) so app.js can NEVER wipe out the buttons
    setInterval(() => {
        if (!document.getElementById('btnOpenBlankServiceReport') ||
            document.querySelector('#historyTableBody button')?.innerText.trim() === 'Certificate') {
            upgradeMaintenanceHistoryCertificateButtons();
        }
        if (!document.getElementById('btnInventoryImportAsset')) {
            relocateImportAssetButtonAndFixInput();
        }
        if (!document.getElementById('btnAddCalibrationReport')) {
            upgradeCalibrationToolbarUI();
        }
    }, 800);
})();
