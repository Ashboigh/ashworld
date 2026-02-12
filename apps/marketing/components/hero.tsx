"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Bot, MessageSquare, Sparkles } from "lucide-react";
import { FloatingElement, GradientBlob, FadeInOnScroll } from "./parallax";

export function Hero() {
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-white via-primary-50/30 to-white">
      {/* Animated gradient blobs */}
      <GradientBlob className="w-[600px] h-[600px] bg-gradient-to-r from-primary-400 to-blue-400 -top-40 -left-40" />
      <GradientBlob className="w-[500px] h-[500px] bg-gradient-to-r from-purple-400 to-primary-400 top-1/2 -right-40" />
      <GradientBlob className="w-[400px] h-[400px] bg-gradient-to-r from-cyan-400 to-primary-400 bottom-20 left-1/4" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(0 0 0 / 0.5)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
        }}
      />

      <div className="container-marketing py-20 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <FadeInOnScroll>
            <motion.div
              className="mb-8 flex justify-center"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-purple-100 px-4 py-2 text-sm font-medium text-primary-700 ring-1 ring-inset ring-primary-700/10 shadow-lg shadow-primary-500/10">
                <Sparkles className="h-4 w-4 text-primary-500" />
                <span>Now with GPT-4o & Claude 3.5 Support</span>
              </div>
            </motion.div>
          </FadeInOnScroll>

          {/* Heading */}
          <FadeInOnScroll delay={0.1}>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Build Intelligent Chatbots{" "}
              <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Without Code
              </span>
            </h1>
          </FadeInOnScroll>

          {/* Description */}
          <FadeInOnScroll delay={0.2}>
            <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
              Create AI-powered chatbots that understand your business. Connect your knowledge
              base, customize workflows, and deploy across all channels in minutes.
            </p>
          </FadeInOnScroll>

          {/* CTA Buttons */}
          <FadeInOnScroll delay={0.3}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="http://localhost:3001/checkout"
                className="group relative inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105"
              >
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary-600 to-purple-600 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative flex items-center">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <button className="group inline-flex items-center justify-center rounded-lg border-2 border-gray-200 bg-white/80 backdrop-blur px-8 py-4 text-base font-semibold text-gray-900 shadow-sm transition-all hover:border-primary-200 hover:bg-primary-50">
                <Play className="mr-2 h-4 w-4 text-primary-600" />
                Watch Demo
              </button>
            </div>
          </FadeInOnScroll>

          {/* Social proof */}
          <FadeInOnScroll delay={0.4}>
            <div className="mt-12">
              <p className="text-sm text-gray-500 mb-4">Trusted by 500+ companies worldwide</p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                {["Acme Inc", "TechCorp", "StartupXYZ", "Enterprise Co", "Global Ltd"].map(
                  (company, i) => (
                    <motion.span
                      key={company}
                      className="text-lg font-semibold text-gray-300"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                    >
                      {company}
                    </motion.span>
                  )
                )}
              </div>
            </div>
          </FadeInOnScroll>
        </div>

        {/* Hero image/illustration with parallax */}
        <FadeInOnScroll delay={0.5}>
          <div className="mt-16 sm:mt-20 perspective-1000">
            <motion.div
              className="relative rounded-xl bg-gradient-to-b from-gray-900/5 to-gray-900/10 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl lg:p-4"
              initial={{ rotateX: 10, y: 40 }}
              animate={{ rotateX: 0, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 via-purple-500/20 to-primary-500/20 blur-2xl rounded-3xl" />

              <div className="relative rounded-lg bg-white shadow-2xl ring-1 ring-gray-900/10 overflow-hidden">
                {/* Mock dashboard UI */}
                <div className="p-4 lg:p-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <FloatingElement duration={4}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      </FloatingElement>
                      <div>
                        <p className="font-semibold text-gray-900">Support Assistant</p>
                        <p className="text-sm text-gray-500">Active - 1.2k conversations today</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      Online
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <motion.div
                      className="flex gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 }}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
                      <div className="flex-1 rounded-2xl rounded-tl-sm bg-gray-100 p-3 text-sm text-gray-700">
                        How do I reset my password?
                      </div>
                    </motion.div>
                    <motion.div
                      className="flex gap-3 justify-end"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 }}
                    >
                      <div className="flex-1 max-w-md rounded-2xl rounded-tr-sm bg-gradient-to-r from-primary-600 to-primary-700 p-3 text-sm text-white shadow-lg shadow-primary-500/20">
                        I can help you with that! To reset your password, click on "Forgot Password"
                        on the login page. You'll receive an email with reset instructions.
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200">
                        <MessageSquare className="h-4 w-4 text-primary-600" />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </FadeInOnScroll>
      </div>
    </div>
  );
}
