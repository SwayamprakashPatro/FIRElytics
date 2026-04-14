"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { getProfile } from "../../lib/api";
import { Zap, LogOut, MessageSquare, X, Send, Home } from "lucide-react";
import {
  calculateNetWorthProjection,
  calculateMonthlySurplus,
  calculateNetWorthWithMortgage,
  recommendHealthCover,
} from "../../lib/calculations/fireCalculator";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";

export default function Dashboard() {
  const router = useRouter();

  type DashboardGoal = {
    name?: string | null;
    target_year?: number | null;
    target_amount?: number | null;
  };

  type DashboardInvestment = {
    current_value?: number | null;
    expected_return?: number | null;
    asset_class?: string | null;
  };

  type DashboardHealthInsurance = {
    sum_insured?: number | null;
    annual_premium?: number | null;
    family_members_covered?: number | null;
    city_tier?: "tier1" | "tier2" | "tier3" | string | null;
  };

  type DashboardProfile = {
    age?: number | null;
    retirement_age?: number | null;
    monthly_income?: number | null;
    monthly_expenses?: number | null;
    current_savings?: number | null;
    monthly_investment_budget?: number | null;
    property_value?: number | null;
    home_loan_outstanding?: number | null;
    home_loan_emi?: number | null;
    home_loan_tenure_remaining?: number | null;
    home_loan_interest_rate?: number | null;
    home_ownership_type?: string | null;
    fire_preferences?: { swr?: number | null } | null;
    investments?: DashboardInvestment[] | null;
    goals?: DashboardGoal[] | null;
    health_insurance?: DashboardHealthInsurance[] | null;
    [key: string]: unknown;
  };

  type ChatMessage = { role: "assistant" | "user"; content: string };

  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const didInitRef = useRef(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [printChartKey, setPrintChartKey] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState<{ width: number; height: number }>(
    { width: 0, height: 0 },
  );

  const measureChartHost = () => {
    const el = chartHostRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    setChartSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  const normalizeProfile = (input: unknown): DashboardProfile | null => {
    if (!input || typeof input !== "object") return null;
    const obj = input as Record<string, unknown>;

    // Newer shape saved by onboarding: { personal: {...}, investments: [], goals: [], ... }
    const personalRaw = obj.personal;
    if (personalRaw && typeof personalRaw === "object") {
      const personal = personalRaw as Record<string, unknown>;
      const investments = Array.isArray(obj.investments) ? obj.investments : [];
      const goals = Array.isArray(obj.goals) ? obj.goals : [];

      const health = obj.health_insurance as unknown;
      const health_insurance = Array.isArray(health)
        ? (health as DashboardHealthInsurance[])
        : health
          ? [health as DashboardHealthInsurance]
          : null;

      return {
        ...(personal as DashboardProfile),
        id: obj.id,
        investments: investments as DashboardInvestment[],
        goals: goals as DashboardGoal[],
        fire_preferences: (obj.fire_preferences as DashboardProfile["fire_preferences"]) ??
          null,
        health_insurance,
      };
    }

    // Flat / Supabase shape
    const health = obj.health_insurance as unknown;
    const health_insurance = Array.isArray(health)
      ? (health as DashboardHealthInsurance[])
      : health
        ? [health as DashboardHealthInsurance]
        : (obj.health_insurance as DashboardHealthInsurance[] | null) ?? null;

    return {
      ...(obj as DashboardProfile),
      health_insurance,
    };
  };

  const handleExport = () => {
    if (typeof window === "undefined") return;

    // Printing: flip into print mode first, then print on the next frames
    flushSync(() => {
      setIsPrinting(true);
      setPrintChartKey((k) => k + 1);
    });
    window.dispatchEvent(new Event("resize"));
    measureChartHost();

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      measureChartHost();
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
        measureChartHost();
        requestAnimationFrame(() => window.print());
      });
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Keep measured size in sync for both screen and print.
    measureChartHost();
    window.addEventListener("resize", measureChartHost);

    const beforePrint = () => {
      setIsPrinting(true);
      setPrintChartKey((k) => k + 1);
      window.dispatchEvent(new Event("resize"));
      measureChartHost();
    };

    const afterPrint = () => {
      setIsPrinting(false);
      window.dispatchEvent(new Event("resize"));
      measureChartHost();
    };

    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("resize", measureChartHost);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    if (!hasMounted) return;
    didInitRef.current = true;

    type ProjectionPoint = ReturnType<typeof calculateNetWorthProjection>[number];

    type Roadmap = {
      totalTarget: number;
      fireTarget: number;
      cushion: number;
      projection: ProjectionPoint[];
      fireDate: number | null;
      yearsToRetire: number;
      milestones: DashboardGoal[];
      isGap: boolean;
      swrAnalysis: {
        swr: number;
        survivalYears: number;
        survivalRate: number;
        safe: boolean;
      }[];
      currentWealth: number;
      healthAdequacy: number;
      healthRecommendation: ReturnType<typeof recommendHealthCover>;
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        const localData = localStorage.getItem("et_explorer_profile");
        if (localData) {
          const parsed: unknown = JSON.parse(localData);
          const normalized = normalizeProfile(parsed);
          if (normalized) {
            setProfile(normalized);
            return;
          }
        }

        if (isSupabaseConfigured) {
          const { data: userData, error: userError } =
            await supabase.auth.getUser();
          if (userError) throw userError;
          const userId = userData?.user?.id;
          if (userId) {
            const { data, error } = await getProfile(userId);
            if (error) throw error;
            if (data) setProfile(data as unknown as DashboardProfile);
          }
        }
      } catch (err) {
        console.error("Dashboard profile load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [hasMounted]);

  type ProjectionPoint = ReturnType<typeof calculateNetWorthProjection>[number];

  type Roadmap = {
    totalTarget: number;
    fireTarget: number;
    cushion: number;
    projection: ProjectionPoint[];
    fireDate: number | null;
    yearsToRetire: number;
    milestones: DashboardGoal[];
    isGap: boolean;
    swrAnalysis: {
      swr: number;
      survivalYears: number;
      survivalRate: number;
      safe: boolean;
    }[];
    currentWealth: number;
    healthAdequacy: number;
    healthRecommendation: ReturnType<typeof recommendHealthCover>;
  };

  const roadmap = useMemo<Roadmap | null>(() => {
    if (!profile) return null;

    const monthlyExpenses = Number(profile.monthly_expenses) || 40000;
    const monthlyIncome = Number(profile.monthly_income) || 100000;
    const emi = Number(profile.home_loan_emi) || 0;
    const healthIns = profile.health_insurance?.[0];
    const healthPremiumMonthly = (Number(healthIns?.annual_premium) || 0) / 12;

    const monthlySurplus = calculateMonthlySurplus(
      monthlyIncome,
      monthlyExpenses,
      emi,
      healthPremiumMonthly,
    );

    const wr = Number(profile.fire_preferences?.swr) || 4.0;
    const fireTarget = (monthlyExpenses * 12) / (wr / 100);
    const cushion = monthlyExpenses * 12 * 2;
    const totalTarget = fireTarget + cushion;

    const startAge = Number(profile.age) || 30;
    const retireAge = Number(profile.retirement_age) || 60;

    const currentWealth = calculateNetWorthWithMortgage(
      Number(profile.current_savings) || 0,
      Number(profile.property_value) || 0,
      Number(profile.home_loan_outstanding) || 0,
    );

    const milestones =
      profile.goals?.filter((g: DashboardGoal) => g.name !== "FIRE") || [];

    const projection =
      calculateNetWorthProjection(
        profile,
        profile.investments || [],
        milestones,
        monthlySurplus,
      ) || [];

    const retireData =
      projection.length > 0
        ? projection.find((p) => p.age === retireAge) ||
          projection[projection.length - 1]
        : null;
    const retireCorpus = Number(retireData?.wealth) || 0;
    const isGap = retireCorpus < totalTarget;

    const swrAnalysis = [3.0, 3.5, 4.0, 4.5].map((testSwr) => {
      let corpus = retireCorpus;
      const annualExpense = Math.max(0, monthlyExpenses * 12);
      const inflation = 0.06;
      const postRetireReturn = 0.07;
      let survivalYears = 0;
      const retireDuration = Math.max(1, 105 - retireAge);

      for (let y = 0; y < retireDuration; y++) {
        const withdraw =
          annualExpense * Math.pow(1 + inflation, y) * (testSwr / wr);
        corpus = corpus * (1 + postRetireReturn) - withdraw;
        if (corpus <= 0) break;
        survivalYears++;
      }

      const survivalRate = Math.min(
        100,
        Math.round((survivalYears / retireDuration) * 100),
      );
      return {
        swr: testSwr,
        survivalYears,
        survivalRate,
        safe: survivalYears >= retireDuration,
      };
    });

    const cityTier =
      healthIns?.city_tier === "tier1" ||
      healthIns?.city_tier === "tier2" ||
      healthIns?.city_tier === "tier3"
        ? healthIns.city_tier
        : "tier1";

    const healthRecommendation = recommendHealthCover(
      Number(healthIns?.sum_insured) || 0,
      Number(healthIns?.family_members_covered) || 1,
      Number(profile.age) || 30,
      cityTier,
    );
    const healthAdequacy = healthIns
      ? (Number(healthIns.sum_insured) /
          healthRecommendation.recommendedCover) *
        100
      : 0;

    return {
      totalTarget,
      fireTarget,
      cushion,
      projection: projection.filter((p) => isFinite(p.wealth)),
      fireDate:
        projection.find((p) => p.investmentCorpus >= totalTarget)?.age || null,
      yearsToRetire: Math.max(0, retireAge - startAge),
      milestones,
      isGap,
      swrAnalysis,
      currentWealth,
      healthAdequacy,
      healthRecommendation,
    };
  }, [profile]);

  const printSvgChart = useMemo(() => {
    if (!isPrinting) return null;
    const data = roadmap?.projection;
    if (!data || data.length < 2) return null;

    // Use a fixed viewBox so PDF rendering is stable.
    const vbW = 1000;
    const vbH = 320;
    const padL = 70;
    const padR = 20;
    const padT = 18;
    const padB = 36;

    const plotW = vbW - padL - padR;
    const plotH = vbH - padT - padB;

    const wealthValues = data.map((d) => Number(d.wealth) || 0);
    const maxWealth = Math.max(...wealthValues, 1);
    const minWealth = 0;
    const range = Math.max(1, maxWealth - minWealth);

    const xForIndex = (i: number) => padL + (i / (data.length - 1)) * plotW;
    const yForWealth = (v: number) =>
      padT + (1 - (v - minWealth) / range) * plotH;

    const points = data.map((d, i) => {
      const x = xForIndex(i);
      const y = yForWealth(Number(d.wealth) || 0);
      return { x, y, age: d.age, wealth: Number(d.wealth) || 0 };
    });

    const lineD = points
      .map(
        (p, idx) =>
          `${idx === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`,
      )
      .join(" ");

    const areaD =
      `${lineD} ` +
      `L${(padL + plotW).toFixed(2)},${(padT + plotH).toFixed(2)} ` +
      `L${padL.toFixed(2)},${(padT + plotH).toFixed(2)} Z`;

    const gridLines = [0.25, 0.5, 0.75].map((t) => {
      const y = padT + t * plotH;
      return (
        <line
          key={t}
          x1={padL}
          y1={y}
          x2={padL + plotW}
          y2={y}
          stroke="#d4d4d4"
          strokeDasharray="4 4"
        />
      );
    });

    const yTicks = [0, 0.5, 1].map((t) => {
      const value = minWealth + (1 - t) * range;
      const y = padT + t * plotH;
      return (
        <text
          key={t}
          x={padL - 10}
          y={y + 4}
          textAnchor="end"
          fontSize="11"
          fill="#111111"
        >
          {(value / 10000000).toFixed(1)}Cr
        </text>
      );
    });

    const firstAge = points[0]?.age;
    const lastAge = points[points.length - 1]?.age;

    const targetY =
      (roadmap?.totalTarget ?? 0) > 0
        ? yForWealth(roadmap.totalTarget)
        : null;

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width={vbW} height={vbH} fill="#ffffff" />
        {gridLines}
        {yTicks}

        <text x={padL} y={vbH - 12} fontSize="11" fill="#111111">
          {typeof firstAge === "number" ? firstAge : ""}
        </text>
        <text
          x={padL + plotW}
          y={vbH - 12}
          fontSize="11"
          fill="#111111"
          textAnchor="end"
        >
          {typeof lastAge === "number" ? lastAge : ""}
        </text>

        {typeof targetY === "number" && (
          <g>
            <line
              x1={padL}
              y1={targetY}
              x2={padL + plotW}
              y2={targetY}
              stroke="#111111"
              strokeDasharray="3 3"
            />
            <text
              x={padL + plotW - 2}
              y={Math.max(padT + 10, targetY - 6)}
              textAnchor="end"
              fontSize="11"
              fill="#111111"
            >
              FIRE TARGET
            </text>
          </g>
        )}

        <path d={areaD} fill="rgba(0,0,0,0.08)" stroke="none" />
        <path d={lineD} fill="none" stroke="#111111" strokeWidth={3} />
      </svg>
    );
  }, [isPrinting, roadmap]);

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return "₹0";
    if (val >= 10000000)
      return `₹${(val / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
    if (val >= 100000)
      return `₹${(val / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} L`;
    return `₹${Math.floor(val).toLocaleString("en-IN")}`;
  };

  useEffect(() => {
    if (
      hasMounted &&
      roadmap &&
      profile &&
      chatMessages.length === 0 &&
      roadmap.totalTarget > 0
    ) {
      setChatMessages([
        {
          role: "assistant",
          content: `Hello! I'm your FIRElytics Wealth Advisor. I've analyzed your orbit and see you are aiming for a ${formatCurrency(roadmap.totalTarget)} corpus. What questions can I answer about your FIRE strategy?`,
        },
      ]);
    }
    // Only trigger once when profile/roadmap is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, !!profile, !!roadmap?.totalTarget]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev: ChatMessage[]) => [
      ...prev,
      { role: "user", content: userMsg },
    ]);
    setIsChatTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMsg }],
          contextData: {
            totalTarget: formatCurrency(roadmap?.totalTarget ?? 0),
            fireAge: roadmap?.fireDate
              ? Math.floor(roadmap.fireDate)
              : profile?.retirement_age || 60,
            swr: profile?.fire_preferences?.swr || 4.0,
            monthlySip: formatCurrency(profile?.monthly_investment_budget ?? 0),
          },
        }),
      });

      const data = await response.json();
      setChatMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setChatMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: "assistant", content: "Local LLM server not responding." },
      ]);
    } finally {
      setIsChatTyping(false);
    }
  };

  if (!hasMounted || loading)
    return (
      <div className="min-h-screen bg-[#2f2f2f] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-t-2 border-white rounded-full animate-spin mb-8" />
        <p className="font-black tracking-widest uppercase text-xs mb-8">
          Synchronizing Orbit...
        </p>
      </div>
    );

  if (!profile || !roadmap)
    return (
      <div
        className="min-h-screen bg-[#2f2f2f] flex flex-col items-center justify-center text-white p-8 text-center"
        key="calibration"
      >
        <div className="w-16 h-16 border-t-2 border-white rounded-full animate-spin mb-8 opacity-20" />
        <p className="font-black tracking-widest uppercase text-xs mb-8 text-neutral-500">
          Wait... System Calibration...
        </p>
      </div>
    );

  return (
    <div className="dashboard-print min-h-screen bg-[#2f2f2f] text-white font-sans selection:bg-[#e5e5e5] selection:text-black flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full max-w-400 mx-auto px-8 py-6 flex items-center justify-between z-1000 relative">
        <Link href="/" aria-label="FIRElytics" className="group">
          <img
            src="/favicon.ico"
            alt="FIRElytics"
            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
          />
        </Link>

        <div className="flex items-center gap-4">
          <button
            onClick={handleExport}
            className="px-6 py-2.5 bg-[#e5e5e5] text-black font-bold rounded-full hover:bg-white transition-colors text-xs uppercase tracking-wide flex items-center gap-2 shadow-lg print:hidden"
          >
            Export
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("et_explorer_profile");
              if (isSupabaseConfigured) {
                supabase.auth.signOut().finally(() => router.push("/"));
              } else {
                router.push("/");
              }
            }}
            className="p-3 text-neutral-400 font-bold hover:text-white transition-colors print:hidden"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-400 mx-auto px-8 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-full">
        {/* Left Main Panel - The Chart */}
        <div className="dashboard-panel dashboard-panel-left col-span-1 lg:col-span-7 bg-[#e5e5e5] rounded-4xl p-6 lg:p-8 flex flex-col shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 text-black tracking-tight px-2">
            Report
          </h2>
          <div className="dashboard-chart-shell bg-[#333333] rounded-3xl p-6 lg:p-10 flex-1 flex flex-col shadow-inner">
            <div className="flex justify-between items-start mb-8 text-white">
              <h3 className="text-sm text-neutral-300 font-medium">
                Wealth Orbit
              </h3>
              <div className="text-right">
                <p className="text-3xl font-bold tracking-tight">
                  {roadmap?.fireDate ? `Age ${roadmap.fireDate}` : `TBD`}
                </p>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">
                  FIRE Intersection
                </p>
              </div>
            </div>
            <div
              className="print-chart flex-1 w-full bg-[#1e1e1e] rounded-xl overflow-hidden"
              style={{ minHeight: "400px", height: "400px" }}
              ref={chartHostRef}
            >
              {hasMounted && (
                isPrinting ? (
                  <div className="w-full h-full bg-white">{printSvgChart}</div>
                ) : (
                  <ResponsiveContainer
                    key={printChartKey}
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={roadmap.projection}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorWealth"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ffffff"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ffffff"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke={isPrinting ? "#d4d4d4" : "#4a4a4a"}
                      />
                      <XAxis
                        dataKey="age"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: isPrinting ? "#111111" : "#a3a3a3",
                          fontSize: 10,
                          fontWeight: 500,
                        }}
                        dy={10}
                        minTickGap={30}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: isPrinting ? "#111111" : "#a3a3a3",
                          fontSize: 10,
                          fontWeight: 500,
                        }}
                        tickFormatter={(v) =>
                          `${(v / 10000000).toFixed(1)}Cr`
                        }
                        width={45}
                      />
                      <Tooltip
                        content={(input) => {
                          type ChartTooltipDatum = {
                            age?: number;
                            wealth?: number;
                            equity?: number;
                          };
                          type ChartTooltipItem = {
                            payload?: ChartTooltipDatum;
                          };
                          const { active, payload } = input as unknown as {
                            active?: boolean;
                            payload?: ReadonlyArray<ChartTooltipItem>;
                          };

                          if (active && payload && payload.length) {
                            const data = payload[0]?.payload;
                            return (
                              <div className="bg-[#e5e5e5] text-black p-4 rounded-xl shadow-2xl min-w-45">
                                <p className="text-[10px] font-bold uppercase mb-1 tracking-widest">
                                  Age {data?.age}
                                </p>
                                <p className="text-2xl font-bold tracking-tight mb-1">
                                  {formatCurrency(data?.wealth)}
                                </p>
                                <p className="text-xs font-medium text-neutral-700">
                                  {data?.equity}% Equity
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="wealth"
                        stroke={isPrinting ? "#111111" : "#ffffff"}
                        strokeWidth={3}
                        isAnimationActive={!isPrinting}
                        animationDuration={isPrinting ? 0 : 400}
                        fillOpacity={1}
                        fill={
                          isPrinting
                            ? "rgba(0, 0, 0, 0.08)"
                            : "url(#colorWealth)"
                        }
                      />
                      {(roadmap?.totalTarget ?? 0) > 0 && (
                        <ReferenceLine
                          y={roadmap.totalTarget}
                          stroke={isPrinting ? "#111111" : "#a3a3a3"}
                          strokeDasharray="3 3"
                          label={{
                            value: "FIRE TARGET",
                            position: "top",
                            fill: isPrinting ? "#111111" : "#e5e5e5",
                            fontSize: 10,
                          }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right Side Cards */}
        <div className="dashboard-panel dashboard-panel-right col-span-1 lg:col-span-5 bg-[#e5e5e5] rounded-4xl p-6 lg:p-8 flex flex-col shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 text-black tracking-tight px-2 print:hidden">
            Report
          </h2>

          <div className="flex flex-col gap-4 flex-1">
            {/* Top Two Small Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#333333] rounded-2xl p-6 text-white shadow-inner flex flex-col justify-between min-h-40">
                <p className="text-sm text-neutral-300 font-medium mb-4">
                  Target Corpus
                </p>
                <div>
                  <p className="text-3xl lg:text-4xl font-bold tracking-tight">
                    {formatCurrency(roadmap?.totalTarget ?? 0)}
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    Required by age {profile?.retirement_age ?? "—"}
                  </p>
                </div>
              </div>
              <div className="bg-[#333333] rounded-2xl p-6 text-white shadow-inner flex flex-col justify-between min-h-40">
                <p className="text-sm text-neutral-300 font-medium mb-4">
                  Current Wealth
                </p>
                <div>
                  <p className="text-3xl lg:text-4xl font-bold tracking-tight">
                    {formatCurrency(profile?.current_savings || 0)}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-2 uppercase flex items-center gap-1 group overflow-hidden whitespace-nowrap">
                    <Home size={10} /> Equity:{" "}
                    {formatCurrency(
                      (profile?.property_value || 0) -
                        (profile?.home_loan_outstanding || 0),
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Wide Card: SWR */}
            <div className="bg-[#333333] rounded-2xl p-6 text-white shadow-inner flex-1 min-h-40 flex flex-col">
              <p className="text-sm text-neutral-300 font-medium mb-4">
                Safe Rate & Strategy
              </p>

              <div className="flex items-center gap-6 mt-2">
                <div className="w-16 h-16 bg-[#e5e5e5] rounded-full flex flex-col items-center justify-center text-black shrink-0">
                  <span className="text-xl font-bold">
                    {profile?.fire_preferences?.swr ?? 4}%
                  </span>
                  <span className="text-[8px] font-bold uppercase">SWR</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-relaxed">
                    You are tuned to a {profile?.fire_preferences?.swr ?? 4}%
                    safe withdrawal rate based on a{" "}
                    {105 - (profile?.retirement_age ?? 60)} year runway.
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    Assuming expected post-retirement inflation of 6%.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Wide Card / AI Chat area */}
            <div className="bg-[#333333] rounded-2xl p-6 text-white shadow-inner flex-1 min-h-40 flex flex-col relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 opacity-10 blur-xl">
                <Zap className="w-48 h-48" />
              </div>
              <p className="text-sm text-neutral-300 font-medium mb-4 relative z-10 flex items-center justify-between">
                Tactical Alerts
                <MessageSquare
                  className="w-4 h-4 cursor-pointer hover:text-[#e5e5e5]"
                  onClick={() => setIsChatOpen(true)}
                />
              </p>

              <div className="relative z-10 space-y-3">
                {roadmap?.isGap && (
                  <div className="text-sm text-[#ff9999] bg-[#ff9999]/10 py-2 px-3 rounded-md animate-pulse">
                    Retirement gap detected. Increase monthly SIP by{" "}
                    {formatCurrency((roadmap?.totalTarget ?? 0) * 0.001)}.
                  </div>
                )}
                {!roadmap?.isGap && (
                  <div className="text-sm text-emerald-400 bg-emerald-400/10 py-2 px-3 rounded-md">
                    Your orbit is stable. Trajectory secure.
                  </div>
                )}
                <div className="text-sm text-white/80 bg-white/5 py-2 px-3 rounded-md">
                  Health adequacy is at{" "}
                  {Math.round(roadmap?.healthAdequacy ?? 0)}%.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Chatbot Window */}
      {isChatOpen && (
        <div className="fixed bottom-8 right-8 w-96 h-150 max-h-[80vh] bg-[#e5e5e5] rounded-3xl shadow-2xl border-4 border-[#333333] flex flex-col z-1001 overflow-hidden">
          <div className="bg-[#333333] p-5 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.ico"
                alt="FIRElytics"
                className="w-6 h-6 object-contain"
              />
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  FIRElytics Wealth Advisor
                </h3>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#e5e5e5]">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm font-medium leading-relaxed shadow-sm ${msg.role === "user" ? "bg-[#333333] text-white rounded-br-sm" : "bg-white text-black rounded-bl-sm whitespace-pre-wrap"}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatTyping && (
              <div className="flex justify-start">
                <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm p-4 flex gap-2">
                  <div className="w-2 h-2 bg-[#333333] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[#333333] rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-[#333333] rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-[#e5e5e5] border-t border-neutral-300 flex gap-2"
          >
            <input
              value={chatInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setChatInput(e.target.value)
              }
              placeholder="Ask about your financial orbit..."
              className="flex-1 bg-white rounded-xl px-4 py-3 text-sm outline-none text-black placeholder-neutral-500 shadow-inner"
            />
            <button
              disabled={!chatInput.trim() || isChatTyping}
              className="p-3 bg-[#333333] text-white rounded-xl disabled:opacity-50 transition-all hover:bg-black focus:scale-95 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
