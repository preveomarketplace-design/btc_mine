// montecarlo.js - Monte Carlo Simulation for Buy vs Mine Decision
// Parameter-based path generation using Geometric Brownian Motion

// Global variables to store simulation data
let simulationResults = null;

/**
 * Generate correlated random paths using Geometric Brownian Motion
 * @param {number} S0 - Starting value
 * @param {number} mu - Expected annual return (as decimal, e.g., 0.25 for 25%)
 * @param {number} sigma - Annual volatility (as decimal, e.g., 0.60 for 60%)
 * @param {number} years - Number of years to project
 * @param {number} numPaths - Number of paths to generate
 * @param {Array} correlatedRandom - Optional array of correlated random numbers
 * @returns {Array} Array of paths, where each path is an array of values for each year
 */
function generateGBMPaths(S0, mu, sigma, years, numPaths, correlatedRandom = null) {
    const paths = [];
    const dt = 1; // Annual time step
    
    for (let i = 0; i < numPaths; i++) {
        const path = [S0]; // Start with initial value
        
        for (let t = 1; t <= years; t++) {
            const S_prev = path[t - 1];
            
            // Use correlated random if provided, otherwise generate new random
            const z = correlatedRandom ? correlatedRandom[i][t-1] : randomNormal();
            
            // Geometric Brownian Motion formula: S_t = S_(t-1) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*z)
            const drift = (mu - 0.5 * sigma * sigma) * dt;
            const diffusion = sigma * Math.sqrt(dt) * z;
            const S_t = S_prev * Math.exp(drift + diffusion);
            
            path.push(S_t);
        }
        
        paths.push(path);
    }
    
    return paths;
}

/**
 * Generate standard normal random variable (Box-Muller transform)
 */
function randomNormal() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generate correlated random numbers using Cholesky decomposition
 * @param {number} numPaths - Number of simulation paths
 * @param {number} numSteps - Number of time steps
 * @param {number} rho - Correlation coefficient between -1 and 1
 * @returns {Object} Object with z1 and z2 arrays of correlated random numbers
 */
function generateCorrelatedRandoms(numPaths, numSteps, rho) {
    const z1 = [];
    const z2 = [];
    
    // Cholesky decomposition for correlation matrix
    // [1, rho]      [1,  0]
    // [rho, 1]  =   [rho, sqrt(1-rho^2)]
    
    const a = 1;
    const b = rho;
    const c = Math.sqrt(1 - rho * rho);
    
    for (let i = 0; i < numPaths; i++) {
        const path1 = [];
        const path2 = [];
        
        for (let t = 0; t < numSteps; t++) {
            const e1 = randomNormal();
            const e2 = randomNormal();
            
            // Transform to correlated normals
            const w1 = a * e1;
            const w2 = b * e1 + c * e2;
            
            path1.push(w1);
            path2.push(w2);
        }
        
        z1.push(path1);
        z2.push(path2);
    }
    
    return { z1, z2 };
}

/**
 * Main Monte Carlo simulation engine with parameter-based path generation
 * CRITICAL: Mining calculation now matches Step 6 (investor.js) exactly!
 * - Calculates BTC mined based on network share
 * - Converts to dollars at Year 5 BTC price
 * - Accounts for GP/LP profit sharing structure
 * - Hash price is NOT used for mining calculation (only BTC price matters)
 */
function runMonteCarloSimulation() {
    try {
        console.log('=== STARTING MONTE CARLO SIMULATION ===');
        
        // Get input parameters
        const numSims = parseInt(document.getElementById('numSimulations').value);
        const projectionYears = parseInt(document.getElementById('projectionYears').value);
        
        const btcStartPrice = parseFloat(document.getElementById('btcStartPrice').value);
        const btcTargetPrice = parseFloat(document.getElementById('btcTargetPrice').value);
        const btcVolatility = parseFloat(document.getElementById('btcVolatility').value) / 100; // Convert % to decimal
        
        const hashStartPrice = parseFloat(document.getElementById('hashStartPrice').value) || 50;
        const hashTargetPrice = parseFloat(document.getElementById('hashTargetPrice').value) || 50;
        const hashVolatility = parseFloat(document.getElementById('hashVolatility').value) / 100 || 0.4;
        
        const investorCapital = parseFloat(document.getElementById('investorCapitalMC').value);
        
        console.log('Input validation:', {
            numSims, projectionYears, btcStartPrice, btcTargetPrice, 
            btcVolatility, investorCapital
        });
        
        // Validate inputs
        if (!numSims || !projectionYears || !btcStartPrice || !btcTargetPrice || !investorCapital) {
            alert('Please fill in all required parameters (BTC prices and investment amount)');
            return;
        }
        
        if (isNaN(numSims) || isNaN(projectionYears) || isNaN(btcStartPrice) || isNaN(btcTargetPrice) || isNaN(investorCapital)) {
            alert('Please enter valid numbers for all parameters');
            return;
        }
        
        if (numSims < 100 || numSims > 10000) {
            alert('Number of simulations must be between 100 and 10,000');
            return;
        }
        
        if (btcTargetPrice <= 0 || btcStartPrice <= 0) {
            alert('BTC prices must be positive');
            return;
        }
        
        if (investorCapital <= 0) {
            alert('Investment amount must be positive');
            return;
        }
        
        console.log('âœ“ Input validation passed');
        
        // Calculate drift parameters from target prices
        const btcDrift = Math.log(btcTargetPrice / btcStartPrice) / projectionYears + 0.5 * btcVolatility * btcVolatility;
        const hashDrift = Math.log(hashTargetPrice / hashStartPrice) / projectionYears + 0.5 * hashVolatility * hashVolatility;
        
        // Calculate implied annual returns for logging
        const btcAnnualReturn = ((Math.pow(btcTargetPrice / btcStartPrice, 1/projectionYears) - 1) * 100).toFixed(1);
        const hashAnnualReturn = ((Math.pow(hashTargetPrice / hashStartPrice, 1/projectionYears) - 1) * 100).toFixed(1);
        
        // Show loading state
        document.getElementById('mcInstructions').style.display = 'none';
        document.getElementById('mcResults').style.display = 'block';
        
        console.log('=== MONTE CARLO SIMULATION START ===');
        console.log('IMPORTANT: Mining calculation now matches Step 6 exactly!');
        console.log(`Simulations: ${numSims}, Years: ${projectionYears}`);
        console.log(`BTC: Start=$${btcStartPrice.toLocaleString()}, Target=$${btcTargetPrice.toLocaleString()}, Vol=${(btcVolatility*100).toFixed(1)}%`);
        console.log(`     â†’ Implied Annual Return: ${btcAnnualReturn}%, Drift: ${(btcDrift*100).toFixed(2)}%`);
        console.log(`Hash Price: NOT USED for mining (using Step 6 methodology instead)`);
        console.log(`     Mining uses: Network share â†’ BTC mined â†’ Convert to $ at Year 5`);
        
        // Generate correlated random numbers
        console.log('Generating correlated random numbers...');
        const correlation = 0.7;
        const correlatedRandoms = generateCorrelatedRandoms(numSims, projectionYears, correlation);
        console.log('âœ“ Random numbers generated');
        
        // Generate BTC price paths
        console.log('Generating BTC price paths...');
        const btcPaths = generateGBMPaths(
            btcStartPrice,
            btcDrift,
            btcVolatility,
            projectionYears,
            numSims,
            correlatedRandoms.z1
        );
        console.log('âœ“ BTC paths generated');
        
        // Generate Hash price paths (for reference only, not used in mining calc)
        console.log('Generating Hash price paths (reference only)...');
        const hashPaths = generateGBMPaths(
            hashStartPrice,
            hashDrift,
            hashVolatility,
            projectionYears,
            numSims,
            correlatedRandoms.z2
        );
        console.log('âœ“ Hash paths generated');
        
        // Run simulation for each path
        console.log('Running buy vs mine simulations...');
        const results = runSimulations(btcPaths, hashPaths, investorCapital, projectionYears);
        console.log('âœ“ Simulations complete');
        
        // Store results
        simulationResults = results;
        
        // Display results
        console.log('Displaying results...');
        displayResults(results, numSims);
        console.log('âœ“ Results displayed');
        
        console.log('=== SIMULATION COMPLETE ===');
        
    } catch (error) {
        console.error('âŒ SIMULATION ERROR:', error);
        console.error('Error stack:', error.stack);
        alert(`Simulation error: ${error.message}\n\nCheck browser console (F12) for details.`);
        
        // Show instructions again
        document.getElementById('mcInstructions').style.display = 'block';
        document.getElementById('mcResults').style.display = 'none';
    }
}

/**
 * Run buy vs mine simulations for all paths
 * CRITICAL: Mining calculation MUST match Step 6 (investor.js) exactly!
 */
function runSimulations(btcPaths, hashPaths, investorCapital, years) {
    const buyResults = [];
    const mineResults = [];
    const scenarios = [];
    
    // Get mining parameters - with defensive checks
    let totalCapex, annualOpex, totalHashratePH, startYear;
    
    try {
        // Try to get from projectData first
        totalCapex = (typeof projectData !== 'undefined' && projectData.totalCapex) ? projectData.totalCapex : parseFloat(localStorage.getItem('totalCapex')) || 0;
        annualOpex = (typeof projectData !== 'undefined' && projectData.totalOpex) ? projectData.totalOpex : parseFloat(localStorage.getItem('totalOpex')) || 0;
        totalHashratePH = (typeof projectData !== 'undefined' && projectData.totalHashratePH) ? projectData.totalHashratePH : parseFloat(localStorage.getItem('totalHashratePH')) || 0;
        startYear = (typeof projectData !== 'undefined' && projectData.startYear) ? projectData.startYear : parseInt(localStorage.getItem('startYear')) || 2026;
    } catch (e) {
        console.error('Error loading project data:', e);
        totalCapex = parseFloat(localStorage.getItem('totalCapex')) || 0;
        annualOpex = parseFloat(localStorage.getItem('totalOpex')) || 0;
        totalHashratePH = parseFloat(localStorage.getItem('totalHashratePH')) || 0;
        startYear = parseInt(localStorage.getItem('startYear')) || 2026;
    }
    
    // Check if we have valid mining data
    if (totalCapex <= 0 || totalHashratePH <= 0) {
        console.warn('âš ï¸ Mining parameters not configured. Complete Steps 2-4 first!');
        console.warn('Using Buy-only strategy for all scenarios.');
    }
    
    // Get investment structure from Step 5 - with defensive checks
    let gpPercent = 40, lpPercent = 60, totalLpCapital = 0, isOwnerOperator = false;
    let investorLpSharePercent = 0, investorProfitSharePercent = 100;
    
    try {
        const splitValue = localStorage.getItem('gpLpSplit') || '40-60';
        [gpPercent, lpPercent] = splitValue.split('-').map(v => parseInt(v) || 50);
        totalLpCapital = parseFloat(localStorage.getItem('totalLpCapital')) || 0;
        isOwnerOperator = totalLpCapital === 0 || splitValue === '100-0';
        
        // Calculate investor's share
        if (isOwnerOperator) {
            investorLpSharePercent = 0;
            investorProfitSharePercent = 100;
        } else {
            investorLpSharePercent = totalLpCapital > 0 ? (investorCapital / totalLpCapital) * 100 : 0;
            investorProfitSharePercent = (investorLpSharePercent / 100) * lpPercent;
        }
    } catch (e) {
        console.error('Error loading investment structure:', e);
        console.log('Using default: Owner-Operator mode (100% profit share)');
        isOwnerOperator = true;
        investorProfitSharePercent = 100;
    }
    
    // Get network parameters from Step 1 - with defensive checks
    let networkHashrateEH = 600, difficultyGrowth = 0.05, uptime = 0.96;
    
    try {
        networkHashrateEH = parseFloat(localStorage.getItem('networkHashrate')) || 600;
        difficultyGrowth = parseFloat(localStorage.getItem('difficultyGrowth')) || 0.05;
        uptime = parseFloat(localStorage.getItem('uptime')) || 0.96;
    } catch (e) {
        console.error('Error loading network parameters:', e);
        console.log('Using defaults: 600 EH/s, 5% difficulty growth, 96% uptime');
    }
    
    console.log('=== MINING PARAMETERS (MATCHING STEP 6) ===');
    console.log(`Total CAPEX: $${totalCapex.toLocaleString()}`);
    console.log(`Annual OPEX: $${annualOpex.toLocaleString()}`);
    console.log(`Total Hashrate: ${totalHashratePH.toFixed(2)} PH/s`);
    console.log(`Network Hashrate: ${networkHashrateEH} EH/s`);
    console.log(`Difficulty Growth: ${(difficultyGrowth * 100).toFixed(1)}%/year`);
    console.log(`Uptime: ${(uptime * 100).toFixed(1)}%`);
    console.log(`GP/LP Split: ${gpPercent}/${lpPercent}`);
    console.log(`Investor LP Share: ${investorLpSharePercent.toFixed(1)}%`);
    console.log(`Investor Profit Share: ${investorProfitSharePercent.toFixed(1)}%`);
    console.log('==========================================');
    
    // Bitcoin constants
    const BLOCKS_PER_YEAR = 52596;
    const CURRENT_BLOCK_REWARD = 3.125;
    const HALVING_YEAR = 2028;
    const EQUIPMENT_RESIDUAL_PERCENT = 0.20;
    
    for (let i = 0; i < btcPaths.length; i++) {
        const btcPath = btcPaths[i];
        const hashPath = hashPaths[i]; // Not used for mining calculation!
        
        // ==========================================
        // BUY STRATEGY: Just buy BTC and hold
        // ==========================================
        const btcBought = investorCapital / btcPath[0];
        const btcFinalValue = btcBought * btcPath[years];
        const buyROI = ((btcFinalValue - investorCapital) / investorCapital) * 100;
        
        // ==========================================
        // MINE STRATEGY: Use EXACT Step 6 calculation
        // ==========================================
        let mineROI = 0;
        
        if (totalHashratePH > 0 && totalCapex > 0) {
            // Calculate BTC mined over 5 years (SAME AS STEP 6)
            let totalBtcMined = 0;
            
            for (let year = 1; year <= years; year++) {
                const calendarYear = startYear + year - 1;
                
                // Get block reward (accounts for halving)
                const reward = calendarYear < HALVING_YEAR ? CURRENT_BLOCK_REWARD : CURRENT_BLOCK_REWARD / 2;
                
                // Calculate network share (accounts for difficulty growth)
                const networkHashratePH = networkHashrateEH * 1000;
                const difficultyFactor = Math.pow(1 + difficultyGrowth, year - 1);
                const effectiveHashrate = totalHashratePH / difficultyFactor;
                const networkShare = effectiveHashrate / networkHashratePH;
                
                // Calculate BTC mined this year
                const btcMined = networkShare * BLOCKS_PER_YEAR * reward * uptime;
                totalBtcMined += btcMined;
            }
            
            // Calculate investor's BTC share based on profit split
            const totalLpBtcEarned = totalBtcMined * (lpPercent / 100);
            const investorBtcEarned = isOwnerOperator ? 
                totalBtcMined : 
                (investorCapital / totalLpCapital) * totalLpBtcEarned;
            
            // Convert BTC to dollars at Year 5 price
            const btcValue = investorBtcEarned * btcPath[years];
            
            // Add equipment residual value
            const equipmentResidual = totalCapex * EQUIPMENT_RESIDUAL_PERCENT;
            const investorEquipmentShare = (investorCapital / totalCapex) * equipmentResidual;
            
            // Calculate total value
            const totalValue = btcValue + investorEquipmentShare;
            
            // Calculate total costs for investor
            const investorOpexShare = isOwnerOperator ? 
                (annualOpex * years) : 
                (investorCapital / totalCapex) * (annualOpex * years);
            
            // Net return = Total Value - Initial Investment - OPEX
            const netReturn = totalValue - investorCapital - investorOpexShare;
            
            // ROI
            mineROI = (netReturn / investorCapital) * 100;
            
            // Log first scenario for debugging
            if (i === 0) {
                console.log('=== FIRST SCENARIO MINING CALCULATION ===');
                console.log(`Total BTC Mined (5 years): ${totalBtcMined.toFixed(4)} BTC`);
                console.log(`Investor BTC Share: ${investorBtcEarned.toFixed(4)} BTC`);
                console.log(`BTC Price Year 5: $${btcPath[years].toLocaleString()}`);
                console.log(`BTC Value: $${btcValue.toLocaleString()}`);
                console.log(`Equipment Residual: $${investorEquipmentShare.toLocaleString()}`);
                console.log(`Total Value: $${totalValue.toLocaleString()}`);
                console.log(`Initial Investment: $${investorCapital.toLocaleString()}`);
                console.log(`OPEX (5 years): $${investorOpexShare.toLocaleString()}`);
                console.log(`Net Return: $${netReturn.toLocaleString()}`);
                console.log(`Mining ROI: ${mineROI.toFixed(1)}%`);
                console.log('=========================================');
            }
        } else {
            // No mining setup configured
            mineROI = 0;
        }
        
        buyResults.push(buyROI);
        mineResults.push(mineROI);
        
        // Store first 10 scenarios for display
        if (i < 10) {
            scenarios.push({
                run: i + 1,
                btcStart: btcPath[0],
                btcEnd: btcPath[years],
                hashStart: hashPath[0],
                hashEnd: hashPath[years],
                buyROI: buyROI,
                mineROI: mineROI,
                winner: buyROI > mineROI ? 'Buy' : 'Mine',
                margin: Math.abs(buyROI - mineROI)
            });
        }
    }
    
    return {
        buyResults,
        mineResults,
        scenarios,
        parameters: {
            investorCapital,
            years,
            totalCapex,
            annualOpex,
            totalHashratePH
        }
    };
}

/**
 * Calculate percentile from sorted array
 */
function percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate mean of array
 */
function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr) {
    const avg = mean(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}

/**
 * Display simulation results
 */
function displayResults(results, numSims) {
    const { buyResults, mineResults, scenarios } = results;
    
    // Calculate statistics
    const stats = {
        buy: {
            p10: percentile(buyResults, 10),
            p25: percentile(buyResults, 25),
            p50: percentile(buyResults, 50),
            p75: percentile(buyResults, 75),
            p90: percentile(buyResults, 90),
            mean: mean(buyResults),
            std: stdDev(buyResults),
            min: Math.min(...buyResults),
            max: Math.max(...buyResults)
        },
        mine: {
            p10: percentile(mineResults, 10),
            p25: percentile(mineResults, 25),
            p50: percentile(mineResults, 50),
            p75: percentile(mineResults, 75),
            p90: percentile(mineResults, 90),
            mean: mean(mineResults),
            std: stdDev(mineResults),
            min: Math.min(...mineResults),
            max: Math.max(...mineResults)
        }
    };
    
    // Calculate win rates
    let buyWins = 0;
    let mineWins = 0;
    let buyLosses = 0;
    let mineLosses = 0;
    
    for (let i = 0; i < buyResults.length; i++) {
        if (buyResults[i] > mineResults[i]) buyWins++;
        if (mineResults[i] > buyResults[i]) mineWins++;
        if (buyResults[i] < 0) buyLosses++;
        if (mineResults[i] < 0) mineLosses++;
    }
    
    const buyWinRate = (buyWins / numSims) * 100;
    const mineWinRate = (mineWins / numSims) * 100;
    const buyDownside = (buyLosses / numSims) * 100;
    const mineDownside = (mineLosses / numSims) * 100;
    
    // Update summary cards
    document.getElementById('simRunCount').textContent = numSims.toLocaleString();
    document.getElementById('buyMedianROI').textContent = stats.buy.p50.toFixed(1) + '%';
    document.getElementById('buyP10').textContent = stats.buy.p10.toFixed(1) + '%';
    document.getElementById('buyP90').textContent = stats.buy.p90.toFixed(1) + '%';
    document.getElementById('mineMedianROI').textContent = stats.mine.p50.toFixed(1) + '%';
    document.getElementById('mineP10').textContent = stats.mine.p10.toFixed(1) + '%';
    document.getElementById('mineP90').textContent = stats.mine.p90.toFixed(1) + '%';
    
    // Update winner banner
    const winner = stats.buy.p50 > stats.mine.p50 ? 'BUY BTC' : 'MINE BTC';
    const winnerColor = stats.buy.p50 > stats.mine.p50 ? '#f39c12' : '#2d6a4f';
    document.getElementById('mcWinnerText').textContent = winner;
    document.getElementById('mcWinnerText').style.color = winnerColor;
    document.getElementById('mcWinnerStats').textContent = 
        `Wins ${winner === 'BUY BTC' ? buyWinRate.toFixed(1) : mineWinRate.toFixed(1)}% of scenarios with median ROI of ${winner === 'BUY BTC' ? stats.buy.p50.toFixed(1) : stats.mine.p50.toFixed(1)}%`;
    
    // Update percentile table
    updatePercentileTable(stats);
    
    // Update risk metrics
    document.getElementById('buyWinRate').textContent = buyWinRate.toFixed(1) + '%';
    document.getElementById('mineWinRate').textContent = mineWinRate.toFixed(1) + '%';
    document.getElementById('buyDownside').textContent = buyDownside.toFixed(1) + '%';
    document.getElementById('mineDownside').textContent = mineDownside.toFixed(1) + '%';
    
    // Update statistical summary
    updateStatisticalSummary(stats);
    
    // Create distribution chart
    createDistributionChart(results);
    
    // Generate recommendation
    generateRecommendation(stats, buyWinRate, mineWinRate, buyDownside, mineDownside);
    
    // Show sample scenarios
    displaySampleScenarios(scenarios);
}

/**
 * Update percentile comparison table
 */
function updatePercentileTable(stats) {
    const percentiles = [
        { label: 'P10', buy: stats.buy.p10, mine: stats.mine.p10 },
        { label: 'P25', buy: stats.buy.p25, mine: stats.mine.p25 },
        { label: 'P50', buy: stats.buy.p50, mine: stats.mine.p50 },
        { label: 'P75', buy: stats.buy.p75, mine: stats.mine.p75 },
        { label: 'P90', buy: stats.buy.p90, mine: stats.mine.p90 }
    ];
    
    percentiles.forEach(p => {
        const pLabel = p.label.toLowerCase();
        document.getElementById(`detailBuy${p.label}`).textContent = p.buy.toFixed(1) + '%';
        document.getElementById(`detailMine${p.label}`).textContent = p.mine.toFixed(1) + '%';
        
        const diff = p.buy - p.mine;
        const diffEl = document.getElementById(`detailDiff${p.label}`);
        diffEl.textContent = (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
        diffEl.style.color = diff > 0 ? '#2d6a4f' : '#dc3545';
        
        const winner = p.buy > p.mine ? 'Buy BTC' : 'Mine BTC';
        const winnerEl = document.getElementById(`detailWinner${p.label}`);
        winnerEl.textContent = winner;
        winnerEl.style.color = p.buy > p.mine ? '#f39c12' : '#2d6a4f';
        winnerEl.style.fontWeight = '600';
    });
}

/**
 * Update statistical summary table
 */
function updateStatisticalSummary(stats) {
    // Mean
    document.getElementById('statBuyMean').textContent = stats.buy.mean.toFixed(1) + '%';
    document.getElementById('statMineMean').textContent = stats.mine.mean.toFixed(1) + '%';
    const meanDiff = stats.buy.mean - stats.mine.mean;
    document.getElementById('statDiffMean').textContent = (meanDiff > 0 ? '+' : '') + meanDiff.toFixed(1) + '%';
    document.getElementById('statInterpMean').textContent = meanDiff > 0 ? 'Buy has higher average return' : 'Mine has higher average return';
    
    // Std Dev
    document.getElementById('statBuyStd').textContent = stats.buy.std.toFixed(1) + '%';
    document.getElementById('statMineStd').textContent = stats.mine.std.toFixed(1) + '%';
    const stdDiff = stats.buy.std - stats.mine.std;
    document.getElementById('statDiffStd').textContent = (stdDiff > 0 ? '+' : '') + stdDiff.toFixed(1) + '%';
    document.getElementById('statInterpStd').textContent = stdDiff > 0 ? 'Buy is more volatile' : 'Mine is more volatile';
    
    // Min
    document.getElementById('statBuyMin').textContent = stats.buy.min.toFixed(1) + '%';
    document.getElementById('statMineMin').textContent = stats.mine.min.toFixed(1) + '%';
    const minDiff = stats.buy.min - stats.mine.min;
    document.getElementById('statDiffMin').textContent = (minDiff > 0 ? '+' : '') + minDiff.toFixed(1) + '%';
    document.getElementById('statInterpMin').textContent = minDiff > 0 ? 'Buy has better worst-case' : 'Mine has better worst-case';
    
    // Max
    document.getElementById('statBuyMax').textContent = stats.buy.max.toFixed(1) + '%';
    document.getElementById('statMineMax').textContent = stats.mine.max.toFixed(1) + '%';
    const maxDiff = stats.buy.max - stats.mine.max;
    document.getElementById('statDiffMax').textContent = (maxDiff > 0 ? '+' : '') + maxDiff.toFixed(1) + '%';
    document.getElementById('statInterpMax').textContent = maxDiff > 0 ? 'Buy has better best-case' : 'Mine has better best-case';
}

/**
 * Create distribution histogram charts (now creates TWO separate charts)
 */
function createDistributionChart(results) {
    // Create histogram bins
    const numBins = 30;
    const buyHist = createHistogram(results.buyResults, numBins);
    const mineHist = createHistogram(results.mineResults, numBins);
    
    // === BUY BTC CHART ===
    const ctxBuy = document.getElementById('buyDistributionChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.mcBuyChart) {
        window.mcBuyChart.destroy();
    }
    
    // Create Buy BTC chart
    window.mcBuyChart = new Chart(ctxBuy, {
        type: 'bar',
        data: {
            labels: buyHist.bins.map(b => `${b.toFixed(0)}%`),
            datasets: [
                {
                    label: 'Buy BTC Frequency',
                    data: buyHist.counts,
                    backgroundColor: 'rgba(243, 156, 18, 0.7)',
                    borderColor: 'rgba(243, 156, 18, 1)',
                    borderWidth: 2
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
                title: {
                    display: false
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const percentage = ((context.parsed.y / results.buyResults.length) * 100).toFixed(1);
                            return `${context.parsed.y} scenarios (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'ROI (%)',
                        font: { size: 11, weight: '600' },
                        color: '#6c757d'
                    },
                    ticks: {
                        font: { size: 9 },
                        color: '#6c757d',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequency',
                        font: { size: 11, weight: '600' },
                        color: '#6c757d'
                    },
                    ticks: {
                        font: { size: 10 },
                        color: '#6c757d'
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
    
    // === MINE BTC CHART ===
    const ctxMine = document.getElementById('mineDistributionChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.mcMineChart) {
        window.mcMineChart.destroy();
    }
    
    // Create Mine BTC chart
    window.mcMineChart = new Chart(ctxMine, {
        type: 'bar',
        data: {
            labels: mineHist.bins.map(b => `${b.toFixed(0)}%`),
            datasets: [
                {
                    label: 'Mine BTC Frequency',
                    data: mineHist.counts,
                    backgroundColor: 'rgba(45, 106, 79, 0.7)',
                    borderColor: 'rgba(45, 106, 79, 1)',
                    borderWidth: 2
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
                title: {
                    display: false
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const percentage = ((context.parsed.y / results.mineResults.length) * 100).toFixed(1);
                            return `${context.parsed.y} scenarios (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'ROI (%)',
                        font: { size: 11, weight: '600' },
                        color: '#6c757d'
                    },
                    ticks: {
                        font: { size: 9 },
                        color: '#6c757d',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequency',
                        font: { size: 11, weight: '600' },
                        color: '#6c757d'
                    },
                    ticks: {
                        font: { size: 10 },
                        color: '#6c757d'
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

/**
 * Create histogram from data
 */
function createHistogram(data, numBins) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / numBins;
    
    const bins = [];
    const counts = [];
    
    for (let i = 0; i < numBins; i++) {
        const binStart = min + i * binWidth;
        const binEnd = binStart + binWidth;
        bins.push((binStart + binEnd) / 2);
        
        const count = data.filter(d => d >= binStart && d < binEnd).length;
        counts.push(count);
    }
    
    return { bins, counts };
}

/**
 * Generate recommendation text
 */
function generateRecommendation(stats, buyWinRate, mineWinRate, buyDownside, mineDownside) {
    const box = document.getElementById('mcRecommendationBox');
    const text = document.getElementById('mcRecommendationText');
    
    const winner = stats.buy.p50 > stats.mine.p50 ? 'buy' : 'mine';
    const loser = winner === 'buy' ? 'mine' : 'buy';
    
    const medianDiff = Math.abs(stats.buy.p50 - stats.mine.p50);
    const winRate = winner === 'buy' ? buyWinRate : mineWinRate;
    
    let recommendation = '';
    let boxColor = '';
    
    if (medianDiff > 20 && winRate > 70) {
        // Strong recommendation
        recommendation = `<p><strong>ðŸŽ¯ STRONG RECOMMENDATION: ${winner.toUpperCase()} BTC</strong></p>
        <p>The Monte Carlo analysis strongly favors ${winner}ing BTC with a median ROI of ${winner === 'buy' ? stats.buy.p50.toFixed(1) : stats.mine.p50.toFixed(1)}% 
        compared to ${loser}ing's ${loser === 'buy' ? stats.buy.p50.toFixed(1) : stats.mine.p50.toFixed(1)}%. 
        ${winner === 'buy' ? 'Buying' : 'Mining'} wins in ${winRate.toFixed(1)}% of scenarios.</p>
        <p>Risk: ${winner === 'buy' ? buyDownside.toFixed(1) : mineDownside.toFixed(1)}% chance of negative returns.</p>`;
        boxColor = winner === 'buy' ? '#fff3cd' : '#d4edda';
    } else if (medianDiff > 10 || winRate > 60) {
        // Moderate recommendation
        recommendation = `<p><strong>âœ… MODERATE RECOMMENDATION: ${winner.toUpperCase()} BTC</strong></p>
        <p>${winner === 'buy' ? 'Buying' : 'Mining'} BTC shows better returns with median ROI of ${winner === 'buy' ? stats.buy.p50.toFixed(1) : stats.mine.p50.toFixed(1)}%, 
        winning ${winRate.toFixed(1)}% of scenarios. However, the margin is moderate (${medianDiff.toFixed(1)}% difference).</p>
        <p>Consider your risk tolerance and operational capabilities before deciding.</p>`;
        boxColor = '#e8f4fd';
    } else {
        // Too close to call
        recommendation = `<p><strong>âš–ï¸ MIXED RESULTS: CONSIDER BOTH OPTIONS</strong></p>
        <p>The strategies show similar performance with median ROIs of ${stats.buy.p50.toFixed(1)}% (Buy) vs ${stats.mine.p50.toFixed(1)}% (Mine). 
        The difference is within the margin of error (${medianDiff.toFixed(1)}%).</p>
        <p>Buy wins ${buyWinRate.toFixed(1)}% of scenarios, Mine wins ${mineWinRate.toFixed(1)}%.</p>
        <p>Decision should be based on operational factors, risk tolerance, and strategic goals rather than pure ROI.</p>`;
        boxColor = '#f8f9fa';
    }
    
    text.innerHTML = recommendation;
    box.style.background = boxColor;
    box.style.border = `2px solid ${winner === 'buy' ? '#ffc107' : winner === 'mine' ? '#2d6a4f' : '#dee2e6'}`;
}

/**
 * Display sample scenarios table
 */
function displaySampleScenarios(scenarios) {
    const tbody = document.getElementById('sampleScenariosBody');
    if (!tbody) return;
    
    tbody.innerHTML = scenarios.map(s => `
        <tr>
            <td>${s.run}</td>
            <td>Generated #${s.run}</td>
            <td class="number">$${s.btcStart.toFixed(0)}</td>
            <td class="number">$${s.btcEnd.toFixed(0)}</td>
            <td class="number" style="color: ${s.buyROI >= 0 ? '#2d6a4f' : '#dc3545'};">${s.buyROI.toFixed(1)}%</td>
            <td class="number" style="color: ${s.mineROI >= 0 ? '#2d6a4f' : '#dc3545'};">${s.mineROI.toFixed(1)}%</td>
            <td style="color: ${s.winner === 'Buy' ? '#f39c12' : '#2d6a4f'}; font-weight: 600;">${s.winner}</td>
            <td class="number">${s.margin.toFixed(1)}%</td>
        </tr>
    `).join('');
}

/**
 * Export Monte Carlo report (placeholder)
 */
function exportMCReport() {
    alert('PDF export feature coming soon! For now, use your browser\'s Print function (Ctrl+P / Cmd+P)');
}

/**
 * Export simulation data to CSV
 */
function exportMCData() {
    if (!simulationResults) {
        alert('No simulation data to export. Please run a simulation first.');
        return;
    }
    
    const { buyResults, mineResults } = simulationResults;
    
    // Create CSV content
    let csv = 'Simulation,Buy_ROI,Mine_ROI,Winner\n';
    for (let i = 0; i < buyResults.length; i++) {
        const winner = buyResults[i] > mineResults[i] ? 'Buy' : 'Mine';
        csv += `${i+1},${buyResults[i].toFixed(2)},${mineResults[i].toFixed(2)},${winner}\n`;
    }
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monte_carlo_results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

console.log('âœ… Monte Carlo simulation module loaded (FIXED - matches Step 6)');
