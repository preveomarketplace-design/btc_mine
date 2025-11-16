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

    let cumulativeBTC = 0;
    let cumulativeOpex = 0;

    // Populate each year
    for (let i = 0; i < 5; i++) {
        const yearData = data[i] || {};
        const btcMined = yearData.btcMined || 0;
        const btcPrice = yearlyPrices[i] || 0;
        const opex = yearData.opex || projectData.totalOpex || 0;

        // Accumulate BTC and OPEX
        cumulativeBTC += btcMined;
        cumulativeOpex += opex;

        // BTC mined this year
        const btcEl = document.getElementById(`btc_y${i+1}`);
        if (btcEl) btcEl.textContent = btcMined.toFixed(2);

        // Cumulative BTC holdings
        const cumBtcEl = document.getElementById(`cum_btc_y${i+1}`);
        if (cumBtcEl) cumBtcEl.textContent = cumulativeBTC.toFixed(2) + ' BTC';

        // BTC price
        const priceEl = document.getElementById(`price_y${i+1}`);
        if (priceEl) priceEl.textContent = '$' + formatNumber(btcPrice);

        // EXIT SCENARIO CALCULATIONS
        // Total BTC sale proceeds if exit at end of this year
        const exitProceeds = cumulativeBTC * btcPrice;
        const exitProceedsEl = document.getElementById(`exit_proceeds_y${i+1}`);
        if (exitProceedsEl) exitProceedsEl.textContent = '$' + formatNumber(exitProceeds);

        // Cumulative OPEX paid through this year
        const exitOpexEl = document.getElementById(`exit_opex_y${i+1}`);
        if (exitOpexEl) exitOpexEl.textContent = '($' + formatNumber(cumulativeOpex) + ')';

        // Initial CAPEX (same for all years)
        const exitCapexEl = document.getElementById(`exit_capex_y${i+1}`);
        if (exitCapexEl) exitCapexEl.textContent = '($' + formatNumber(initialCapex) + ')';

        // Equipment residual value - linear depreciation from 100% to 25% over 5 years
        // Year 1: 85%, Year 2: 70%, Year 3: 55%, Year 4: 40%, Year 5: 25%
        const depreciationRate = 0.75; // Depreciates by 75% over 5 years
        const residualPercent = 1 - (depreciationRate * (i + 1) / 5);
        const residualValue = initialCapex * residualPercent;
        const exitResidualEl = document.getElementById(`exit_residual_y${i+1}`);
        if (exitResidualEl) exitResidualEl.textContent = '$' + formatNumber(residualValue);

        // Net cash if exit this year
        const netCash = exitProceeds - cumulativeOpex - initialCapex + residualValue;
        const exitNetEl = document.getElementById(`exit_net_y${i+1}`);
        if (exitNetEl) {
            exitNetEl.textContent = (netCash >= 0 ? '$' : '($') + formatNumber(Math.abs(netCash)) + (netCash >= 0 ? '' : ')');
            // Color code: green if positive, red if negative
            exitNetEl.style.color = netCash >= 0 ? '#2d6a4f' : '#e74c3c';
            exitNetEl.style.fontWeight = '700';
        }

        // ROI % if exit this year
        const roi = (netCash / initialCapex) * 100;
        const exitRoiEl = document.getElementById(`exit_roi_y${i+1}`);
        if (exitRoiEl) {
            exitRoiEl.textContent = roi.toFixed(1) + '%';
            // Color code: green if positive, red if negative
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
    
    // Create all charts (with delays to ensure DOM is ready)
    setTimeout(() => {
        createBtcPositionChart(projections, yearlyPrices);
        createOpexBreakdownChart(projections);
        createCumulativeCashFlowChart(projections);
        createExitROIChart(projections, yearlyPrices);
        createWaterfallChart(projections);
    }, 100);
    
    console.log(' Pro Forma Report update complete');
}

console.log(' Pro Forma financial module loaded (FIXED VERSION)');
