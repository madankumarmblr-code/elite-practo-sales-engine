"use client";

import { HeroSection, HealthcareBackground, FeatureCard, StatsDisplay } from "@/components/motion";
import { motion } from "framer-motion";
import { Users, Zap, BarChart3, Workflow } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-900 overflow-hidden">
      <HealthcareBackground />

      <div className="relative z-10">
        {/* Hero Section */}
        <HeroSection
          title="Transform Healthcare Sales with AI Intelligence"
          subtitle="Real-time Lead Generation, Enrichment & Automation"
          description="PractoPulse is the next-generation B2B sales engine for Reach & Prime inside sales. Powered by AI, integrated with 6+ automation platforms, and designed for healthcare teams that close deals faster."
          cta={{
            text: "Launch Your Engine",
            href: "/dashboard",
          }}
        />

        {/* Features Section */}
        <section className="relative py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-white mb-4">
                Everything You Need to Win
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                From lead discovery to closed deals, we've got your entire sales workflow covered
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FeatureCard
                icon={<Users className="w-6 h-6" />}
                title="AI Lead Finder"
                description="Smart discovery powered by Clay & Apify"
                gradient="teal"
                delay={0}
              >
                <p className="text-sm text-slate-300">Find and enrich qualified healthcare leads automatically</p>
              </FeatureCard>

              <FeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="Multi-Channel Outreach"
                description="Smartlead & HeyReach integration"
                gradient="blue"
                delay={0.1}
              >
                <p className="text-sm text-slate-300">Engage prospects across email, SMS & LinkedIn</p>
              </FeatureCard>

              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="AI Pitch Generation"
                description="Claude-powered personalization"
                gradient="amber"
                delay={0.2}
              >
                <p className="text-sm text-slate-300">Create unique, compelling pitches in seconds</p>
              </FeatureCard>

              <FeatureCard
                icon={<Workflow className="w-6 h-6" />}
                title="End-to-End Automation"
                description="Workflow orchestration"
                gradient="teal"
                delay={0.3}
              >
                <p className="text-sm text-slate-300">Automate from lead to meeting scheduling</p>
              </FeatureCard>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="relative py-20 px-4 border-t border-slate-700/50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-white mb-4">
                Healthcare Sales Products
              </h2>
              <p className="text-xl text-slate-400">
                Optimized for Practo Reach & Practo Prime
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              <FeatureCard
                title="Practo Reach"
                description="Guaranteed impressions & patient traffic"
                gradient="blue"
                delay={0}
              >
                <div className="space-y-3 text-sm text-slate-300">
                  <p>🎯 50+ specialty visibility</p>
                  <p>📍 Locality optimization</p>
                  <p>👥 Consistent patient flow</p>
                  <p className="pt-4 border-t border-slate-700">
                    <span className="text-blue-400 font-semibold">Best for:</span> New clinic launches & specialty expansion
                  </p>
                </div>
              </FeatureCard>

              <FeatureCard
                title="Practo Prime"
                description="Premier listing with smart conversions"
                gradient="teal"
                delay={0.1}
              >
                <div className="space-y-3 text-sm text-slate-300">
                  <p>⭐ Priority placement</p>
                  <p>⏰ 24×7 booking automation</p>
                  <p>📱 Smart virtual numbers</p>
                  <p className="pt-4 border-t border-slate-700">
                    <span className="text-teal-400 font-semibold">Best for:</span> High-volume bookings & premium experience
                  </p>
                </div>
              </FeatureCard>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <StatsDisplay
              title="Why Teams Love PractoPulse"
              subtitle="Built for modern healthcare sales teams"
              stats={[
                {
                  icon: <Zap className="w-6 h-6" />,
                  label: "Setup Time",
                  value: "<30m",
                  change: "Ready to go",
                  changeType: "neutral",
                },
                {
                  icon: <BarChart3 className="w-6 h-6" />,
                  label: "Lead Quality",
                  value: "94%",
                  change: "Enriched data",
                  changeType: "positive",
                },
                {
                  icon: <Users className="w-6 h-6" />,
                  label: "Response Rate",
                  value: "3.2x",
                  change: "vs industry avg",
                  changeType: "positive",
                },
                {
                  icon: <Workflow className="w-6 h-6" />,
                  label: "Automation",
                  value: "94%",
                  change: "End-to-end",
                  changeType: "positive",
                },
              ]}
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Transform Your Sales Pipeline?
              </h2>
              <p className="text-lg text-slate-400 mb-8">
                Join healthcare teams already closing 3x more deals with AI-powered intelligence
              </p>
              <motion.a
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:shadow-lg hover:shadow-teal-500/50 transition-all"
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 20px 25px -5px rgba(16, 185, 129, 0.5)",
                }}
                whileTap={{ scale: 0.95 }}
              >
                Start Free Trial
                <span className="ml-2">→</span>
              </motion.a>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative border-t border-slate-700/50 py-12 px-4">
          <div className="max-w-6xl mx-auto text-center text-slate-400 text-sm">
            <p>© 2026 PractoPulse. AI-Powered Sales Engine for Healthcare.</p>
            <p className="mt-2">Trusted by healthcare organizations worldwide.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
