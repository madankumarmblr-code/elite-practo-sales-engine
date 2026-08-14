"use client";

import { motion, useHover } from "framer-motion";
import { ReactNode, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
  delay?: number;
  gradient?: "teal" | "blue" | "amber";
}

export function FeatureCard({
  icon,
  title,
  description,
  children,
  delay = 0,
  gradient = "teal",
}: FeatureCardProps) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useHover();

  const gradients = {
    teal: "from-teal-500/20 to-cyan-500/20",
    blue: "from-blue-500/20 to-sky-500/20",
    amber: "from-amber-500/20 to-orange-500/20",
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="relative overflow-hidden border-slate-700/50 bg-slate-950/50 backdrop-blur">
        {/* Animated gradient border on hover */}
        <motion.div
          className={`absolute inset-0 rounded-lg bg-gradient-to-r ${gradients[gradient]} opacity-0 blur-xl`}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ zIndex: -1 }}
        />

        <CardHeader>
          {icon && (
            <motion.div
              className="mb-2 h-10 w-10"
              animate={{ scale: isHovered ? 1.1 : 1, rotate: isHovered ? 5 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="text-slate-400">{description}</CardDescription>
        </CardHeader>

        {children && (
          <CardContent>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isHovered ? 1 : 0.7, y: isHovered ? 0 : 5 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </CardContent>
        )}

        {/* Shine effect */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{ x: ["100%", "-100%"] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </Card>
    </motion.div>
  );
}
