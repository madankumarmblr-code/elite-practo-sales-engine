"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CounterCardProps {
  label: string;
  value: number;
  tone: "teal" | "blue" | "amber";
  description?: string;
  delay?: number;
}

export function CounterCard({ label, value, tone, description, delay = 0 }: CounterCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [isInView, value]);

  const toneClasses = {
    teal: "bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-500/20",
    blue: "bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20",
    amber: "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20",
  };

  const badgeTone = {
    teal: "teal",
    blue: "blue",
    amber: "amber",
  } as const;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <Card className={`border ${toneClasses[tone]} overflow-hidden`}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardHeader className="relative">
          <CardDescription className="text-slate-400">{label}</CardDescription>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
            viewport={{ once: true }}
          >
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {displayValue.toLocaleString()}
            </CardTitle>
          </motion.div>
        </CardHeader>

        <CardContent className="relative">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: delay + 0.3 }}
            viewport={{ once: true }}
          >
            <Badge tone={tone}>{description || "Live enriched"}</Badge>
          </motion.div>
        </CardContent>

        {/* Gradient shine effect on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          initial={false}
          whileHover={{
            opacity: 0.05,
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
          }}
        />
      </Card>
    </motion.div>
  );
}
