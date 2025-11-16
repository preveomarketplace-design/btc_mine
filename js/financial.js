// financial.js - Financial Model Module (Refactored with GP/LP)
// Dependencies: utils.js (CONSTANTS, calculateIRRSimplified, getEquipmentValue)

function loadStep5() {
    if (!projectData || projectData.totalCapex <= 0) {
        console.error('Project data not initialized. Please complete Steps 1-4 first.');
        alert('Please complete Steps 1-4 before viewing financial analysis.');
        return;
    }
    
    // Update summary fields
    const savedCapexEl = document.getElementById('savedCapex5');
    const savedOpexEl = document.getElementById('savedOpex5');
    const savedHashrateEl = document.getElementById('savedHashrate5');
    
    if (savedCapexEl) savedCapexEl.textContent = projectData.totalCapex.toLocaleString();
    if (savedOpexEl) savedOpexEl.textContent = projectData.totalOpex.toLocaleString();
    if (savedHashrateEl) savedHashrateEl.textContent = projectData.totalHashratePH.toFixed(2) + ' PH/s';
    
    // Restore saved values if they exist
    const savedInvestorCapital = localStorage.getItem('investorCapital');
    const savedTotalLpCapital = localStorage.getItem('totalLpCapital');
    const savedGpLpSplit = localStorage.getItem('gpLpSplit');
    
    const investorCapitalEl = document.getElementById('investorCapital');
    const totalLpCapitalEl = document.getElementById('totalLpCapital');
    const gpLpSplitEl = document.getElementById('gpLpSplit');
    
    if (savedInvestorCapital && investorCapitalEl) investorCapitalEl.value = savedInvestorCapital;
    if (savedTotalLpCapital && totalLpCapitalEl) totalLpCapitalEl.value = savedTotalLpCapital;
    if (savedGpLpSplit && gpLpSplitEl) gpLpSplitEl.value = savedGpLpSplit;
    
    // Run calculations
    calculateInvestmentReturns();
}

function calculateInvestmentReturns() {
    try {
        // Save current inputs to localStorage for persistence
        const investorCapitalValue = document.getElementById('investorCapital')?.value || '200000';
        const totalLpCapitalValue = document.getElementById('totalLpCapital')?.value || '1000000';
        const gpLpSplitValue = document.getElementById('gpLpSplit')?.value || '40-60';
        
        localStorage.setItem('investorCapital', investorCapitalValue);
        localStorage.setItem('totalLpCapital', totalLpCapitalValue);
        localStorage.setItem('gpLpSplit', gpLpSplitValue);
        
        const inputs = getFinancialInputs();
        if (!validateFinancialInputs(inputs)) {
            console.error('Financial inputs validation failed');
            return;
        }
        
        const yearlyPrices = getYearlyPrices(inputs.btcPrice);
        if (!yearlyPrices || yearlyPrices.length !== 5) {
            console.error('Failed to get yearly prices');
            return;
        }
        
        const projections = calculateYearlyProjections(inputs, yearlyPrices);
        if (!projections || !projections.yearlyData) {
            console.error('Failed to calculate projections');
            return;
        }
        
        // Get GP/LP structure
        const structure = getInvestmentStructure();
        if (!structure) {
            console.error('Failed to get investment structure');
            return;
        }
        
        // Calculate GP and LP returns
        const returns = calculateGpLpReturns(projections, structure, yearlyPrices);
        if (!returns || !returns.gp || !returns.lp) {
            console.error('Failed to calculate GP/LP returns');
            return;
        }
        
        // Update all UI sections
        updateInvestmentStructure(structure);
        updateLpReturns(returns.lp, structure);
        updateGpReturns(returns.gp, structure);
        updateLpCashFlowTable(returns.lpYearly, structure);
        updateWaterfallVisualization(returns, structure);
        updateTraditionalMetrics(projections, inputs);        
        // Update Pro Forma Report
        if (typeof updateProFormaReport === 'function') {
            console.log('Calling updateProFormaReport...');
            updateProFormaReport(projections, inputs);
        } else {
            console.error('updateProFormaReport function not found!');
        }
        
        announceCalculationComplete(returns.lp.roi || 0);
    } catch (error) {
        console.error('Financial calculation error:', error);
        alert('Error calculating financials. Please check your inputs and ensure Steps 1-4 are complete.');
    }
}

function getInvestmentStructure() {
    const splitValue = document.getElementById('gpLpSplit')?.value || '40-60';
    const [gpPercent, lpPercent] = splitValue.split('-').map(v => parseInt(v));
    
    const totalLpCapital = parseFloat(document.getElementById('totalLpCapital')?.value) || 0;
    const investorCapital = parseFloat(document.getElementById('investorCapital')?.value) || 0;
    const totalCapex = projectData.totalCapex;
    
    // If no LP capital or owner-operator mode
    const isOwnerOperator = totalLpCapital === 0 || splitValue === '100-0';
    
    let gpCapital, investorLpSharePercent, investorProfitSharePercent;
    
    if (isOwnerOperator) {
        gpCapital = totalCapex;
        investorLpSharePercent = 0;
        investorProfitSharePercent = 100; // Owner gets 100% of profits
    } else {
        gpCapital = totalCapex - totalLpCapital;
        
        // Investor's share of LP pool
        investorLpSharePercent = totalLpCapital > 0 ? (investorCapital / totalLpCapital) * 100 : 0;
        
        // Investor's share of total profits = (their LP%) — (LP pool's profit%)
        investorProfitSharePercent = (investorLpSharePercent / 100) * lpPercent;
    }
    
    return {
        gpPercent: isOwnerOperator ? 100 : gpPercent,
        lpPercent: isOwnerOperator ? 0 : lpPercent,
        totalLpCapital,
        investorCapital,
        gpCapital,
        investorLpSharePercent,
        investorProfitSharePercent,
        totalCapex,
        isOwnerOperator
    };
}

function getFinancialInputs() {
    return {
        btcPrice: validateInputRange(document.getElementById('btcPrice')?.value, 10000, 1000000, 104337),
        networkHashrateEH: validateInputRange(document.getElementById('networkHashrate')?.value, 100, 5000, 600),
        difficultyGrowth: validateInputRange(document.getElementById('difficultyGrowth')?.value, 0, 50, 5) / 100,
        uptime: validateInputRange(document.getElementById('uptime')?.value, 50, 99, 95) / 100,
        discountRate: validateInputRange(document.getElementById('discountRate')?.value, 5, 30, 12) / 100
    };
}

function validateFinancialInputs(inputs) {
    if (projectData.totalHashratePH <= 0) {
        alert('âš ï¸ Invalid hashrate. Please complete Steps 2-4 first.');
        return false;
    }
    if (inputs.networkHashrateEH <= 0) {
        alert('âš ï¸ Network hashrate must be greater than 0.');
        return false;
    }
    return true;
}

function getYearlyPrices(baseBtcPrice) {
    const prices = [];
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`btcPriceY${i}`);
        prices.push(input ? validateInputRange(input.value, 10000, 1000000, baseBtcPrice) : baseBtcPrice);
    }
    return prices;
}

function calculateYearlyProjections(inputs, yearlyPrices) {
    const hashratePH = projectData.totalHashratePH;
    const networkHashrate = inputs.networkHashrateEH * 1000;
    const startYear = projectData.startYear || 2026;
    const annualDepreciation = projectData.totalCapex / CONSTANTS.DEPRECIATION_YEARS;
    
    let cumulative = opsOnlyMode ? 0 : -projectData.totalCapex;
    let totalRevenue = 0;
    let totalOpex5Year = 0;
    let totalBtcMined = 0;
    let npv = opsOnlyMode ? 0 : -projectData.totalCapex;
    let paybackYear = 0;
    
    const yearlyData = [];
    
    for(let year = 1; year <= 5; year++) {
        const calendarYear = startYear + year - 1;
        const reward = getBlockReward(calendarYear);
        const difficultyFactor = Math.pow(1 + inputs.difficultyGrowth, year - 1);
        const effectiveHashrate = hashratePH / difficultyFactor;
        const networkShare = effectiveHashrate / networkHashrate;
        
        const btcMined = networkShare * CONSTANTS.BLOCKS_PER_YEAR * reward * inputs.uptime;
        totalBtcMined += btcMined;
        
        const yearPrice = yearlyPrices[year - 1];
        const revenue = btcMined * yearPrice;
        totalRevenue += revenue;
        
        const opex = projectData.totalOpex * Math.pow(1 + CONSTANTS.DEFAULT_OPEX_INFLATION, year - 1);
        totalOpex5Year += opex;
        
        const netOpsFlow = revenue - opex;
        const cashFlow = netOpsFlow + annualDepreciation;
        cumulative += cashFlow;
        
        const discountFactor = Math.pow(1 + inputs.discountRate, year);
        npv += cashFlow / discountFactor;
        
        if (cumulative > 0 && paybackYear === 0) {
            paybackYear = year - 1 + (projectData.totalCapex - Math.abs(cumulative - cashFlow)) / cashFlow;
        }
        
        yearlyData.push({ 
            year, 
            calendarYear,
            btcMined, 
            revenue, 
            opex, 
            cashFlow, 
            cumulative,
            btcPrice: yearPrice 
        });
    }
    
    return {
        yearlyData,
        totalRevenue,
        totalOpex5Year,
        totalBtcMined,
        npv,
        paybackYear,
        cumulative,
        annualDepreciation
    };
}

function calculateGpLpReturns(projections, structure, yearlyPrices) {
    const equipmentResidual = projectData.totalCapex * CONSTANTS.EQUIPMENT_RESIDUAL_PERCENT;
    
    // Equipment residual split by capital contribution
    const gpEquipmentShare = (structure.gpCapital / structure.totalCapex) * equipmentResidual;
    const totalLpEquipmentShare = (structure.totalLpCapital / structure.totalCapex) * equipmentResidual;
    const investorEquipmentShare = (structure.investorCapital / structure.totalCapex) * equipmentResidual;
    
    // BTC split by profit share percentage
    const gpBtcShare = projections.totalBtcMined * (structure.gpPercent / 100);
    const totalLpBtcShare = projections.totalBtcMined * (structure.lpPercent / 100);
    
    // This investor's share = their % of LP pool — total LP BTC
    const investorBtcShare = structure.totalLpCapital > 0 ? 
        (structure.investorCapital / structure.totalLpCapital) * totalLpBtcShare : 0;
    
    // Calculate final year BTC value
    const finalYearPrice = yearlyPrices[4]; // Year 5 price
    const gpBtcValue = gpBtcShare * finalYearPrice;
    const investorBtcValue = investorBtcShare * finalYearPrice;
    
    // Total returns
    const gpTotalReturn = gpBtcValue + gpEquipmentShare;
    const investorTotalReturn = investorBtcValue + investorEquipmentShare;
    
    // Net returns (after subtracting initial investment)
    const gpNetReturn = gpTotalReturn - structure.gpCapital;
    const investorNetReturn = investorTotalReturn - structure.investorCapital;
    
    // ROI calculations
    const gpRoi = structure.gpCapital > 0 ? (gpNetReturn / structure.gpCapital) * 100 : 0;
    const investorRoi = structure.investorCapital > 0 ? (investorNetReturn / structure.investorCapital) * 100 : 0;
    
    // Year-by-year investor breakdown
    const lpYearly = [];
    let cumulativeInvestorBtc = 0;
    
    projections.yearlyData.forEach((data, idx) => {
        // Total LP pool gets lpPercent of BTC mined
        const totalLpYearBtc = data.btcMined * (structure.lpPercent / 100);
        
        // This investor gets their share of LP pool
        const investorYearBtc = structure.totalLpCapital > 0 ? 
            (structure.investorCapital / structure.totalLpCapital) * totalLpYearBtc : 0;
        
        cumulativeInvestorBtc += investorYearBtc;
        
        const investorBtcValueAtYear = cumulativeInvestorBtc * data.btcPrice;
        const cumulativeRoi = structure.investorCapital > 0 ? 
            ((investorBtcValueAtYear - structure.investorCapital) / structure.investorCapital) * 100 : 0;
        const annualizedRoi = cumulativeRoi / (idx + 1);
        
        lpYearly.push({
            year: data.year,
            calendarYear: data.calendarYear,
            totalBtcMined: data.btcMined,
            totalLpBtcShare: totalLpYearBtc,
            investorBtcShare: investorYearBtc,
            investorBtcValue: investorYearBtc * data.btcPrice,
            cumulativeInvestorBtc,
            cumulativeRoi,
            annualizedRoi,
            btcPrice: data.btcPrice
        });
    });
    
    return {
        gp: {
            investment: structure.gpCapital,
            btcEarned: gpBtcShare,
            btcValue: gpBtcValue,
            equipmentShare: gpEquipmentShare,
            totalReturn: gpTotalReturn,
            netReturn: gpNetReturn,
            roi: gpRoi
        },
        lp: {
            investment: structure.investorCapital,
            btcEarned: investorBtcShare,
            btcValue: investorBtcValue,
            equipmentShare: investorEquipmentShare,
            totalReturn: investorTotalReturn,
            netReturn: investorNetReturn,
            roi: investorRoi
        },
        lpYearly,
        totalBtc: projections.totalBtcMined
    };
}

function updateInvestmentStructure(structure) {
    if (!structure) {
        console.warn('Investment structure is undefined');
        return;
    }

    // Update the investment structure table
    const tableBody = document.getElementById('investmentStructureTable');
    if (tableBody) {
        const totalCapital = structure.totalCapex || 0;
        const lpCapital = structure.totalLpCapital || 0;
        const gpCapital = totalCapital - lpCapital;
        const lpPercent = totalCapital > 0 ? ((lpCapital / totalCapital) * 100) : 0;
        const gpPercentOfCapital = totalCapital > 0 ? ((gpCapital / totalCapital) * 100) : 0;

        tableBody.innerHTML = `
            <tr>
                <td><strong>Limited Partners (LP)</strong></td>
                <td class="number">$${lpCapital.toLocaleString()}</td>
                <td class="number">${lpPercent.toFixed(1)}%</td>
                <td class="number">${structure.lpPercent || 0}%</td>
            </tr>
            <tr>
                <td><strong>General Partner (GP)</strong></td>
                <td class="number">$${gpCapital.toLocaleString()}</td>
                <td class="number">${gpPercentOfCapital.toFixed(1)}%</td>
                <td class="number">${structure.gpPercent || 0}%</td>
            </tr>
            <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td class="number"><strong>$${totalCapital.toLocaleString()}</strong></td>
                <td class="number"><strong>100.0%</strong></td>
                <td class="number"><strong>100%</strong></td>
            </tr>
        `;
    }

    safeUpdateElement('structureTotalCapex', '$' + (structure.totalCapex || 0).toLocaleString());
    safeUpdateElement('structureTotalLpPool', '$' + (structure.totalLpCapital || 0).toLocaleString());
    safeUpdateElement('structureInvestorLpShare', (structure.investorLpSharePercent || 0).toFixed(1) + '%');
    safeUpdateElement('structureInvestorProfitShare', (structure.investorProfitSharePercent || 0).toFixed(1) + '%');
    safeUpdateElement('structureProfitSplit', (structure.gpPercent || 0) + '/' + (structure.lpPercent || 0));
}

function updateLpReturns(lp, structure) {
    if (!lp || lp.investment === undefined) {
        console.warn('LP returns data is undefined');
        return;
    }

    safeUpdateElement('lpInvestment', '$' + (lp.investment || 0).toLocaleString());
    safeUpdateElement('lpReturn', '$' + (lp.totalReturn || 0).toLocaleString(undefined, {maximumFractionDigits: 0}));

    const roiColor = (lp.roi || 0) >= 0 ? '#2d6a4f' : '#e74c3c';
    const roiElement = document.getElementById('lpROI');
    if (roiElement) {
        roiElement.textContent = (lp.roi || 0).toFixed(1) + '%';
        roiElement.style.color = roiColor;
    }
}

function updateGpReturns(gp, structure) {
    if (!gp || gp.investment === undefined) {
        console.warn('GP returns data is undefined');
        return;
    }

    safeUpdateElement('gpShare', (structure.gpPercent || 0) + '%');
    safeUpdateElement('gpProfit', '$' + (gp.totalReturn || 0).toLocaleString(undefined, {maximumFractionDigits: 0}));
    safeUpdateElement('gpLpRatio', (structure.gpPercent || 0) + ':' + (structure.lpPercent || 0));
}

function updateLpCashFlowTable(lpYearly, structure) {
    const tbody = document.querySelector('#lpCashFlowTable tbody');
    if (!tbody) return;
    
    if (!lpYearly || lpYearly.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    lpYearly.forEach(data => {
        const row = tbody.insertRow();
        const roiColor = (data.cumulativeRoi || 0) >= 0 ? '#2d6a4f' : '#e74c3c';
        
        row.innerHTML = `
            <td><strong>Year ${data.year || 0}</strong> (${data.calendarYear || 0})</td>
            <td class="number">${(data.totalBtcMined || 0).toFixed(4)}</td>
            <td class="number">${(data.totalLpBtcShare || 0).toFixed(4)}</td>
            <td class="number" style="color: #3498db; font-weight: 600;">${(data.investorBtcShare || 0).toFixed(4)}</td>
            <td class="number">$${(data.investorBtcValue || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td class="number" style="font-weight: 600;">${(data.cumulativeInvestorBtc || 0).toFixed(4)} BTC</td>
            <td class="number" style="color: ${roiColor}; font-weight: 600;">${(data.cumulativeRoi || 0).toFixed(1)}%</td>
            <td class="number">${(data.annualizedRoi || 0).toFixed(1)}%</td>
        `;
    });
    
    // Add total row
    const totalRow = tbody.insertRow();
    totalRow.classList.add('total-row');
    const finalData = lpYearly[lpYearly.length - 1] || {};
    
    totalRow.innerHTML = `
        <td><strong>5-YEAR TOTAL</strong></td>
        <td class="number"><strong>${lpYearly.reduce((sum, d) => sum + (d.totalBtcMined || 0), 0).toFixed(4)} BTC</strong></td>
        <td class="number"><strong>${lpYearly.reduce((sum, d) => sum + (d.totalLpBtcShare || 0), 0).toFixed(4)} BTC</strong></td>
        <td class="number"><strong>${(finalData.cumulativeInvestorBtc || 0).toFixed(4)} BTC</strong></td>
        <td class="number"><strong>$${lpYearly.reduce((sum, d) => sum + (d.investorBtcValue || 0), 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></td>
        <td class="number"><strong>${(finalData.cumulativeInvestorBtc || 0).toFixed(4)} BTC</strong></td>
        <td class="number"><strong>${(finalData.cumulativeRoi || 0).toFixed(1)}%</strong></td>
        <td class="number"><strong>${(finalData.annualizedRoi || 0).toFixed(1)}%</strong></td>
    `;
}

function updateWaterfallVisualization(returns, structure) {
    if (!returns || !structure) {
        console.warn('Returns or structure is undefined');
        return;
    }
    
    safeUpdateElement('waterfallTotalBtc', (returns.totalBtc || 0).toFixed(4));
    safeUpdateElement('waterfallGpPercent', structure.gpPercent || 0);
    safeUpdateElement('waterfallGpBtc', ((returns.gp && returns.gp.btcEarned) || 0).toFixed(4));
    safeUpdateElement('waterfallLpPercent', structure.lpPercent || 0);
    safeUpdateElement('waterfallLpBtc', ((returns.lp && returns.lp.btcEarned) || 0).toFixed(4));
}

function updateTraditionalMetrics(projections, inputs) {
    if (!projections) {
        console.warn('Projections data is undefined');
        return;
    }
    
    const equipmentResidual = projectData.totalCapex * CONSTANTS.EQUIPMENT_RESIDUAL_PERCENT;
    const irr = calculateIRRSimplified(
        projectData.totalCapex, 
        projections.totalRevenue || 0, 
        projections.totalOpex5Year || 0, 
        equipmentResidual, 
        projections.annualDepreciation || 0
    );
    
    safeUpdateElement('paybackPeriod', (projections.paybackYear || 0) > 0 ? projections.paybackYear.toFixed(1) + ' years' : '> 5 years');
    safeUpdateElement('projectIrr', irr.toFixed(1) + '%');
    safeUpdateElement('projectNpv', '$' + (projections.npv || 0).toLocaleString(undefined, {maximumFractionDigits: 0}));
    safeUpdateElement('totalBtcMined', (projections.totalBtcMined || 0).toFixed(4) + ' BTC');
}

function safeUpdateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        if (typeof text === 'string') {
            element.textContent = text;
        } else {
            element.textContent = String(text);
        }
    }
}

function announceCalculationComplete(lpRoi) {
    const announcer = document.getElementById('status-announcer');
    if (announcer) {
        announcer.textContent = 'Investment returns calculated. LP ROI: ' + lpRoi.toFixed(1) + '%';
    }
}

// Keep old function name for backward compatibility
function calculateFinancials() {
    calculateInvestmentReturns();
}

function calculateFinancialsInternal() {
    calculateInvestmentReturns();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadStep5,
        calculateInvestmentReturns,
        calculateFinancials,
        calculateFinancialsInternal
    };
}
