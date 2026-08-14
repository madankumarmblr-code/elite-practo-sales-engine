"use client";

import { motion } from "framer-motion";
import { TrendingUp, Activity, Users, ZapOff } from "lucide-react";

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
}

interface StatsDisplayProps {
  stats: StatItem[];
  title?: string;
  subtitle?: string;
}

export function StatsDisplay({ stats, title, subtitle }: StatsDisplayProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const changeColors = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    neutral: "text-slate-400",
  };

  return (
    <div className="w-full">
      {(title || subtitle) && (
        <div className="mb-8">
          {title && (
            <motion.h2
              className="text-3xl font-bold text-white mb-2"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              {title}
            </motion.h2>
          )}
          {subtitle && (
            <motion.p
              className="text-slate-400"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="relative group"
            whileHover={{ y: -5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-blue-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 backdrop-blur">
              {/* Icon with animation */}
              <motion.div
                className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center mb-4"
                whileHover={{ rotate: 10, scale: 1.05 }}
              >
                <div className="text-teal-400">{stat.icon}</div>
              </motion.div>

              {/* Label */}
              <p className="text-sm text-slate-400 mb-2">{stat.label}</p>

              {/* Value with animation */}
              <motion.div
                className="mb-4"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.1 + 0.3 }}
                viewport={{ once: true }}
              >
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </motion.div>

              {/* Change indicator */}
              <motion.div
                className="flex items-center gap-1"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 + 0.4 }}
                viewport={{ once: true }}
              >
                <span className={`text-sm font-semibold ${changeColors[stat.changeType]}`}>
                  {stat.change}
                </span>
              </motion.div>

              {/* Animated line at bottom on hover */}
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                whileHover={{ width: "100%" }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
