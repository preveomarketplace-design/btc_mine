// financial_proforma_FIXED.js - Pro Forma with Chart Fixes
// This version ensures charts render correctly and integrates properly

/**
 * Get BTC prices from user inputs (5 years)
 */
function getProFormaBtcPrices() {
    const prices = [];
    
    // Try to get from individual year inputs first
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById(`btcPriceY${i}`);
        if (el && el.value) {
            prices.push(parseFloat(el.value));
        }
    }
    
    // If we don't have 5 prices, fall back to default or calculated
    if (prices.length !== 5) {
        console.log('Using fallback BTC prices');
        const basePrice = parseFloat(document.getElementById('btcPrice')?.value) || 100000;
        // Default growth: 10% per year
        for (let i = 1; i <= 5; i++) {
            prices.push(basePrice * Math.pow(1.10, i));
        }
    }
    
    console.log('Pro Forma BTC Prices:', prices);
    return prices;
}

/**
 * Update BTC Accumulation & Exit Scenarios Table
 */
function updateAccumulationTable(projections, yearlyPrices) {
    console.log('Updating BTC Accumulation & Exit Scenarios...', {projections, yearlyPrices});

    if (!projections || !projections.yearlyData || projections.yearlyData.length === 0) {
        console.error('No projection data available');
        return;
    }

    const data = projections.yearlyData;
    const initialCapex = projectData.totalCapex;
    const equipmentResidualPercent = 0.25; // 25% residual value at year 5

    let cumulativeGpBTC = 0;
    let cumulativeLpBTC = 0;
    let cumulativeSoldBTC = 0;
    let cumulativeOpex = 0;

    // Populate each year
    for (let i = 0; i < 5; i++) {
        const yearData = data[i] || {};
        const btcMined = yearData.btcMined || 0;
        const btcSold = yearData.btcSold || 0;
        const btcToGp = yearData.btcToGp || 0;
        const btcToLp = yearData.btcToLp || 0;
        const btcSaleProceeds = yearData.btcSaleProceeds || 0;
        const btcPrice = yearlyPrices[i] || 0;
        const opex = yearData.opex || 0;
        const opexCovered = yearData.opexCovered || false;

        // Accumulate
        cumulativeGpBTC += btcToGp;
        cumulativeLpBTC += btcToLp;
        cumulativeSoldBTC += btcSold;
        cumulativeOpex += opex;

        // BTC mined this year
        safeUpdateElement(`btc_y${i+1}`, btcMined.toFixed(2));

        // BTC distribution breakdown
        safeUpdateElement(`btc_sold_y${i+1}`, btcSold.toFixed(2));
        safeUpdateElement(`btc_gp_y${i+1}`, btcToGp.toFixed(2));
        safeUpdateElement(`btc_lp_y${i+1}`, btcToLp.toFixed(2));

        // Cumulative holdings
        safeUpdateElement(`cum_gp_y${i+1}`, cumulativeGpBTC.toFixed(2) + ' BTC');
        safeUpdateElement(`cum_lp_y${i+1}`, cumulativeLpBTC.toFixed(2) + ' BTC');
        safeUpdateElement(`cum_sold_y${i+1}`, cumulativeSoldBTC.toFixed(2) + ' BTC');

        // BTC price
        safeUpdateElement(`price_y${i+1}`, '$' + formatNumber(btcPrice));

        // OPEX Coverage Check
        safeUpdateElement(`opex_req_y${i+1}`, '$' + formatNumber(opex));
        safeUpdateElement(`opex_proceeds_y${i+1}`, '$' + formatNumber(btcSaleProceeds));

        const statusEl = document.getElementById(`opex_status_y${i+1}`);
        if (statusEl) {
            if (opexCovered) {
                const buffer = btcSaleProceeds - opex;
                const bufferPercent = opex > 0 ? (buffer / opex * 100) : 0;
                statusEl.textContent = `✓ +$${formatNumber(buffer)} (${bufferPercent.toFixed(0)}%)`;
                statusEl.style.color = bufferPercent >= 5 ? '#2d6a4f' : '#f39c12';
            } else {
                const shortfall = opex - btcSaleProceeds;
                statusEl.textContent = `⚠ -$${formatNumber(shortfall)}`;
                statusEl.style.color = '#e74c3c';
            }
        }

        // EXIT SCENARIO CALCULATIONS
        // Total BTC if exit: GP + LP accumulated (not sold)
        const totalAccumulatedBTC = cumulativeGpBTC + cumulativeLpBTC;
        const exitProceeds = totalAccumulatedBTC * btcPrice;
        safeUpdateElement(`exit_proceeds_y${i+1}`, '$' + formatNumber(exitProceeds));

        // Cumulative OPEX paid through this year
        safeUpdateElement(`exit_opex_y${i+1}`, '($' + formatNumber(cumulativeOpex) + ')');

        // Initial CAPEX (same for all years)
        safeUpdateElement(`exit_capex_y${i+1}`, '($' + formatNumber(initialCapex) + ')');

        // Equipment residual value - linear depreciation from 100% to 25% over 5 years
        const depreciationRate = 0.75;
        const residualPercent = 1 - (depreciationRate * (i + 1) / 5);
        const residualValue = initialCapex * residualPercent;
        safeUpdateElement(`exit_residual_y${i+1}`, '$' + formatNumber(residualValue));

        // Net cash if exit this year
        const netCash = exitProceeds - cumulativeOpex - initialCapex + residualValue;
        const exitNetEl = document.getElementById(`exit_net_y${i+1}`);
        if (exitNetEl) {
            exitNetEl.textContent = (netCash >= 0 ? '$' : '($') + formatNumber(Math.abs(netCash)) + (netCash >= 0 ? '' : ')');
            exitNetEl.style.color = netCash >= 0 ? '#2d6a4f' : '#e74c3c';
            exitNetEl.style.fontWeight = '700';
        }

        // ROI % if exit this year
        const roi = (netCash / initialCapex) * 100;
        const exitRoiEl = document.getElementById(`exit_roi_y${i+1}`);
        if (exitRoiEl) {
            exitRoiEl.textContent = roi.toFixed(1) + '%';
            exitRoiEl.style.color = roi >= 0 ? '#2d6a4f' : '#e74c3c';
            exitRoiEl.style.fontWeight = '700';
        }
    }

    console.log(' Accumulation Table updated');
}

/**
 * Update Pro Forma Cash Flow Statement
 */
function updateProFormaCashFlow(projections) {
    console.log('Updating Cash Flow Statement...');
    
    if (!projections || !projections.yearlyData) return;
    
    const data = projections.yearlyData;
    const equipmentResidual = projectData.totalCapex * 0.25; // 25% residual
    
    let cumulativeCF = -projectData.totalCapex;
    let totalFCF = 0;
    
    for (let i = 0; i < 5; i++) {
        const yearData = data[i] || {};
        const ebitda = yearData.revenue - yearData.opex;
        const capex = i === 0 ? projectData.totalCapex : 0;
        const residual = i === 4 ? equipmentResidual : 0;
        const fcf = ebitda - capex + residual;
        
        cumulativeCF += fcf;
        totalFCF += fcf;
        
        const ebitdaEl = document.getElementById(`cf_ebitda_y${i+1}`);
        const capexEl = document.getElementById(`cf_capex_y${i+1}`);
        const residualEl = document.getElementById(`cf_residual_y${i+1}`);
        const fcfEl = document.getElementById(`fcf_y${i+1}`);
        const cumEl = document.getElementById(`cum_cf_y${i+1}`);
        
        if (ebitdaEl) ebitdaEl.textContent = '$' + formatNumber(ebitda);
        if (capexEl) capexEl.textContent = i === 0 ? '($' + formatNumber(capex) + ')' : '$0';
        if (residualEl) residualEl.textContent = i === 4 ? '$' + formatNumber(residual) : '$0';
        if (fcfEl) fcfEl.textContent = '$' + formatNumber(fcf);
        if (cumEl) cumEl.textContent = '$' + formatNumber(cumulativeCF);
    }
    
    // Totals
    const totalEbitda = data.reduce((sum, d) => sum + (d.revenue - d.opex), 0);
    
    const ebitdaTotalEl = document.getElementById('cf_ebitda_total');
    const capexTotalEl = document.getElementById('cf_capex_total');
    const residualTotalEl = document.getElementById('cf_residual_total');
    const fcfTotalEl = document.getElementById('fcf_total');
    
    if (ebitdaTotalEl) ebitdaTotalEl.textContent = '$' + formatNumber(totalEbitda);
    if (capexTotalEl) capexTotalEl.textContent = '($' + formatNumber(projectData.totalCapex) + ')';
    if (residualTotalEl) residualTotalEl.textContent = '$' + formatNumber(equipmentResidual);
    if (fcfTotalEl) fcfTotalEl.textContent = '$' + formatNumber(totalFCF);
    
    console.log(' Cash Flow Statement updated');
}

/**
 * Update Key Financial Metrics Dashboard
 */
function updateKeyMetrics(projections, inputs) {
    console.log('Updating Key Metrics...');

    if (!projections) return;

    // IRR - Build cash flows for accumulation model
    const cashFlows = [];
    projections.yearlyData.forEach((d, i) => {
        // In accumulation model, cash flow = -OPEX (negative) until exit
        // We're NOT selling BTC each year, just accumulating
        const yearlyOpex = -(d.opex || projectData.totalOpex);

        // Only Year 5 includes BTC sale + equipment residual
        if (i === 4) {
            const totalBtcMined = projections.yearlyData.reduce((sum, year) => sum + year.btcMined, 0);
            const btcPrice = parseFloat(document.getElementById('btcPriceY5')?.value || 150000);
            const btcProceeds = totalBtcMined * btcPrice;
            const equipmentResidual = projectData.totalCapex * 0.25;
            cashFlows.push(yearlyOpex + btcProceeds + equipmentResidual);
        } else {
            cashFlows.push(yearlyOpex);
        }
    });

    // Calculate IRR using the correct function
    const irr = calculateIRR(projectData.totalCapex, cashFlows);
    const irrEl = document.getElementById('metric_irr');
    if (irrEl) irrEl.textContent = irr.toFixed(1) + '%';
    
    // NPV
    const npv = projections.npv || 0;
    const npvEl = document.getElementById('metric_npv');
    if (npvEl) npvEl.textContent = '$' + formatNumber(npv);
    
    // Payback Period
    const payback = projections.paybackYear || 0;
    const paybackEl = document.getElementById('metric_payback');
    if (paybackEl) paybackEl.textContent = payback.toFixed(1) + ' yrs';
    
    // Total ROI
    const totalReturn = projections.cumulative || 0;
    const roi = projectData.totalCapex > 0 ? ((totalReturn / projectData.totalCapex) * 100) : 0;
    const roiEl = document.getElementById('metric_roi');
    if (roiEl) roiEl.textContent = roi.toFixed(1) + '%';
    
    console.log(' Key Metrics updated');
}

/**
 * Create Revenue & EBITDA Chart
 */
function createRevenueEbitdaChart(projections) {
    console.log('Creating Revenue & EBITDA Chart...');

    const canvas = document.getElementById('revenueEbitdaChart');
    if (!canvas) {
        console.error(' Canvas revenueEbitdaChart not found!');
        return;
    }

    if (!window.Chart) {
        console.error(' Chart.js not loaded!');
        return;
    }

    // Destroy existing chart
    if (window.revenueEbitdaChart && typeof window.revenueEbitdaChart.destroy === 'function') {
        window.revenueEbitdaChart.destroy();
    }

    const years = projections.yearlyData.map(d => `Year ${d.year}`);
    const revenues = projections.yearlyData.map(d => d.revenue / 1000);
    const ebitdas = projections.yearlyData.map(d => (d.revenue - d.opex) / 1000);

    const ctx = canvas.getContext('2d');
    window.revenueEbitdaChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenues,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'EBITDA',
                    data: ebitdas,
                    borderColor: '#2d6a4f',
                    backgroundColor: 'rgba(45, 106, 79, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 11, weight: '600' } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + (context.parsed.y * 1000).toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#6c757d' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Amount ($1,000s)',
                        font: { size: 11, weight: '600' },
                        color: '#6c757d'
                    },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { 
                        font: { size: 10 },
                        color: '#6c757d',
                        callback: function(value) {
                            return '$' + value + 'k';
                        }
                    }
                }
            }
        }
    });
    
    console.log(' Revenue & EBITDA Chart created');
}

/**
 * Create OPEX Breakdown Chart
 */
function createOpexBreakdownChart(projections) {
    console.log('Creating OPEX Breakdown Chart...');

    const canvas = document.getElementById('opexBreakdownChart');
    if (!canvas) {
        console.error(' Canvas opexBreakdownChart not found!');
        return;
    }

    if (window.opexBreakdownChart && typeof window.opexBreakdownChart.destroy === 'function') {
        window.opexBreakdownChart.destroy();
    }

    const years = projections.yearlyData.map(d => `Year ${d.year}`);
    const opexEnergy = projections.yearlyData.map(() => (projectData.totalOpex * 0.6) / 1000);
    const opexMaint = projections.yearlyData.map(() => (projectData.totalOpex * 0.4) / 1000);

    const ctx = canvas.getContext('2d');
    window.opexBreakdownChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Energy & Fuel',
                    data: opexEnergy,
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Maintenance & Operations',
                    data: opexMaint,
                    backgroundColor: 'rgba(230, 126, 34, 0.7)',
                    borderColor: 'rgba(230, 126, 34, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 11, weight: '600' } }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#6c757d' }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'OPEX ($1,000s)',
                        font: { size: 11, weight: '600' },
                        color: '#6c757d'
                    },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: {
                        font: { size: 10 },
                        color: '#6c757d',
                        callback: function(value) {
                            return '$' + value + 'k';
                        }
                    }
                }
            }
        }
    });
    
    console.log(' OPEX Breakdown Chart created');
}

/**
 * Create Cumulative Cash Flow Chart
 */
function createCumulativeCashFlowChart(projections) {
    console.log('Creating Cumulative Cash Flow Chart...');

    const canvas = document.getElementById('cumulativeCashFlowChart');
    if (!canvas) {
        console.error(' Canvas cumulativeCashFlowChart not found!');
        return;
    }

    if (window.cumulativeCashFlowChart && typeof window.cumulativeCashFlowChart.destroy === 'function') {
        window.cumulativeCashFlowChart.destroy();
    }

    const years = ['Start'].concat(projections.yearlyData.map(d => `Year ${d.year}`));
    let cumulative = -projectData.totalCapex;
    const cumulativeData = [-projectData.totalCapex / 1000];

    projections.yearlyData.forEach((d, i) => {
        const ebitda = d.revenue - d.opex;
        const residual = i === 4 ? projectData.totalCapex * 0.25 : 0;
        cumulative += ebitda + residual;
        cumulativeData.push(cumulative / 1000);
    });

    const ctx = canvas.getContext('2d');
    window.cumulativeCashFlowChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Cumulative Cash Flow',
                data: cumulativeData,
                borderColor: '#2d6a4f',
                backgroundColor: function(context) {
                    if (!context.parsed) return 'rgba(45, 106, 79, 0.2)';
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgba(45, 106, 79, 0.2)' : 'rgba(231, 76, 60, 0.2)';
                },
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: function(context) {
                    if (!context.parsed) return '#2d6a4f';
                    const value = context.parsed.y;
                    return value >= 0 ? '#2d6a4f' : '#e74c3c';
                },
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Cumulative CF: $' + (context.parsed.y * 1000).toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#6c757d' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cash Flow ($1,000s)',
                        font: { size: 11, weight: '600' },
                        color: '#6c757d'
                    },
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 0) {
                                return 'rgba(0, 0, 0, 0.3)';
                            }
                            return 'rgba(0, 0, 0, 0.05)';
                        },
                        lineWidth: function(context) {
                            if (context.tick.value === 0) {
                                return 2;
                            }
                            return 1;
                        }
                    },
                    ticks: {
                        font: { size: 10 },
                        color: '#6c757d',
                        callback: function(value) {
                            return '$' + value + 'k';
                        }
                    }
                }
            }
        }
    });
    
    console.log(' Cumulative Cash Flow Chart created');
}

/**
 * Create EBITDA Margin Trend Chart
 */
function createEbitdaMarginChart(projections) {
    console.log('Creating EBITDA Margin Chart...');

    const canvas = document.getElementById('ebitdaMarginChart');
    if (!canvas) {
        console.error(' Canvas ebitdaMarginChart not found!');
        return;
    }

    if (window.ebitdaMarginChart && typeof window.ebitdaMarginChart.destroy === 'function') {
        window.ebitdaMarginChart.destroy();
    }

    const years = projections.yearlyData.map(d => `Year ${d.year}`);
    const margins = projections.yearlyData.map(d => {
        const ebitda = d.revenue - d.opex;
        return d.revenue > 0 ? ((ebitda / d.revenue) * 100) : 0;
    });

    const ctx = canvas.getContext('2d');
    window.ebitdaMarginChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'EBITDA Margin %',
                data: margins,
                backgroundColor: 'rgba(155, 89, 182, 0.7)',
                borderColor: 'rgba(155, 89, 182, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'EBITDA Margin: ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#6c757d' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Margin (%)',
                        font: { size: 11, weight: '600' },
                        color: '#6c757d'
                    },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: {
                        font: { size: 10 },
                        color: '#6c757d',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    console.log(' EBITDA Margin Chart created');
}

/**
 * Create BTC Position Value Chart
 */
function createBtcPositionChart(projections, yearlyPrices) {
    console.log('Creating BTC Position Value Chart...');

    const canvas = document.getElementById('btcPositionChart');
    if (!canvas) {
        console.error(' Canvas btcPositionChart not found!');
        return;
    }

    if (!window.Chart) {
        console.error(' Chart.js not loaded!');
        return;
    }

    if (window.btcPositionChart && typeof window.btcPositionChart.destroy === 'function') {
        window.btcPositionChart.destroy();
    }

    const years = projections.yearlyData.map(d => `Year ${d.year}`);

    let cumulativeBTC = 0;
    const cumulativeBTCData = [];
    const positionValues = [];

    for (let i = 0; i < projections.yearlyData.length; i++) {
        cumulativeBTC += projections.yearlyData[i].btcMined;
        cumulativeBTCData.push(cumulativeBTC);
        positionValues.push((cumulativeBTC * yearlyPrices[i]) / 1000);
    }

    const ctx = canvas.getContext('2d');
    window.btcPositionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Position Value (Thousands $)',
                    data: positionValues,
                    backgroundColor: 'rgba(243, 156, 18, 0.7)',
                    borderColor: '#f39c12',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Cumulative BTC',
                    data: cumulativeBTCData,
                    borderColor: '#2d6a4f',
                    backgroundColor: 'rgba(45, 106, 79, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 11, weight: '600' } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.yAxisID === 'y1') {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' BTC';
                            }
                            return 'Value: $' + (context.parsed.y * 1000).toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#6c757d' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        font: { size: 10 },
                        callback: function(value) {
                            return '$' + (value * 1000).toLocaleString();
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: {
                        font: { size: 10 },
                        callback: function(value) {
                            return value.toFixed(1) + ' BTC';
                        }
                    }
                }
            }
        }
    });

    console.log(' BTC Position Chart created');
}

/**
 * Create Exit ROI Chart
 */
function createExitROIChart(projections, yearlyPrices) {
    console.log('Creating Exit ROI Chart...');

    const canvas = document.getElementById('exitROIChart');
    if (!canvas) {
        console.error(' Canvas exitROIChart not found!');
        return;
    }

    if (window.exitROIChart && typeof window.exitROIChart.destroy === 'function') {
        window.exitROIChart.destroy();
    }

    const years = projections.yearlyData.map(d => `Year ${d.year}`);
    const initialCapex = projectData.totalCapex;

    let cumulativeBTC = 0;
    let cumulativeOpex = 0;
    const roiData = [];

    for (let i = 0; i < projections.yearlyData.length; i++) {
        cumulativeBTC += projections.yearlyData[i].btcMined;
        cumulativeOpex += (projections.yearlyData[i].opex || projectData.totalOpex);

        const exitProceeds = cumulativeBTC * yearlyPrices[i];

        // Equipment residual value - linear depreciation from 100% to 25% over 5 years
        const depreciationRate = 0.75;
        const residualPercent = 1 - (depreciationRate * (i + 1) / 5);
        const residualValue = initialCapex * residualPercent;

        const netCash = exitProceeds - cumulativeOpex - initialCapex + residualValue;
        const roi = (netCash / initialCapex) * 100;

        roiData.push(roi);
    }

    const ctx = canvas.getContext('2d');
    window.exitROIChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Exit ROI %',
                data: roiData,
                backgroundColor: roiData.map(roi => roi >= 0 ? 'rgba(45, 106, 79, 0.7)' : 'rgba(231, 76, 60, 0.7)'),
                borderColor: roiData.map(roi => roi >= 0 ? '#2d6a4f' : '#e74c3c'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'ROI: ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#6c757d' }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        font: { size: 10 },
                        callback: function(value) {
                            return value.toFixed(0) + '%';
                        }
                    }
                }
            }
        }
    });

    console.log(' Exit ROI Chart created');
}

/**
 * Create Cash Flow Waterfall Chart
 */
function createWaterfallChart(projections) {
    console.log('Creating Waterfall Chart...');

    const canvas = document.getElementById('waterfallChart');
    if (!canvas) {
        console.error(' Canvas waterfallChart not found!');
        return;
    }

    if (window.waterfallChart && typeof window.waterfallChart.destroy === 'function') {
        window.waterfallChart.destroy();
    }

    // Calculate waterfall data
    const capex = -projectData.totalCapex;
    const yearlyRevenues = projections.yearlyData.map(d => d.revenue);
    const yearlyOpex = projections.yearlyData.map(() => -projectData.totalOpex);
    const residual = projectData.totalCapex * 0.25;

    // Build cumulative values for waterfall
    const labels = ['Initial CAPEX'];
    const data = [capex / 1000];
    let cumulative = capex;

    for (let i = 0; i < 5; i++) {
        labels.push(`Y${i+1} Revenue`);
        data.push(yearlyRevenues[i] / 1000);

        labels.push(`Y${i+1} OPEX`);
        data.push(yearlyOpex[i] / 1000);
    }

    labels.push('Equipment Residual');
    data.push(residual / 1000);

    labels.push('Final Position');
    data.push((cumulative + projections.yearlyData.reduce((sum, d) => sum + d.revenue, 0) + yearlyOpex.reduce((a, b) => a + b, 0) + residual) / 1000);

    const ctx = canvas.getContext('2d');
    window.waterfallChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cash Flow',
                data: data,
                backgroundColor: data.map(v => v >= 0 ? 'rgba(45, 106, 79, 0.7)' : 'rgba(231, 76, 60, 0.7)'),
                borderColor: data.map(v => v >= 0 ? '#2d6a4f' : '#e74c3c'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + (context.parsed.y * 1000).toLocaleString(undefined, {maximumFractionDigits: 0});
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 9 },
                        color: '#6c757d',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        font: { size: 10 },
                        callback: function(value) {
                            return '$' + (value * 1000).toLocaleString(undefined, {maximumFractionDigits: 0});
                        }
                    }
                }
            }
        }
    });

    console.log(' Waterfall Chart created');
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    if (isNaN(num)) return '0';
    return Math.round(num).toLocaleString();
}

/**
 * Safely update element text content
 */
function safeUpdateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = typeof text === 'string' ? text : String(text);
    }
}

/**
 * Master function to update all pro forma sections
 */
function updateProFormaReport(projections, inputs) {
    console.log('=== UPDATING PRO FORMA REPORT ===');
    console.log('Projections:', projections);
    console.log('Inputs:', inputs);

    if (!projections || !projections.yearlyData) {
        console.error(' No projection data available!');
        return;
    }

    // Get BTC prices from inputs
    const yearlyPrices = getProFormaBtcPrices();

    // Update all sections
    updateAccumulationTable(projections, yearlyPrices);
    updateProFormaCashFlow(projections);
    updateKeyMetrics(projections, inputs);
    update5YearImpactSummary(projections, inputs);

    // Create all charts (with delays to ensure DOM is ready)
    setTimeout(() => {
        createBtcPositionChart(projections, yearlyPrices);
        createOpexBreakdownChart(projections);
        createCumulativeCashFlowChart(projections);
        createExitROIChart(projections, yearlyPrices);
        createWaterfallChart(projections);
    }, 100);

    // Update sensitivity analysis
    updateSensitivityAnalysis(projections, inputs);

    console.log(' Pro Forma Report update complete');
}

/**
 * Update Sensitivity Analysis Table
 */
function updateSensitivityAnalysis(projections, inputs) {
    console.log('Updating Sensitivity Analysis...');

    const btcPrices = [150000, 120000, 100000, 80000, 60000];
    const hashRateMultipliers = [1.0, 1.2, 1.5, 0.8, 0.5];
    const hashRateLabels = ['100', '120', '150', '80', '50'];

    const baseHashrate = projectData.totalHashratePH || 0;
    const capex = projectData.totalCapex;
    const opex = projectData.totalOpex;

    btcPrices.forEach((btcPrice, i) => {
        hashRateMultipliers.forEach((multiplier, j) => {
            const adjustedHashrate = baseHashrate * multiplier;

            // Calculate total BTC mined over 5 years with adjusted hashrate
            let totalBtcMined = 0;
            for (let year = 0; year < 5; year++) {
                const yearBtc = projections.yearlyData[year]?.btcMined || 0;
                totalBtcMined += yearBtc * multiplier; // Scale by hash rate
            }

            // Calculate cash flows for IRR
            const cashFlows = [];
            for (let year = 0; year < 5; year++) {
                const yearlyOpex = -opex;

                if (year === 4) {
                    // Year 5: sell all BTC + equipment residual
                    const btcProceeds = totalBtcMined * btcPrice;
                    const equipmentResidual = capex * 0.25;
                    cashFlows.push(yearlyOpex + btcProceeds + equipmentResidual);
                } else {
                    cashFlows.push(yearlyOpex);
                }
            }

            // Calculate IRR
            const irr = calculateIRR(capex, cashFlows);

            // Update table cell
            const cellId = `sens_${btcPrice / 1000}_${hashRateLabels[j]}`;
            const cell = document.getElementById(cellId);
            if (cell) {
                cell.textContent = irr.toFixed(1) + '%';
                // Color code: green if positive, red if negative
                cell.style.color = irr >= 0 ? '#2d6a4f' : '#e74c3c';
                cell.style.fontWeight = '600';
            }
        });
    });

    console.log(' Sensitivity Analysis updated');
}

/**
 * Update 5-Year Impact Summary
 */
function update5YearImpactSummary(projections, inputs) {
    console.log('Updating 5-Year Impact Summary...');

    if (!projections || !projections.yearlyData) {
        return;
    }

    const showPV = document.getElementById('showPresentValue')?.checked || false;
    const discountRate = inputs?.discountRate || 0.12;

    // Total BTC mined
    safeUpdateElement('summaryTotalBtc', projections.totalBtcMined.toFixed(2) + ' BTC');

    // Sold BTC
    const totalSoldBtc = projections.totalBtcSold || 0;
    let totalSoldValue = 0;
    let totalSoldValuePV = 0;

    projections.yearlyData.forEach((data, i) => {
        const soldValue = (data.btcSold || 0) * (data.btcPrice || 0);
        totalSoldValue += soldValue;
        totalSoldValuePV += calculatePresentValue(soldValue, i + 1, discountRate);
    });

    safeUpdateElement('summarySoldBtc', totalSoldBtc.toFixed(2) + ' BTC');
    safeUpdateElement('summarySoldValue', '$' + (totalSoldValue / 1000000).toFixed(1) + 'M');
    if (showPV) {
        safeUpdateElement('summarySoldPv', 'PV: $' + (totalSoldValuePV / 1000000).toFixed(1) + 'M');
    } else {
        safeUpdateElement('summarySoldPv', '');
    }

    // LP Accumulated
    const totalLpBtc = projections.totalBtcToLp || 0;
    const finalYearPrice = projections.yearlyData[4]?.btcPrice || 0;
    const lpValue = totalLpBtc * finalYearPrice;
    const lpValuePV = calculatePresentValue(lpValue, 5, discountRate);

    const lpCapital = parseFloat(document.getElementById('totalLpCapital')?.value) || 1000000;
    const lpRoi = lpCapital > 0 ? ((lpValue - lpCapital) / lpCapital * 100) : 0;
    const lpRoiPV = lpCapital > 0 ? ((lpValuePV - lpCapital) / lpCapital * 100) : 0;

    safeUpdateElement('summaryLpBtc', totalLpBtc.toFixed(2) + ' BTC');
    safeUpdateElement('summaryLpValue', '$' + (lpValue / 1000000).toFixed(1) + 'M' + (showPV ? ' / PV: $' + (lpValuePV / 1000000).toFixed(1) + 'M' : ''));
    safeUpdateElement('summaryLpRoi', 'ROI: ' + lpRoi.toFixed(0) + '%' + (showPV ? ' / PV: ' + lpRoiPV.toFixed(0) + '%' : ''));

    // GP Accumulated
    const totalGpBtc = projections.totalBtcToGp || 0;
    const gpValue = totalGpBtc * finalYearPrice;
    const gpValuePV = calculatePresentValue(gpValue, 5, discountRate);

    const gpCapital = projectData.totalCapex - lpCapital;
    const gpRoi = gpCapital > 0 ? ((gpValue - gpCapital) / gpCapital * 100) : 0;
    const gpRoiPV = gpCapital > 0 ? ((gpValuePV - gpCapital) / gpCapital * 100) : 0;

    safeUpdateElement('summaryGpBtc', totalGpBtc.toFixed(2) + ' BTC');
    safeUpdateElement('summaryGpValue', '$' + (gpValue / 1000000).toFixed(1) + 'M' + (showPV ? ' / PV: $' + (gpValuePV / 1000000).toFixed(1) + 'M' : ''));
    safeUpdateElement('summaryGpRoi', 'ROI: ' + gpRoi.toFixed(0) + '%' + (showPV ? ' / PV: ' + gpRoiPV.toFixed(0) + '%' : ''));

    // OPEX Coverage Status
    const opexCoverageEl = document.getElementById('opexCoverageStatus');
    if (opexCoverageEl) {
        let allCovered = true;
        let minBuffer = Infinity;
        let worstYear = 0;

        projections.yearlyData.forEach((data, i) => {
            if (!data.opexCovered) {
                allCovered = false;
            }
            if (data.opexCovered && data.opex > 0) {
                const buffer = ((data.btcSaleProceeds - data.opex) / data.opex * 100);
                if (buffer < minBuffer) {
                    minBuffer = buffer;
                    worstYear = i + 1;
                }
            }
        });

        if (allCovered) {
            opexCoverageEl.style.background = minBuffer >= 5 ? '#d4edda' : '#fff3cd';
            opexCoverageEl.style.border = minBuffer >= 5 ? '1px solid #2d6a4f' : '1px solid #f39c12';
            opexCoverageEl.style.color = minBuffer >= 5 ? '#2d6a4f' : '#856404';
            opexCoverageEl.textContent = `✅ OPEX Fully Covered All 5 Years (Min buffer: ${minBuffer.toFixed(0)}% in Year ${worstYear})`;
        } else {
            opexCoverageEl.style.background = '#fff5f5';
            opexCoverageEl.style.border = '1px solid #e74c3c';
            opexCoverageEl.style.color = '#e74c3c';
            opexCoverageEl.textContent = '⚠️ WARNING: OPEX shortfall detected in one or more years. Review table above or increase "Sell for OPEX" percentage.';
        }
    }

    console.log(' 5-Year Impact Summary updated');
}

// ============================================================================
// BTC DISTRIBUTION STRATEGY FUNCTIONS
// ============================================================================

/**
 * Apply preset distribution template
 * @param {string} preset - 'conservative', 'balanced', or 'aggressive'
 */
function applyDistributionPreset(preset) {
    let sellPercent, lpPercent, gpPercent;

    switch(preset) {
        case 'conservative':
            sellPercent = 40;
            lpPercent = 36;  // 60% of remaining 60%
            gpPercent = 24;  // 40% of remaining 60%
            break;
        case 'balanced':
            sellPercent = 30;
            lpPercent = 42;  // 60% of remaining 70%
            gpPercent = 28;  // 40% of remaining 70%
            break;
        case 'aggressive':
            sellPercent = 20;
            lpPercent = 48;  // 60% of remaining 80%
            gpPercent = 32;  // 40% of remaining 80%
            break;
        default:
            console.error('Unknown preset:', preset);
            return;
    }

    // Update sliders
    document.getElementById('btcSellPercent').value = sellPercent;
    document.getElementById('btcLpPercent').value = lpPercent;
    document.getElementById('btcGpPercent').value = gpPercent;

    // Update displays
    updateDistributionDisplay();

    // Recalculate
    calculateInvestmentReturns();
}

/**
 * Update distribution percentage displays and validate total
 */
function updateDistributionDisplay() {
    const sellPercent = parseFloat(document.getElementById('btcSellPercent')?.value) || 0;
    const lpPercent = parseFloat(document.getElementById('btcLpPercent')?.value) || 0;
    const gpPercent = parseFloat(document.getElementById('btcGpPercent')?.value) || 0;

    // Update display labels
    document.getElementById('btcSellPercentDisplay').textContent = sellPercent + '%';
    document.getElementById('btcLpPercentDisplay').textContent = lpPercent + '%';
    document.getElementById('btcGpPercentDisplay').textContent = gpPercent + '%';

    // Update slider backgrounds
    const sellSlider = document.getElementById('btcSellPercent');
    const lpSlider = document.getElementById('btcLpPercent');
    const gpSlider = document.getElementById('btcGpPercent');

    if (sellSlider) {
        sellSlider.style.background = `linear-gradient(to right, #e74c3c 0%, #e74c3c ${sellPercent}%, #ddd ${sellPercent}%, #ddd 100%)`;
    }
    if (lpSlider) {
        lpSlider.style.background = `linear-gradient(to right, #3498db 0%, #3498db ${lpPercent}%, #ddd ${lpPercent}%, #ddd 100%)`;
    }
    if (gpSlider) {
        gpSlider.style.background = `linear-gradient(to right, #2d6a4f 0%, #2d6a4f ${gpPercent}%, #ddd ${gpPercent}%, #ddd 100%)`;
    }

    // Validate total = 100%
    const total = sellPercent + lpPercent + gpPercent;
    const totalEl = document.getElementById('distributionTotal');
    const warningEl = document.getElementById('distributionWarning');

    if (totalEl) {
        totalEl.textContent = total.toFixed(0) + '%';
        if (total === 100) {
            totalEl.style.color = '#2d6a4f';
            if (warningEl) warningEl.style.display = 'none';
        } else {
            totalEl.style.color = '#e74c3c';
            if (warningEl) warningEl.style.display = 'block';
        }
    }
}

/**
 * Calculate minimum BTC sell % needed to cover OPEX all 5 years
 */
function calculateMinimumOpexPercent() {
    if (!projectData || !projectData.totalOpex) {
        alert('Please complete Steps 1-4 first to calculate minimum OPEX coverage.');
        return;
    }

    const baseOpex = projectData.totalOpex;
    const inputs = getFinancialInputs();
    const yearlyPrices = getYearlyPrices(inputs.btcPrice);

    // Calculate BTC mined each year
    const projections = calculateYearlyProjections(inputs, yearlyPrices);

    if (!projections || !projections.yearlyData) {
        console.error('Failed to calculate projections');
        return;
    }

    // Find minimum % needed across all years
    let maxPercentNeeded = 0;

    for (let i = 0; i < 5; i++) {
        const yearData = projections.yearlyData[i];
        const inflatedOpex = calculateInflatedOpex(baseOpex, i + 1);
        const btcPrice = yearlyPrices[i];
        const btcMined = yearData.btcMined;

        // What % of BTC mined do we need to sell to cover OPEX?
        const btcValueIfSellAll = btcMined * btcPrice;
        const percentNeeded = btcValueIfSellAll > 0 ? (inflatedOpex / btcValueIfSellAll) * 100 : 100;

        maxPercentNeeded = Math.max(maxPercentNeeded, percentNeeded);
    }

    // Round up to nearest whole percent and add 2% buffer
    const recommendedPercent = Math.min(100, Math.ceil(maxPercentNeeded) + 2);

    // Update sell slider
    document.getElementById('btcSellPercent').value = recommendedPercent;

    // Get current GP/LP profit split
    const splitValue = document.getElementById('gpLpSplit')?.value || '40-60';
    const [gpProfitPercent, lpProfitPercent] = splitValue.split('-').map(v => parseInt(v));

    // Distribute remaining % per profit split
    const remaining = 100 - recommendedPercent;
    const lpPercent = Math.round((remaining * lpProfitPercent) / 100);
    const gpPercent = 100 - recommendedPercent - lpPercent;

    document.getElementById('btcLpPercent').value = lpPercent;
    document.getElementById('btcGpPercent').value = gpPercent;

    updateDistributionDisplay();
    calculateInvestmentReturns();

    alert(`Minimum ${recommendedPercent}% of BTC must be sold to cover OPEX (including 2% buffer).\n\nRemaining ${100 - recommendedPercent}% split ${gpPercent}% GP / ${lpPercent}% LP per your profit sharing ratio.`);
}

console.log(' Pro Forma financial module loaded (FIXED VERSION)');
