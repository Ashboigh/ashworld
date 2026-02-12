"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, HelpCircle, Sparkles, ChevronDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeInOnScroll, GradientBlob } from "@/components/parallax";

const tiers = [
  {
    name: "Free",
    id: "free",
    slug: "free",
    priceMonthly: 0,
    priceYearly: 0,
    description: "Perfect for trying out ChatBot Pro",
    features: [
      { name: "1 chatbot", included: true },
      { name: "100 messages/month", included: true },
      { name: "1 workspace", included: true },
      { name: "Basic analytics", included: true },
      { name: "Web widget", included: true },
      { name: "Community support", included: true },
      { name: "Knowledge base (5 docs)", included: true },
      { name: "Custom branding", included: false },
      { name: "API access", included: false },
      { name: "Integrations", included: false },
      { name: "Priority support", included: false },
    ],
    cta: "Get Started Free",
    highlighted: false,
    gradient: "from-gray-500 to-gray-600",
  },
  {
    name: "Pro",
    id: "pro",
    slug: "pro",
    priceMonthly: 49,
    priceYearly: 490,
    description: "For growing teams and businesses",
    features: [
      { name: "10 chatbots", included: true },
      { name: "10,000 messages/month", included: true },
      { name: "5 workspaces", included: true },
      { name: "Advanced analytics", included: true },
      { name: "All channels", included: true },
      { name: "Email support", included: true },
      { name: "Unlimited knowledge base", included: true },
      { name: "Custom branding", included: true },
      { name: "API access", included: true },
      { name: "50+ integrations", included: true },
      { name: "Priority support", included: false },
    ],
    cta: "Start Free Trial",
    highlighted: true,
    gradient: "from-primary-500 to-purple-600",
  },
  {
    name: "Enterprise",
    id: "enterprise",
    slug: "enterprise",
    priceMonthly: 199,
    priceYearly: 1990,
    description: "For large organizations with custom needs",
    features: [
      { name: "Unlimited chatbots", included: true },
      { name: "Unlimited messages", included: true },
      { name: "Unlimited workspaces", included: true },
      { name: "Custom analytics", included: true },
      { name: "All channels + custom", included: true },
      { name: "24/7 phone support", included: true },
      { name: "Unlimited knowledge base", included: true },
      { name: "White-label solution", included: true },
      { name: "Full API access", included: true },
      { name: "Custom integrations", included: true },
      { name: "Dedicated success manager", included: true },
    ],
    cta: "Contact Sales",
    highlighted: false,
    gradient: "from-purple-500 to-pink-600",
  },
];

const faqs = [
  {
    question: "Can I change plans later?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.",
  },
  {
    question: "What happens if I exceed my message limit?",
    answer:
      "We'll notify you when you're approaching your limit. You can upgrade to a higher plan or purchase additional messages as needed.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer:
      "Yes! All paid plans come with a 14-day free trial. No credit card required to start.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) and can arrange invoicing for Enterprise plans.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Absolutely. You can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.",
  },
  {
    question: "Do you offer discounts for non-profits?",
    answer:
      "Yes, we offer special pricing for non-profit organizations and educational institutions. Contact our sales team for details.",
  },
];

function FAQItem({ faq }: { faq: { question: string; answer: string } }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200"
      initial={false}
    >
      <button
        className="flex w-full items-center justify-between p-6 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <span className="font-semibold text-gray-900">{faq.question}</span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 pb-6 ml-8 text-gray-600">{faq.answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  const getHref = (tier: typeof tiers[0]) => {
    if (tier.id === "enterprise") {
      return "/contact";
    }
    const billingCycle = annual ? "yearly" : "monthly";
    return `http://localhost:3001/checkout?plan=${tier.slug}&billing=${billingCycle}`;
  };

  const formatPrice = (price: number) => {
    return price === 0 ? "$0" : `$${price}`;
  };

  return (
    <>
      {/* Hero with gradient */}
      <section className="section-padding relative overflow-hidden bg-gradient-to-b from-white via-primary-50/30 to-white">
        <GradientBlob className="w-[600px] h-[600px] bg-gradient-to-r from-primary-300/40 to-purple-300/40 -top-40 -left-40" />
        <GradientBlob className="w-[500px] h-[500px] bg-gradient-to-r from-cyan-300/40 to-blue-300/40 top-20 -right-40" />

        <div className="container-marketing relative">
          <FadeInOnScroll>
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                className="mb-6 flex justify-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-purple-100 px-4 py-2 text-sm font-medium text-primary-700">
                  <Sparkles className="h-4 w-4" />
                  Simple Pricing
                </span>
              </motion.div>

              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Choose your{" "}
                <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  perfect plan
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Start free, scale as you grow. All plans include core features with no hidden fees.
              </p>

              {/* Enhanced billing toggle */}
              <div className="mt-10 flex items-center justify-center gap-4">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    !annual ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  Monthly
                </span>
                <button
                  type="button"
                  className={cn(
                    "relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2",
                    annual
                      ? "bg-gradient-to-r from-primary-600 to-purple-600"
                      : "bg-gray-200"
                  )}
                  role="switch"
                  aria-checked={annual}
                  onClick={() => setAnnual(!annual)}
                >
                  <motion.span
                    className="inline-block h-5 w-5 rounded-full bg-white shadow-lg"
                    animate={{ x: annual ? 28 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    annual ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  Annual{" "}
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    Save 17%
                  </span>
                </span>
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Pricing cards with enhanced effects */}
      <section className="pb-24 relative bg-gradient-to-b from-white to-gray-50">
        <div className="container-marketing">
          <div className="mx-auto max-w-6xl grid grid-cols-1 gap-8 lg:grid-cols-3">
            {tiers.map((tier, index) => (
              <FadeInOnScroll key={tier.id} delay={index * 0.1}>
                <motion.div
                  className={cn(
                    "relative h-full",
                    tier.highlighted && "lg:-mt-4 lg:mb-4"
                  )}
                  onHoverStart={() => setHoveredTier(tier.id)}
                  onHoverEnd={() => setHoveredTier(null)}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Glow effect on hover */}
                  <motion.div
                    className={cn(
                      "absolute -inset-1 rounded-3xl bg-gradient-to-r opacity-0 blur-lg transition-opacity",
                      tier.gradient
                    )}
                    animate={{ opacity: hoveredTier === tier.id ? 0.5 : 0 }}
                  />

                  {/* Card */}
                  <div
                    className={cn(
                      "relative h-full rounded-2xl p-8 transition-all",
                      tier.highlighted
                        ? "bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 shadow-2xl shadow-primary-500/30"
                        : "bg-white shadow-lg ring-1 ring-gray-200"
                    )}
                  >
                    {tier.highlighted && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1 text-sm font-semibold text-white shadow-lg">
                          <Zap className="h-4 w-4" />
                          Most Popular
                        </span>
                      </div>
                    )}

                    <h3
                      className={cn(
                        "text-2xl font-bold",
                        tier.highlighted ? "text-white" : "text-gray-900"
                      )}
                    >
                      {tier.name}
                    </h3>
                    <p
                      className={cn(
                        "mt-2 text-sm",
                        tier.highlighted ? "text-primary-100" : "text-gray-500"
                      )}
                    >
                      {tier.description}
                    </p>

                    {/* Price with animation */}
                    <div className="mt-6">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={annual ? "yearly" : "monthly"}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span
                            className={cn(
                              "text-5xl font-bold tracking-tight",
                              tier.highlighted ? "text-white" : "text-gray-900"
                            )}
                          >
                            {formatPrice(annual ? tier.priceYearly : tier.priceMonthly)}
                          </span>
                          <span
                            className={cn(
                              "text-sm ml-1",
                              tier.highlighted ? "text-primary-100" : "text-gray-500"
                            )}
                          >
                            /{annual ? "year" : "month"}
                          </span>
                        </motion.div>
                      </AnimatePresence>
                      {annual && tier.priceMonthly > 0 && (
                        <p
                          className={cn(
                            "mt-1 text-sm",
                            tier.highlighted ? "text-primary-200" : "text-gray-400"
                          )}
                        >
                          ${Math.round(tier.priceYearly / 12)}/month billed annually
                        </p>
                      )}
                    </div>

                    <Link
                      href={getHref(tier)}
                      className={cn(
                        "mt-8 block w-full rounded-xl py-3.5 text-center text-sm font-semibold transition-all",
                        tier.highlighted
                          ? "bg-white text-primary-600 hover:bg-primary-50 shadow-lg"
                          : "bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-500/20"
                      )}
                    >
                      {tier.cta}
                    </Link>

                    <ul className="mt-8 space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature.name} className="flex items-center gap-3">
                          {feature.included ? (
                            <div
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full",
                                tier.highlighted
                                  ? "bg-white/20"
                                  : "bg-primary-100"
                              )}
                            >
                              <Check
                                className={cn(
                                  "h-3 w-3",
                                  tier.highlighted ? "text-white" : "text-primary-600"
                                )}
                              />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full",
                                tier.highlighted ? "bg-white/10" : "bg-gray-100"
                              )}
                            >
                              <X
                                className={cn(
                                  "h-3 w-3",
                                  tier.highlighted ? "text-primary-200" : "text-gray-400"
                                )}
                              />
                            </div>
                          )}
                          <span
                            className={cn(
                              "text-sm",
                              tier.highlighted
                                ? feature.included
                                  ? "text-white"
                                  : "text-primary-200"
                                : feature.included
                                ? "text-gray-700"
                                : "text-gray-400"
                            )}
                          >
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section with accordion */}
      <section className="section-padding relative overflow-hidden bg-white">
        <GradientBlob className="w-[400px] h-[400px] bg-gradient-to-r from-primary-200/30 to-purple-200/30 bottom-0 -left-40" />

        <div className="container-marketing relative">
          <FadeInOnScroll>
            <div className="mx-auto max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 text-center">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-center text-gray-600">
                Everything you need to know about our pricing
              </p>
              <div className="mt-12 space-y-4">
                {faqs.map((faq, index) => (
                  <FadeInOnScroll key={faq.question} delay={index * 0.05}>
                    <FAQItem faq={faq} />
                  </FadeInOnScroll>
                ))}
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* CTA with gradient */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 bg-[length:200%_auto] animate-gradient" />

        <div className="container-marketing relative">
          <FadeInOnScroll>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to transform your customer experience?
              </h2>
              <p className="mt-4 text-lg text-primary-100">
                Join 500+ companies using ChatBot Pro. Start your free trial today.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="http://localhost:3001/checkout"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary-600 shadow-lg shadow-black/10 transition-all hover:bg-primary-50 hover:scale-105"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-white/30 bg-transparent px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
                >
                  Talk to Sales
                </Link>
              </div>
              <p className="mt-6 text-sm text-primary-200">
                No credit card required · 14-day free trial · Cancel anytime
              </p>
            </div>
          </FadeInOnScroll>
        </div>
      </section>
    </>
  );
}
