import Link from "next/link";
import { ArrowRight, TrendingUp, ShieldCheck, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#2f2f2f] text-white font-sans selection:bg-[#e5e5e5] selection:text-black">
      {/* Hero Section */}
      <main>
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-4xl py-24 sm:py-32 lg:py-40">
            <div className="mb-10 flex justify-center">
              <Link href="/" aria-label="FIRElytics" className="group">
                <img
                  src="/favicon.ico"
                  alt="FIRElytics"
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain group-hover:scale-105 transition-transform"
                />
              </Link>
            </div>

            <div className="hidden sm:mb-10 sm:flex sm:justify-center">
              <div className="relative rounded-full px-6 py-3 text-[10px] font-bold leading-6 text-black bg-[#e5e5e5] hover:bg-white transition-all uppercase tracking-[0.2em] shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
                Next-Gen Financial Intelligence Is Live
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-7xl font-semibold tracking-tight text-white sm:text-[90px] leading-[1.1]">
                Design Your <br />
                <span className="italic font-serif font-black">
                  Financial Orbit
                </span>
              </h1>
              <p className="mt-10 text-xl font-medium leading-relaxed text-neutral-300 max-w-2xl mx-auto tracking-tight">
                Build your Financial Independence trajectory with
                institutional-grade data. Visualize life goals, calculate robust
                Safe Withdrawal Rates, and let intelligent algorithms optimize
                your compounding trajectory out to age 80.
              </p>
              <div className="mt-14 flex items-center justify-center gap-x-6">
                <Link
                  href="/onboarding"
                  className="rounded-full bg-[#e5e5e5] px-10 py-5 text-sm font-bold text-black shadow-2xl hover:bg-white hover:-translate-y-1 transition-all uppercase tracking-[0.2em] flex items-center gap-3 group"
                >
                  Generate Path{" "}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-7xl mx-auto px-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-[#e5e5e5] text-black p-12 rounded-[3rem] shadow-xl hover:-translate-y-2 transition-transform cursor-default group">
              <div className="w-16 h-16 bg-[#333333] rounded-2xl flex items-center justify-center mb-10 shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-semibold tracking-tight mb-6">
                Dynamic Glide Paths
              </h3>
              <p className="text-neutral-700 text-base leading-relaxed font-medium">
                Automatic de-risking projections. Watch your portfolio
                dynamically shift from high-growth equities securely into
                protective debt yields as you approach your defined FIRE target.
              </p>
            </div>

            <div className="bg-[#e5e5e5] text-black p-12 rounded-[3rem] shadow-xl hover:-translate-y-2 transition-transform cursor-default group">
              <div className="w-16 h-16 bg-[#333333] rounded-2xl flex items-center justify-center mb-10 shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-semibold tracking-tight mb-6">
                Life Goal Subtractions
              </h3>
              <p className="text-neutral-700 text-base leading-relaxed font-medium">
                Buying a home? Funding a degree? Plot major cash outflows onto
                your compounding timeline to see exactly how these events alter
                your final baseline withdrawal stamina.
              </p>
            </div>

            <div className="bg-[#e5e5e5] text-black p-12 rounded-[3rem] shadow-xl hover:-translate-y-2 transition-transform cursor-default group">
              <div className="w-16 h-16 bg-[#333333] rounded-2xl flex items-center justify-center mb-10 shadow-lg">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-semibold tracking-tight mb-6">
                Advanced Telemetry
              </h3>
              <p className="text-neutral-700 text-base leading-relaxed font-medium">
                Engage securely with the blazingly fast Llama-3.1 API. Chat
                directly with an LLM that reads your specific datasets,
                simulating Safe Withdrawal tolerances to verify your ultimate
                trajectory.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
