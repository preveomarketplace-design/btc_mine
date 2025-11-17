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
 * Update Pro Forma Income Statement Table
 */
function updateProFormaIncomeStatement(projections, yearlyPrices) {
    console.log('Updating Pro Forma Income Statement...', {projections, yearlyPrices});
    
    if (!projections || !projections.yearlyData || projections.yearlyData.length === 0) {
        console.error('No projection data available');
        return;
    }
    
    const data = projections.yearlyData;
    const opexEnergy = projectData.totalOpex * 0.6; // Assume 60% energy
    const opexMaint = projectData.totalOpex * 0.4;  // Assume 40% maintenance
    
    let totalRevenue = 0, totalBtc = 0, totalOpex = 0, totalEbitda = 0;
    let totalOpexEnergy = 0, totalOpexMaint = 0;
    
    // Populate each year
    for (let i = 0; i < 5; i++) {
        const yearData = data[i] || {};
        const revenue = yearData.revenue || 0;
        const btcMined = yearData.btcMined || 0;
        const btcPrice = yearlyPrices[i] || 0;
        const opex = yearData.opex || projectData.totalOpex || 0;
        const ebitda = revenue - opex;
        const margin = revenue > 0 ? ((ebitda / revenue) * 100) : 0;
        
        // Revenue
        const revEl = document.getElementById(`rev_y${i+1}`);
        const btcEl = document.getElementById(`btc_y${i+1}`);
        const priceEl = document.getElementById(`price_y${i+1}`);
        
        if (revEl) revEl.textContent = '$' + formatNumber(revenue);
        if (btcEl) btcEl.textContent = btcMined.toFixed(2);
        if (priceEl) priceEl.textContent = '$' + formatNumber(btcPrice);
        
        // OPEX
        const opexEl = document.getElementById(`opex_y${i+1}`);
        const energyEl = document.getElementById(`opex_energy_y${i+1}`);
        const maintEl = document.getElementById(`opex_maint_y${i+1}`);
        
        const yearEnergy = opexEnergy;
        const yearMaint = opexMaint;
        
        if (opexEl) opexEl.textContent = '($' + formatNumber(opex) + ')';
        if (energyEl) energyEl.textContent = '($' + formatNumber(yearEnergy) + ')';
        if (maintEl) maintEl.textContent = '($' + formatNumber(yearMaint) + ')';
        
        // EBITDA
        const ebitdaEl = document.getElementById(`ebitda_y${i+1}`);
        const marginEl = document.getElementById(`margin_y${i+1}`);
        
        if (ebitdaEl) ebitdaEl.textContent = '$' + formatNumber(ebitda);
        if (marginEl) marginEl.textContent = margin.toFixed(1) + '%';
        
        totalRevenue += revenue;
        totalBtc += btcMined;
        totalOpex += opex;
        totalEbitda += ebitda;
        totalOpexEnergy += yearEnergy;
        totalOpexMaint += yearMaint;
    }
    
    // Totals
    const revTotalEl = document.getElementById('rev_total');
    const btcTotalEl = document.getElementById('btc_total');
    const opexTotalEl = document.getElementById('opex_total');
    const opexEnergyTotalEl = document.getElementById('opex_energy_total');
    const opexMaintTotalEl = document.getElementById('opex_maint_total');
    const ebitdaTotalEl = document.getElementById('ebitda_total');
    const marginAvgEl = document.getElementById('margin_avg');
    
    if (revTotalEl) revTotalEl.textContent = '$' + formatNumber(totalRevenue);
    if (btcTotalEl) btcTotalEl.textContent = totalBtc.toFixed(2);
    if (opexTotalEl) opexTotalEl.textContent = '($' + formatNumber(totalOpex) + ')';
    if (opexEnergyTotalEl) opexEnergyTotalEl.textContent = '($' + formatNumber(totalOpexEnergy) + ')';
    if (opexMaintTotalEl) opexMaintTotalEl.textContent = '($' + formatNumber(totalOpexMaint) + ')';
    if (ebitdaTotalEl) ebitdaTotalEl.textContent = '$' + formatNumber(totalEbitda);
    
    const avgMargin = totalRevenue > 0 ? ((totalEbitda / totalRevenue) * 100) : 0;
    if (marginAvgEl) marginAvgEl.textContent = avgMargin.toFixed(1) + '%';
    
    console.log('✅ Income Statement updated');
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
    
    console.log('✅ Cash Flow Statement updated');
}

/**
 * Update Key Financial Metrics Dashboard
 */
function updateKeyMetrics(projections, inputs) {
    console.log('Updating Key Metrics...');
    
    if (!projections) return;
    
    // IRR
    const cashFlows = [-projectData.totalCapex];
    projections.yearlyData.forEach((d, i) => {
        const ebitda = d.revenue - d.opex;
        const residual = i === 4 ? projectData.totalCapex * 0.25 : 0;
        cashFlows.push(ebitda + residual);
    });
    
    const irr = calculateIRRSimplified ? calculateIRRSimplified(cashFlows) : 0;
    const irrEl = document.getElementById('metric_irr');
    if (irrEl) irrEl.textContent = (irr * 100).toFixed(1) + '%';
    
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
    
    console.log('✅ Key Metrics updated');
}

/**
 * Create Revenue & EBITDA Chart
 */
function createRevenueEbitdaChart(projections) {
    console.log('Creating Revenue & EBITDA Chart...');
    
    const ctx = document.getElementById('revenueEbitdaChart');
    if (!ctx) {
        console.error('❌ Canvas revenueEbitdaChart not found!');
        return;
    }
    
    if (!window.Chart) {
        console.error('❌ Chart.js not loaded!');
        return;
    }
    
    // Destroy existing chart
    if (window.revenueEbitdaChart && typeof window.revenueEbitdaChart.destroy === 'function') {
        window.revenueEbitdaChart.destroy();
    }
    
    const years = projections.yearlyData.map(d => `Year ${d.year}`);
    const revenues = projections.yearlyData.map(d => d.revenue / 1000);
    const ebitdas = projections.yearlyData.map(d => (d.revenue - d.opex) / 1000);
    
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
    
    console.log('✅ Revenue & EBITDA Chart created');
}

/**
 * Create OPEX Breakdown Chart
 */
function createOpexBreakdownChart(projections) {
    console.log('Creating OPEX Breakdown Chart...');
    
    const ctx = document.getElementById('opexBreakdownChart');
    if (!ctx) {
        console.error('❌ Canvas opexBreakdownChart not found!');
        return;
    }
    
    if (window.opexBreakdownChart && typeof window.opexBreakdownChart.destroy === 'function') {
        window.opexBreakdownChart.destroy();
    }
    
    const years = projections.yearlyData.map(d => `Year ${d.year}`);
    const opexEnergy = projections.yearlyData.map(() => (projectData.totalOpex * 0.6) / 1000);
    const opexMaint = projections.yearlyData.map(() => (projectData.totalOpex * 0.4) / 1000);
    
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
    
    console.log('✅ OPEX Breakdown Chart created');
}

/**
 * Create Cumulative Cash Flow Chart
 */
function createCumulativeCashFlowChart(projections) {
    console.log('Creating Cumulative Cash Flow Chart...');
    
    const ctx = document.getElementById('cumulativeCashFlowChart');
    if (!ctx) {
        console.error('❌ Canvas cumulativeCashFlowChart not found!');
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
    
    window.cumulativeCashFlowChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Cumulative Cash Flow',
                data: cumulativeData,
                borderColor: '#2d6a4f',
                backgroundColor: function(context) {
                    const value = context.parsed.y;
                    return value >= 0 ? 'rgba(45, 106, 79, 0.2)' : 'rgba(231, 76, 60, 0.2)';
                },
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: function(context) {
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
    
    console.log('✅ Cumulative Cash Flow Chart created');
}

/**
 * Create EBITDA Margin Trend Chart
 */
function createEbitdaMarginChart(projections) {
    console.log('Creating EBITDA Margin Chart...');
    
    const ctx = document.getElementById('ebitdaMarginChart');
    if (!ctx) {
        console.error('❌ Canvas ebitdaMarginChart not found!');
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
    
    console.log('✅ EBITDA Margin Chart created');
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
        console.error('❌ No projection data available!');
        return;
    }
    
    // Get BTC prices from inputs
    const yearlyPrices = getProFormaBtcPrices();
    
    // Update all sections
    updateProFormaIncomeStatement(projections, yearlyPrices);
    updateProFormaCashFlow(projections);
    updateKeyMetrics(projections, inputs);
    
    // Create all charts (with delays to ensure DOM is ready)
    setTimeout(() => {
        createRevenueEbitdaChart(projections);
        createOpexBreakdownChart(projections);
        createCumulativeCashFlowChart(projections);
        createEbitdaMarginChart(projections);
    }, 100);
    
    console.log('✅ Pro Forma Report update complete');
}

console.log('✅ Pro Forma financial module loaded (FIXED VERSION)');
