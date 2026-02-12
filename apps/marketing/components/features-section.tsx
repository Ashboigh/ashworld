"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Database,
  Workflow,
  MessageSquare,
  Shield,
  BarChart3,
  Plug,
  Globe,
} from "lucide-react";
import { FadeInOnScroll, GradientBlob } from "./parallax";

const features = [
  {
    name: "AI-Powered Conversations",
    description:
      "Leverage GPT-4, Claude, and other leading AI models to deliver intelligent, context-aware responses.",
    icon: Brain,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Knowledge Base",
    description:
      "Upload documents, scrape websites, and build a comprehensive knowledge base your chatbot can reference.",
    icon: Database,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "Visual Workflow Builder",
    description:
      "Design complex conversation flows with our drag-and-drop workflow editor. No coding required.",
    icon: Workflow,
    gradient: "from-orange-500 to-red-500",
  },
  {
    name: "Omnichannel Support",
    description:
      "Deploy your chatbot across web, WhatsApp, Messenger, Slack, Teams, and more from a single platform.",
    icon: MessageSquare,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    name: "Enterprise Security",
    description:
      "SOC 2 compliant with SSO, SAML, and role-based access control. Your data stays secure.",
    icon: Shield,
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    name: "Advanced Analytics",
    description:
      "Track conversations, measure performance, and gain insights with comprehensive analytics dashboards.",
    icon: BarChart3,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    name: "Seamless Integrations",
    description:
      "Connect with Salesforce, HubSpot, Zendesk, and 50+ other tools to automate your workflows.",
    icon: Plug,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    name: "Multi-Language Support",
    description:
      "Reach global audiences with automatic translation and multi-language chatbot capabilities.",
    icon: Globe,
    gradient: "from-teal-500 to-cyan-500",
  },
];

export function FeaturesSection() {
  return (
    <section className="section-padding relative overflow-hidden" id="features">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50" />

      {/* Decorative gradient blobs */}
      <GradientBlob className="w-[500px] h-[500px] bg-gradient-to-r from-primary-300/40 to-purple-300/40 top-20 -left-60" />
      <GradientBlob className="w-[400px] h-[400px] bg-gradient-to-r from-cyan-300/40 to-blue-300/40 bottom-40 -right-40" />

      <div className="container-marketing relative">
        <FadeInOnScroll>
          <div className="mx-auto max-w-2xl text-center">
            <motion.span
              className="inline-block text-base font-semibold leading-7 bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Everything you need
            </motion.span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Powerful features for{" "}
              <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                modern businesses
              </span>
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Build, deploy, and scale intelligent chatbots with our comprehensive platform.
              Everything you need to deliver exceptional customer experiences.
            </p>
          </div>
        </FadeInOnScroll>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <FadeInOnScroll key={feature.name} delay={index * 0.1}>
                <motion.div
                  className="group relative h-full"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Card glow effect */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300`} />

                  <div className="relative h-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all group-hover:shadow-xl group-hover:ring-0">
                    {/* Icon with gradient background */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg transition-transform group-hover:scale-110`}>
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {feature.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
