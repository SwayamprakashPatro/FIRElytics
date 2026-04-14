import { NextResponse } from "next/server";
import {
  calculateEmergencyFund,
  calculateSIP,
  calculateNetWorthProjection,
  calculateFIRECorpus,
  calculateCoastFI,
  FIRE_TYPES,
} from "../../../lib/calculations/fireCalculator";
import {
  analyzeInsurance,
  recommendTaxSaving,
} from "../../../lib/calculations/fireCalculator";

type InvestmentInput = { current_value?: number | null };
type GoalInput = { target_amount?: number | null };
type InsuranceInput = { life_coverage?: number | null };

type CalculateRequestBody = {
  profile: Record<string, unknown> & {
    age?: number;
    retirement_age?: number;
    monthly_expenses?: number;
    monthly_income?: number;
    current_savings?: number;
    monthly_investment_budget?: number;
    tax_regime?: "old" | "new" | string;
  };
  investments?: InvestmentInput[];
  goals?: GoalInput[];
  insurance?: InsuranceInput;
  whatIf?: {
    retirementAge?: number;
    swr?: number;
    expectedReturn?: number;
    inflationRate?: number;
    monthlySIP?: number;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CalculateRequestBody;
    const { profile, investments, goals, insurance, whatIf } = body;

    const age = Number(profile.age) || 30;
    const retirementAge =
      Number(whatIf?.retirementAge ?? profile.retirement_age) || age + 30;
    const yearsToRetire = Math.max(retirementAge - age, 1);

    const monthlyExpenses = Number(profile.monthly_expenses) || 0;
    const monthlyIncome = Number(profile.monthly_income) || 0;
    const taxRegime: "old" | "new" = profile.tax_regime === "old" ? "old" : "new";

    const swr = whatIf?.swr || 0.04;
    const expectedReturn = whatIf?.expectedReturn || 0.1;
    const inflationRate = whatIf?.inflationRate || 0.06;

    // 1. Emergency Fund
    const emergencyFundTarget = calculateEmergencyFund(monthlyExpenses);

    // 2. FIRE Corpus Scenarios
    const fireScenarios = {
      lean: calculateFIRECorpus(
        monthlyExpenses,
        yearsToRetire,
        swr,
        FIRE_TYPES.lean,
        inflationRate,
      ),
      regular: calculateFIRECorpus(
        monthlyExpenses,
        yearsToRetire,
        swr,
        FIRE_TYPES.regular,
        inflationRate,
      ),
      fat: calculateFIRECorpus(
        monthlyExpenses,
        yearsToRetire,
        swr,
        FIRE_TYPES.fat,
        inflationRate,
      ),
    };

    // 3. CoastFI Number
    const targetFIRECorpus = fireScenarios.regular.corpusNeeded;
    const coastFINumber = calculateCoastFI(
      targetFIRECorpus,
      yearsToRetire,
      expectedReturn,
      inflationRate,
    );

    // 4. Net Worth Projection (adjusted for What-If)
    const currentAssets =
      (investments || []).reduce(
        (sum: number, inv: InvestmentInput) => sum + (inv.current_value || 0),
        0,
      ) + (profile.current_savings || 0);

    // SIP Calculation for FIRE specifically
    const fireSIP = calculateSIP(
      targetFIRECorpus,
      yearsToRetire,
      expectedReturn,
      currentAssets,
    );

    const netWorthProjection = calculateNetWorthProjection(
      profile,
      investments || [],
      goals || [],
      whatIf?.monthlySIP || profile.monthly_investment_budget || fireSIP,
      { retirementAge, expectedReturn, inflationRate },
    );

    // 5. Readiness
    const currentNetWorth = netWorthProjection[0]?.netWorth || currentAssets;
    const readiness = (currentNetWorth / targetFIRECorpus) * 100;

    // 6. Insurance Gap
    const insuranceAnalysis = analyzeInsurance(
      insurance?.life_coverage || 0,
      monthlyIncome * 12,
      (goals || []).reduce(
        (sum: number, g: GoalInput) => sum + (g.target_amount || 0),
        0,
      ),
    );

    // 7. Tax Recommendations
    const taxRecommendations = recommendTaxSaving(
      monthlyIncome * 12,
      0, // Placeholder for existing investments if not tracked
      taxRegime,
    );

    return NextResponse.json({
      emergencyFundTarget,
      fireScenarios,
      coastFINumber,
      netWorthProjection,
      readiness: Math.min(Math.round(readiness), 100),
      currentNetWorth,
      targetFIRECorpus,
      fireSIP,
      insuranceAnalysis,
      taxRecommendations,
    });
  } catch (error: unknown) {
    console.error("Calculation API Error:", error);
    const message =
      error instanceof Error ? error.message : "Simulation engine failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
