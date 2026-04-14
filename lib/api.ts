import { isSupabaseConfigured, supabase } from "./supabase";

export const getProfile = async (userId: string) => {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error("Supabase is not configured") };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*, investments(*), goals(*), insurance(*), health_insurance(*)")
    .eq("id", userId)
    .single();

  return { data, error };
};

export type ProfileFormValues = {
  personal: {
    age: number;
    retirement_age: number;
    monthly_income: number;
    monthly_expenses: number;
    current_savings?: number;
    monthly_investment_budget?: number;
    risk_tolerance: "conservative" | "moderate" | "aggressive";
    tax_regime: "old" | "new";
    property_value?: number;
    home_loan_outstanding?: number;
    home_loan_emi?: number;
    home_loan_tenure_remaining?: number;
    home_loan_interest_rate?: number;
    home_ownership_type?: string;
  };
  investments: {
    asset_class: string;
    current_value: number;
    expected_return: number;
  }[];
  goals: {
    name: string;
    target_year: number;
    target_amount: number;
  }[];
  insurance: {
    life_coverage: number;
    health_coverage: number;
  };
  health_insurance?: {
    sum_insured: number;
    annual_premium: number;
    family_members_covered: number;
    includes_parents: boolean;
    city_tier: string;
  };
  fire_preferences?: {
    swr: number;
    fire_type: string;
    strategy: string;
    glide_path: boolean;
  };
};

export const saveFullProfile = async (
  userId: string,
  data: ProfileFormValues,
) => {
  if (!isSupabaseConfigured) {
    return { error: new Error("Supabase is not configured") };
  }

  // 1. Save Profile
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    age: data.personal.age,
    retirement_age: data.personal.retirement_age,
    monthly_income: data.personal.monthly_income,
    monthly_expenses: data.personal.monthly_expenses,
    current_savings: data.personal.current_savings || 0,
    monthly_investment_budget: data.personal.monthly_investment_budget || 0,
    risk_tolerance: data.personal.risk_tolerance,
    tax_regime: data.personal.tax_regime,
    property_value: data.personal.property_value || 0,
    home_loan_outstanding: data.personal.home_loan_outstanding || 0,
    home_loan_emi: data.personal.home_loan_emi || 0,
    home_loan_tenure_remaining: data.personal.home_loan_tenure_remaining || 0,
    home_loan_interest_rate: data.personal.home_loan_interest_rate || 0,
    home_ownership_type: data.personal.home_ownership_type || "self_occupied",
    fire_preferences: data.fire_preferences,
    updated_at: new Date().toISOString(),
  });

  if (profileError) return { error: profileError };

  // 2. Save Investments
  await supabase.from("investments").delete().eq("profile_id", userId);
  const { error: invError } = await supabase.from("investments").insert(
    data.investments.map((inv) => ({
      profile_id: userId,
      asset_class: inv.asset_class,
      current_value: inv.current_value,
      expected_return: inv.expected_return,
    })),
  );
  if (invError) return { error: invError };

  // 3. Save Goals
  await supabase.from("goals").delete().eq("profile_id", userId);
  const { error: goalError } = await supabase.from("goals").insert(
    data.goals.map((goal) => ({
      profile_id: userId,
      name: goal.name,
      target_year: goal.target_year,
      target_amount: goal.target_amount,
    })),
  );
  if (goalError) return { error: goalError };

  // 4. Save Insurance
  await supabase.from("insurance").delete().eq("profile_id", userId);
  const { error: insError } = await supabase.from("insurance").insert({
    profile_id: userId,
    life_coverage: data.insurance.life_coverage,
    health_coverage: data.insurance.health_coverage,
  });
  if (insError) return { error: insError };

  // 5. Save Health Insurance Details
  await supabase.from("health_insurance").delete().eq("profile_id", userId);
  if (data.health_insurance) {
    const { error: healthInsError } = await supabase
      .from("health_insurance")
      .insert({
        profile_id: userId,
        sum_insured: data.health_insurance.sum_insured,
        annual_premium: data.health_insurance.annual_premium,
        family_members_covered: data.health_insurance.family_members_covered,
        includes_parents: data.health_insurance.includes_parents,
        city_tier: data.health_insurance.city_tier,
      });
    if (healthInsError) return { error: healthInsError };
  }

  return { error: null };
};
