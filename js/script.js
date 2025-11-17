// This is a modified version that handles embedded Step 7
// Copy from original script.js but modify Step 7 loading

// Copy the entire original script.js content
// Miner Presets Data
const minerPresets = [
    { index: 0, model: 'Antminer S21 Pro', manufacturer: 'Bitmain', hashrate: 234, power: 3510, efficiency: 15.0, defaultCost: 4500, releaseYear: 2024 },
    { index: 1, model: 'Antminer S21', manufacturer: 'Bitmain', hashrate: 200, power: 3500, efficiency: 17.5, defaultCost: 3800, releaseYear: 2024 },
    { index: 5, model: 'Whatsminer M60S', manufacturer: 'MicroBT', hashrate: 172, power: 3344, efficiency: 19.4, defaultCost: 3200, releaseYear: 2024 },
    { index: 2, model: 'Antminer S19 XP', manufacturer: 'Bitmain', hashrate: 140, power: 3010, efficiency: 21.5, defaultCost: 2800, releaseYear: 2023 },
    { index: 6, model: 'Whatsminer M50S++', manufacturer: 'MicroBT', hashrate: 150, power: 3306, efficiency: 22.0, defaultCost: 2900, releaseYear: 2023 },
    { index: 9, model: 'AvalonMiner 1466', manufacturer: 'Canaan', hashrate: 150, power: 3500, efficiency: 23.3, defaultCost: 2700, releaseYear: 2023 },
    { index: 3, model: 'Antminer S19 Pro', manufacturer: 'Bitmain', hashrate: 110, power: 3250, efficiency: 29.5, defaultCost: 2200, releaseYear: 2022 },
    { index: 4, model: 'Antminer S19j Pro', manufacturer: 'Bitmain', hashrate: 100, power: 3050, efficiency: 30.5, defaultCost: 2000, releaseYear: 2022 },
    { index: 7, model: 'Whatsminer M50S', manufacturer: 'MicroBT', hashrate: 130, power: 3306, efficiency: 25.4, defaultCost: 2400, releaseYear: 2023 }
];

// Global State
let currentStep = 1;
let opsOnlyMode = false;
let projectData = {
    gasPrice: 0.50, hashPrice: 50.00, gasAvailable: 2000, powerGenerated: 2500, startYear: 2026,
    totalHashratePH: 0, totalCapex: 0, totalOpex: 0
};
let miners = [];

// Track loaded scripts
const loadedScripts = { financial: false, investor: false, montecarlo: false };


// Load/Save Project
function loadSavedProject() {
    try {
        const saved = localStorage.getItem('offGridProject');
        if(saved) {
            const data = JSON.parse(saved);
            Object.assign(projectData, data.inputs || {});
            miners = data.miners || [];
            ['gasPrice', 'hashPrice', 'gasAvailable', 'powerGenerated', 'startYear'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = projectData[id];
            });
            updateInputSummary();
            renderMinerTable();
            console.log('Project loaded successfully');
        }
    } catch(e) {
        console.error('Error loading project:', e);
        if(e.name === 'QuotaExceededError') localStorage.clear();
    }
}

function saveProject() {
    try {
        const data = {
            inputs: { gasPrice: projectData.gasPrice, hashPrice: projectData.hashPrice, gasAvailable: projectData.gasAvailable, powerGenerated: projectData.powerGenerated, startYear: projectData.startYear },
            miners: miners,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('offGridProject', JSON.stringify(data));
    } catch(e) {
        console.error('Error saving project:', e);
        if(e.name === 'QuotaExceededError') alert('Storage full export data.');
    }
}

function autoSave() {
    saveProject();
}

// Step Navigation - IMPROVED
function switchStep(step) {
    // Only block forward movement if data incomplete
    if((step === 5 || step === 6 || step === 7) && (projectData.totalCapex === 0 || projectData.totalOpex === 0 || miners.length === 0)) {
        alert('Complete Steps 2-4 first.');
        return;
    }
    
    // Remove active from all tabs
    for(let i = 1; i <= 7; i++) {
        const tabContent = document.getElementById('step' + i);
        const tabButton = document.getElementById('tab' + i);
        if(tabContent) tabContent.classList.remove('active');
        if(tabButton) {
            tabButton.classList.remove('active');
            tabButton.setAttribute('aria-selected', 'false');
        }
    }
    
    // Activate selected tab
    const targetContent = document.getElementById('step' + step);
    const targetButton = document.getElementById('tab' + step);
    if(targetContent) targetContent.classList.add('active');
    if(targetButton) {
        targetButton.classList.add('active');
        targetButton.setAttribute('aria-selected', 'true');
    }
    
    currentStep = step;

    // Load/refresh step data
    if(step === 1) loadStep1();
    if(step === 2) loadStep2();
    if(step === 3) loadStep3();
    if(step === 4) loadStep4();
    if(step === 5) loadStep5Content();
    if(step === 6) loadStep6Content();
    if(step === 7) loadStep7Content();
}

// NEW: Load Step 1 (refresh from saved data)
function loadStep1() {
    updateInputSummary();
}

async function loadStep5Content() {
    const content = document.getElementById('step5-content');
    content.innerHTML = '<div class="loading-state"><p>Loading Financial Model...</p></div>';
    try {
        const response = await fetch('./Step5.html');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        content.innerHTML = await response.text();

        if (!loadedScripts.financial) {
            loadedScripts.financial = true;
            const script = document.createElement('script');
            script.src = './js/financial.js';
            script.onload = () => loadStep5();
            script.onerror = () => {
                console.error('Failed to load financial.js');
                content.innerHTML = '<p>Error loading financial model. Check files.</p>';
            };
            document.head.appendChild(script);
        } else {
            loadStep5();
        }
    } catch(e) {
        console.error('Step 5 fetch error:', e);
        content.innerHTML = '<p>Error loading Step 5: ' + e.message + '</p>';
    }
}

async function loadStep6Content() {
    const content = document.getElementById('step6-content');
    content.innerHTML = '<div class="loading-state"><p>Loading Investor Analysis...</p></div>';
    try {
        const response = await fetch('./Step6.html');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        content.innerHTML = await response.text();

        if (!loadedScripts.investor) {
            loadedScripts.investor = true;
            const script = document.createElement('script');
            script.src = './js/investor.js';
            script.onload = () => loadStep6();
            script.onerror = () => {
                console.error('Failed to load investor.js');
                content.innerHTML = '<p>Error loading investor model. Check files.</p>';
            };
            document.head.appendChild(script);
        } else {
            loadStep6();
        }
    } catch(e) {
        console.error('Step 6 fetch error:', e);
        content.innerHTML = '<p>Error loading Step 6: ' + e.message + '</p>';
    }
}

async function loadStep7Content() {
    const content = document.getElementById('step7-content');
    content.innerHTML = '<div class="loading-state"><p>Loading Monte Carlo Simulation...</p></div>';
    try {
        const response = await fetch('./Step7.html');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        content.innerHTML = await response.text();

        if (!loadedScripts.montecarlo) {
            loadedScripts.montecarlo = true;
            const script = document.createElement('script');
            script.src = './js/montecarlo.js';
            script.onload = () => {
                console.log('Monte Carlo simulation JS loaded successfully');
            };
            script.onerror = () => {
                console.error('Failed to load montecarlo.js');
                content.innerHTML = '<p>Error loading Monte Carlo simulation. Check files.</p>';
            };
            document.head.appendChild(script);
        } else {
            console.log('Monte Carlo JS already loaded');
        }
    } catch(e) {
        console.error('Step 7 fetch error:', e);
        content.innerHTML = '<p>Error loading Step 7: ' + e.message + '</p>';
    }
}

// Global Functions for HTML Events
function toggleCumulative() {
    opsOnlyMode = !opsOnlyMode;
    const btn = document.getElementById('toggleBtn');
    if (btn) btn.textContent = opsOnlyMode ? 'Full Cumulative' : 'Ops-Only Cumulative';
    if (typeof calculateFinancialsInternal === 'function') calculateFinancialsInternal();
}

function calculateFinancials() {
    if (typeof calculateFinancialsInternal === 'function') {
        calculateFinancialsInternal();
    } else {
        console.log('Financial calc not loaded  Step 5');
    }
}

function saveStep5() {
    calculateFinancials();
    autoSave();
    switchStep(6);
}

function loadStep5() {
    document.getElementById('savedCapex5').textContent = projectData.totalCapex.toLocaleString();
    document.getElementById('savedOpex5').textContent = projectData.totalOpex.toLocaleString();
    document.getElementById('savedHashrate5').textContent = projectData.totalHashratePH.toFixed(2) + ' PH/s';
    calculateFinancialsInternal();
}

function loadStep6() {
    if(projectData.totalCapex > 0 && projectData.totalOpex > 0) calculateInvestorAnalysis();
}

// STEP 1: INPUTS
function updateInputSummary() {
    const gasPrice = parseFloat(document.getElementById('gasPrice').value) || 0.50;
    const hashPrice = parseFloat(document.getElementById('hashPrice').value) || 50;
    const gasAvailable = parseFloat(document.getElementById('gasAvailable').value) || 2000;
    const powerGenerated = parseFloat(document.getElementById('powerGenerated').value) || 2500;
    const startYear = parseInt(document.getElementById('startYear').value) || 2026;
    
    projectData.gasPrice = gasPrice;
    projectData.hashPrice = hashPrice;
    projectData.gasAvailable = gasAvailable;
    projectData.powerGenerated = powerGenerated;
    projectData.startYear = startYear;

    const powerMW = powerGenerated / 1000;
    const dailyGasCost = gasPrice * gasAvailable;
    const annualGasCost = dailyGasCost * 365;

    document.getElementById('summaryPower').textContent = powerMW.toFixed(2) + ' MW';
    document.getElementById('summaryEnergyCost').textContent = '$' + dailyGasCost.toLocaleString();
    document.getElementById('summaryHashPrice').textContent = '$' + hashPrice.toFixed(2);

    document.getElementById('tableGasPrice').textContent = gasPrice.toFixed(2);
    document.getElementById('tableHashPrice').textContent = hashPrice.toFixed(2);
    document.getElementById('tableGasAvailable').textContent = gasAvailable.toLocaleString();
    document.getElementById('tablePowerGenerated').textContent = powerGenerated.toLocaleString();
    document.getElementById('tableAnnualGas').textContent = '$' + annualGasCost.toLocaleString();
    
    autoSave();
}

function saveStep1() {
    updateInputSummary();
    autoSave();
    switchStep(2);
}

// STEP 2: MINING EQUIPMENT
function loadStep2() {
    const powerMW = projectData.powerGenerated / 1000;
    document.getElementById('savedPower2').textContent = powerMW.toFixed(2) + ' MW';
    renderMinerTable();
}

function onMinerPresetChange() {
    const select = document.getElementById('minerPresetSelect');
    const value = select.value;
    if(value === '') {
        document.getElementById('minerSpecsDisplay').style.display = 'none';
        return;
    }
    if(value === 'custom') {
        select.value = '';
        openAddMinerModal();
        return;
    }
    const preset = minerPresets.find(p => p.index === parseInt(value));
    if(preset) displayMinerSpecs(preset);
}

function displayMinerSpecs(preset) {
    document.getElementById('minerSpecsDisplay').style.display = 'block';
    document.getElementById('selectedMinerName').textContent = preset.model;
    document.getElementById('selectedMinerManufacturer').textContent = `${preset.manufacturer} Released ${preset.releaseYear}`;
    document.getElementById('selectedHashrate').value = preset.hashrate;
    document.getElementById('selectedPower').value = preset.power;
    document.getElementById('selectedEfficiency').value = preset.efficiency;
    document.getElementById('selectedCost').value = preset.defaultCost;
    document.getElementById('selectedQuantity').value = 1;
}

function addSelectedMiner() {
    const model = document.getElementById('selectedMinerName').textContent;
    const hashrate = parseFloat(document.getElementById('selectedHashrate').value);
    const power = parseFloat(document.getElementById('selectedPower').value);
    const cost = parseFloat(document.getElementById('selectedCost').value) || 0;
    const quantity = parseInt(document.getElementById('selectedQuantity').value) || 0;
    if(quantity <= 0 || cost <= 0) {
        alert('Valid quantity and cost required.');
        return;
    }
    miners.push({ model, quantity, hashrate, power, cost });
    renderMinerTable();
    autoSave();
    cancelMinerSelection();
}

function cancelMinerSelection() {
    document.getElementById('minerPresetSelect').value = '';
    document.getElementById('minerSpecsDisplay').style.display = 'none';
}

function openAddMinerModal() {
    document.getElementById('addMinerModal').style.display = 'block';
    // Clear form
    document.getElementById('minerModel').value = '';
    document.getElementById('minerHashrate').value = '';
    document.getElementById('minerPower').value = '';
    document.getElementById('minerCost').value = '';
    document.getElementById('minerQuantity').value = '1';
}

function closeAddMinerModal() {
    document.getElementById('addMinerModal').style.display = 'none';
}

function addCustomMiner() {
    const model = document.getElementById('minerModel').value;
    const hashrate = parseFloat(document.getElementById('minerHashrate').value) || 0;
    const power = parseFloat(document.getElementById('minerPower').value) || 0;
    const cost = parseFloat(document.getElementById('minerCost').value) || 0;
    const quantity = parseInt(document.getElementById('minerQuantity').value) || 0;
    if(!model || hashrate <= 0 || power <= 0 || cost <= 0 || quantity <= 0) {
        alert('Fill all fields with valid values.');
        return;
    }
    miners.push({ model, hashrate, power, cost, quantity });
    renderMinerTable();
    closeAddMinerModal();
    autoSave();
    alert('Custom miner added!');
}

function deleteMiner(index) {
    if(confirm('Remove this miner?')) {
        miners.splice(index, 1);
        renderMinerTable();
        autoSave();
    }
}

function renderMinerTable() {
    const tbody = document.getElementById('minerTable');
    let totalHashrate = 0, totalPower = 0, totalCost = 0, totalQty = 0;
    if(miners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No miners added. Select a model from the dropdown above.</td></tr>';
        updateFleetMetrics(0, 0, 0, 0);
        return;
    }
    tbody.innerHTML = miners.map((m, idx) => {
        const jth = (m.power / m.hashrate) * 1000;
        const wth = m.power / m.hashrate;
        const grade = jth < 20 ? 'EXCELLENT' : jth < 25 ? 'GOOD' : jth < 30 ? 'FAIR' : 'POOR';
        const gradeClass = jth < 20 ? 'efficiency-excellent' : jth < 25 ? 'efficiency-good' : jth < 30 ? 'efficiency-fair' : 'efficiency-poor';
        const minerHashrate = m.hashrate * m.quantity;
        const minerPower = m.power * m.quantity;
        const minerCost = m.cost * m.quantity;
        totalHashrate += minerHashrate;
        totalPower += minerPower;
        totalCost += minerCost;
        totalQty += m.quantity;

        // Escape user input to prevent XSS
        const safeModel = typeof escapeHtml === 'function' ? escapeHtml(m.model) : String(m.model).replace(/[<>]/g, '');

        return `
            <tr>
                <td>${safeModel}</td>
                <td>${m.quantity}</td>
                <td class="number">${m.hashrate.toFixed(1)}</td>
                <td class="number">${m.power.toLocaleString()}</td>
                <td class="number">${jth.toFixed(1)}</td>
                <td class="number">${wth.toFixed(1)}</td>
                <td><span class="efficiency-badge ${gradeClass}">${grade}</span></td>
                <td class="number">$${m.cost.toLocaleString()}</td>
                <td class="number">$${minerCost.toLocaleString()}</td>
                <td><button class="action-btn btn-danger" onclick="removeMiner(${idx})">Remove</button></td>
            </tr>
        `;
    }).join('');
    updateFleetMetrics(totalHashrate, totalPower, totalCost, totalQty ? (totalPower / totalQty) / (totalHashrate / totalQty / 1000) : 0);
}

function updateFleetMetrics(hashrate, power, cost, avgJTH) {
    const hashratePH = hashrate / 1000;
    const powerKW = power / 1000;
    const utilization = (powerKW / projectData.powerGenerated) * 100;
    document.getElementById('totalHashratePH').textContent = hashratePH.toFixed(2) + ' PH/s';
    document.getElementById('fleetEfficiency').textContent = avgJTH.toFixed(1) + ' J/TH';
    document.getElementById('powerUtilization').textContent = utilization.toFixed(1) + '%';
    document.getElementById('totalMinerCost').textContent = '$' + cost.toLocaleString();
    projectData.totalHashratePH = hashratePH;
    document.getElementById('powerWarning').style.display = utilization > 100 ? 'block' : 'none';
}

function removeMiner(index) {
    if(confirm('Remove this miner?')) {
        miners.splice(index, 1);
        renderMinerTable();
        autoSave();
    }
}

function saveStep2() {
    if(miners.length === 0) {
        alert('Add at least one miner.');
        return;
    }
    autoSave();
    switchStep(3);
}

// STEP 3: CAPEX
function loadStep3() {
    const minerQty = miners.reduce((sum, m) => sum + m.quantity, 0);
    const hashratePH = projectData.totalHashratePH;
    const powerMW = projectData.powerGenerated / 1000;
    document.getElementById('savedMinerQty3').textContent = minerQty;
    document.getElementById('savedHashrate3').textContent = hashratePH.toFixed(2) + ' PH/s';
    document.getElementById('savedPower3').textContent = powerMW.toFixed(2) + ' MW';
    document.getElementById('cost_miners').value = miners.reduce((sum, m) => sum + (m.cost * m.quantity), 0);
    calculateCapex();
}

function calculateCapex() {
    const costs = {
        container: parseFloat(document.getElementById('cost_container').value) || 0,
        miners: parseFloat(document.getElementById('cost_miners').value) || 0,
        cooling: parseFloat(document.getElementById('cost_cooling').value) || 0,
        networking: parseFloat(document.getElementById('cost_networking').value) || 0,
        pdu: parseFloat(document.getElementById('cost_pdu').value) || 0,
        starlink: parseFloat(document.getElementById('cost_starlink').value) || 0,
        generator: parseFloat(document.getElementById('cost_generator').value) || 0,
        separator: parseFloat(document.getElementById('cost_separator').value) || 0,
        desiccant: parseFloat(document.getElementById('cost_desiccant').value) || 0,
        piping: parseFloat(document.getElementById('cost_piping').value) || 0,
        sitePrep: parseFloat(document.getElementById('cost_site_prep').value) || 0,
        deployment: parseFloat(document.getElementById('cost_deployment').value) || 0,
        securityCapex: parseFloat(document.getElementById('cost_security_capex').value) || 0
    };
    const dataCenter = costs.container + costs.miners + costs.cooling + costs.networking + costs.pdu + costs.starlink;
    const gasInfra = costs.generator + costs.separator + costs.desiccant + costs.piping;
    const siteDev = costs.sitePrep + costs.deployment + costs.securityCapex;
    const total = dataCenter + gasInfra + siteDev;
    projectData.totalCapex = total;
    const hashratePH = projectData.totalHashratePH || 1;
    const costPerPH = total / hashratePH;
    const powerKW = projectData.powerGenerated || 1;
    document.getElementById('summaryTotalCapex').textContent = '$' + total.toLocaleString();
    document.getElementById('summaryInfraCapex').textContent = '$' + (dataCenter - costs.miners).toLocaleString();
    document.getElementById('summaryMinerCapex').textContent = '$' + costs.miners.toLocaleString();
    document.getElementById('summaryCostPerPH').textContent = '$' + costPerPH.toLocaleString();
    document.getElementById('totalCapexRow').textContent = '$' + total.toLocaleString();
    // Category updates
    document.getElementById('catDataCenter').textContent = '$' + dataCenter.toLocaleString();
    document.getElementById('pctDataCenter').textContent = total > 0 ? ((dataCenter / total * 100).toFixed(1) + '%') : '0%';
    document.getElementById('kwDataCenter').textContent = '$' + (dataCenter / powerKW).toLocaleString();
    document.getElementById('catGas').textContent = '$' + gasInfra.toLocaleString();
    document.getElementById('pctGas').textContent = total > 0 ? ((gasInfra / total * 100).toFixed(1) + '%') : '0%';
    document.getElementById('kwGas').textContent = '$' + (gasInfra / powerKW).toLocaleString();
    document.getElementById('catSite').textContent = '$' + siteDev.toLocaleString();
    document.getElementById('pctSite').textContent = total > 0 ? ((siteDev / total * 100).toFixed(1) + '%') : '0%';
    document.getElementById('kwSite').textContent = '$' + (siteDev / powerKW).toLocaleString();
    document.getElementById('catTotalCapex').textContent = '$' + total.toLocaleString();
    document.getElementById('kwTotal').textContent = '$' + (total / powerKW).toLocaleString();
}

function saveStep3() {
    calculateCapex();
    autoSave();
    switchStep(4);
}

// STEP 4: OPEX
function loadStep4() {
    const powerMW = projectData.powerGenerated / 1000;
    const minerQty = miners.reduce((sum, m) => sum + m.quantity, 0);
    document.getElementById('savedPower4').textContent = powerMW.toFixed(2) + ' MW';
    document.getElementById('savedMinerQty4').textContent = minerQty;
    document.getElementById('savedCapex4').textContent = projectData.totalCapex.toLocaleString();
    document.getElementById('opex_gas').value = (projectData.gasPrice * projectData.gasAvailable * 365).toFixed(0);
    calculateAnnualOpex();
}

function calculateAnnualOpex() {
    const opexItems = {
        gas: parseFloat(document.getElementById('opex_gas').value) || 0,
        additives: parseFloat(document.getElementById('opex_additives').value) || 0,
        gen_maint: parseFloat(document.getElementById('opex_gen_maint').value) || 0,
        miner_maint: parseFloat(document.getElementById('opex_miner_maint').value) || 0,
        facility: parseFloat(document.getElementById('opex_facility').value) || 0,
        spares: parseFloat(document.getElementById('opex_spares').value) || 0,
        manager: parseFloat(document.getElementById('opex_manager').value) || 0,
        monitoring: parseFloat(document.getElementById('opex_monitoring').value) || 0,
        internet: parseFloat(document.getElementById('opex_internet').value) || 0,
        pool: parseFloat(document.getElementById('opex_pool').value) || 0,
        software: parseFloat(document.getElementById('opex_software').value) || 0,
        insurance: parseFloat(document.getElementById('opex_insurance').value) || 0,
        liability: parseFloat(document.getElementById('opex_liability').value) || 0,
        permits: parseFloat(document.getElementById('opex_permits').value) || 0,
        security: parseFloat(document.getElementById('opex_security').value) || 0,
        contingency: parseFloat(document.getElementById('opex_contingency').value) || 0
    };

    // Update monthly
    Object.keys(opexItems).forEach(key => {
        const monthlyEl = document.getElementById('monthly_' + key);
        if(monthlyEl) monthlyEl.textContent = (opexItems[key] / 12).toLocaleString(undefined, {maximumFractionDigits: 0});
    });

    const energyFuel = opexItems.gas + opexItems.additives;
    const maintenance = opexItems.gen_maint + opexItems.miner_maint + opexItems.facility + opexItems.spares;
    const personnel = opexItems.manager + opexItems.monitoring;
    const connectivity = opexItems.internet + opexItems.pool + opexItems.software;
    const insuranceCompliance = opexItems.insurance + opexItems.liability + opexItems.permits;
    const securityContingency = opexItems.security + opexItems.contingency;

    const totalAnnual = energyFuel + maintenance + personnel + connectivity + insuranceCompliance + securityContingency;
    const totalMonthly = totalAnnual / 12;
    const hashratePH = projectData.totalHashratePH || 1;
    const opexPerPH = totalAnnual / hashratePH;
    const opexCapexRatio = projectData.totalCapex > 0 ? (totalAnnual / projectData.totalCapex * 100) : 0;

    projectData.totalOpex = totalAnnual;

    document.getElementById('summaryTotalOpex').textContent = '$' + totalAnnual.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('summaryMonthlyOpex').textContent = '$' + totalMonthly.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('summaryOpexPerPH').textContent = '$' + opexPerPH.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('summaryOpexCapexRatio').textContent = opexCapexRatio.toFixed(1) + '%';

    document.getElementById('totalAnnualOpex').textContent = '$' + totalAnnual.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('totalMonthlyOpex').textContent = '$' + totalMonthly.toLocaleString(undefined, {maximumFractionDigits: 0});

    // Categories
    document.getElementById('catEnergyFuel').textContent = '$' + energyFuel.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('pctEnergyFuel').textContent = totalAnnual > 0 ? ((energyFuel/totalAnnual)*100).toFixed(1) + '%' : '0%';
    document.getElementById('monthlyEnergyFuel').textContent = '$' + (energyFuel/12).toLocaleString(undefined, {maximumFractionDigits: 0});

    document.getElementById('catMaintenance').textContent = '$' + maintenance.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('pctMaintenance').textContent = totalAnnual > 0 ? ((maintenance/totalAnnual)*100).toFixed(1) + '%' : '0%';
    document.getElementById('monthlyMaintenance').textContent = '$' + (maintenance/12).toLocaleString(undefined, {maximumFractionDigits: 0});

    document.getElementById('catPersonnel').textContent = '$' + personnel.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('pctPersonnel').textContent = totalAnnual > 0 ? ((personnel/totalAnnual)*100).toFixed(1) + '%' : '0%';
    document.getElementById('monthlyPersonnel').textContent = '$' + (personnel/12).toLocaleString(undefined, {maximumFractionDigits: 0});

    document.getElementById('catConnectivity').textContent = '$' + connectivity.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('pctConnectivity').textContent = totalAnnual > 0 ? ((connectivity/totalAnnual)*100).toFixed(1) + '%' : '0%';
    document.getElementById('monthlyConnectivity').textContent = '$' + (connectivity/12).toLocaleString(undefined, {maximumFractionDigits: 0});

    document.getElementById('catInsurance').textContent = '$' + insuranceCompliance.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('pctInsurance').textContent = totalAnnual > 0 ? ((insuranceCompliance/totalAnnual)*100).toFixed(1) + '%' : '0%';
    document.getElementById('monthlyInsurance').textContent = '$' + (insuranceCompliance/12).toLocaleString(undefined, {maximumFractionDigits: 0});

    document.getElementById('catSecurity').textContent = '$' + securityContingency.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('pctSecurity').textContent = totalAnnual > 0 ? ((securityContingency/totalAnnual)*100).toFixed(1) + '%' : '0%';
    document.getElementById('monthlySecurity').textContent = '$' + (securityContingency/12).toLocaleString(undefined, {maximumFractionDigits: 0});

    document.getElementById('catTotalOpex').textContent = '$' + totalAnnual.toLocaleString(undefined, {maximumFractionDigits: 0});
    document.getElementById('catMonthlyTotal').textContent = '$' + totalMonthly.toLocaleString(undefined, {maximumFractionDigits: 0});
}

function saveStep4() {
    calculateAnnualOpex();
    autoSave();
    switchStep(5);
}

// Modal Event
window.onclick = function(event) {
    const modal = document.getElementById('addMinerModal');
    if(event.target == modal) closeAddMinerModal();
};

// Initialize
document.getElementById('reportDate').textContent = new Date('2025-11-06').toLocaleDateString();
loadSavedProject();
updateInputSummary();

