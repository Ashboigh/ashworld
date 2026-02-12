"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { GradientBlob } from "./parallax";

export function CTA() {
  return (
    <section className="section-padding relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 bg-[length:200%_auto] animate-gradient" />

      {/* Decorative elements */}
      <GradientBlob className="w-[400px] h-[400px] bg-white/10 -top-40 -left-40" />
      <GradientBlob className="w-[300px] h-[300px] bg-white/10 -bottom-20 -right-20" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='white'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
        }}
      />

      <div className="container-marketing relative">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mb-6 flex justify-center"
            initial={{ scale: 0.9 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-4 py-2 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4" />
              Start building today
            </span>
          </motion.div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to transform your{" "}
            <span className="relative">
              <span className="relative z-10">customer experience</span>
              <motion.span
                className="absolute inset-x-0 bottom-2 h-3 bg-white/20 -z-0"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              />
            </span>
            ?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-100">
            Join 500+ companies using ChatBot Pro to deliver exceptional customer support.
            Start your free trial today — no credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="http://localhost:3001/checkout"
                className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary-600 shadow-lg shadow-black/10 transition-all hover:bg-primary-50"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border-2 border-white/30 bg-white/5 backdrop-blur px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10 hover:border-white/50"
              >
                Contact Sales
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
