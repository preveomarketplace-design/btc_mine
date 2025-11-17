// investor.js - Investor Analysis Module (Refactored with Buy vs Mine Focus)
// Dependencies: utils.js (CONSTANTS, calculateIRRSimplified, getEquipmentValue, calculateNetworkShare, getBlockReward)

const calcCache = new Map();

function loadStep6() {
    if (projectData.totalCapex <= 0 || projectData.totalOpex <= 0 || projectData.totalHashratePH <= 0) {
        announceStatus('Error: Complete Steps 2-5 to enable investor analysis.', 'error');
        return;
    }
    
    // Populate summary fields from Step 5
    populateAssumptionsSummary();
    
    calculateInvestorAnalysis();
    announceStatus('Investor analysis loaded successfully.', 'success');
}

function populateAssumptionsSummary() {
    // Restore from localStorage if available
    const investorCapital = parseFloat(localStorage.getItem('investorCapital') || document.getElementById('investorCapital')?.value) || 200000;
    const splitValue = localStorage.getItem('gpLpSplit') || document.getElementById('gpLpSplit')?.value || '40-60';
    const btcPrice = parseFloat(document.getElementById('btcPrice')?.value) || 104337;
    
    safeUpdateElement('investorCapitalDisplay', investorCapital.toLocaleString());
    safeUpdateElement('summaryInvestment', investorCapital.toLocaleString());
    safeUpdateElement('summaryGpLp', splitValue.replace('-', '/'));
    safeUpdateElement('summaryBtcPrice', btcPrice.toLocaleString());
}

function calculateInvestorAnalysis() {
    try {
        validateInputs();
        const { btcPrice, difficultyGrowth, uptime } = getCurrentInputs();
        const yearlyPrices = getYearlyPrices(btcPrice);
        const structure = getInvestmentStructure();
        
        calcCache.clear();
        
        // Calculate all sections
        updateHeroSection(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
        updateScenarioComparison(difficultyGrowth, uptime, yearlyPrices, structure);
        updateExitStrategy(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
        updateRiskDashboard(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
        updateSensitivities(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
        
        generateRecommendation(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
        
        announceStatus('Analysis updated successfully.', 'success');
    } catch (error) {
        console.error('Calculation error:', error);
        announceStatus(`Error in analysis: ${error.message}`, 'error');
    }
}

function getInvestmentStructure() {
    // Use values from localStorage (saved in Step 5)
    const splitValue = localStorage.getItem('gpLpSplit') || document.getElementById('gpLpSplit')?.value || '40-60';
    const [gpPercent, lpPercent] = splitValue.split('-').map(v => parseInt(v));
    
    const totalLpCapital = parseFloat(localStorage.getItem('totalLpCapital') || document.getElementById('totalLpCapital')?.value) || 1000000;
    const investorCapital = parseFloat(localStorage.getItem('investorCapital') || document.getElementById('investorCapital')?.value) || 200000;
    const totalCapex = projectData.totalCapex;
    
    const isOwnerOperator = totalLpCapital === 0 || splitValue === '100-0';
    
    let investorLpSharePercent, investorProfitSharePercent;
    
    if (isOwnerOperator) {
        investorLpSharePercent = 0;
        investorProfitSharePercent = 100;
    } else {
        investorLpSharePercent = totalLpCapital > 0 ? (investorCapital / totalLpCapital) * 100 : 0;
        investorProfitSharePercent = (investorLpSharePercent / 100) * lpPercent;
    }
    
    return {
        gpPercent: isOwnerOperator ? 100 : gpPercent,
        lpPercent: isOwnerOperator ? 0 : lpPercent,
        totalLpCapital,
        investorCapital,
        investorLpSharePercent,
        investorProfitSharePercent,
        totalCapex,
        isOwnerOperator
    };
}

function validateInputs() {
    const required = { 
        totalCapex: projectData.totalCapex, 
        totalOpex: projectData.totalOpex, 
        totalHashratePH: projectData.totalHashratePH 
    };
    Object.entries(required).forEach(([key, value]) => {
        if (value <= 0) throw new Error(`${key} must be greater than 0`);
    });
}

function getCurrentInputs() {
    return {
        btcPrice: validateInputRange(document.getElementById('btcPrice')?.value, 10000, 1000000, 104337),
        difficultyGrowth: validateInputRange(document.getElementById('difficultyGrowth')?.value, 0, 50, 5) / 100,
        uptime: validateInputRange(document.getElementById('uptime')?.value, 50, 99, 95) / 100,
        networkHashrateEH: validateInputRange(document.getElementById('networkHashrate')?.value, 100, 5000, 600),
        discountRate: validateInputRange(document.getElementById('discountRate')?.value, 5, 30, 12) / 100
    };
}

function getYearlyPrices(baseBtcPrice) {
    const prices = [];
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`btcPriceY${i}`);
        prices.push(input ? validateInputRange(input.value, 10000, 1000000, baseBtcPrice) : baseBtcPrice);
    }
    return prices;
}

// ============================================================================
// INVESTMENT SUMMARY: Simplified Focus on Mining Returns
// ============================================================================

function updateHeroSection(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure) {
    const investorCapital = structure.investorCapital;

    // Calculate Mining Returns
    const miningResult = calculateLpMiningReturns(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
    const mineEndValue = miningResult.totalValue;
    const mineRoi = miningResult.roi;
    const multiple = mineEndValue / investorCapital;

    // Update Display Elements
    safeUpdateElement('heroInvestmentAmount', investorCapital.toLocaleString());
    safeUpdateElement('investorCapitalDisplay2', investorCapital.toLocaleString());

    safeUpdateElement('heroMineBtc', miningResult.lpBtcEarned.toFixed(4) + ' BTC');
    safeUpdateElement('heroMineUnits', structure.investorLpSharePercent.toFixed(1));
    safeUpdateElement('heroMineShare', structure.investorProfitSharePercent.toFixed(1));
    safeUpdateElement('heroMineValue', '$' + formatNumber(mineEndValue));
    safeUpdateElement('heroMineRoi', mineRoi.toFixed(1) + '%');

    console.log('✅ Investment summary updated:', {
        btcEarned: miningResult.lpBtcEarned.toFixed(4),
        endValue: mineEndValue,
        roi: mineRoi.toFixed(1) + '%',
        multiple: multiple.toFixed(2) + 'x'
    });
}

function calculateLpMiningReturns(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure) {
    const hashratePH = projectData.totalHashratePH;
    const { networkHashrateEH } = getCurrentInputs();
    const startYear = projectData.startYear || 2026;
    
    let totalBtcMined = 0;
    
    for(let year = 1; year <= 5; year++) {
        const calendarYear = startYear + year - 1;
        const reward = getBlockReward(calendarYear);
        const networkShare = calculateNetworkShare(hashratePH, networkHashrateEH, difficultyGrowth, year);
        const btcMined = networkShare * CONSTANTS.BLOCKS_PER_YEAR * reward * uptime;
        totalBtcMined += btcMined;
    }
    
    // Total LP pool gets lpPercent of all BTC
    const totalLpBtcEarned = totalBtcMined * (structure.lpPercent / 100);
    
    // This investor gets their share of the LP pool
    const investorBtcEarned = structure.totalLpCapital > 0 ? 
        (structure.investorCapital / structure.totalLpCapital) * totalLpBtcEarned : 0;
    
    // Equipment residual split by capital contribution
    const equipmentResidual = projectData.totalCapex * CONSTANTS.EQUIPMENT_RESIDUAL_PERCENT;
    const investorEquipmentShare = (structure.investorCapital / structure.totalCapex) * equipmentResidual;
    
    // Total value
    const finalPrice = yearlyPrices[4];
    const investorBtcValue = investorBtcEarned * finalPrice;
    const totalValue = investorBtcValue + investorEquipmentShare;
    
    const roi = structure.investorCapital > 0 ? ((totalValue - structure.investorCapital) / structure.investorCapital) * 100 : 0;
    
    return {
        lpBtcEarned: investorBtcEarned,
        lpBtcValue: investorBtcValue,
        lpEquipmentShare: investorEquipmentShare,
        totalValue,
        roi
    };
}

// ============================================================================
// SCENARIO COMPARISON TABLE
// ============================================================================

function updateScenarioComparison(difficultyGrowth, uptime, yearlyPrices, structure) {
    const scenarios = [50000, 80000, 104337, 130000, 160000, 190000, 220000];
    const tbody = document.getElementById('scenarioComparisonTable')?.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    scenarios.forEach(price => {
        const scenarioPrices = Array(5).fill(price);
        
        // Buy Strategy
        const btcIfBuy = structure.investorCapital / price;
        const buyEndValue = btcIfBuy * price;
        const buyRoi = 0; // No change if constant price
        
        // Mine Strategy
        const mineResult = calculateLpMiningReturns(price, difficultyGrowth, uptime, scenarioPrices, structure);
        
        // Determine Winner
        const edge = ((mineResult.totalValue / buyEndValue) - 1) * 100;
        let winner, winnerColor, rowStyle;
        
        if (edge > 10) {
            winner = 'MINE';
            winnerColor = '#2d6a4f';
            rowStyle = 'background: #e8f5e9;';
        } else if (edge < -10) {
            winner = 'BUY';
            winnerColor = '#f39c12';
            rowStyle = 'background: #fff8e1;';
        } else {
            winner = 'TIE';
            winnerColor = '#6c757d';
            rowStyle = '';
        }
        
        const row = tbody.insertRow();
        row.setAttribute('style', rowStyle);
        row.innerHTML = `
            <td><strong>$${price.toLocaleString()}</strong></td>
            <td class="number">${btcIfBuy.toFixed(4)} BTC</td>
            <td class="number">$${formatNumber(buyEndValue)}</td>
            <td class="number">${buyRoi.toFixed(1)}%</td>
            <td class="number">${mineResult.lpBtcEarned.toFixed(4)} BTC</td>
            <td class="number">$${formatNumber(mineResult.totalValue)}</td>
            <td class="number">${mineResult.roi.toFixed(1)}%</td>
            <td style="color: ${winnerColor}; font-weight: 600;">${winner}</td>
            <td class="number" style="color: ${winnerColor}; font-weight: 600;">${edge > 0 ? '+' : ''}${edge.toFixed(1)}%</td>
        `;
    });
}

// ============================================================================
// EXIT STRATEGY ANALYSIS
// ============================================================================

function updateExitStrategy(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure) {
    const exitYears = [1, 2, 3, 4, 5];
    const tbodyMine = document.getElementById('exitStrategyTableMine')?.querySelector('tbody');
    const tbodyHold = document.getElementById('exitStrategyTableHold')?.querySelector('tbody');
    
    if (!tbodyMine || !tbodyHold) return;
    
    tbodyMine.innerHTML = '';
    tbodyHold.innerHTML = '';
    
    // Buy at Year 0 (today) with base Bitcoin price
    const btcIfBuyInitial = structure.investorCapital / btcPrice;
    
    exitYears.forEach(year => {
        const exitResult = calculateLpExit(year, btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
        const exitYearPrice = yearlyPrices[year - 1];
        
        // MINE Strategy Row
        const mineROI = structure.investorCapital > 0 ? ((exitResult.netReturn / structure.investorCapital) * 100).toFixed(1) : 0;
        const mineNetColor = exitResult.netReturn >= 0 ? '#2d6a4f' : '#e74c3c';
        
        const rowMine = tbodyMine.insertRow();
        rowMine.innerHTML = `
            <td><strong>Year ${year}</strong></td>
            <td class="number">${exitResult.lpBtcEarned.toFixed(4)} BTC</td>
            <td class="number" style="color: #3498db; font-weight: 600;">$${formatNumber(exitYearPrice)}</td>
            <td class="number">$${formatNumber(exitResult.btcValue)}</td>
            <td class="number">$${formatNumber(exitResult.equipmentShare)}</td>
            <td class="number">$${formatNumber(exitResult.totalRecovery)}</td>
            <td class="number" style="color: ${mineNetColor}; font-weight: 600;">$${formatNumber(exitResult.netReturn)}</td>
            <td class="number" style="color: ${mineNetColor}; font-weight: 600;">${mineROI}%</td>
        `;
        
        // HOLD Strategy Row
        const holdValue = btcIfBuyInitial * exitYearPrice;
        const holdNetReturn = holdValue - structure.investorCapital;
        const holdROI = structure.investorCapital > 0 ? ((holdNetReturn / structure.investorCapital) * 100).toFixed(1) : 0;
        const holdNetColor = holdNetReturn >= 0 ? '#2d6a4f' : '#e74c3c';
        
        const rowHold = tbodyHold.insertRow();
        rowHold.innerHTML = `
            <td><strong>Year ${year}</strong></td>
            <td class="number">${btcIfBuyInitial.toFixed(4)} BTC</td>
            <td class="number" style="color: #3498db; font-weight: 600;">$${formatNumber(exitYearPrice)}</td>
            <td class="number">$${formatNumber(holdValue)}</td>
            <td class="number">$0</td>
            <td class="number">$${formatNumber(holdValue)}</td>
            <td class="number" style="color: ${holdNetColor}; font-weight: 600;">$${formatNumber(holdNetReturn)}</td>
            <td class="number" style="color: ${holdNetColor}; font-weight: 600;">${holdROI}%</td>
        `;
        
        // Winner determination
        const holdROINum = parseFloat(holdROI);
        const mineROINum = parseFloat(mineROI);
        let winner = 'TIE';
        let winnerColor = '#6c757d';
        
        if (mineROINum > holdROINum + 10) {
            winner = 'MINE';
            winnerColor = '#2d6a4f';
        } else if (holdROINum > mineROINum + 10) {
            winner = 'HOLD';
            winnerColor = '#f39c12';
        } else {
            winner = 'TIE';
        }
        
        const winnerElement = document.getElementById(`winnerY${year}`);
        if (winnerElement) {
            winnerElement.textContent = winner;
            winnerElement.style.color = winnerColor;
        }
    });
}

function calculateLpExit(year, btcPrice, difficultyGrowth, uptime, yearlyPrices, structure) {
    const hashratePH = projectData.totalHashratePH;
    const { networkHashrateEH } = getCurrentInputs();
    const startYear = projectData.startYear || 2026;
    
    let totalBtcMined = 0;
    
    for(let y = 1; y <= year; y++) {
        const calendarYear = startYear + y - 1;
        const reward = getBlockReward(calendarYear);
        const networkShare = calculateNetworkShare(hashratePH, networkHashrateEH, difficultyGrowth, y);
        const btcMined = networkShare * CONSTANTS.BLOCKS_PER_YEAR * reward * uptime;
        totalBtcMined += btcMined;
    }
    
    // Total LP pool gets lpPercent
    const totalLpBtcEarned = totalBtcMined * (structure.lpPercent / 100);
    
    // This investor gets their share of LP pool
    const investorBtcEarned = structure.totalLpCapital > 0 ? 
        (structure.investorCapital / structure.totalLpCapital) * totalLpBtcEarned : 0;
    
    const exitYearPrice = yearlyPrices[year - 1];
    const btcValue = investorBtcEarned * exitYearPrice;
    
    const equipmentValue = getEquipmentValue(projectData.totalCapex, year);
    const equipmentShare = (structure.investorCapital / structure.totalCapex) * equipmentValue;
    
    const totalRecovery = btcValue + equipmentShare;
    const netReturn = totalRecovery - structure.investorCapital;
    
    return {
        lpBtcEarned: investorBtcEarned,
        btcValue,
        equipmentShare,
        totalRecovery,
        netReturn
    };
}

// ============================================================================
// RISK DASHBOARD
// ============================================================================

function updateRiskDashboard(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure) {
    const breakEven = calculateBreakEvenPrice(difficultyGrowth, uptime, structure);
    
    const baseResult = calculateLpMiningReturns(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
    const lowUptimeResult = calculateLpMiningReturns(btcPrice, difficultyGrowth, 0.85, yearlyPrices, structure);
    const uptimeImpact = baseResult.totalValue - lowUptimeResult.totalValue;
    
    const highDiffResult = calculateLpMiningReturns(btcPrice, difficultyGrowth * 2, uptime, yearlyPrices, structure);
    const difficultyImpact = baseResult.totalValue - highDiffResult.totalValue;
    
    const capexEfficiency = projectData.totalHashratePH > 0 ? projectData.totalCapex / projectData.totalHashratePH : 0;
    
    safeUpdateElement('breakEvenPrice', '$' + Math.round(breakEven).toLocaleString());
    safeUpdateElement('uptimeImpact', '$' + Math.round(uptimeImpact).toLocaleString());
    safeUpdateElement('difficultyImpact', '$' + Math.round(difficultyImpact).toLocaleString());
    safeUpdateElement('capexEfficiency', '$' + Math.round(capexEfficiency).toLocaleString() + '/PH');
}

function calculateBreakEvenPrice(difficultyGrowth, uptime, structure) {
    const hashratePH = projectData.totalHashratePH;
    const { networkHashrateEH } = getCurrentInputs();
    const startYear = projectData.startYear || 2026;
    
    let totalBtcMined = 0;
    
    for(let year = 1; year <= 5; year++) {
        const calendarYear = startYear + year - 1;
        const reward = getBlockReward(calendarYear);
        const networkShare = calculateNetworkShare(hashratePH, networkHashrateEH, difficultyGrowth, year);
        const btcMined = networkShare * CONSTANTS.BLOCKS_PER_YEAR * reward * uptime;
        totalBtcMined += btcMined;
    }
    
    // Total LP pool gets lpPercent
    const totalLpBtcEarned = totalBtcMined * (structure.lpPercent / 100);
    
    // This investor gets their share of LP pool
    const investorBtcEarned = structure.totalLpCapital > 0 ? 
        (structure.investorCapital / structure.totalLpCapital) * totalLpBtcEarned : 0;
    
    // For break-even: BTC bought = BTC mined
    // investorCapital / price = investorBtcEarned
    // price = investorCapital / investorBtcEarned
    
    return investorBtcEarned > 0 ? structure.investorCapital / investorBtcEarned : 0;
}

// ============================================================================
// SENSITIVITIES
// ============================================================================

function updateSensitivities(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure) {
    const baseResult = calculateLpMiningReturns(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
    
    const sensitivities = [
        {
            variable: 'BTC Price',
            baseCase: '$' + btcPrice.toLocaleString(),
            downResult: calculateLpMiningReturns(btcPrice * 0.8, difficultyGrowth, uptime, yearlyPrices.map(p => p * 0.8), structure),
            upResult: calculateLpMiningReturns(btcPrice * 1.5, difficultyGrowth, uptime, yearlyPrices.map(p => p * 1.5), structure)
        },
        {
            variable: 'Difficulty Growth',
            baseCase: (difficultyGrowth * 100).toFixed(0) + '%',
            downResult: calculateLpMiningReturns(btcPrice, difficultyGrowth * 0.8, uptime, yearlyPrices, structure),
            upResult: calculateLpMiningReturns(btcPrice, difficultyGrowth * 1.5, uptime, yearlyPrices, structure)
        },
        {
            variable: 'Uptime',
            baseCase: (uptime * 100).toFixed(0) + '%',
            downResult: calculateLpMiningReturns(btcPrice, difficultyGrowth, uptime * 0.8, yearlyPrices, structure),
            upResult: calculateLpMiningReturns(btcPrice, difficultyGrowth, Math.min(uptime * 1.5, 0.99), yearlyPrices, structure)
        }
    ];
    
    const tbody = document.getElementById('sensitivityTable')?.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    sensitivities.forEach(sens => {
        const downImpact = ((sens.downResult.totalValue - baseResult.totalValue) / baseResult.totalValue * 100).toFixed(1);
        const upImpact = ((sens.upResult.totalValue - baseResult.totalValue) / baseResult.totalValue * 100).toFixed(1);
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${sens.variable}</td>
            <td>${sens.baseCase}</td>
            <td class="number">${downImpact}%</td>
            <td class="number">+${upImpact}%</td>
            <td class="number">${(parseFloat(upImpact) - parseFloat(downImpact)).toFixed(1)}%</td>
        `;
    });
}

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

function generateRecommendation(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure) {
    const box = document.getElementById('recommendationBox');
    const text = document.getElementById('recommendationText');
    
    // Buy at Year 0 (today) with base Bitcoin price
    const btcIfBuy = structure.investorCapital / btcPrice;
    const buyEndValue = btcIfBuy * yearlyPrices[4];
    
    const mineResult = calculateLpMiningReturns(btcPrice, difficultyGrowth, uptime, yearlyPrices, structure);
    
    const edge = ((mineResult.totalValue / buyEndValue) - 1) * 100;
    
    let recommendation = '';
    let bgGradient = '';
    let borderColor = '';
    
    if (edge > 15) {
        // Strong Mining Advantage
        bgGradient = 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)';
        borderColor = '#2d6a4f';
        recommendation = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 24px; font-weight: 700; color: #2d6a4f; margin-bottom: 10px;">STRONG MINING RECOMMENDATION</div>
                <div style="font-size: 14px; color: #155724;">Mining outperforms buying BTC by ${edge.toFixed(1)}%</div>
            </div>
            <p style="margin-bottom: 12px;"><strong>Why Mining Wins:</strong></p>
            <ul style="margin-left: 20px; line-height: 1.6;">
                <li>You'll earn <strong>${mineResult.lpBtcEarned.toFixed(4)} BTC</strong> vs buying <strong>${btcIfBuy.toFixed(4)} BTC</strong></li>
                <li>Equipment residual value of <strong>$${formatNumber(mineResult.lpEquipmentShare)}</strong> provides downside protection</li>
                <li>Your ${structure.lpPercent}% LP share generates <strong>${mineResult.roi.toFixed(1)}% ROI</strong> over 5 years</li>
            </ul>
            <p style="margin-top: 12px;"><strong>Key Considerations:</strong> Mining requires operational expertise and carries uptime risk. Ensure the GP has proven track record.</p>
        `;
    } else if (edge > 5) {
        // Moderate Mining Advantage
        bgGradient = 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)';
        borderColor = '#2d6a4f';
        recommendation = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 24px; font-weight: 700; color: #2d6a4f; margin-bottom: 10px;">â›ï¸ MINING SLIGHTLY FAVORED</div>
                <div style="font-size: 14px; color: #155724;">Mining edges out buying by ${edge.toFixed(1)}%</div>
            </div>
            <p><strong>Proceed with mining if:</strong></p>
            <ul style="margin-left: 20px; line-height: 1.6;">
                <li>You trust the GP's operational capabilities</li>
                <li>You're comfortable with ${structure.lpPercent}% profit share structure</li>
                <li>You believe BTC price will remain stable or increase</li>
            </ul>
            <p style="margin-top: 12px;"><strong>Consider buying BTC if:</strong> You want zero operational risk and instant liquidity.</p>
        `;
    } else if (edge < -15) {
        // Strong Buy Advantage
        bgGradient = 'linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)';
        borderColor = '#f39c12';
        recommendation = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 24px; font-weight: 700; color: #f39c12; margin-bottom: 10px;">STRONG BUY RECOMMENDATION</div>
                <div style="font-size: 14px; color: #856404;">Buying BTC outperforms mining by ${Math.abs(edge).toFixed(1)}%</div>
            </div>
            <p style="margin-bottom: 12px;"><strong>Why Buying Wins:</strong></p>
            <ul style="margin-left: 20px; line-height: 1.6;">
                <li>You'll own <strong>${btcIfBuy.toFixed(4)} BTC</strong> outright vs earning <strong>${mineResult.lpBtcEarned.toFixed(4)} BTC</strong> from mining</li>
                <li>Zero operational risk or GP dependency</li>
                <li>Instant liquidity - sell anytime without equipment liquidation</li>
                <li>No uptime, difficulty, or execution risk</li>
            </ul>
            <p style="margin-top: 12px;"><strong>Bottom Line:</strong> At current assumptions, buying BTC is the superior investment. Only consider mining if you can negotiate better GP/LP terms or reduce CAPEX significantly.</p>
        `;
    } else if (edge < -5) {
        // Moderate Buy Advantage
        bgGradient = 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)';
        borderColor = '#ffc107';
        recommendation = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 24px; font-weight: 700; color: #f39c12; margin-bottom: 10px;">BUYING BTC SLIGHTLY FAVORED</div>
                <div style="font-size: 14px; color: #856404;">Buying edges out mining by ${Math.abs(edge).toFixed(1)}%</div>
            </div>
            <p><strong>Lean toward buying BTC because:</strong></p>
            <ul style="margin-left: 20px; line-height: 1.6;">
                <li>Similar returns with much lower complexity</li>
                <li>No operational or counterparty risk</li>
                <li>Complete liquidity and portability</li>
            </ul>
            <p style="margin-top: 12px;"><strong>Only choose mining if:</strong> You have specific conviction that BTC price will surge significantly, making the extra complexity worthwhile.</p>
        `;
    } else {
        // Neutral / Tie
        bgGradient = 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)';
        borderColor = '#adb5bd';
        recommendation = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 24px; font-weight: 700; color: #6c757d; margin-bottom: 10px;">BOTH STRATEGIES VIABLE</div>
                <div style="font-size: 14px; color: #495057;">Mining and buying yield similar results (within ${Math.abs(edge).toFixed(1)}%)</div>
            </div>
            <p><strong>Decision factors to consider:</strong></p>
            <ul style="margin-left: 20px; line-height: 1.6;">
                <li><strong>Choose Mining if:</strong> You want exposure to mining operations, trust the GP, and believe equipment will retain value</li>
                <li><strong>Choose Buying if:</strong> You prioritize simplicity, liquidity, and want to avoid operational complexity</li>
            </ul>
            <p style="margin-top: 12px;"><strong>Recommendation:</strong> Since returns are similar, choose based on your risk tolerance and investment preferences rather than pure financial metrics.</p>
        `;
    }
    
    if (box) {
        box.style.background = bgGradient;
        box.style.border = `3px solid ${borderColor}`;
    }
    if (text) text.innerHTML = recommendation;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatNumber(value) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function safeUpdateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function announceStatus(message, type = 'info') {
    const announcer = document.getElementById('status-announcer');
    if (announcer) {
        announcer.textContent = message;
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function exportReport() {
    try {
        const structure = getInvestmentStructure();
        const { btcPrice } = getCurrentInputs();
        
        const exportData = {
            projectSummary: {
                capex: projectData.totalCapex,
                opex: projectData.totalOpex,
                hashrate: projectData.totalHashratePH,
                miners: miners?.length || 0
            },
            investmentStructure: {
                investorCapital: structure.investorCapital,
                gpLpSplit: `${structure.gpPercent}/${structure.lpPercent}`,
                lpUnits: structure.lpUnits
            },
            marketAssumptions: {
                btcPrice,
                timestamp: new Date().toISOString()
            },
            version: '3.0-GP-LP'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mining-investment-analysis-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        setTimeout(() => {
            if (confirm('Export complete! Would you like to print the report as PDF?')) {
                window.print();
            }
        }, 500);
        
        announceStatus('Report exported successfully.', 'success');
    } catch (error) {
        announceStatus(`Export error: ${error.message}`, 'error');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadStep6,
        calculateInvestorAnalysis,
        exportReport
    };
}
