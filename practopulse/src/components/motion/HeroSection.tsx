"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  description: string;
  cta?: {
    text: string;
    href: string;
  };
}

export function HeroSection({ title, subtitle, description, cta }: HeroSectionProps) {
  const titleWords = title.split(" ");
  const subtitleWords = subtitle.split(" ");

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
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background elements */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Floating particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-teal-500/50"
            initial={{
              x: Math.random() * 1000 - 500,
              y: Math.random() * 1000 - 500,
              opacity: 0,
            }}
            animate={{
              x: Math.random() * 1000 - 500,
              y: Math.random() * 1000 - 500,
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 8 + i,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/10 mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="text-sm text-teal-200">Powered by AI Sales Intelligence</span>
        </motion.div>

        {/* Title with staggered words */}
        <motion.div
          className="mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {titleWords.map((word, idx) => (
            <motion.span key={idx} variants={itemVariants} className="inline-block mr-2">
              <span className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                {word}
              </span>
            </motion.span>
          ))}
        </motion.div>

        {/* Subtitle with staggered animation */}
        <motion.div
          className="mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {subtitleWords.map((word, idx) => (
            <motion.span key={idx} variants={itemVariants} className="inline-block mr-2">
              <span className="text-2xl md:text-3xl bg-gradient-to-r from-teal-300 to-blue-300 bg-clip-text text-transparent font-semibold">
                {word}
              </span>
            </motion.span>
          ))}
        </motion.div>

        {/* Description */}
        <motion.p
          className="text-lg text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {description}
        </motion.p>

        {/* CTA Button */}
        {cta && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <motion.a
              href={cta.href}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:shadow-lg hover:shadow-teal-500/50 transition-all"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 25px -5px rgba(16, 185, 129, 0.5)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              {cta.text}
              <motion.span
                className="ml-2"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.a>
          </motion.div>
        )}
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-slate-500 rounded-full flex items-start justify-center p-2">
          <motion.div
            className="w-1 h-2 bg-teal-500 rounded-full"
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </div>
  );
}
