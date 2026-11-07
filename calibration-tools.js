// ============================================================================
// SEIRALAB CMMS - CALIBRATION-TOOLS.JS
// 1. SYSTEM NOTIFICATIONS
// 2. OFFICIAL SEIRALAB "CERTIFICATE OF CALIBRATION" TEMPLATE + SERIES + EDIT REQUESTS
// 3. BIOMED OFFICE TOOL & KIT LOGBOOK (BORROW / EDIT / DELETE / RETURN)
// ============================================================================

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
    },
    {
        id: "2026-04240011",
        eqName: "Flexor Chemistry Analyzer (AB-380)",
        instrumentDesc: "FULLY AUTO CHEMISTRY ANALYZER",
        model: "AB-380",
        serial: "AS24B05160",
        facility: "Cebu City Medical Center",
        address: "Cebu City",
        calDate: "2026-04-24",
        nextDue: "2027-04-23",
        accuracy: "PASSED — Within ±2 Standard Deviation (SD)",
        calibratorName: "Randox Calibrator",
        lotNumber: "1262UE",
        expiryDate: "01/2027",
        remarksStatus: "PASSED",
        remarksNote: "The results are within the ±2 Standard Deviation (SD).",
        techName: "HARVY L. AGSALONA",
        techCertNo: "BES NCII Cert. No.: 22013302204066",
        editRequestStatus: "none"
    }
];

window.toolLogs = JSON.parse(localStorage.getItem('seiralab_tool_logs') || 'null') || DEFAULT_TOOL_LOGS;
window.calibrationList = JSON.parse(localStorage.getItem('seiralab_calibrations') || 'null') || DEFAULT_CALIBRATION_LIST;
if (!Array.isArray(window.calibrationList) || window.calibrationList.length === 0) {
    window.calibrationList = DEFAULT_CALIBRATION_LIST;
}

function isVisitorMode() {
    const role = window.currentAccessRole || sessionStorage.getItem('seiralab_active_session_role') || localStorage.getItem('seiralab_access_role') || 'Visitor';
    return !role || role === 'Visitor';
}
window.isVisitorMode = isVisitorMode;

function isCalSupervisor() {
    const role = window.currentAccessRole || sessionStorage.getItem('seiralab_active_session_role') || 'Visitor';
    return role === 'Head Technical' || role === 'MasterAdmin';
}

// Generate next non-duplicating Certificate Number (Format: YYYY-MMDDXXXX like 2024-06030010)
function getNextCalibrationCertNumber(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    const yyyy = validDate.getFullYear();
    const mm = String(validDate.getMonth() + 1).padStart(2, '0');
    const dd = String(validDate.getDate()).padStart(2, '0');

    let maxSeq = 9;
    (window.calibrationList || []).forEach(c => {
        const match = String(c.id || '').match(/(\d{4})$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
    });
    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${yyyy}-${mm}${dd}${nextSeq}`;
}

function formatLongDateDisplay(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
}

// ============================================================================
// 0. SELF-HEALING MODALS (Borrow Tool + Official Certificate of Calibration Modal)
// ============================================================================
let currentCalCertMode = 'register'; // 'register' | 'view' | 'edit'
let currentEditingCalId = null;

function ensureFeatureModalsExist() {
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
    }

    // 2. Official Seiralab CERTIFICATE OF CALIBRATION Template Modal (Matches AGD 2260 Document)
    if (!document.getElementById('seiralabCalibrationCertModal')) {
        const printStyle = document.createElement('style');
        printStyle.id = 'seiralabCalCertPrintStyle';
        printStyle.textContent = `
            #calCertPaperSheet {
                font-family: Arial, Helvetica, sans-serif;
                color: #111827;
            }
            #calCertPaperSheet.cal-readonly-mode input {
                pointer-events: none;
                border-bottom-color: transparent !important;
            }
            @media print {
                body:has(#seiralabCalibrationCertModal:not(.hidden)) * {
                    visibility: hidden !important;
                }
                #seiralabCalibrationCertModal:not(.hidden),
                #seiralabCalibrationCertModal:not(.hidden) #calCertPaperSheet,
                #seiralabCalibrationCertModal:not(.hidden) #calCertPaperSheet * {
                    visibility: visible !important;
                }
                #seiralabCalibrationCertModal:not(.hidden) {
                    position: absolute !important;
                    inset: 0 !important;
                    background: #ffffff !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    display: block !important;
                }
                #calCertToolbar {
                    display: none !important;
                }
                #calCertPaperSheet {
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 auto !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 12mm 18mm !important;
                }
                #calCertPaperSheet input {
                    border-bottom-color: transparent !important;
                }
            }
        `;
        document.head.appendChild(printStyle);

        const calCertModalHTML = `
        <div id="seiralabCalibrationCertModal" class="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-[120] hidden overflow-y-auto p-3 sm:p-6 flex flex-col items-center">
            <!-- Top Action Toolbar -->
            <div id="calCertToolbar" class="w-full max-w-3xl bg-slate-900 text-white rounded-t-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border border-slate-700 shadow-xl">
                <div class="flex items-center space-x-2.5">
                    <i data-lucide="award" class="w-5 h-5 text-teal-400"></i>
                    <div>
                        <div class="flex items-center space-x-2">
                            <h3 class="text-sm font-bold">Official Certificate of Calibration</h3>
                            <span id="calCertModeBadge" class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">New Certificate</span>
                        </div>
                        <p id="calCertSubtitle" class="text-[11px] text-slate-400">Fill in the fields directly on the certificate below</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button type="button" id="calBtnRequestEdit" onclick="openEditCalibrationModal(currentEditingCalId)" class="hidden px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg shadow-sm inline-flex items-center space-x-1.5 cursor-pointer">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        <span id="calBtnRequestEditLabel">Request Edit</span>
                    </button>
                    <button type="button" id="calBtnSaveCert" onclick="saveCalibrationCertificateFromTemplate()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm inline-flex items-center space-x-1.5 cursor-pointer">
                        <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                        <span id="calBtnSaveCertLabel">Register Certificate</span>
                    </button>
                    <button type="button" onclick="window.print()" class="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg shadow-sm inline-flex items-center space-x-1.5 cursor-pointer">
                        <i data-lucide="printer" class="w-4 h-4"></i>
                        <span>Print / Save PDF</span>
                    </button>
                    <button type="button" onclick="closeAddCalibrationModal()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg cursor-pointer">
                        Close
                    </button>
                </div>
            </div>

            <!-- Official A4 Certificate Sheet (Exact Match to CALIBRATION CERTIFICATE - AGD 2260.doc) -->
            <div id="calCertPaperSheet" class="w-full max-w-3xl bg-white shadow-2xl border border-slate-300 rounded-b-2xl px-8 sm:px-14 py-10 text-sm text-slate-900 mb-10 flex flex-col justify-between min-h-[860px]">
                <div>
                    <!-- Top Centered Seiralab Banner Logo -->
                    <div class="flex justify-center mb-6">
                        <img src="./seiralab-logo.jpg" alt="Seiralab Incorporated" class="h-20 sm:h-24 w-auto object-contain" onerror="this.onerror=null; this.src='./seiralab-logo.gIH9ySyn.jpg';">
                    </div>

                    <!-- Title: CERTIFICATE OF CALIBRATION -->
                    <h1 class="text-xl sm:text-2xl font-bold text-center tracking-[0.28em] uppercase text-black my-7">
                        CERTIFICATE OF CALIBRATION
                    </h1>

                    <!-- Certificate Number / Date Issued / Valid Until -->
                    <div class="space-y-1.5 text-sm max-w-xl">
                        <div class="grid grid-cols-12 items-center">
                            <span class="col-span-5 text-slate-900">Certificate Number:</span>
                            <input type="text" id="tplCalCertNo" readonly class="col-span-7 font-bold text-red-600 text-base focus:outline-none bg-transparent cursor-not-allowed">
                        </div>
                        <div class="grid grid-cols-12 items-center">
                            <span class="col-span-5 text-slate-900">Date Issued:</span>
                            <input type="text" id="tplCalDateIssued" placeholder="June 03, 2024" class="col-span-7 border-b border-slate-300 focus:border-teal-600 py-0.5 focus:outline-none">
                        </div>
                        <div class="grid grid-cols-12 items-center">
                            <span class="col-span-5 text-slate-900">Valid Until:</span>
                            <input type="text" id="tplCalValidUntil" placeholder="June 02, 2025" class="col-span-7 border-b border-slate-300 focus:border-teal-600 py-0.5 focus:outline-none">
                        </div>
                    </div>

                    <!-- Company Name / Company Address -->
                    <div class="space-y-1.5 text-sm max-w-xl mt-6">
                        <div class="grid grid-cols-12 items-center">
                            <span class="col-span-5 text-slate-900">Company Name:</span>
                            <input type="text" id="tplCalCompany" placeholder="SCDL DAVAO" class="col-span-7 font-bold uppercase border-b border-slate-300 focus:border-teal-600 py-0.5 focus:outline-none">
                        </div>
                        <div class="grid grid-cols-12 items-center">
                            <span class="col-span-5 text-slate-900">Company Address:</span>
                            <input type="text" id="tplCalAddress" placeholder="Davao City" class="col-span-7 border-b border-slate-300 focus:border-teal-600 py-0.5 focus:outline-none">
                        </div>
                    </div>

                    <!-- Instrument Description / Model / Serial No. -->
                    <div class="space-y-1.5 text-sm max-w-xl mt-6">
                        <div class="grid grid-cols-12 items-center">
                            <span class="col-span-5 text-slate-900">Instrument Description:</span>
                            <input type="text" id="tplCalInstDesc" placeholder="FULLY AUTO CHEMISTRY ANALYZER" class="col-span-7 uppercase border-b border-slate-300 focus:border-teal-600 py-0.5 focus:outline-none">
                        </div>
                        <div class="grid grid-cols-12 items-center">
                            <span class="col-span-5 text-slate-900">Instrument Model:</span>
                            <input type="text" id="tplCalModel" placeholder="AGD 2260" class="col-span-7 uppercase border-b border-slate-300 focus:border-teal-600 py-0.5 focus:outline-none">
                        </div>
                        <div class="grid grid-cols-12 items-center">
                            <span class="col-span-5 text-slate-900">Instrument Serial No.:</span>
                            <input type="text" id="tplCalSerial" placeholder="K3-E2206N108L" class="col-span-7 uppercase font-mono border-b border-slate-300 focus:border-teal-600 py-0.5 focus:outline-none">
                        </div>
                    </div>

                    <!-- Calibration Procedure / Lot Number / Expiry Date -->
                    <div class="space-y-1.5 text-sm max-w-2xl mt-6">
                        <div class="grid grid-cols-12 items-start">
                            <span class="col-span-5 text-slate-900">Calibration Procedure:</span>
                            <div class="col-span-7 leading-relaxed">
                                The instrument was stabilized at ambient (room) temperature, then calibrated using the
                                <input type="text" id="tplCalCalibrator" value="Randox Calibrator" class="w-44 border-b border-slate-400 focus:border-teal-600 px-1 font-semibold focus:outline-none">
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 pt-1">
                            <span>Lot Number:</span>
                            <input type="text" id="tplCalLotNo" value="1262UE" oninp="syncCalLotFooter()" onchange="syncCalLotFooter()" class="w-36 border-b border-slate-400 focus:border-teal-600 px-1 font-semibold focus:outline-none">
                        </div>
                        <div class="flex items-center space-x-2">
                            <span>Expiry Date:</span>
                            <input type="text" id="tplCalExpiry" value="01/2025" oninput="syncCalLotFooter()" onchange="syncCalLotFooter()" class="w-36 border-b border-slate-400 focus:border-teal-600 px-1 font-semibold focus:outline-none">
                        </div>
                    </div>

                    <!-- Remarks: PASSED -->
                    <div class="grid grid-cols-12 items-start max-w-2xl mt-6">
                        <span class="col-span-5 text-slate-900">Remarks:</span>
                        <div class="col-span-7">
                            <input type="text" id="tplCalRemarksStatus" value="PASSED" class="text-lg font-extrabold text-blue-600 uppercase focus:outline-none border-b border-transparent focus:border-blue-400 w-40">
                            <input type="text" id="tplCalRemarksNote" value="The results are within the ±2 Standard Deviation (SD)." class="w-full italic text-slate-800 border-b border-slate-300 focus:border-teal-600 py-0.5 mt-0.5 focus:outline-none">
                        </div>
                    </div>

                    <!-- Calibration Technician & BES NCII Cert No -->
                    <div class="grid grid-cols-12 items-end max-w-2xl mt-8 pb-2 border-b-2 border-slate-800">
                        <span class="col-span-5 text-slate-900">Calibration Technician:</span>
                        <div class="col-span-7">
                            <input type="text" id="tplCalTechName" value="HARVY L. AGSALONA" class="w-full font-semibold uppercase border-b border-slate-300 focus:border-teal-600 py-0.5 focus:outline-none">
                            <input type="text" id="tplCalTechCert" value="BES NCII Cert. No.: 22013302204066" class="w-full text-xs text-slate-800 border-b border-transparent focus:border-slate-300 py-0.5 focus:outline-none">
                        </div>
                    </div>

                    <!-- DOH Compliance Paragraph -->
                    <div class="mt-4 space-y-3 text-xs sm:text-[13px] leading-relaxed text-slate-900">
                        <p id="tplCalTraceabilityParagraph">
                            The results were obtained by recording the result of the Randox Calibrator with Lot Number: <span id="tplFooterLotSpan" class="font-semibold">1262UE</span> and Expiry Date: <span id="tplFooterExpSpan" class="font-semibold">01/2025</span>.
                        </p>
                        <p>
                            This certificate is issued in accordance with the requirements of Department of Health (DOH). This certificate may not be reproduced other than in full, except with the prior written approval of the issuing laboratory.
                        </p>
                    </div>
                </div>

                <!-- Bottom Koronadal Cinton Bldg Footer -->
                <div class="pt-8 mt-6 text-center text-[11px] text-slate-600 leading-tight">
                    <p>Ground Floor, Unit 2-3, Cinton Bldg., Abad Santos St., Zone IV, Koronadal City, 9506 South Cotabato, Philippines</p>
                    <p><span class="underline text-blue-700">seiralab.inc@gmail.com</span>, (082) 228 - 2747</p>
                </div>
            </div>
        </div>

        <!-- Technical Calibration Edit Request Modal -->
        <div id="calEditRequestModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[130] hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div class="flex items-center space-x-2.5">
                        <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                            <i data-lucide="send" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h4 class="text-sm font-bold text-slate-900">Request Calibration Certificate Edit</h4>
                            <p id="calEditReqLabel" class="text-[11px] text-slate-500">Send edit request to Head Technical or MasterAdmin</p>
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('calEditRequestModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                <form onsubmit="submitCalibrationEditRequest(event)" class="space-y-4 pt-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Requested By (Engineer / Technician) *</label>
                        <input type="text" id="calReqTechName" required placeholder="e.g., Eng. Barzce Barcelona" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Reason for Editing Certificate *</label>
                        <textarea id="calReqReason" rows="3" required placeholder="Specify what needs to be updated (e.g. Lot Number, Serial Number, or Validity Date)..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"></textarea>
                    </div>
                    <div class="pt-2 flex items-center justify-end space-x-2.5">
                        <button type="button" onclick="document.getElementById('calEditRequestModal').classList.add('hidden')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer">Send Edit Request</button>
                    </div>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', calCertModalHTML);
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

// ============================================================================
// 1. NOTIFICATION CENTER
// ============================================================================
function buildSystemNotifications() {
    const list = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    if (!list) return;

    const today = new Date();
    const alerts = [];

    (window.historyLogs || []).forEach(log => {
        if (log.editRequestStatus === 'pending') {
            alerts.push({
                type: 'editreq',
                title: `Service Report Edit Request: SR #${log.reportNo || '05535'}`,
                desc: `${log.editRequestedBy || 'Technical'}: "${log.editRequestReason || 'Requests edit approval'}"`,
                tab: 'history'
            });
        }
    });

    (window.calibrationList || []).forEach(cal => {
        if (cal.editRequestStatus === 'pending') {
            alerts.push({
                type: 'editreq',
                title: `Calibration Edit Request: Cert #${cal.id}`,
                desc: `${cal.editRequestedBy || 'Technical'}: "${cal.editRequestReason || 'Requests edit approval'}"`,
                tab: 'calibration'
            });
        }
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

    alerts.slice(0, 30).forEach(a => {
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

// ============================================================================
// 2. CALIBRATION & METROLOGY REPORTS (Export Removed + Official Certificate Template)
// ============================================================================
function upgradeCalibrationToolbarUI() {
    ensureFeatureModalsExist();
    const calHeader = document.querySelector('#calibration > div:first-child');
    if (!calHeader) return;

    let calToolbar = calHeader.querySelector('div:nth-child(2)');
    if (!calToolbar) return;

    // Removed "Export Calibration Data" button as requested in Screenshot 2; kept Add + Print Calibration Report on 1 clean row
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

function renderPendingCalibrationApprovalsBanner() {
    const calSection = document.getElementById('calibration');
    if (!calSection) return;

    let banner = document.getElementById('calPendingApprovalsBanner');
    const pendingList = (window.calibrationList || []).filter(c => c.editRequestStatus === 'pending');

    if (pendingList.length === 0) {
        if (banner) banner.remove();
        return;
    }

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'calPendingApprovalsBanner';
        const firstChild = calSection.querySelector('div:first-child');
        if (firstChild && firstChild.nextSibling) {
            calSection.insertBefore(banner, firstChild.nextSibling);
        } else {
            calSection.prepend(banner);
        }
    }

    const canApprove = isCalSupervisor();
    let rowsHTML = '';
    pendingList.forEach(item => {
        const safeId = String(item.id).replace(/'/g, "\\'");
        const controls = canApprove
            ? `<div class="flex items-center space-x-2 shrink-0">
                    <button type="button" onclick="resolveCalibrationEditRequest('${safeId}', 'accept')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer">Accept</button>
                    <button type="button" onclick="resolveCalibrationEditRequest('${safeId}', 'decline')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer">Decline</button>
               </div>`
            : `<span class="px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-full text-[11px] font-bold">Awaiting Head / Admin Approval</span>`;

        rowsHTML += `
            <div class="bg-white border border-amber-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span class="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 font-mono text-xs font-bold rounded">Cert #${item.id}</span>
                    <span class="text-xs font-bold text-slate-900 ml-2">${item.eqName} — ${item.facility}</span>
                    <p class="text-xs text-slate-600 mt-1"><strong>${item.editRequestedBy || 'Technical'}:</strong> "${item.editRequestReason || 'Needs update'}"</p>
                </div>
                ${controls}
            </div>
        `;
    });

    banner.className = 'mb-4 bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2';
    banner.innerHTML = `
        <div class="text-xs font-bold uppercase tracking-wider text-amber-900">Pending Calibration Edit Requests (${pendingList.length})</div>
        <div class="space-y-2">${rowsHTML}</div>
    `;
}

function renderCalibrationTable() {
    upgradeCalibrationToolbarUI();
    renderPendingCalibrationApprovalsBanner();

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
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No calibration records found. Click "+ Add Calibration Report" to create one.</td></tr>`;
        return;
    }

    const isVis = isVisitorMode();
    const isSup = isCalSupervisor();

    window.calibrationList.slice(0, 100).forEach(item => {
        const diffDays = Math.ceil((new Date(item.nextDue) - today) / (1000 * 60 * 60 * 24));
        const dueColor = diffDays < 0 ? 'text-rose-600 font-semibold' : (diffDays <= 30 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-medium');
        const safeId = String(item.id).replace(/'/g, "\\'");
        const reqStatus = item.editRequestStatus || 'none';

        let editBtnHTML = '';
        if (!isVis) {
            if (isSup) {
                if (reqStatus === 'pending') {
                    editBtnHTML += `
                        <button type="button" onclick="resolveCalibrationEditRequest('${safeId}', 'accept')" class="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer">Accept</button>
                        <button type="button" onclick="resolveCalibrationEditRequest('${safeId}', 'decline')" class="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer">Decline</button>
                    `;
                }
                editBtnHTML += `
                    <button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        <span>Edit</span>
                    </button>
                `;
            } else {
                if (reqStatus === 'pending') {
                    editBtnHTML = `<button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer"><i data-lucide="clock" class="w-3.5 h-3.5"></i><span>Requested</span></button>`;
                } else if (reqStatus === 'approved') {
                    editBtnHTML = `<button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer"><i data-lucide="unlock" class="w-3.5 h-3.5"></i><span>Edit (Approved)</span></button>`;
                } else {
                    editBtnHTML = `<button type="button" onclick="openEditCalibrationModal('${safeId}')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer"><i data-lucide="send" class="w-3.5 h-3.5"></i><span>Request Edit</span></button>`;
                }
            }
        }

        const deleteBtnHTML = isSup ? `
            <button type="button" onclick="deleteCalibrationReport('${safeId}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer" title="Delete Calibration Certificate (Head / Admin Only)">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        ` : '';

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
                        <button type="button" onclick="downloadCalibrationCert('${safeId}')" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg font-semibold text-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer">
                            <i data-lucide="award" class="w-3.5 h-3.5"></i>
                            <span>Certificate</span>
                        </button>
                        ${deleteBtnHTML}
                    </div>
                </td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function setCalCertReadOnlyState(isReadOnly) {
    const sheet = document.getElementById('calCertPaperSheet');
    if (!sheet) return;
    sheet.classList.toggle('cal-readonly-mode', isReadOnly);

    const fields = [
        'tplCalDateIssued', 'tplCalValidUntil', 'tplCalCompany', 'tplCalAddress',
        'tplCalInstDesc', 'tplCalModel', 'tplCalSerial', 'tplCalCalibrator',
        'tplCalLotNo', 'tplCalExpiry', 'tplCalRemarksStatus', 'tplCalRemarksNote',
        'tplCalTechName', 'tplCalTechCert'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.readOnly = isReadOnly;
    });
}

function populateCalibrationTemplateFields(item, certNumber) {
    const today = new Date();
    const nextYr = new Date();
    nextYr.setFullYear(nextYr.getFullYear() + 1);
    nextYr.setDate(nextYr.getDate() - 1);

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

// Open Blank Certificate of Calibration to Register New Certificate
function openAddCalibrationModal() {
    if (isVisitorMode()) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Visitors have view-only access. Please Sign In.', true);
        return;
    }
    ensureFeatureModalsExist();
    currentCalCertMode = 'register';
    currentEditingCalId = null;

    const nextCertNo = getNextCalibrationCertNumber();
    populateCalibrationTemplateFields(null, nextCertNo);
    setCalCertReadOnlyState(false);

    document.getElementById('calCertModeBadge').innerText = `New Series #${nextCertNo}`;
    document.getElementById('calBtnSaveCert')?.classList.remove('hidden');
    document.getElementById('calBtnSaveCertLabel').innerText = 'Register Certificate';
    document.getElementById('calBtnRequestEdit')?.classList.add('hidden');

    document.getElementById('seiralabCalibrationCertModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

// Open Existing Certificate of Calibration for Viewing / Printing
function downloadCalibrationCert(certId) {
    ensureFeatureModalsExist();
    const item = (window.calibrationList || []).find(c => String(c.id) === String(certId)) || window.calibrationList?.[0];
    if (!item) {
        openAddCalibrationModal();
        return;
    }

    currentCalCertMode = 'view';
    currentEditingCalId = item.id;

    populateCalibrationTemplateFields(item, item.id);
    setCalCertReadOnlyState(true);

    document.getElementById('calCertModeBadge').innerText = `Viewing #${item.id}`;
    document.getElementById('calBtnSaveCert')?.classList.add('hidden');

    const reqBtn = document.getElementById('calBtnRequestEdit');
    const reqLabel = document.getElementById('calBtnRequestEditLabel');
    if (reqBtn && !isVisitorMode()) {
        reqBtn.classList.remove('hidden');
        if (reqLabel) {
            reqLabel.innerText = (isCalSupervisor() || item.editRequestStatus === 'approved') ? 'Edit Certificate' : 'Request Edit';
        }
    } else if (reqBtn) {
        reqBtn.classList.add('hidden');
    }

    document.getElementById('seiralabCalibrationCertModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function openLatestCalibrationCertForPrint() {
    if (window.calibrationList && window.calibrationList.length > 0) {
        downloadCalibrationCert(window.calibrationList[0].id);
    } else {
        openAddCalibrationModal();
    }
}

// Request Edit (Technical) or Direct Unlock (Head Technical / MasterAdmin)
function openEditCalibrationModal(certId) {
    if (isVisitorMode()) return;
    ensureFeatureModalsExist();

    const item = (window.calibrationList || []).find(c => String(c.id) === String(certId));
    if (!item) return;

    currentEditingCalId = item.id;

    if (isCalSupervisor() || item.editRequestStatus === 'approved') {
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

    if (item.editRequestStatus === 'pending') {
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(`Edit request for Certificate #${item.id} is already awaiting Head / Admin approval.`);
        }
        return;
    }

    document.getElementById('calEditReqLabel').innerText = `Certificate #${item.id} — ${item.eqName} (${item.facility})`;
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
    closeAddCalibrationModal();

    renderCalibrationTable();
    buildSystemNotifications();

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(`Sent edit request for Calibration Certificate #${item.id}!`);
    }
    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`Request Edit on Calibration Certificate #${item.id}`);
    }
}

async function resolveCalibrationEditRequest(certId, decision) {
    if (!isCalSupervisor()) return;
    const item = (window.calibrationList || []).find(c => String(c.id) === String(certId));
    if (!item) return;

    item.editRequestStatus = decision === 'accept' ? 'approved' : 'declined';
    localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));

    renderCalibrationTable();
    buildSystemNotifications();

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(decision === 'accept' ? `Approved edit for Certificate #${item.id}!` : `Declined edit for Certificate #${item.id}.`);
    }
    if (typeof pushToGitHub === 'function') {
        await pushToGitHub(`${decision === 'accept' ? 'Approved' : 'Declined'} Calibration Edit #${item.id}`);
    }
}

function closeAddCalibrationModal() {
    document.getElementById('seiralabCalibrationCertModal')?.classList.add('hidden');
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

    const recordPayload = {
        id: certNo,
        eqName,
        instrumentDesc,
        model,
        serial,
        facility,
        address,
        calDate: calDateISO,
        nextDue: nextDueISO,
        dateIssuedText,
        validUntilText,
        accuracy,
        calibratorName,
        lotNumber,
        expiryDate,
        remarksStatus,
        remarksNote,
        techName,
        techCertNo,
        editRequestStatus: 'none'
    };

    let commitAction = '';
    if (currentCalCertMode === 'edit' && currentEditingCalId) {
        const idx = window.calibrationList.findIndex(c => String(c.id) === String(currentEditingCalId));
        if (idx !== -1) {
            window.calibrationList[idx] = { ...window.calibrationList[idx], ...recordPayload, id: currentEditingCalId };
            commitAction = `Save Edited Calibration Certificate #${currentEditingCalId}`;
        }
    } else {
        const uniqueNo = window.calibrationList.some(c => String(c.id) === String(certNo))
            ? getNextCalibrationCertNumber()
            : certNo;
        recordPayload.id = uniqueNo;
        window.calibrationList.unshift(recordPayload);
        commitAction = `Register Calibration Certificate #${uniqueNo} (${eqName})`;
    }

    localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
    closeAddCalibrationModal();
    renderCalibrationTable();
    buildSystemNotifications();

    if (typeof showNotificationToast === 'function') {
        showNotificationToast(`Saved Calibration Certificate #${recordPayload.id}!`);
    }
    if (typeof pushToGitHub === 'function' && commitAction) {
        await pushToGitHub(commitAction);
    }
}

async function deleteCalibrationReport(certId) {
    if (!isCalSupervisor()) {
        if (typeof showNotificationToast === 'function') showNotificationToast('Only Head Technical and MasterAdmin can delete Calibration Certificates.', true);
        return;
    }
    const target = window.calibrationList.find(c => String(c.id) === String(certId));
    if (!target) return;

    if (confirm(`Delete Calibration Certificate #${target.id} (${target.eqName})?`)) {
        window.calibrationList = window.calibrationList.filter(c => String(c.id) !== String(certId));
        localStorage.setItem('seiralab_calibrations', JSON.stringify(window.calibrationList));
        renderCalibrationTable();
        buildSystemNotifications();

        if (typeof showNotificationToast === 'function') showNotificationToast(`Deleted Calibration #${target.id}`);
        if (typeof pushToGitHub === 'function') await pushToGitHub(`Delete Calibration Certificate #${target.id}`);
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
    document.getElementById('editToolLogId').value = '';
    const now = new Date();
    document.getElementById('toolBorrowDate').value = now.toISOString().split('T')[0];
    document.getElementById('toolBorrowTime').value = now.toTimeString().slice(0, 5);
    document.getElementById('borrowToolModal')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function openEditToolModal(logId) {
    if (isVisitorMode()) return;
    ensureFeatureModalsExist();
    const log = window.toolLogs.find(t => t.id == logId);
    if (!log) return;

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
            commitMsg = `Update Tool Log: ${toolName} (${toolCode})`;
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
    if (typeof pushToGitHub === 'function') await pushToGitHub(commitMsg);
}

async function deleteToolLog(logId) {
    if (isVisitorMode()) return;
    const target = window.toolLogs.find(t => t.id == logId);
    if (!target) return;

    if (confirm(`Delete tool log for "${target.toolName}"?`)) {
        window.toolLogs = window.toolLogs.filter(t => t.id != logId);
        localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
        renderToolLogsTable();
        buildSystemNotifications();
        if (typeof pushToGitHub === 'function') await pushToGitHub(`Delete Tool Log: ${target.toolName}`);
    }
}

async function markToolReturned(logId) {
    if (isVisitorMode()) return;
    const log = window.toolLogs.find(t => t.id == logId);
    if (!log) return;

    const now = new Date();
    log.returnDateTime = `${now.toISOString().split('T')[0]} (${formatTime12Hr(now.toTimeString().slice(0, 5))})`;
    log.status = "Returned";

    localStorage.setItem('seiralab_tool_logs', JSON.stringify(window.toolLogs));
    renderToolLogsTable();
    buildSystemNotifications();
    if (typeof pushToGitHub === 'function') await pushToGitHub(`Tool Returned: ${log.toolName}`);
}

// Export globally
window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.buildSystemNotifications = buildSystemNotifications;
window.renderNotifications = buildSystemNotifications;

window.renderCalibrationTable = renderCalibrationTable;
window.openAddCalibrationModal = openAddCalibrationModal;
window.openEditCalibrationModal = openEditCalibrationModal;
window.closeAddCalibrationModal = closeAddCalibrationModal;
window.saveCalibrationCertificateFromTemplate = saveCalibrationCertificateFromTemplate;
window.submitCalibrationEditRequest = submitCalibrationEditRequest;
window.resolveCalibrationEditRequest = resolveCalibrationEditRequest;
window.deleteCalibrationReport = deleteCalibrationReport;
window.downloadCalibrationCert = downloadCalibrationCert;
window.openLatestCalibrationCertForPrint = openLatestCalibrationCertForPrint;

window.renderToolLogsTable = renderToolLogsTable;
window.openBorrowToolModal = openBorrowToolModal;
window.openEditToolModal = openEditToolModal;
window.closeBorrowToolModal = closeBorrowToolModal;
window.saveToolBorrow = saveToolBorrow;
window.deleteToolLog = deleteToolLog;
window.markToolReturned = markToolReturned;

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
    if (tabId === 'history' && typeof upgradeMaintenanceHistoryCertificateButtons === 'function') {
        setTimeout(upgradeMaintenanceHistoryCertificateButtons, 50);
    }
};

ensureFeatureModalsExist();
upgradeCalibrationToolbarUI();
renderCalibrationTable();
renderToolLogsTable();
buildSystemNotifications();
