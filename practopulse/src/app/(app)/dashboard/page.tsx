"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CounterCard, FeatureCard, StatsDisplay } from "@/components/motion";
import { useLeadsStore } from "@/lib/store/leads";
import { TrendingUp, Target, Zap, Clock } from "lucide-react";

export default function DashboardPage() {
  const leads = useLeadsStore((s) => s.leads);
  const byStatus = (status: string) => leads.filter((l) => l.status === status).length;
  const reach = leads.filter((l) => l.recommendedProduct !== "PRIME").length;
  const prime = leads.filter((l) => l.recommendedProduct !== "REACH").length;
  const conversion = leads.length > 0 ? Math.round((byStatus("DEMO_SCHEDULED") / leads.length) * 100) : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="space-y-8">
      {/* Header Section with Animation */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Sales Pulse Dashboard
          </h1>
          <p className="mt-2 text-base text-slate-400">
            Real-time AI-powered intelligence for healthcare sales automation
          </p>
        </motion.div>
      </motion.div>

      {/* KPI Cards with Animated Counters */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <CounterCard
          label="Pipeline Leads"
          value={leads.length}
          tone="teal"
          description="Active prospects"
          delay={0}
        />
        <CounterCard
          label="Reach-fit Leads"
          value={reach}
          tone="blue"
          description="Segment ready"
          delay={0.1}
        />
        <CounterCard
          label="Prime-fit Leads"
          value={prime}
          tone="teal"
          description="Premium segment"
          delay={0.2}
        />
        <CounterCard
          label="Demo Conversion"
          value={conversion}
          tone="amber"
          description={`${byStatus("DEMO_SCHEDULED")} scheduled`}
          delay={0.3}
        />
      </motion.div>

      {/* Stats Overview Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <StatsDisplay
          title="Performance Metrics"
          subtitle="Real-time insights from your sales engine"
          stats={[
            {
              icon: <TrendingUp className="w-6 h-6" />,
              label: "Growth Rate",
              value: "+24%",
              change: "↑ vs last week",
              changeType: "positive",
            },
            {
              icon: <Target className="w-6 h-6" />,
              label: "Target Hit",
              value: "87%",
              change: "On track",
              changeType: "positive",
            },
            {
              icon: <Zap className="w-6 h-6" />,
              label: "Response Time",
              value: "2.3h",
              change: "↓ 15% faster",
              changeType: "positive",
            },
            {
              icon: <Clock className="w-6 h-6" />,
              label: "Avg Demo Duration",
              value: "38m",
              change: "Rich engagement",
              changeType: "neutral",
            },
          ]}
        />
      </motion.div>

      {/* Feature Cards Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <motion.h2
          className="text-2xl font-bold text-white mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          Healthcare Sales Solutions
        </motion.h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <FeatureCard
            title="Practo Reach"
            description="Expand your patient reach"
            gradient="blue"
            delay={0}
          >
            <div className="space-y-3 text-sm text-slate-300">
              <p>✓ Guaranteed impressions across 50+ specialties</p>
              <p>✓ Locality & specialty visibility optimization</p>
              <p>✓ Consistent patient traffic flow</p>
              <p className="pt-2">
                <span className="text-teal-400 font-semibold">Perfect for:</span> Expanding reach to new patient segments
              </p>
            </div>
          </FeatureCard>

          <FeatureCard
            title="Practo Prime"
            description="Maximize conversions"
            gradient="teal"
            delay={0.1}
          >
            <div className="space-y-3 text-sm text-slate-300">
              <p>✓ Premier listing with priority placement</p>
              <p>✓ 24×7 automated booking system</p>
              <p>✓ Smart virtual number integration</p>
              <p className="pt-2">
                <span className="text-teal-400 font-semibold">Perfect for:</span> High-volume booking & instant conversions
              </p>
            </div>
          </FeatureCard>
        </div>
      </motion.div>

      {/* Action Cards */}
      <motion.div
        className="grid gap-4 lg:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <FeatureCard
          title="Lead Finder Engine"
          description="Smart lead discovery"
          gradient="teal"
          delay={0}
        >
          <p className="text-slate-300 mb-4">
            AI-powered search & enrichment powered by Clay, Apify & HeyReach
          </p>
          <Link
            href="/leads"
            className="inline-flex h-10 items-center rounded-lg bg-teal-500 px-4 text-sm font-semibold text-slate-950 hover:bg-teal-400 transition-colors"
          >
            Open Lead Finder →
          </Link>
        </FeatureCard>

        <FeatureCard
          title="Outreach Campaigns"
          description="Multi-channel engagement"
          gradient="blue"
          delay={0.1}
        >
          <p className="text-slate-300 mb-4">
            Smartlead & HeyReach integration for omnichannel reach
          </p>
          <Link
            href="/outreach"
            className="inline-flex h-10 items-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
          >
            Launch Campaigns →
          </Link>
        </FeatureCard>

        <FeatureCard
          title="Pitch Studio"
          description="AI-crafted proposals"
          gradient="amber"
          delay={0.2}
        >
          <p className="text-slate-300 mb-4">
            Claude-powered personalized pitch generation
          </p>
          <Link
            href="/pitch-studio"
            className="inline-flex h-10 items-center rounded-lg bg-[#1A365D] px-4 text-sm font-semibold text-white hover:bg-[#234a7a] transition-colors"
          >
            Create Pitch →
          </Link>
        </FeatureCard>
      </motion.div>

      {/* Quick Stats Footer */}
      <motion.div
        className="border-t border-slate-700/50 pt-8 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
      >
        <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-400">
          <div>
            <div className="text-slate-300 font-semibold mb-1">Active Segments</div>
            <div className="text-2xl text-teal-400">2</div>
            <p>Reach & Prime focused</p>
          </div>
          <div>
            <div className="text-slate-300 font-semibold mb-1">API Integrations</div>
            <div className="text-2xl text-blue-400">6+</div>
            <p>Clay, Apify, Smartlead, HeyReach...</p>
          </div>
          <div>
            <div className="text-slate-300 font-semibold mb-1">Automation Rate</div>
            <div className="text-2xl text-amber-400">{leads.length > 0 ? "94%" : "N/A"}</div>
            <p>End-to-end workflow</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
