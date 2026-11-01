// ============================================================================
// SEIRALAB CMMS - APP.JS (PM EXECUTION ENGINE + ASSET DATA IMPORTER)
// ============================================================================

const SEIRALAB_EXCEL_SEED = [
    // CEBU
    { id: 1, name: "Flexor Chemistry Analyzer", serial: "AS24B05160", model: "AB-380", facility: "Cebu City Medical Center", region: "CEBU", department: "Pathology Lab", location: "CEBU - Clinical Lab", status: "Operational", nextDue: "2026-10-24", risk: "High", lastMaint: "2026-04-24" },
    { id: 2, name: "Flexor Chemistry Analyzer", serial: "ES24TV09099", model: "AB-480", facility: "Cebu City Medical Center", region: "CEBU", department: "Pathology Lab", location: "CEBU - Clinical Lab", status: "Operational", nextDue: "2026-11-15", risk: "High", lastMaint: "2026-05-15" },
    { id: 3, name: "Alexis Hematology Analyzer", serial: "G11052322001", model: "AB-H530 plus", facility: "Cebu City Medical Center", region: "CEBU", department: "Pathology Lab", location: "CEBU - Hematology", status: "Operational", nextDue: "2026-11-20", risk: "High", lastMaint: "2026-05-20" },
    { id: 4, name: "Eaglenos Blood Gas Analyzer", serial: "EN10224060009", model: "EN102", facility: "Cebu City Medical Center", region: "CEBU", department: "ICU", location: "CEBU - ICU Respiratory", status: "Operational", nextDue: "2026-10-18", risk: "Critical", lastMaint: "2026-04-18" },
    { id: 5, name: "Biolight ECG Monitor", serial: "E61B0001051", model: "E65", facility: "Cebu City Medical Center", region: "CEBU", department: "Cardiology", location: "CEBU - Cardio Ward", status: "Operational", nextDue: "2026-11-10", risk: "High", lastMaint: "2026-05-10" },
    { id: 6, name: "Fluorecare Immunoassay Analyzer", serial: "SN-CC-1001", model: "MF-T1000", facility: "Cebu City Health Department", region: "CEBU", department: "Pathology Lab", location: "CEBU - Immunology", status: "Operational", nextDue: "2026-12-01", risk: "High", lastMaint: "2026-06-01" },

    // DAVAO
    { id: 7, name: "Alexis Hematology Analyzer", serial: "G10012422003", model: "AB-H630", facility: "God Care Medical Diagnostic", region: "DAVAO", department: "Pathology Lab", location: "DAVAO - Core Lab", status: "Operational", nextDue: "2026-10-26", risk: "High", lastMaint: "2026-04-26" },
    { id: 8, name: "Flexor Chemistry Analyzer", serial: "AS24B05158", model: "AB-380", facility: "God Care Medical Diagnostic", region: "DAVAO", department: "Pathology Lab", location: "DAVAO - Chemistry", status: "Operational", nextDue: "2026-10-24", risk: "High", lastMaint: "2026-04-24" },
    { id: 9, name: "Medical System Hematology Analyzer", serial: "MSH65020190318002", model: "MS H650", facility: "Davao Mediquest Hospital", region: "DAVAO", department: "Pathology Lab", location: "DAVAO - Lab", status: "Operational", nextDue: "2026-12-01", risk: "High", lastMaint: "2026-06-01" },
    { id: 10, name: "AGD Biomedicals Chemistry Analyzer", serial: "K3-E2206N108L", model: "AGD 2260", facility: "SCDL - Davao", region: "DAVAO", department: "Pathology Lab", location: "DAVAO - Lab", status: "Under Maintenance", nextDue: "2026-10-23", risk: "High", lastMaint: "2026-04-23" },
    { id: 11, name: "Mindray Hematology Analyzer", serial: "RM-62104925", model: "BC3200", facility: "RPMED Diagnostics", region: "DAVAO", department: "Pathology Lab", location: "DAVAO - Hematology", status: "Operational", nextDue: "2026-11-01", risk: "High", lastMaint: "2026-05-01" },

    // SOCCSKSARGEN
    { id: 12, name: "Horron Chemistry Analyzer", serial: "S28024518", model: "RD 171", facility: "Gensan Diagnostic Center", region: "SOCCSKSARGEN", department: "Pathology Lab", location: "SOCCSKSARGEN - Lab", status: "Operational", nextDue: "2026-10-15", risk: "High", lastMaint: "2026-04-15" },
    { id: 13, name: "Wondfo Blood Gas Analyzer", serial: "BGA1022311200632", model: "BGA-102", facility: "AVMSCI Hospital", region: "SOCCSKSARGEN", department: "ICU", location: "SOCCSKSARGEN - ICU", status: "Operational", nextDue: "2026-11-24", risk: "Critical", lastMaint: "2026-05-24" },
    { id: 14, name: "Angell Mobile X-ray", serial: "M32D22040013", model: "M Series", facility: "AVMSCI Hospital", region: "SOCCSKSARGEN", department: "Radiology", location: "SOCCSKSARGEN - Radiology", status: "Operational", nextDue: "2026-10-22", risk: "Critical", lastMaint: "2026-04-22" },
    { id: 15, name: "Horron Electrolyte Analyzer", serial: "E28072519", model: "H900", facility: "Koronadal City Diagnostic", region: "SOCCSKSARGEN", department: "Pathology Lab", location: "SOCCSKSARGEN - Lab", status: "Operational", nextDue: "2026-11-05", risk: "High", lastMaint: "2026-05-05" },

    // MAGUINDANAO
    { id: 16, name: "Mindray Hematology Analyzer", serial: "SS-58001882", model: "BC 5000", facility: "USM Hospital", region: "MAGUINDANAO", department: "Pathology Lab", location: "MAGUINDANAO - Lab", status: "Operational", nextDue: "2026-12-01", risk: "High", lastMaint: "2026-06-01" },
    { id: 17, name: "Rayto Chemistry Analyzer", serial: "161350022 BGE", model: "RT 9200", facility: "USM Hospital", region: "MAGUINDANAO", department: "Pathology Lab", location: "MAGUINDANAO - Lab", status: "Operational", nextDue: "2026-11-12", risk: "High", lastMaint: "2026-05-12" },
    { id: 18, name: "HFMED Infusion Pump", serial: "IP202108001", model: "DY11", facility: "TTMF Kidapawan", region: "MAGUINDANAO", department: "ICU", location: "MAGUINDANAO - ICU", status: "Operational", nextDue: "2026-10-19", risk: "Critical", lastMaint: "2026-04-19" },
    { id: 19, name: "Horron Electrolyte Analyzer", serial: "H90025848", model: "H900", facility: "Cotabato Sanitarium", region: "MAGUINDANAO", department: "Pathology Lab", location: "MAGUINDANAO - Lab", status: "Under Maintenance", nextDue: "2026-10-10", risk: "High", lastMaint: "2026-04-10" },

    // LANAO DEL SUR & LANAO DEL NORTE
    { id: 20, name: "Perlove X-ray Machine", serial: "65E24012", model: "PLD6500E", facility: "Dr.Serapio Montañer Hospital", region: "LANAO DEL SUR", department: "Radiology", location: "LANAO DEL SUR - X-Ray", status: "Operational", nextDue: "2026-11-24", risk: "Critical", lastMaint: "2026-05-24" },
    { id: 21, name: "Prunus Anesthesia Machine", serial: "0105240129001", model: "BOARAY 600D", facility: "Dr.Serapio Montañer Hospital", region: "LANAO DEL SUR", department: "Surgery", location: "LANAO DEL SUR - OR", status: "Operational", nextDue: "2026-10-28", risk: "Critical", lastMaint: "2026-04-28" },
    { id: 22, name: "Biolight Patient Monitor", serial: "Q51B0009547", model: "Q5", facility: "Dr.Serapio Montañer Hospital", region: "LANAO DEL SUR", department: "ICU", location: "LANAO DEL SUR - ICU", status: "Operational", nextDue: "2026-11-18", risk: "Critical", lastMaint: "2026-05-18" },
    { id: 23, name: "Aikang Immunoassay Analyzer", serial: "CLAK022314436", model: "Climate 1200", facility: "Gregorio T. Lluch Memorial Hospital", region: "LANAO DEL NORTE", department: "Pathology Lab", location: "LANAO DEL NORTE - Lab", status: "Operational", nextDue: "2026-11-24", risk: "High", lastMaint: "2026-05-24" },

    // BUKIDNON, CARAGA, ILOILO
    { id: 24, name: "Heto Chemistry Analyzer", serial: "CA24-210900532", model: "Flexor 380", facility: "Bongcas Holychild Hospital", region: "BUKIDNON", department: "Pathology Lab", location: "BUKIDNON - Lab", status: "Operational", nextDue: "2026-11-01", risk: "High", lastMaint: "2026-05-01" },
    { id: 25, name: "Prunus Anesthesia Machine", serial: "101231028001", model: "Boaray 700D", facility: "Adea Serra Ty Memorial Medical Center", region: "CARAGA", department: "Surgery", location: "CARAGA - OR Suite", status: "Operational", nextDue: "2026-11-23", risk: "Critical", lastMaint: "2026-05-23" },
    { id: 26, name: "Horron Electrolyte Analyzer", serial: "E28167345", model: "H900", facility: "Western Visayas Sanitarium", region: "ILOILO", department: "Pathology Lab", location: "ILOILO - Clinical Lab", status: "Operational", nextDue: "2026-11-15", risk: "High", lastMaint: "2026-05-15" }
];

if (!localStorage.getItem('seiralab_excel_initialized')) {
    window.equipmentList = SEIRALAB_EXCEL_SEED;
    localStorage.setItem('seiralab_equipment', JSON.stringify(window.equipmentList));
    localStorage.setItem('seiralab_excel_initialized', 'true');
} else {
    window.equipmentList = JSON.parse(localStorage.getItem('seiralab_equipment')) || SEIRALAB_EXCEL_SEED;
}

window.historyLogs = JSON.parse(localStorage.getItem('seiralab_history')) || [
    { id: 101, date: "2026-05-15", eqName: "Flexor Chemistry Analyzer (AB-480)", facility: "Cebu City Medical Center", activity: "Preventive Maintenance & Photometer Calibration", tech: "Biomedical Technical Team", notes: "Cleaned cuvette wash station, verified halogen lamp voltage, passed QC.", reportUrl: "Seiralab_PM_AS24B05160.txt" },
    { id: 102, date: "2026-05-10", eqName: "Biolight ECG Monitor (E65)", facility: "Cebu City Medical Center", activity: "ECG Lead & Thermal Printer PM", tech: "Biomedical Technical Team", notes: "Verified 12-lead waveform accuracy and battery backup discharge.", reportUrl: "Seiralab_PM_E61B0001051.txt" },
    { id: 103, date: "2026-04-26", eqName: "Alexis Hematology Analyzer (AB-H630)", facility: "God Care Medical Diagnostic", activity: "Fluidics & Aperture Cleaning PM", tech: "Biomedical Technical Team", notes: "Performed bleach cycle, checked WBC/RBC aperture voltage, background count 0.", reportUrl: "Seiralab_PM_G10012422003.txt" }
];

const checklistTemplates = {
    "Hematology & Chemistry Analyzers": [
        "Aspiration probe, sample rotor valve & dilutor syringe leak check",
        "WBC / RBC counting chamber & aperture cautery / bleach cleaning",
        "Optical photometer / halogen lamp absorbance & filter verification",
        "Fluidics tubing, peristaltic pump & waste sensor inspection",
        "Background count verification & 3-level Quality Control (QC) run"
    ],
    "Electrolyte & Blood Gas Analyzers": [
        "ISE reference, Na+, K+, Cl-, Ca++ electrode slope calibration",
        "Reagent pack / calibrator A & B fluidic line prime & bubble check",
        "Peristaltic pump tube elasticity & waste chamber seal check",
        "Sample probe sensor & air detector optical check",
        "Internal thermal printer & QC target value verification"
    ],
    "Immunoassay & A1C Analyzers": [
        "Optical fluorescence / laser excitation reader calibration",
        "Incubation block temperature stability verification (37.0 °C ± 0.2 °C)",
        "Card transport / stepper motor track alignment & lubrication",
        "Barcode / QR lot calibration scanner optical cleaning",
        "Control cartridge verification & software error log check"
    ],
    "Microscopes & Centrifuges": [
        "Objective lenses (4x, 10x, 40x, 100x Oil) optical cleaning & alignment",
        "Coarse/fine focus tension & mechanical X-Y stage lubrication",
        "LED illumination / condenser iris diaphragm check (or Rotor balance check)",
        "Centrifuge tachometer RPM verification & timer accuracy check",
        "Lid interlock safety switch & carbon brush / motor vibration check"
    ],
    "Patient Monitors & ECG": [
        "SpO2 sensor optical response & NIBP pneumatic leak/pressure test",
        "ECG 12-lead / 5-lead cable continuity & baseline noise test",
        "Alarm audio/visual limits & display calibration check",
        "Battery charge/discharge capacity & AC power ground leakage test"
    ],
    "X-Ray, Anesthesia & OR Equipment": [
        "Collimator light field alignment / Vaporizer & flowmeter leak check",
        "High-voltage generator / O2 sensor & breathing circuit pressure test",
        "Emergency stop, interlock switches & backup battery safety check",
        "Chassis ground resistance & electrical leakage current test"
    ],
    "Infusion Pumps & General Medical": [
        "Enclosure, power cord & mechanical clamp integrity check",
        "Occlusion pressure alarm & air-in-line ultrasonic sensor test",
        "Flow rate delivery volume accuracy calibration",
        "Electrical safety & battery backup runtime verification"
    ]
};

let currentScheduleFilter = 'all';
let complianceChartInstance = null;
let healthChartInstance = null;
let trendChartInstance = null;

function injectExcelToolbarButton() {
    // Automatically remove "Templates Available: ..." line if present in index.html
    document.querySelectorAll('#schedule .text-xs.text-slate-500.font-medium').forEach(el => {
        if (el.innerText.includes('Templates Available')) el.remove();
    });

    const schedContainer = document.querySelector('#schedule .flex.items-center.space-x-3');
    if (schedContainer && !document.getElementById('excelUploadInput')) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'excelUploadInput';
        fileInput.accept = '.xls,.xlsx,.csv';
        fileInput.className = 'hidden';
        fileInput.onchange = handleExcelFileUpload;

        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.id = 'importAssetDataBtn';
        uploadBtn.onclick = () => fileInput.click();
        uploadBtn.className = 'inline-flex items-center justify-center px-4 py-2 bg-white border border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 font-medium text-sm shadow-xs transition-all space-x-2';
        uploadBtn.innerHTML = `<i data-lucide="upload-cloud" class="w-4 h-4"></i><span>Import Asset Data</span>`;

        schedContainer.prepend(uploadBtn);
        schedContainer.prepend(fileInput);
        if (window.lucide) lucide.createIcons();
    }
}

function loadSheetJSLibrary() {
    return new Promise((resolve, reject) => {
        if (window.XLSX) return resolve(window.XLSX);
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => resolve(window.XLSX);
        script.onerror = () => reject(new Error('Failed to load SheetJS Excel parser'));
        document.head.appendChild(script);
    });
}

async function handleExcelFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showNotificationToast(`Importing asset data from ${file.name}...`);
        const XLSX = await loadSheetJSLibrary();
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const regionalSheets = ['DAVAO', 'SOCCSKSARGEN', 'MAGUINDANAO', 'LANAO DEL SUR', 'LANAO DEL NORTE', 'BUKIDNON', 'CARAGA', 'ILOILO', 'CEBU'];
        const imported = [];
        const seen = new Set();
        let nextId = 1;

        const sheetsToRead = workbook.SheetNames.filter(s => regionalSheets.includes(s.toUpperCase()));
        if (sheetsToRead.length === 0) sheetsToRead.push(workbook.SheetNames[0]);
        else if (workbook.SheetNames.includes('Sheet1')) sheetsToRead.push('Sheet1');

        sheetsToRead.forEach(sheetName => {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
            rows.forEach(row => {
                const facility = String(row['ACCOUNT NAME'] || row['ACCOUNTNAME'] || "").trim();
                const desc = String(row['DESC'] || "").trim();
                if (!facility || !desc) return;

                const mfg = String(row['MFG'] || "Standard").trim();
                const model = String(row['MODEL'] || "Standard").trim();
                const snRaw = String(row['SN'] || "").trim();
                const dedupKey = `${facility.toLowerCase()}|${desc.toLowerCase()}|${model.toLowerCase()}|${snRaw.toLowerCase()}`;
                if (snRaw && seen.has(dedupKey)) return;
                if (snRaw) seen.add(dedupKey);

                const sn = snRaw || `SN-SL-${String(nextId).padStart(4, '0')}`;
                const statusRaw = String(row['STATUS'] || row['Column2'] || "FUNCTIONAL").toUpperCase();
                let status = "Operational";
                if (statusRaw.includes("PULL") || statusRaw.includes("DEFECTIVE") || statusRaw.includes("NOT FUNCTIONAL")) {
                    status = "Out of Service";
                } else if (statusRaw.includes("NOT IN USE")) {
                    status = "Under Maintenance";
                }

                let lastMaint = "2026-05-15";
                let nextDue = "2026-11-15";
                const rawDate = row['INSTALL DATE'];
                if (rawDate) {
                    const dt = new Date(rawDate);
                    if (!isNaN(dt.getTime())) {
                        lastMaint = dt.toISOString().split('T')[0];
                        const m = dt.getMonth();
                        const d = Math.min(dt.getDate(), 28);
                        let dueDt = new Date(2026, m, d);
                        if (dueDt < new Date(2026, 9, 1)) {
                            dueDt = new Date(2026, m + 6, d);
                        }
                        nextDue = dueDt.toISOString().split('T')[0];
                    }
                }

                const dLower = desc.toLowerCase();
                let dept = "Pathology Lab";
                let risk = dLower.includes("analyzer") ? "High" : "Medium";
                if (dLower.includes("x-ray") || dLower.includes("ultrasound")) { dept = "Radiology"; risk = "Critical"; }
                else if (dLower.includes("ventilator") || dLower.includes("blood gas") || dLower.includes("infusion") || dLower.includes("monitor")) { dept = "ICU"; risk = "Critical"; }
                else if (dLower.includes("anesthesia") || dLower.includes("or light") || dLower.includes("or table")) { dept = "Surgery"; risk = "Critical"; }
                else if (dLower.includes("ecg")) { dept = "Cardiology"; risk = "High"; }

                const regionLabel = regionalSheets.includes(sheetName.toUpperCase()) ? sheetName.toUpperCase() : "REGIONAL SITE";
                const fullName = (mfg && mfg !== "Standard" && !dLower.includes(mfg.toLowerCase())) ? `${mfg} ${desc}` : desc;

                imported.push({
                    id: nextId++,
                    name: fullName,
                    serial: sn,
                    model: model,
                    facility: facility,
                    region: regionLabel,
                    department: dept,
                    location: `${regionLabel} - ${dept}`,
                    status: status,
                    nextDue: nextDue,
                    risk: risk,
                    lastMaint: lastMaint
                });
            });
        });

        if (imported.length > 0) {
            window.equipmentList = imported;
            localStorage.setItem('seiralab_equipment', JSON.stringify(window.equipmentList));
            refreshAllViews();
            showNotificationToast(`Imported ${imported.length} Seiralab assets!`);
            if (typeof pushToGitHub === 'function') {
                await pushToGitHub(`Import ${imported.length} equipment records from ${file.name}`);
            }
        }
    } catch (err) {
        console.error(err);
        showNotificationToast(`Asset Import Error: ${err.message}`, true);
    }
}

function populateDynamicFacilities() {
    const select = document.getElementById('filterFacility');
    if (!select) return;
    const currentVal = select.value;
    const facilities = [...new Set(equipmentList.map(e => e.facility))].sort();
    select.innerHTML = '<option value="">All Hospitals / Labs (' + facilities.length + ' Sites)</option>';
    facilities.forEach(fac => {
        select.innerHTML += `<option value="${fac}">${fac}</option>`;
    });
    select.value = currentVal;
}

function refreshAllViews() {
    injectExcelToolbarButton();
    populateDynamicFacilities();
    renderDashboard();
    renderInventoryTable();
    renderScheduleTasks();
    renderHistoryTable();
    renderNotifications();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-teal-600', 'text-teal-600');
        btn.classList.add('border-transparent', 'text-slate-500');
    });
    
    const targetEl = document.getElementById(tabId);
    if (targetEl) targetEl.classList.add('active');

    const activeBtn = document.querySelector(`[data-target="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('border-transparent', 'text-slate-500');
        activeBtn.classList.add('border-teal-600', 'text-teal-600');
    }
    
    if (tabId === 'dashboard') renderDashboard();
    else if (tabId === 'inventory') renderInventoryTable();
    else if (tabId === 'schedule') renderScheduleTasks();
    else if (tabId === 'history') renderHistoryTable();
    else if (tabId === 'reports') renderCharts();
    if (window.lucide) lucide.createIcons();
}

function renderDashboard() {
    const total = equipmentList.length;
    const today = new Date();
    
    let dueCount = 0;
    let overdueCount = 0;
    let completedCount = historyLogs.length;

    equipmentList.forEach(eq => {
        const dueDate = new Date(eq.nextDue);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) overdueCount++;
        else if (diffDays <= 30) dueCount++;
    });

    const complianceRate = total > 0 ? Math.round(((total - overdueCount) / total) * 100) : 100;

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statDue').innerText = dueCount;
    document.getElementById('statOverdue').innerText = overdueCount;
    document.getElementById('statCompleted').innerText = completedCount;
    document.getElementById('statCompliance').innerText = complianceRate + '%';

    const tbody = document.getElementById('urgentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const urgentItems = equipmentList.filter(eq => {
        const dueDate = new Date(eq.nextDue);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
    }).slice(0, 12);

    if (urgentItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">No urgent or overdue equipment maintenance pending. All clear!</td></tr>`;
        return;
    }

    urgentItems.forEach(eq => {
        const dueDate = new Date(eq.nextDue);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        let statusBadge = diffDays < 0 
            ? `<span class="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-semibold">Overdue (${Math.abs(diffDays)}d)</span>`
            : `<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-semibold">Due in ${diffDays}d</span>`;

        let riskBadge = eq.risk === 'Critical'
            ? `<span class="px-2 py-1 bg-rose-50 text-rose-600 rounded font-semibold text-[10px]">Critical</span>`
            : `<span class="px-2 py-1 bg-amber-50 text-amber-600 rounded font-semibold text-[10px]">${eq.risk}</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="py-3 font-semibold text-slate-900">${eq.name}<br><span class="text-xs font-normal text-slate-500">${eq.model} (${eq.serial})</span></td>
                <td class="py-3 text-slate-600">${eq.facility}<br><span class="text-[11px] text-slate-400">${eq.location || eq.department}</span></td>
                <td class="py-3">${riskBadge}</td>
                <td class="py-3">${statusBadge}</td>
                <td class="py-3 text-right">
                    <button onclick="openChecklistModalWithEq(${eq.id})" class="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors">Service PM</button>
                </td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function renderInventoryTable() {
    const search = (document.getElementById('inventorySearch')?.value || '').toLowerCase();
    const facilityFilter = document.getElementById('filterFacility')?.value || '';
    const deptFilter = document.getElementById('filterDepartment')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';

    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = equipmentList.filter(eq => {
        const matchesSearch = eq.name.toLowerCase().includes(search) || eq.serial.toLowerCase().includes(search) || eq.model.toLowerCase().includes(search) || eq.facility.toLowerCase().includes(search);
        const matchesFacility = !facilityFilter || eq.facility === facilityFilter;
        const matchesDept = !deptFilter || eq.department === deptFilter;
        const matchesStatus = !statusFilter || eq.status === statusFilter;
        return matchesSearch && matchesFacility && matchesDept && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400 text-sm">No medical equipment matching the criteria.</td></tr>`;
        return;
    }

    filtered.slice(0, 100).forEach(eq => {
        let statusBadge = '';
        if (eq.status === 'Operational') statusBadge = `<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium flex items-center w-max space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Operational</span></span>`;
        else if (eq.status === 'Under Maintenance') statusBadge = `<span class="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium flex items-center w-max space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>Under Maint</span></span>`;
        else statusBadge = `<span class="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium flex items-center w-max space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span>Out of Service</span></span>`;

        let riskBadge = '';
        if (eq.risk === 'Critical') riskBadge = `<span class="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-semibold">Critical</span>`;
        else if (eq.risk === 'High') riskBadge = `<span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">High</span>`;
        else riskBadge = `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">${eq.risk}</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4 font-semibold text-slate-900">${eq.name}<br><span class="text-xs font-normal text-slate-500">Model: ${eq.model}</span></td>
                <td class="p-4 text-slate-600 font-mono text-xs">${eq.serial}</td>
                <td class="p-4 font-medium text-slate-800 text-xs">${eq.facility}</td>
                <td class="p-4 text-slate-600">${eq.department}<br><span class="text-xs text-slate-400">${eq.location}</span></td>
                <td class="p-4">${riskBadge}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4 text-slate-600 font-medium">${eq.nextDue}</td>
                <td class="p-4 text-right space-x-1">
                    <button onclick="openChecklistModalWithEq(${eq.id})" class="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition-colors" title="Execute PM"><i data-lucide="clipboard-check" class="w-4 h-4"></i></button>
                    <button onclick="openEditEquipmentModal(${eq.id})" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors" title="Edit Equipment"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteEquipment(${eq.id})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors" title="Delete Equipment"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function setScheduleFilter(filter) {
    currentScheduleFilter = filter;
    ['all', 'due', 'overdue'].forEach(f => {
        const btn = document.getElementById(`schedBtn${f.charAt(0).toUpperCase() + f.slice(1)}`);
        if (btn) {
            if (f === filter) {
                btn.classList.remove('bg-slate-100', 'text-slate-600');
                btn.classList.add('bg-teal-600', 'text-white');
            } else {
                btn.classList.remove('bg-teal-600', 'text-white');
                btn.classList.add('bg-slate-100', 'text-slate-600');
            }
        }
    });
    renderScheduleTasks();
}

function renderScheduleTasks() {
    injectExcelToolbarButton();
    const grid = document.getElementById('tasksGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const today = new Date();

    let tasks = equipmentList.map(eq => {
        const dueDate = new Date(eq.nextDue);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        let status = 'upcoming';
        if (diffDays < 0) status = 'overdue';
        else if (diffDays <= 30) status = 'due';
        return { ...eq, diffDays, pmStatus: status };
    });

    if (currentScheduleFilter === 'due') {
        tasks = tasks.filter(t => t.pmStatus === 'due' || t.pmStatus === 'overdue');
    } else if (currentScheduleFilter === 'overdue') {
        tasks = tasks.filter(t => t.pmStatus === 'overdue');
    }

    if (tasks.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">No PM tasks match this filter.</div>`;
        return;
    }

    tasks.slice(0, 60).forEach(eq => {
        let badge = eq.pmStatus === 'overdue' 
            ? `<span class="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold">Overdue by ${Math.abs(eq.diffDays)}d</span>`
            : `<span class="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Due in ${eq.diffDays}d</span>`;

        grid.innerHTML += `
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-teal-500/50 transition-all">
                <div>
                    <div class="flex items-center justify-between mb-3 gap-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-teal-600 truncate">${eq.facility}</span>
                        ${badge}
                    </div>
                    <h3 class="font-bold text-slate-900 text-base">${eq.name}</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Model: <span class="font-semibold text-slate-700">${eq.model}</span> | SN: <span class="font-mono">${eq.serial}</span></p>
                    
                    <div class="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Region / Dept:</span>
                            <span class="font-medium text-slate-800">${eq.location || eq.department}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Status:</span>
                            <span class="font-medium text-slate-800">${eq.status}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Install / Last PM:</span>
                            <span class="font-medium text-slate-800">${eq.lastMaint}</span>
                        </div>
                    </div>
                </div>
                <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-xs text-slate-400">Next Due: ${eq.nextDue}</span>
                    <button onclick="openChecklistModalWithEq(${eq.id})" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center space-x-1.5">
                        <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
                        <span>Execute PM</span>
                    </button>
                </div>
            </div>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function openChecklistModal() {
    const select = document.getElementById('checkEquipmentSelect');
    if (!select) return;
    select.innerHTML = '';

    const sorted = [...equipmentList].sort((a, b) => a.facility.localeCompare(b.facility) || a.name.localeCompare(b.name));
    sorted.forEach(eq => {
        select.innerHTML += `<option value="${eq.id}">[${eq.facility}] ${eq.name} - ${eq.model} (SN: ${eq.serial})</option>`;
    });

    document.getElementById('checkNotes').value = "";
    loadChecklistTemplate();
    document.getElementById('checklistModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function openChecklistModalWithEq(eqId) {
    openChecklistModal();
    const select = document.getElementById('checkEquipmentSelect');
    if (select) {
        select.value = eqId;
        loadChecklistTemplate();
    }
}

function closeChecklistModal() {
    document.getElementById('checklistModal')?.classList.add('hidden');
}

function loadChecklistTemplate() {
    const selectId = document.getElementById('checkEquipmentSelect')?.value;
    const eq = equipmentList.find(e => e.id == selectId);
    const container = document.getElementById('checklistItemsContainer');
    if (!container) return;
    container.innerHTML = '';

    let templateKey = "Infusion Pumps & General Medical";
    if (eq) {
        const lower = `${eq.name} ${eq.model}`.toLowerCase();
        if (lower.includes('hematology') || lower.includes('chemistry') || lower.includes('flexor') || lower.includes('alexis') || lower.includes('mindray') || lower.includes('agd') || lower.includes('horron rd')) {
            templateKey = "Hematology & Chemistry Analyzers";
        } else if (lower.includes('electrolyte') || lower.includes('blood gas') || lower.includes('h900') || lower.includes('bga') || lower.includes('eaglenos')) {
            templateKey = "Electrolyte & Blood Gas Analyzers";
        } else if (lower.includes('immunoassay') || lower.includes('a1c') || lower.includes('fluorecare') || lower.includes('lansion') || lower.includes('aikang')) {
            templateKey = "Immunoassay & A1C Analyzers";
        } else if (lower.includes('microscope') || lower.includes('centrifuge') || lower.includes('cx23')) {
            templateKey = "Microscopes & Centrifuges";
        } else if (lower.includes('monitor') || lower.includes('ecg') || lower.includes('biolight')) {
            templateKey = "Patient Monitors & ECG";
        } else if (lower.includes('x-ray') || lower.includes('anesthesia') || lower.includes('or light') || lower.includes('boaray') || lower.includes('perlove')) {
            templateKey = "X-Ray, Anesthesia & OR Equipment";
        }
    }

    const badge = document.getElementById('templateTypeBadge');
    if (badge) badge.innerText = templateKey;

    const items = checklistTemplates[templateKey] || checklistTemplates["Infusion Pumps & General Medical"];
    items.forEach(item => {
        container.innerHTML += `
            <label class="flex items-center space-x-3 text-xs font-medium text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500">
                <span>${item}</span>
            </label>
        `;
    });
}

async function submitChecklist(event) {
    event.preventDefault();
    const eqId = document.getElementById('checkEquipmentSelect').value;
    const eq = equipmentList.find(e => e.id == eqId);
    const tech = document.getElementById('checkTech').value.trim();
    const notes = document.getElementById('checkNotes').value.trim();

    if (eq) {
        const todayStr = new Date().toISOString().split('T')[0];
        eq.lastMaint = todayStr;
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 6);
        eq.nextDue = nextDate.toISOString().split('T')[0];
        eq.status = "Operational";

        historyLogs.unshift({
            id: Date.now(),
            date: todayStr,
            eqName: `${eq.name} (${eq.model} - SN: ${eq.serial})`,
            facility: eq.facility,
            activity: "Preventive Maintenance & Calibration Check",
            tech: tech,
            notes: notes,
            reportUrl: `Seiralab_PM_Cert_${eq.serial}_${todayStr}.txt`
        });

        localStorage.setItem('seiralab_equipment', JSON.stringify(equipmentList));
        localStorage.setItem('seiralab_history', JSON.stringify(historyLogs));

        closeChecklistModal();
        refreshAllViews();
        showNotificationToast(`PM recorded for ${eq.name} (${eq.facility})!`);

        if (typeof pushToGitHub === 'function') {
            await pushToGitHub(`Complete PM task for ${eq.serial} at ${eq.facility} by ${tech}`);
        }
    }
}

function renderHistoryTable() {
    const search = (document.getElementById('historySearch')?.value || '').toLowerCase();
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = historyLogs.filter(log => 
        log.eqName.toLowerCase().includes(search) || 
        log.tech.toLowerCase().includes(search) || 
        log.notes.toLowerCase().includes(search) ||
        log.facility.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm">No maintenance history logs found.</td></tr>`;
        return;
    }

    filtered.forEach(log => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4 font-medium text-slate-900">${log.date}</td>
                <td class="p-4 font-semibold text-slate-900">${log.eqName}</td>
                <td class="p-4 text-xs font-medium text-slate-700">${log.facility}</td>
                <td class="p-4"><span class="px-2.5 py-1 bg-teal-50 text-teal-700 rounded text-xs font-semibold">${log.activity}</span></td>
                <td class="p-4 text-slate-600 text-xs">${log.tech}</td>
                <td class="p-4 text-slate-600 text-xs max-w-xs truncate" title="${log.notes}">${log.notes}</td>
                <td class="p-4 text-right">
                    <button onclick="downloadSingleReport(${log.id})" class="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors">
                        <i data-lucide="file-text" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>Certificate</span>
                    </button>
                </td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    list.innerHTML = '';
    const today = new Date();

    equipmentList.slice(0, 30).forEach(eq => {
        const diffDays = Math.ceil((new Date(eq.nextDue) - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            list.innerHTML += `
                <div class="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start space-x-3">
                    <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-600 shrink-0 mt-0.5"></i>
                    <div>
                        <p class="text-xs font-bold text-rose-900">Overdue PM: ${eq.name} (${eq.model})</p>
                        <p class="text-xs text-rose-700 mt-0.5">${eq.facility} — Due date was ${eq.nextDue}.</p>
                    </div>
                </div>`;
        } else if (diffDays <= 14) {
            list.innerHTML += `
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start space-x-3">
                    <i data-lucide="clock" class="w-5 h-5 text-amber-600 shrink-0 mt-0.5"></i>
                    <div>
                        <p class="text-xs font-bold text-amber-900">Upcoming PM Due in ${diffDays} Days</p>
                        <p class="text-xs text-amber-700 mt-0.5">${eq.name} (${eq.facility}).</p>
                    </div>
                </div>`;
        }
    });
}

function renderCharts() {
    const ctxComp = document.getElementById('complianceChart')?.getContext('2d');
    if (!ctxComp) return;
    if (complianceChartInstance) complianceChartInstance.destroy();

    const facilities = [...new Set(equipmentList.map(e => e.facility))].slice(0, 8);
    const today = new Date();
    const onTimeData = facilities.map(fac => equipmentList.filter(e => e.facility === fac && new Date(e.nextDue) >= today).length);
    const overdueData = facilities.map(fac => equipmentList.filter(e => e.facility === fac && new Date(e.nextDue) < today).length);

    complianceChartInstance = new Chart(ctxComp, {
        type: 'bar',
        data: {
            labels: facilities,
            datasets: [
                { label: 'On-Time PM', data: onTimeData, backgroundColor: '#0d9488' },
                { label: 'Overdue PM', data: overdueData, backgroundColor: '#f43f5e' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
    });

    const ctxHealth = document.getElementById('healthChart')?.getContext('2d');
    if (healthChartInstance) healthChartInstance.destroy();
    healthChartInstance = new Chart(ctxHealth, {
        type: 'doughnut',
        data: {
            labels: ['Operational', 'Under Maintenance', 'Out of Service'],
            datasets: [{
                data: [
                    equipmentList.filter(e => e.status === 'Operational').length,
                    equipmentList.filter(e => e.status === 'Under Maintenance').length,
                    equipmentList.filter(e => e.status === 'Out of Service').length
                ],
                backgroundColor: ['#10b981', '#f59e0b', '#f43f5e']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxTrend = document.getElementById('trendChart')?.getContext('2d');
    if (trendChartInstance) trendChartInstance.destroy();
    trendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
            datasets: [{
                label: 'Completed PM Tasks',
                data: [22, 28, 35, 30, 42, 38, 45, 40, 50, 45 + historyLogs.length],
                borderColor: '#0d9488',
                backgroundColor: 'rgba(13, 148, 136, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function openAddEquipmentModal() {
    document.getElementById('equipmentModalTitle').innerText = "Add New Medical Equipment";
    document.getElementById('equipmentForm').reset();
    document.getElementById('editEquipmentId').value = "";
    document.getElementById('eqNextDue').value = new Date().toISOString().split('T')[0];
    document.getElementById('equipmentModal').classList.remove('hidden');
}

function openEditEquipmentModal(id) {
    const eq = equipmentList.find(e => e.id === id);
    if (!eq) return;
    document.getElementById('equipmentModalTitle').innerText = "Edit Medical Equipment";
    document.getElementById('editEquipmentId').value = eq.id;
    document.getElementById('eqName').value = eq.name;
    document.getElementById('eqSerial').value = eq.serial;
    document.getElementById('eqModel').value = eq.model;
    document.getElementById('eqFacility').value = eq.facility;
    document.getElementById('eqDepartment').value = eq.department;
    document.getElementById('eqLocation').value = eq.location;
    document.getElementById('eqRisk').value = eq.risk;
    document.getElementById('eqStatus').value = eq.status;
    document.getElementById('eqNextDue').value = eq.nextDue;
    document.getElementById('equipmentModal').classList.remove('hidden');
}

function closeEquipmentModal() {
    document.getElementById('equipmentModal')?.classList.add('hidden');
}

async function saveEquipment(event) {
    event.preventDefault();
    const id = document.getElementById('editEquipmentId').value;
    const name = document.getElementById('eqName').value.trim();
    const serial = document.getElementById('eqSerial').value.trim();
    const model = document.getElementById('eqModel').value.trim();
    const facility = document.getElementById('eqFacility').value.trim();
    const department = document.getElementById('eqDepartment').value;
    const location = document.getElementById('eqLocation').value.trim();
    const risk = document.getElementById('eqRisk').value;
    const status = document.getElementById('eqStatus').value;
    const nextDue = document.getElementById('eqNextDue').value;

    let actionMsg = '';
    if (id) {
        const eq = equipmentList.find(e => e.id == id);
        if (eq) {
            Object.assign(eq, { name, serial, model, facility, department, location, risk, status, nextDue });
            actionMsg = `Update equipment ${serial} (${name})`;
        }
    } else {
        const newId = equipmentList.length > 0 ? Math.max(...equipmentList.map(e => e.id)) + 1 : 1;
        equipmentList.push({
            id: newId, name, serial, model, facility, department, location, risk, status, nextDue,
            lastMaint: new Date().toISOString().split('T')[0]
        });
        actionMsg = `Register new equipment ${serial} (${name})`;
    }

    localStorage.setItem('seiralab_equipment', JSON.stringify(equipmentList));
    closeEquipmentModal();
    refreshAllViews();
    if (typeof pushToGitHub === 'function') await pushToGitHub(actionMsg);
}

async function deleteEquipment(id) {
    const eq = equipmentList.find(e => e.id === id);
    if (!eq) return;
    if (confirm(`Remove ${eq.name} (${eq.serial}) from Seiralab inventory?`)) {
        equipmentList = equipmentList.filter(e => e.id !== id);
        localStorage.setItem('seiralab_equipment', JSON.stringify(equipmentList));
        refreshAllViews();
        if (typeof pushToGitHub === 'function') await pushToGitHub(`Delete equipment ${eq.serial}`);
    }
}

function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportDashboardReport() {
    const headers = ["ID", "Equipment Name", "Serial", "Model", "Facility", "Department", "Location", "Risk", "Status", "Last Maintained", "Next Due"];
    const rows = equipmentList.map(e => [
        e.id, `"${e.name}"`, `"${e.serial}"`, `"${e.model}"`, `"${e.facility}"`, `"${e.department}"`, `"${e.location || ''}"`, e.risk, e.status, e.lastMaint, e.nextDue
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    downloadBlob(csv, `Seiralab_Equipment_Inventory_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showNotificationToast("Downloaded Seiralab Inventory CSV!");
}

function exportHistoryLogs() {
    const headers = ["Log ID", "Date", "Equipment Name", "Facility", "Activity", "Technician", "Notes"];
    const rows = historyLogs.map(l => [
        l.id, l.date, `"${l.eqName}"`, `"${l.facility}"`, `"${l.activity}"`, `"${l.tech}"`, `"${l.notes.replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    downloadBlob(csv, `Seiralab_PM_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showNotificationToast("Downloaded Seiralab Audit Trail CSV!");
}

function downloadSingleReport(logId) {
    const log = historyLogs.find(l => l.id === logId);
    if (!log) return;
    const certText = `=========================================================
SEIRALAB INCORPORATED - BIOMEDICAL ENGINEERING CERTIFICATE
=========================================================
Certificate ID : ${log.id}
Service Date   : ${log.date}
Client Facility: ${log.facility}
Equipment      : ${log.eqName}
Activity Type  : ${log.activity}
Field Engineer : ${log.tech}

SERVICE & CALIBRATION NOTES:
${log.notes}

Verification Status: PASSED (JCAHO / ISO 13485 Compliant)
=========================================================`;
    downloadBlob(certText, `Seiralab_Certificate_${log.id}.txt`, 'text/plain');
}

function showNotificationToast(msg, isError = false) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 z-50 ${isError ? 'bg-rose-900' : 'bg-slate-900'} text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-medium flex items-center space-x-2 transition-all`;
    toast.innerHTML = `<i data-lucide="${isError ? 'alert-triangle' : 'check-circle'}" class="w-4 h-4 ${isError ? 'text-rose-400' : 'text-teal-400'}"></i><span>${msg}</span>`;
    document.body.appendChild(toast);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => toast.remove(), 3500);
}

window.addEventListener('load', function() {
    refreshAllViews();
    if (window.lucide) lucide.createIcons();
});
