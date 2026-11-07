// ============================================================================
// SEIRALAB CMMS - ASSET-IMPORTER.JS
// 4. MULTI-SHEET EXCEL (.XLS / .XLSX), CSV & JSON IMPORTER (FIXED FOR installation.xls)
// 5. REMOVE "RISK" COLUMN FROM DASHBOARD, INVENTORY & ADD EQUIPMENT MODAL
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
    if (typeof isVisitorMode === 'function' && isVisitorMode()) {
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
            str = str.replace(/,(\d{4})/, ', $1');
            const parsed = new Date(str);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1995 && parsed.getFullYear() <= 2035) {
                return parsed.toISOString().split('T')[0];
            }
        }
    }
    return new Date().toISOString().split('T')[0];
}

function computeNextPMFromInstall(installDateStr) {
    const base = new Date(installDateStr);
    if (isNaN(base.getTime())) {
        const fallback = new Date();
        fallback.setMonth(fallback.getMonth() + 6);
        return fallback.toISOString().split('T')[0];
    }
    const next = new Date(base);
    next.setMonth(next.getMonth() + 6);

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

function parseWorksheetToEquipment(worksheet, sheetName, XLSX) {
    const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!matrix || matrix.length === 0) return [];

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

        if (facility.toLowerCase() === 'account name' || model.toLowerCase() === 'model') continue;
        if (!facility && !prodType && !model && !brand) continue;

        if (facility) {
            lastKnownFacility = facility;
            if (address) lastKnownAddress = address;
        } else if (lastKnownFacility && (prodType || model || brand)) {
            facility = lastKnownFacility;
            if (!address) address = lastKnownAddress;
        }

        if (!facility && !prodType && !model) continue;

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
        const cleanLocation = address ? `${sheetName} - ${address}` : `${sheetName} - Clinical Lab`;

        const lastPMDate = parseFlexibleInstallDate(rawDate);
        const nextDueDate = rawNext ? parseFlexibleInstallDate(rawNext) : computeNextPMFromInstall(lastPMDate);

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
            department: cleanDept,
            dept: cleanDept,
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

function sanitizeExistingEquipmentList() {
    if (!Array.isArray(window.equipmentList)) return;

    window.equipmentList = window.equipmentList.filter(item => {
        const isBrokenImport = String(item.serial || '').startsWith('SN-') &&
                               (!item.department || item.department === 'undefined') &&
                               item.facility === 'Cebu City Medical Center' &&
                               item.name !== 'Flexor Chemistry Analyzer';
        return !isBrokenImport;
    });

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
    sanitizeExistingEquipmentList();

    const uniqueIncomingMap = new Map();
    allExtractedItems.forEach(item => {
        const sKey = normalizeSerialKey(item.serial);
        const dedupKey = sKey ? `serial:${sKey}` : `comp:${normalizeCompositeKey(item)}|${item.serial}`;
        uniqueIncomingMap.set(dedupKey, item);
    });

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

    localStorage.setItem('seiralab_equipment', JSON.stringify(window.equipmentList));
    try {
        if (typeof equipmentList !== 'undefined') equipmentList = window.equipmentList;
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
        await pushToGitHub(`Import Assets (${file.name}): +${addedCount} new, ${updatedCount} updated (${totalHospitals} sites)`);
    }
}

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

// 5. REMOVE "RISK" FROM DASHBOARD, EQUIPMENT INVENTORY & ADD EQUIPMENT MODAL
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

window.triggerAssetImportPicker = triggerAssetImportPicker;
window.importAssetData = triggerAssetImportPicker;
window.triggerImport = triggerAssetImportPicker;
window.handleImportFile = handleAssetDataFileImport;
window.rebuildHospitalFilterDropdown = rebuildHospitalFilterDropdown;

ensureSheetJSLoaded().catch(() => {});
sanitizeExistingEquipmentList();
localStorage.setItem('seiralab_equipment', JSON.stringify(window.equipmentList || []));
relocateImportAssetButtonAndFixInput();
removeRiskFromAllUI();
setTimeout(() => {
    rebuildHospitalFilterDropdown();
    if (typeof renderInventoryTable === 'function') renderInventoryTable();
}, 250);
