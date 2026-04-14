import { 
  calculateEmergencyFund, 
  calculateSIP, 
  analyzeInsurance, 
  recommendTaxSaving, 
  getGlidePath,
  calculateNetWorthProjection
} from '../lib/calculations/fireCalculator';

console.log("--------------------------------------------------");
console.log("🔥 FIN-CALC ENGINE TEST SUITE 🔥");
console.log("--------------------------------------------------");

// Test 1: Emergency Fund (6 months of monthly expenses)
const monthlyExp = 50000;
const eFund = calculateEmergencyFund(monthlyExp);
console.log(`✅ Emergency Fund (6mo): ₹${eFund.toLocaleString()}`);

// Test 2: SIP Calculation (Target 1 Cr in 10 years at 12% returns)
const target = 10000000;
const yrs = 10;
const ret = 12; // 12%
const sip = calculateSIP(target, yrs, ret);
console.log(`✅ SIP Required for ₹1Cr (10yr @ 12%): ₹${sip.toLocaleString()}/mo`);

// Test 3: Insurance Analysis (20L Income, 50L existing cover)
const income = 2000000; // 20L
const existingCover = 5000000; // 50L
const insResult = analyzeInsurance(existingCover, income);
console.log(`✅ Insurance Status: ${insResult.status.toUpperCase()}`);
console.log(`   Target: ₹${insResult.required.toLocaleString()}, Gap: ₹${insResult.gap.toLocaleString()}`);

// Test 4: Tax Regime Comparison (15L Income)
const taxRes = recommendTaxSaving(1500000, 150000, 'old');
console.log(`✅ Tax Comparison for ₹15L Income:`);
console.log(`   Old Regime Tax: ₹${taxRes.regimeComparison.oldTax.toLocaleString()}`);
console.log(`   New Regime Tax: ₹${taxRes.regimeComparison.newTax.toLocaleString()}`);
console.log(`   Recommended: ${taxRes.regimeComparison.recommended.toUpperCase()} REGIME`);

// Test 5: Glide Path (Age 30 to 60)
const gp = getGlidePath(30, 60);
console.log(`✅ Glide Path (Equity % at age 55): ${gp.find(p => p.age === 55)?.equityPercentage}%`);

// Test 6: Net Worth Projection
const sampleProfile = { age: 30, retirement_age: 40 }; 
const sampleInvestments = [{ current_value: 500000 }];
const sampleGoals = [{ name: "Early FIRE", target_year: 2030, target_amount: 5000000 }];
const sampleSIPs = 20000;
const projection = calculateNetWorthProjection(sampleProfile, sampleInvestments, sampleGoals, sampleSIPs);
console.log(`✅ Projection (Age 40 Net Worth): ₹${projection[projection.length - 1].netWorth.toLocaleString()}`);

console.log("--------------------------------------------------");
console.log("TEST COMPLETED");
console.log("--------------------------------------------------");
