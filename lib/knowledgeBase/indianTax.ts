export const INDIAN_TAX_OLD_REGIME = {
  BASIC_EXEMPTION: 250000,
  SECTION_80C_LIMIT: 150000,
  SECTION_80D_LIMIT: 25000,
  SECTION_80D_PARENTS_SENIOR_LIMIT: 50000,
  SECTION_80CCD_1B_LIMIT: 50000,
  STANDARD_DEDUCTION: 50000,
};

export const INDIAN_TAX_NEW_REGIME = {
  BASIC_EXEMPTION: 300000,
  STANDARD_DEDUCTION: 50000,
};

export const TAX_SLABS_OLD = [
  { limit: 250000, rate: 0 },
  { limit: 500000, rate: 0.05 },
  { limit: 1000000, rate: 0.2 },
  { limit: Infinity, rate: 0.3 },
];

export const TAX_SLABS_NEW = [
  { limit: 300000, rate: 0 },
  { limit: 600000, rate: 0.05 },
  { limit: 900000, rate: 0.1 },
  { limit: 1200000, rate: 0.15 },
  { limit: 1500000, rate: 0.2 },
  { limit: Infinity, rate: 0.3 },
];

export const CESS_RATE = 0.04;

export interface TaxResult {
  tax: number;
  cess: number;
  total: number;
}

export function computeIncomeTax(
  income: number,
  regime: "old" | "new",
  deductions: number = 0,
): TaxResult {
  const slabs = regime === "old" ? TAX_SLABS_OLD : TAX_SLABS_NEW;
  const standardDeduction = 50000;

  const taxableIncome = Math.max(
    0,
    income - standardDeduction - (regime === "old" ? deductions : 0),
  );

  let tax = 0;
  let previousLimit = 0;

  for (const slab of slabs) {
    if (taxableIncome > previousLimit) {
      const amountInSlab = Math.min(taxableIncome, slab.limit) - previousLimit;
      tax += amountInSlab * slab.rate;
      previousLimit = slab.limit;
    } else {
      break;
    }
  }

  // Rebate u/s 87A (Simplified)
  if (regime === "new" && taxableIncome <= 700000) {
    tax = 0;
  } else if (regime === "old" && taxableIncome <= 500000) {
    tax = 0;
  }

  const cess = tax * CESS_RATE;
  return {
    tax: Math.round(tax),
    cess: Math.round(cess),
    total: Math.round(tax + cess),
  };
}

export function compareTaxRegimes(income: number, deductions: number = 150000) {
  const oldRegime = computeIncomeTax(income, "old", deductions);
  const newRegime = computeIncomeTax(income, "new", 0);

  const recommendation =
    oldRegime.total < newRegime.total ? "Old Regime" : "New Regime";

  return {
    oldTax: oldRegime.total,
    newTax: newRegime.total,
    recommendation,
    savings: Math.abs(oldRegime.total - newRegime.total),
  };
}
