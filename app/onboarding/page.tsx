"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  CheckCircle2,
  TrendingUp,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { saveFullProfile } from "../../lib/api";

type Milestone = {
  id: number;
  name: string;
  amount: number;
  targetYear: number;
};

type OnboardingState = {
  monthly: number;
  expenseMultiplier: number;
  currentAge: number;
  retirementAge: number;
  currentCorpus: number;
  monthlySIP: number;
  sipStepUp: number;
  equity: number;
  debt: number;
  cash: number;
  wr: number;
  cushionYears: number;
  milestones: Milestone[];
  propertyValue: number;
  homeDownpaymentPercent: number;
  homeLoanOutstanding: number;
  homeLoanEMI: number;
  homeLoanTenure: number;
  homeLoanInterestRate: number;
  homeOwnershipType: string;
  healthSumInsured: number;
  healthPremium: number;
  healthFamilyMembers: number;
  healthIncludesParents: boolean;
  healthCityTier: string;
  monthlyIncome: number;
  lastChangedField:
    | "emi"
    | "tenure"
    | "outstanding"
    | "rate"
    | "principal"
    | "percent"
    | "";
};

type LocalUser = { id: string };

type NumericInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  value?: number;
  onChange: (value: number) => void;
};

const STEPS_TOTAL = 11;

const formatCurrency = (n: number) => {
  if (n >= 10000000)
    return (
      "₹" +
      (n / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 2 }) +
      " Cr"
    );
  if (n >= 100000)
    return (
      "₹" +
      (n / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 }) +
      "L"
    );
  return "₹" + Math.round(n).toLocaleString("en-IN");
};

const formatIndian = (n: number) => {
  return n.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  });
};

const formatIndianNumber = (n: number) => {
  return n.toLocaleString("en-IN");
};

const parseIndianNumber = (s: string) => {
  return parseInt(s.replace(/,/g, "")) || 0;
};

function NumericInput({
  value,
  onChange,
  className,
  ...props
}: NumericInputProps) {
  const displayValue = formatIndianNumber(value || 0);
  return (
    <input
      type="text"
      value={displayValue === "0" ? "" : displayValue}
      onChange={(e) => {
        const rawValue = parseIndianNumber(e.target.value);
        onChange(rawValue);
      }}
      className={`${className} font-bold text-black placeholder-neutral-500`}
      {...props}
    />
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<LocalUser | null>(null);

  // State matching the Antigravity Prompt
  const [state, setState] = useState<OnboardingState>({
    monthly: 80000,
    expenseMultiplier: 1.0,
    currentAge: 30,
    retirementAge: 60,
    currentCorpus: 1000000,
    monthlySIP: 20000,
    sipStepUp: 0,
    equity: 70,
    debt: 20,
    cash: 10,
    wr: 4.0,
    cushionYears: 1,
    milestones: [],
    propertyValue: 10000000,
    homeDownpaymentPercent: 20,
    homeLoanOutstanding: 8000000,
    homeLoanEMI: 65000,
    homeLoanTenure: 20,
    homeLoanInterestRate: 8.5,
    homeOwnershipType: "self_occupied",
    healthSumInsured: 500000,
    healthPremium: 10000,
    healthFamilyMembers: 1,
    healthIncludesParents: false,
    healthCityTier: "tier1",
    monthlyIncome: 150000,
    lastChangedField: "" as
      | "emi"
      | "tenure"
      | "outstanding"
      | "rate"
      | "principal"
      | "percent"
      | "",
  });

  useEffect(() => {
    const checkUser = async () => {
      if (!isSupabaseConfigured) {
        setUser({ id: "local-user" });
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) setUser(data.session.user);
        else {
          const { data: signData } = await supabase.auth.signInAnonymously();
          if (signData?.user) setUser(signData.user);
        }
      } catch (e) {
        console.error(
          "Supabase auth init failed; continuing in local-only mode.",
          e,
        );
        setUser({ id: "local-user" });
      }
    };
    checkUser();
  }, []);

  // Auto-calculate Loan Parameters
  const PV = state.propertyValue;
  const DPP = state.homeDownpaymentPercent;
  const P = state.homeLoanOutstanding;
  const EMI = state.homeLoanEMI;
  const N = state.homeLoanTenure;
  const R = state.homeLoanInterestRate;
  const lastChangedField = state.lastChangedField;

  useEffect(() => {
    // 1. Calculate Loan Amount from Principal/Percentage
    const downpaymentVal = (PV * DPP) / 100;

    if (lastChangedField === "principal" || lastChangedField === "percent") {
      const newOutstanding = Math.max(0, PV - downpaymentVal);
      if (newOutstanding !== P) {
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            homeLoanOutstanding: newOutstanding,
            lastChangedField: "outstanding", // Trigger EMI recalc
          }));
        }, 0);
        return;
      }
    }

    const monthlyRate = R / 100 / 12;
    if (P <= 0 || R <= 0) return;

    if (
      lastChangedField === "tenure" ||
      (lastChangedField === "outstanding" && N > 0)
    ) {
      // Calculate EMI: [P * r * (1+r)^n] / [(1+r)^n - 1]
      const months = N * 12;
      const emi =
        (P * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
      if (isFinite(emi) && Math.round(emi) !== EMI) {
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            homeLoanEMI: Math.round(emi),
            lastChangedField: "",
          }));
        }, 0);
      }
    } else if (lastChangedField === "emi") {
      // Calculate Tenure: n = log[EMI / (EMI - P*r)] / log(1+r)
      if (EMI > P * monthlyRate) {
        const months =
          Math.log(EMI / (EMI - P * monthlyRate)) / Math.log(1 + monthlyRate);
        const years = Math.round((months / 12) * 10) / 10;
        if (isFinite(years) && years !== N) {
          setTimeout(() => {
            setState((prev) => ({
              ...prev,
              homeLoanTenure: years,
              lastChangedField: "",
            }));
          }, 0);
        }
      }
    }
  }, [PV, DPP, P, EMI, N, R, lastChangedField]);

  const duration = 105 - state.retirementAge;
  const fireTarget =
    (state.monthly * state.expenseMultiplier * 12) / (state.wr / 100);
  const totalTarget =
    fireTarget +
    state.monthly * state.expenseMultiplier * 12 * state.cushionYears;

  const buildFullProfile = (s: OnboardingState) => {
    return {
      personal: {
        age: s.currentAge,
        retirement_age: s.retirementAge,
        monthly_income: s.monthlyIncome,
        monthly_expenses: s.monthly * s.expenseMultiplier,
        current_savings: s.currentCorpus,
        monthly_investment_budget: s.monthlySIP,
        risk_tolerance: (s.equity > 60 ? "aggressive" : "moderate") as
          | "conservative"
          | "moderate"
          | "aggressive",
        tax_regime: "new" as "old" | "new",
        property_value: s.propertyValue,
        home_loan_outstanding: s.homeLoanOutstanding,
        home_loan_emi: s.homeLoanEMI,
        home_loan_tenure_remaining: s.homeLoanTenure,
        home_loan_interest_rate: s.homeLoanInterestRate,
        home_ownership_type: s.homeOwnershipType,
      },
      investments: [
        {
          asset_class: "Equity",
          current_value: (s.currentCorpus * s.equity) / 100,
          expected_return: 12,
        },
        {
          asset_class: "Debt",
          current_value: (s.currentCorpus * (s.debt + s.cash)) / 100,
          expected_return: 7,
        },
      ],
      goals: [
        ...s.milestones
          .filter((m) => m.amount > 0)
          .map((m) => ({
            name: m.name,
            target_year: m.targetYear,
            target_amount: m.amount,
          })),
        {
          name: "FIRE",
          target_year:
            new Date().getFullYear() + (s.retirementAge - s.currentAge),
          target_amount:
            (s.monthly * s.expenseMultiplier * 12) / (s.wr / 100) +
            s.monthly * s.expenseMultiplier * 12 * s.cushionYears,
        },
      ],
      insurance: {
        life_coverage: s.monthly * 12 * 10,
        health_coverage: s.healthSumInsured,
      },
      health_insurance: {
        sum_insured: s.healthSumInsured,
        annual_premium: s.healthPremium,
        family_members_covered: s.healthFamilyMembers,
        includes_parents: s.healthIncludesParents,
        city_tier: s.healthCityTier,
      },
      fire_preferences: {
        swr: s.wr,
        fire_type: "regular",
        strategy: "fixed",
        glide_path: true,
      },
    };
  };

  const persistAndGoToDashboard = async () => {
    setLoading(true);
    try {
      const fullProfile = buildFullProfile(state);

      if (isSupabaseConfigured && user?.id) {
        const { error } = await saveFullProfile(user.id, fullProfile);
        if (error) console.error("Profile persist failed:", error);
      }

      try {
        localStorage.setItem(
          "et_explorer_profile",
          JSON.stringify({ ...fullProfile, id: user?.id || "local-user" }),
        );

        const written = localStorage.getItem("et_explorer_profile");
        if (!written) {
          alert(
            "Could not save your profile to localStorage. Disable private mode / storage blocking and try again.",
          );
          return;
        }
      } catch (e) {
        console.error("Local storage save failed:", e);
        alert(
          "Could not save your profile to localStorage. Disable private mode / storage blocking and try again.",
        );
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Discovery save failed, but moving forward:", err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    // special logic for downpayment goals
    if (
      currentStep === 2 &&
      state.homeDownpaymentPercent === 0 &&
      state.propertyValue > 0
    ) {
      const hasGoal = state.milestones.some(
        (m) =>
          m.name.toLowerCase().includes("house") ||
          m.name.toLowerCase().includes("home"),
      );
      if (!hasGoal) {
        setState((prev) => ({
          ...prev,
          milestones: [
            ...prev.milestones,
            {
              id: Date.now(),
              name: "House Downpayment",
              amount: state.propertyValue * 0.2,
              targetYear: new Date().getFullYear() + 5,
            },
          ],
        }));
      }
    }

    if (currentStep < STEPS_TOTAL) {
      setCurrentStep((s: number) => s + 1);
    } else {
      await persistAndGoToDashboard();
    }
  };
  return (
    <div className="min-h-screen bg-[#2f2f2f] flex flex-col selection:bg-[#e5e5e5] selection:text-black relative font-sans">
      {/* Top Header */}
      <header className="absolute top-8 left-8 right-8 z-50 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group z-10">
          <div className="w-10 h-10 bg-[#e5e5e5] rounded-lg flex items-center justify-center text-black font-serif italic text-xl font-black shadow-lg group-hover:scale-105 transition-transform">
            <img
              src="/favicon.ico"
              alt="FIRElytics"
              className="w-6 h-6 object-contain"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white font-serif italic hidden sm:block">
            FIRElytics
          </h1>
        </Link>

        {/* Progress Indicator Centered horizontally */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-1/3 max-w-md h-1.5 bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${(currentStep / STEPS_TOTAL) * 100}%` }}
          />
        </div>

        <button
          onClick={persistAndGoToDashboard}
          className="px-8 py-3 bg-[#e5e5e5] text-black rounded-full font-bold hover:bg-white shadow-lg transition-all tracking-wide z-10"
        >
          Skip
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-350 w-full mx-auto px-6 md:px-10 lg:px-20 py-24 justify-between h-screen">
        {/* Left: Interactive Form */}
        <div className="flex-1 flex flex-col justify-center max-w-2xl lg:max-w-3xl text-white pr-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
                {getStepTitle(currentStep)}
              </h2>

              <p className="text-sm text-neutral-400 leading-relaxed">
                {getExplanation(currentStep)}
              </p>

              {/* The Interactive Form Area */}
              <div className="pt-6">
                {renderStepInput(currentStep, state, setState)}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Navigation */}
          <div className="mt-16 pt-8 border-t border-neutral-700 w-full flex items-center gap-6">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-8 py-4 bg-transparent border-2 border-[#e5e5e5] text-white rounded-full font-bold hover:bg-[#e5e5e5] hover:text-black transition-colors shadow-lg flex items-center gap-2"
              >
                <ChevronLeft size={20} /> Back
              </button>
            )}
            <button
              onClick={nextStep}
              disabled={
                loading ||
                (currentStep === 7 &&
                  state.monthlyIncome <
                    state.monthly +
                      state.homeLoanEMI +
                      Math.round(state.healthPremium / 12) +
                      state.monthlySIP)
              }
              className="px-10 py-4 bg-[#e5e5e5] text-black rounded-full font-bold hover:bg-white transition-colors disabled:opacity-50 text-lg tracking-wide shadow-lg"
            >
              {currentStep === STEPS_TOTAL
                ? loading
                  ? "Saving Orbit..."
                  : "Finish"
                : "Next"}
            </button>
          </div>
        </div>

        {/* Right: Snapshot Report */}
        <div className="hidden md:flex flex-col w-100 bg-[#e5e5e5] rounded-3xl p-6 shadow-2xl shrink-0 h-full overflow-y-auto">
          <h2 className="text-2xl font-semibold mb-6 text-black tracking-tight px-2">
            Report
          </h2>

          <div className="space-y-4">
            {/* Large Target Corpus Card */}
            <div className="bg-[#333333] rounded-xl p-6 text-white shadow-md flex justify-between items-center">
              <p className="text-sm text-neutral-300 font-medium">
                Target Corpus
              </p>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(totalTarget)}
              </p>
            </div>

            {/* Two-Column Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#333333] rounded-xl p-6 text-white shadow-md flex justify-between flex-col md:flex-row items-start md:items-center">
                <p className="text-sm text-neutral-300 font-medium whitespace-nowrap">
                  Retire at
                </p>
                <p className="text-2xl font-bold ml-0 md:ml-4">
                  {state.retirementAge}
                </p>
              </div>
              <div className="bg-[#333333] rounded-xl p-6 text-white shadow-md flex justify-between flex-col md:flex-row items-start md:items-center">
                <p className="text-sm text-neutral-300 font-medium whitespace-nowrap">
                  Safe Rate
                </p>
                <p className="text-2xl font-bold ml-0 md:ml-4">{state.wr}%</p>
              </div>
            </div>

            {/* Readiness Progress Card */}
            <div className="bg-[#333333] rounded-xl p-6 text-white shadow-md space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-neutral-300 font-medium">
                  Readiness
                </p>
                <span className="text-lg font-bold">8%</span>
              </div>
              <div className="h-2 w-full bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all"
                  style={{ width: "8%" }}
                />
              </div>
            </div>

            {/* Dynamic Note Card */}
            <div className="bg-[#333333] rounded-xl p-6 text-white shadow-md flex-1 min-h-37.5">
              <p className="text-sm text-neutral-300 font-medium mb-3">Note</p>
              <p className="text-sm leading-relaxed text-neutral-100">
                By investing {formatCurrency(state.monthlySIP)} monthly, you are
                building a runway that will last {duration} years in retirement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStepTitle(step: number) {
  switch (step) {
    case 1:
      return "Monthly Spending";
    case 2:
      return "Home Loan";
    case 3:
      return "Your Timeline";
    case 4:
      return "Current Wealth";
    case 5:
      return "Asset Allocation";
    case 6:
      return "Health Insurance";
    case 7:
      return "Income & SIP";
    case 8:
      return "Life Milestones";
    case 9:
      return "Withdrawal Rate";
    case 10:
      return "Safety Buffer";
    case 11:
      return "You're Ready";
    default:
      return "";
  }
}

function getExplanation(step: number) {
  switch (step) {
    case 1:
      return "First things first — how much do you actually spend each month? Include everything from rent to bills. If you're not sure, look at your monthly savings vs your salary.";
    case 2:
      return "Do you have a home mortgage? Owning a home is both an asset and a liability. We'll factor in your EMI and outstanding balance to see when you'll be debt-free.";
    case 3:
      return "Retirement duration is the single biggest factor in your FIRE number. A longer runway means we need to be more conservative with your withdrawal rates.";
    case 4:
      return "You're probably not starting from zero. Mutual funds, EPF, savings—all of it counts. We calculate how this amount grows by the time you stop working.";
    case 5:
      return "Where you put your money matters. As you grow older, you should gradually shift from risky stocks to stable bonds. This is called a 'Glide Path'.";
    case 6:
      return "Medical expenses can be the biggest threat to retirement. Tell us about your current health cover so we can ensure you're fully protected against inflation.";
    case 7:
      return "Now — how much can you set aside every month? This is your SIP amount. We'll also factor in if you expect your income to grow over time.";
    case 8:
      return "Life isn't just about retiring. You might want to buy a house or fund a child's education. These 'lumpy' expenses can derail a plan if not factored in early.";
    case 9:
      return "Inflation is the sneaky enemy. India averages around 6% historically. We've suggested a withdrawal rate based on your planned retirement duration.";
    case 10:
      return "A safety buffer prevents selling stocks during a market crash. We suggest keeping 1-2 years of expenses in cash or FDs separate from investments.";
    case 11:
      return "We've finished our discovery. We can now project exactly when you reach orbit and what your financial roadmap looks like.";
    default:
      return "";
  }
}

function renderStepInput(
  step: number,
  state: OnboardingState,
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>,
) {
  switch (step) {
    case 1:
      return (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-white tracking-widest">
              Monthly Expenses
            </span>
            <div className="flex items-center gap-4 w-1/2 justify-end relative group">
              <div className="absolute -top-10 right-0 bg-white text-black px-3 py-1 rounded-lg text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {formatIndianNumber(state.monthly)}
              </div>
              <input
                type="range"
                min={10000}
                max={500000}
                step={5000}
                value={state.monthly}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setState({ ...state, monthly: parseInt(e.target.value) })
                }
                className="flex-1 accent-white h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer shadow-inner"
              />
              <span className="text-3xl font-semibold text-white tracking-tighter min-w-28 text-right">
                {formatCurrency(state.monthly)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NumericInput
              value={state.monthly}
              onChange={(val: number) => setState({ ...state, monthly: val })}
              className="w-1/3 p-5 text-2xl font-semibold bg-white rounded-2xl text-black outline-none focus:ring-4 focus:ring-neutral-500 shadow-sm transition-all"
              placeholder="Enter expenses..."
            />
            <div className="flex gap-4 flex-1">
              {[0.85, 1.0, 1.15].map((v) => (
                <button
                  key={v}
                  onClick={() => setState({ ...state, expenseMultiplier: v })}
                  className={`flex-1 p-5 rounded-2xl transition-all text-xs font-semibold tracking-widest ${state.expenseMultiplier === v ? "bg-white text-black shadow-xl ring-2 ring-neutral-300 scale-[1.02]" : "bg-[#222222] border border-neutral-700 text-white hover:bg-neutral-800 shadow-sm"}`}
                >
                  {v === 0.85
                    ? "Less (Lean)"
                    : v === 1.0
                      ? "Default"
                      : "More (Fat)"}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="space-y-8">
          <div className="space-y-8">
            {/* Primary Inputs: Price & DP Percentage */}
            <div className="bg-[#e5e5e5] p-6 rounded-[2.5rem] shadow-xl space-y-6 text-black">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold text-black tracking-widest flex justify-between">
                    House Price
                    <span className="text-black">
                      {formatCurrency(state.propertyValue)}
                    </span>
                  </p>
                  <div className="flex gap-2 items-center">
                    <NumericInput
                      value={state.propertyValue}
                      onChange={(val: number) =>
                        setState({
                          ...state,
                          propertyValue: val,
                          lastChangedField: "principal",
                        })
                      }
                      className="flex-1 min-w-0 p-4 font-semibold text-xl bg-white rounded-2xl text-black shadow-sm outline-none focus:ring-4 focus:ring-neutral-500 transition-all"
                    />
                    <button
                      onClick={() =>
                        setState({
                          ...state,
                          propertyValue: state.propertyValue + 500000,
                          lastChangedField: "principal",
                        })
                      }
                      className="px-4 py-3 shrink-0 bg-[#222222] text-white hover:bg-neutral-800 rounded-2xl text-[10px] font-semibold uppercase tracking-widest shadow-lg"
                    >
                      +5L
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold text-black tracking-widest flex justify-between">
                    Downpayment %
                    <span
                      className={
                        state.homeDownpaymentPercent < 20
                          ? "text-amber-600 font-bold"
                          : "text-black font-bold"
                      }
                    >
                      {state.homeDownpaymentPercent === 0
                        ? "Plan to Buy?"
                        : state.homeDownpaymentPercent + "%"}
                    </span>
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={
                        state.homeDownpaymentPercent === 0
                          ? ""
                          : state.homeDownpaymentPercent
                      }
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setState({
                          ...state,
                          homeDownpaymentPercent:
                            parseInt(e.target.value.replace(/\D/g, "")) || 0,
                          lastChangedField: "percent",
                        })
                      }
                      className="flex-1 min-w-0 p-4 font-semibold text-xl bg-white rounded-2xl text-black shadow-sm outline-none focus:ring-4 focus:ring-neutral-500 transition-all"
                    />
                    <button
                      onClick={() =>
                        setState({
                          ...state,
                          homeDownpaymentPercent: 20,
                          lastChangedField: "percent",
                        })
                      }
                      className="px-4 py-3 shrink-0 bg-[#222222] text-white hover:bg-neutral-800 rounded-2xl text-[10px] font-semibold uppercase tracking-widest shadow-sm"
                    >
                      Min 20%
                    </button>
                  </div>
                  <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">
                    Note: Minimum 20% is recommended to avoid high interest.
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Inputs: Tenure, Interest Rate & Ownership */}
            <div className="grid grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-white tracking-widest">
                  Interest Rate (%)
                </p>
                <input
                  type="text"
                  value={state.homeLoanInterestRate || ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setState({
                      ...state,
                      homeLoanInterestRate: parseFloat(e.target.value) || 0,
                      lastChangedField: "rate",
                    })
                  }
                  className="w-full p-4 font-semibold bg-white rounded-2xl text-black shadow-sm outline-none focus:ring-4 focus:ring-neutral-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-white tracking-widest flex justify-between">
                  Tenure (Yrs)
                  {state.lastChangedField === "emi" && (
                    <span className="text-[8px] text-white animate-pulse font-semibold">
                      AI UPDATED
                    </span>
                  )}
                </p>
                <input
                  type="text"
                  value={state.homeLoanTenure || ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setState({
                      ...state,
                      homeLoanTenure: parseFloat(e.target.value) || 0,
                      lastChangedField: "tenure",
                    })
                  }
                  className="w-full p-4 font-semibold bg-white rounded-2xl text-black shadow-sm outline-none focus:ring-4 focus:ring-neutral-500 transition-all"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <p className="text-[10px] uppercase font-bold text-white tracking-widest">
                  Property Use
                </p>
                <div className="flex gap-2 h-14">
                  {["self_occupied", "rented"].map((v) => (
                    <button
                      key={v}
                      onClick={() =>
                        setState({ ...state, homeOwnershipType: v })
                      }
                      className={`flex-1 rounded-2xl text-[10px] font-semibold tracking-widest transition-all ${state.homeOwnershipType === v ? "bg-white text-black shadow-lg ring-2 ring-emerald-500" : "bg-[#333333] text-neutral-400 hover:text-white hover:bg-[#444444] shadow-sm"}`}
                    >
                      {v.replace("_", " ").toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Result & Target EMI */}
            <div className="grid grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-white tracking-widest flex justify-between">
                  Target Monthly EMI
                  {(state.lastChangedField === "tenure" ||
                    state.lastChangedField === "outstanding" ||
                    state.lastChangedField === "principal" ||
                    state.lastChangedField === "percent") && (
                    <span className="text-[8px] text-white animate-pulse font-semibold">
                      AI UPDATED
                    </span>
                  )}
                </p>
                <NumericInput
                  value={state.homeLoanEMI}
                  onChange={(val: number) =>
                    setState({
                      ...state,
                      homeLoanEMI: val,
                      lastChangedField: "emi",
                    })
                  }
                  className="w-full p-4 text-2xl font-semibold bg-white rounded-2xl outline-none focus:ring-4 focus:ring-neutral-500 transition-all text-black shadow-sm"
                />
              </div>

              <div className="flex items-center gap-4 p-4 h-16 bg-emerald-900/60 rounded-2xl border border-emerald-700 shadow-xl">
                <div className="w-10 h-10 shrink-0 bg-white rounded-xl flex items-center justify-center text-black shadow-sm">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase text-emerald-200 tracking-widest mb-0.5">
                    Calculated Loan
                  </p>
                  <p className="text-xl font-bold text-white tracking-tighter">
                    {formatIndian(state.homeLoanOutstanding)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    case 3:
      return (
        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-10">
            <div className="flex items-center gap-4">
              <p className="text-[10px] uppercase font-bold text-white tracking-widest pl-1 whitespace-nowrap">
                Current Age
              </p>
              <input
                type="number"
                value={state.currentAge}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setState({
                    ...state,
                    currentAge: parseInt(e.target.value) || 0,
                  })
                }
                className="w-1/2 p-4 text-2xl font-semibold bg-white rounded-2xl text-black shadow-sm outline-none focus:ring-4 focus:ring-neutral-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-4">
              <p className="text-[10px] uppercase font-bold text-white tracking-widest pl-1 whitespace-nowrap">
                Retirement Age
              </p>
              <input
                type="number"
                value={state.retirementAge}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setState({
                    ...state,
                    retirementAge: parseInt(e.target.value) || 0,
                  })
                }
                className="w-1/2 p-4 text-2xl font-semibold bg-white rounded-2xl text-black shadow-sm outline-none focus:ring-4 focus:ring-neutral-500 transition-all"
              />
            </div>
          </div>
        </div>
      );
    case 4:
      return (
        <div className="space-y-10">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-white tracking-widest">
                Current Net Worth (Investments)
              </span>
              <div className="flex items-center gap-4 w-1/2 justify-end">
                <input
                  type="range"
                  min={0}
                  max={50000000}
                  step={100000}
                  value={state.currentCorpus}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setState({
                      ...state,
                      currentCorpus: parseInt(e.target.value),
                    })
                  }
                  className="flex-1 accent-white h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer shadow-inner"
                />
                <span className="text-3xl font-semibold text-white tracking-tighter min-w-28 text-right">
                  {formatCurrency(state.currentCorpus)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NumericInput
                value={state.currentCorpus}
                onChange={(val: number) =>
                  setState({ ...state, currentCorpus: val })
                }
                className="w-1/3 p-5 text-2xl font-semibold bg-white rounded-2xl text-black outline-none focus:ring-4 focus:ring-neutral-500 shadow-sm transition-all"
              />
              <div className="flex gap-4 flex-1">
                {[100000, 500000, 1000000].map((val) => (
                  <button
                    key={val}
                    onClick={() =>
                      setState({
                        ...state,
                        currentCorpus: state.currentCorpus + val,
                      })
                    }
                    className="flex-1 p-5 border border-neutral-700 bg-[#222222] text-white hover:bg-neutral-800 rounded-2xl shadow-sm text-sm font-semibold tracking-widest transition-all"
                  >
                    +{val / 100000}L
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    case 5:
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                Risk Protection Strategy
              </span>
              <p className="text-xl font-bold text-white mt-0.5">
                Automated Glide-Path
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                Starting Allocation
              </span>
              <p className="text-xl font-bold text-white mt-0.5">
                {state.equity ?? 80}% Equity
              </p>
            </div>
          </div>

          {/* Gradient glide path bar */}
          <div
            className="relative w-full h-16 rounded-2xl overflow-hidden shadow-xl"
            style={{
              background: "linear-gradient(to right, #2563eb, #059669)",
            }}
          >
            {/* NOW marker */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2">
              <p className="text-[9px] font-bold uppercase text-blue-200 tracking-widest">
                Now
              </p>
              <p className="text-sm font-bold text-white">80% Risk</p>
            </div>
            {/* Arrow indicator */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex gap-1 opacity-40">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-white" />
                ))}
              </div>
            </div>
            {/* RETIRE marker */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-right">
              <p className="text-[9px] font-bold uppercase text-emerald-200 tracking-widest">
                Retire
              </p>
              <p className="text-sm font-bold text-white">30% Risk</p>
            </div>
          </div>

          <p className="text-xs text-neutral-500 leading-relaxed">
            Your allocation automatically shifts from high-growth equity to
            stable bonds as you approach retirement — no manual action needed.
          </p>
        </div>
      );
    case 6: {
      const calculatedPremium = Math.round(
        state.healthSumInsured *
          0.008 *
          (1 + (state.healthFamilyMembers - 1) * 0.4),
      );
      return (
        <div className="space-y-10">
          <div className="bg-[#222222] border border-neutral-700 p-8 rounded-[3rem] shadow-xl space-y-10 text-white transition-all">
            <div className="space-y-4">
              <p className="text-[10px] uppercase font-bold text-neutral-300 tracking-widest flex justify-between items-center pl-1">
                Target Health Cover (Sum Insured)
                <span className="text-white text-xl font-semibold">
                  {formatCurrency(state.healthSumInsured)}
                </span>
              </p>
              <div className="flex gap-4 items-center">
                <NumericInput
                  value={state.healthSumInsured}
                  onChange={(val: number) =>
                    setState({
                      ...state,
                      healthSumInsured: val,
                      healthPremium: Math.round(
                        val *
                          0.008 *
                          (1 + (state.healthFamilyMembers - 1) * 0.4),
                      ),
                    })
                  }
                  className="flex-1 min-w-0 p-6 font-semibold text-2xl bg-[#111111] border border-neutral-700 rounded-2xl text-white shadow-sm outline-none focus:ring-2 focus:ring-neutral-500 transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newVal = state.healthSumInsured + 100000;
                      setState({
                        ...state,
                        healthSumInsured: newVal,
                        healthPremium: Math.round(
                          newVal *
                            0.008 *
                            (1 + (state.healthFamilyMembers - 1) * 0.4),
                        ),
                      });
                    }}
                    className="px-6 py-6 h-full bg-[#333333] text-white hover:bg-[#444444] rounded-2xl text-sm font-semibold tracking-widest shadow-lg transition-transform"
                  >
                    +1L
                  </button>
                  <button
                    onClick={() => {
                      const newVal = state.healthSumInsured + 500000;
                      setState({
                        ...state,
                        healthSumInsured: newVal,
                        healthPremium: Math.round(
                          newVal *
                            0.008 *
                            (1 + (state.healthFamilyMembers - 1) * 0.4),
                        ),
                      });
                    }}
                    className="px-6 py-6 h-full bg-[#333333] text-white hover:bg-[#444444] rounded-2xl text-sm font-semibold tracking-widest shadow-lg transition-transform"
                  >
                    +5L
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] uppercase font-bold text-neutral-300 tracking-widest pl-1">
                Total Family Members Covered
              </p>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setState({
                        ...state,
                        healthFamilyMembers: num,
                        healthPremium: Math.round(
                          state.healthSumInsured *
                            0.008 *
                            (1 + (num - 1) * 0.4),
                        ),
                      });
                    }}
                    className={`flex-1 p-6 rounded-2xl font-semibold text-xl transition-all ${state.healthFamilyMembers === num ? "bg-white text-black shadow-2xl ring-4 ring-neutral-300 scale-[1.05]" : "bg-[#333333] text-white hover:bg-[#444444] hover:scale-[1.02] shadow-sm"}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-neutral-700">
              <div className="flex items-center justify-between p-8 bg-emerald-950/20 rounded-4xl border border-emerald-900/50 shadow-sm transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase text-emerald-500 tracking-[0.2em]">
                    Estimated Annual Premium
                  </p>
                  <p className="text-sm font-bold text-neutral-400">
                    Calculated based on standard family-floater rules
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-semibold text-emerald-400 tracking-tighter">
                    {formatCurrency(calculatedPremium)}
                  </span>
                  <p className="text-[9px] font-semibold uppercase text-emerald-600 mt-1">
                    AI ESTIMATED
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    case 7: {
      const totalOutflows =
        state.monthly +
        state.homeLoanEMI +
        Math.round(state.healthPremium / 12) +
        state.monthlySIP;
      const isDeficit = state.monthlyIncome < totalOutflows;

      return (
        <div className="space-y-10">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-white tracking-widest">
                Monthly Take-Home Income
              </span>
              <div className="flex items-center gap-4 w-1/2 justify-end">
                <input
                  type="range"
                  min={10000}
                  max={1000000}
                  step={5000}
                  value={state.monthlyIncome}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setState({
                      ...state,
                      monthlyIncome: parseInt(e.target.value),
                    })
                  }
                  className="flex-1 accent-blue-500 h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer shadow-inner"
                />
                <span className="text-3xl font-semibold text-blue-500 tracking-tighter min-w-28 text-right">
                  {formatCurrency(state.monthlyIncome)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NumericInput
                value={state.monthlyIncome}
                onChange={(val: number) =>
                  setState({ ...state, monthlyIncome: val })
                }
                className="w-1/3 p-5 text-2xl font-semibold bg-white rounded-2xl text-black outline-none focus:ring-4 focus:ring-neutral-500 shadow-sm"
              />
              <div className="flex gap-4 flex-1">
                {[10000, 25000, 50000].map((val) => (
                  <button
                    key={val}
                    onClick={() =>
                      setState({
                        ...state,
                        monthlyIncome: state.monthlyIncome + val,
                      })
                    }
                    className="flex-1 p-5 border border-neutral-700 bg-[#222222] text-white hover:bg-neutral-800 rounded-2xl shadow-sm text-sm font-semibold tracking-widest transition-all"
                  >
                    +{val >= 100000 ? val / 100000 + "L" : val / 1000 + "K"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 pt-6 border-t border-neutral-700">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-white tracking-widest">
                Monthly Investment (SIP)
              </span>
              <div className="flex items-center gap-4 w-1/2 justify-end">
                <input
                  type="range"
                  min={1000}
                  max={200000}
                  step={1000}
                  value={state.monthlySIP}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setState({ ...state, monthlySIP: parseInt(e.target.value) })
                  }
                  className="flex-1 accent-emerald-500 h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer shadow-inner"
                />
                <span className="text-3xl font-semibold text-emerald-500 tracking-tighter min-w-28 text-right">
                  {formatCurrency(state.monthlySIP)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NumericInput
                value={state.monthlySIP}
                onChange={(val: number) =>
                  setState({ ...state, monthlySIP: val })
                }
                className="w-1/3 p-5 text-2xl font-semibold bg-white rounded-2xl text-black outline-none focus:ring-4 focus:ring-neutral-500 shadow-sm"
              />
              <div className="flex gap-4 flex-1">
                {[10000, 25000, 50000].map((val) => (
                  <button
                    key={val}
                    onClick={() =>
                      setState({ ...state, monthlySIP: state.monthlySIP + val })
                    }
                    className="flex-1 p-5 border border-neutral-700 bg-[#222222] text-white hover:bg-neutral-800 rounded-2xl shadow-sm text-sm font-semibold tracking-widest transition-all"
                  >
                    +{val >= 100000 ? val / 100000 + "L" : val / 1000 + "K"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`p-6 rounded-2xl border transition-all shadow-lg backdrop-blur-sm ${isDeficit ? "bg-red-950/20 border-red-900/50 text-white" : "bg-[#111111] border-neutral-800 text-white"}`}
          >
            <div className="flex justify-between items-center mb-4 border-b border-neutral-800 pb-3">
              <span
                className={`text-[10px] font-semibold uppercase tracking-widest ${isDeficit ? "text-red-400" : "text-emerald-500"}`}
              >
                Budget Check
              </span>
              <span
                className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${isDeficit ? "bg-red-950 text-red-400" : "bg-emerald-950/50 text-emerald-400"}`}
              >
                {isDeficit ? "Deficit Detected" : "Healthy Surplus"}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold text-white">
                <span>Total Income</span>
                <span>{formatCurrency(state.monthlyIncome)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium text-neutral-400 pl-4 border-l border-neutral-700">
                <span>Living Expenses</span>
                <span>-{formatCurrency(state.monthly)}</span>
              </div>
              {state.homeLoanEMI > 0 && (
                <div className="flex justify-between items-center text-xs font-medium text-neutral-400 pl-4 border-l border-neutral-700">
                  <span>Home Loan EMI</span>
                  <span>-{formatCurrency(state.homeLoanEMI)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs font-medium text-neutral-400 pl-4 border-l border-neutral-700">
                <span>Insurance (Monthly Avg)</span>
                <span>
                  -{formatCurrency(Math.round(state.healthPremium / 12))}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium text-neutral-400 pl-4 border-l border-neutral-700">
                <span>Investments (SIP)</span>
                <span>-{formatCurrency(state.monthlySIP)}</span>
              </div>
            </div>
            <div
              className={`flex justify-between items-center mt-5 pt-4 border-t ${isDeficit ? "border-red-900/50" : "border-neutral-800"}`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-widest ${isDeficit ? "text-red-400" : "text-emerald-400"}`}
              >
                Remaining Cash
              </span>
              <span
                className={`text-xl font-bold tracking-tighter ${isDeficit ? "text-red-400" : "text-emerald-400"}`}
              >
                {formatCurrency(state.monthlyIncome - totalOutflows)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    case 8:
      return (
        <div className="space-y-4">
          {state.milestones.length === 0 && (
            <div className="p-8 border border-dashed border-neutral-700 rounded-4xl text-center text-neutral-500">
              <p className="text-sm">
                No milestones added yet. Click below to add one.
              </p>
            </div>
          )}
          {state.milestones.map((m: Milestone, idx: number) => (
            <div
              key={m.id}
              className="p-6 bg-[#222222] border border-neutral-700 rounded-4xl space-y-5 shadow-xl text-white transition-all"
            >
              <div className="flex items-center gap-4">
                <p className="text-[10px] font-bold uppercase text-neutral-300 tracking-[0.2em] whitespace-nowrap">
                  Milestone Name
                </p>
                <input
                  className="font-semibold text-xl bg-[#333333] p-3 rounded-xl outline-none flex-1 text-white shadow-sm border border-neutral-600 focus:ring-2 focus:ring-neutral-400 transition-all"
                  value={m.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const nm = [...state.milestones];
                    nm[idx].name = e.target.value;
                    setState({ ...state, milestones: nm });
                  }}
                />
                <button
                  onClick={() =>
                    setState({
                      ...state,
                      milestones: state.milestones.filter(
                        (_m: Milestone, i: number) => i !== idx,
                      ),
                    })
                  }
                  className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-5 pt-4 border-t border-neutral-700">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-neutral-300 tracking-widest pl-1">
                    Target Amount (₹)
                  </p>
                  <NumericInput
                    value={m.amount}
                    onChange={(val: number) => {
                      const nm = [...state.milestones];
                      nm[idx].amount = val;
                      setState({ ...state, milestones: nm });
                    }}
                    className="p-3 font-semibold text-xl bg-[#333333] rounded-xl text-white shadow-sm w-full border border-neutral-600 focus:ring-2 focus:ring-neutral-400 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-neutral-300 tracking-widest pl-1">
                    Target Year
                  </p>
                  <input
                    type="number"
                    value={m.targetYear}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const nm = [...state.milestones];
                      nm[idx].targetYear = parseInt(e.target.value);
                      setState({ ...state, milestones: nm });
                    }}
                    className="p-3 font-semibold text-xl bg-[#333333] rounded-xl text-white border border-neutral-600 shadow-sm w-full focus:ring-2 focus:ring-neutral-400 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Milestone Button */}
          <button
            onClick={() =>
              setState({
                ...state,
                milestones: [
                  ...state.milestones,
                  {
                    id: Date.now(),
                    name: "",
                    amount: 0,
                    targetYear: new Date().getFullYear() + 5,
                  },
                ],
              })
            }
            className="w-full p-4 border border-dashed border-neutral-600 rounded-4xl text-neutral-400 hover:text-white hover:border-neutral-400 hover:bg-neutral-800/30 transition-all flex items-center justify-center gap-3 font-semibold text-sm tracking-wide"
          >
            <Plus size={18} />
            Add Milestone
          </button>
        </div>
      );
    case 9:
      return (
        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-6">
            {[3.0, 3.5, 4.0, 4.5].map((v) => (
              <button
                key={v}
                onClick={() => setState({ ...state, wr: v })}
                className={`p-8 rounded-3xl border ${state.wr === v ? "bg-white text-black" : "bg-[#333333]"}`}
              >
                <p className="text-2xl font-semibold">{v}%</p>
              </button>
            ))}
          </div>
        </div>
      );
    case 10:
      return (
        <div className="flex gap-4">
          {[0, 1, 2, 3].map((v) => (
            <button
              key={v}
              onClick={() => setState({ ...state, cushionYears: v })}
              className={`flex-1 p-8 rounded-3xl border ${state.cushionYears === v ? "bg-emerald-600 text-white" : "bg-[#333333]"}`}
            >
              <p className="text-2xl font-semibold">{v}y</p>
            </button>
          ))}
        </div>
      );
    case 11:
      return (
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
          <h2 className="text-3xl font-semibold">Plan Complete</h2>
        </div>
      );
    default:
      return null;
  }
}
