import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Database,
  Workflow,
  MessageSquare,
  Shield,
  BarChart3,
  Plug,
  Globe,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Bot,
  Users,
} from "lucide-react";
import { CTA } from "@/components/cta";

export const metadata: Metadata = {
  title: "Features - ChatBot Pro",
  description:
    "Explore the powerful features of ChatBot Pro: AI-powered conversations, knowledge bases, workflow builder, omnichannel support, and more.",
};

const mainFeatures = [
  {
    name: "AI-Powered Conversations",
    description:
      "Harness the power of leading AI models to deliver intelligent, context-aware conversations that feel natural and helpful.",
    icon: Brain,
    highlights: [
      "GPT-4o, Claude 3.5, and custom model support",
      "Context-aware responses with conversation memory",
      "Intent recognition and entity extraction",
      "Sentiment analysis for better customer insights",
      "Multi-turn conversation handling",
    ],
  },
  {
    name: "Knowledge Base",
    description:
      "Build a comprehensive knowledge repository that your chatbot can reference to provide accurate, up-to-date information.",
    icon: Database,
    highlights: [
      "Upload PDFs, Word docs, and text files",
      "Web scraping with automatic content extraction",
      "Real-time content synchronization",
      "Semantic search with vector embeddings",
      "Version control and content management",
    ],
  },
  {
    name: "Visual Workflow Builder",
    description:
      "Design complex conversation flows and automation with our intuitive drag-and-drop interface. No coding required.",
    icon: Workflow,
    highlights: [
      "Drag-and-drop flow designer",
      "Conditional logic and branching",
      "API integrations and webhooks",
      "Human handoff triggers",
      "A/B testing for conversation paths",
    ],
  },
  {
    name: "Omnichannel Deployment",
    description:
      "Deploy your chatbot everywhere your customers are. One platform, unlimited channels.",
    icon: MessageSquare,
    highlights: [
      "Web widget with customizable design",
      "WhatsApp Business integration",
      "Facebook Messenger & Instagram",
      "Slack and Microsoft Teams",
      "SMS via Twilio and Telegram",
    ],
  },
];

const additionalFeatures = [
  {
    name: "Enterprise Security",
    description: "SOC 2 Type II compliant with advanced security controls",
    icon: Shield,
    items: ["SSO & SAML 2.0", "Role-based access control", "Data encryption", "Audit logs"],
  },
  {
    name: "Advanced Analytics",
    description: "Deep insights into chatbot performance and customer behavior",
    icon: BarChart3,
    items: ["Real-time dashboards", "Conversation analytics", "User satisfaction tracking", "Custom reports"],
  },
  {
    name: "Integrations",
    description: "Connect with your existing tools and workflows",
    icon: Plug,
    items: ["Salesforce & HubSpot", "Zendesk & Freshdesk", "Calendly & Google Calendar", "Custom webhooks"],
  },
  {
    name: "Multi-Language",
    description: "Reach customers worldwide in their preferred language",
    icon: Globe,
    items: ["100+ languages supported", "Auto-detection", "Custom translations", "Regional customization"],
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="section-padding bg-white">
        <div className="container-marketing">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 ring-1 ring-inset ring-primary-700/10">
                <Sparkles className="h-4 w-4" />
                <span>Packed with powerful features</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Everything you need to build{" "}
              <span className="gradient-text">amazing chatbots</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              From AI-powered conversations to enterprise security, ChatBot Pro provides all
              the tools you need to create, deploy, and scale intelligent chatbots.
            </p>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="section-padding bg-gray-50">
        <div className="container-marketing">
          <div className="space-y-24">
            {mainFeatures.map((feature, index) => (
              <div
                key={feature.name}
                className={`flex flex-col gap-12 lg:flex-row lg:items-center ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className="lg:w-1/2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600">
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="mt-6 text-3xl font-bold text-gray-900">{feature.name}</h2>
                  <p className="mt-4 text-lg text-gray-600">{feature.description}</p>
                  <ul className="mt-8 space-y-3">
                    {feature.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-3">
                        <Check className="h-5 w-5 flex-shrink-0 text-primary-600 mt-0.5" />
                        <span className="text-gray-700">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:w-1/2">
                  <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                      <feature.icon className="h-20 w-20 text-primary-300" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="section-padding bg-white" id="integrations">
        <div className="container-marketing">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              And so much more
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Enterprise-ready features to support your business at any scale.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl grid grid-cols-1 gap-8 md:grid-cols-2">
            {additionalFeatures.map((feature) => (
              <div
                key={feature.name}
                className="rounded-2xl bg-gray-50 p-8 ring-1 ring-gray-200"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-600">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                </div>
                <ul className="mt-6 grid grid-cols-2 gap-3">
                  {feature.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-primary-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="section-padding bg-gray-900" id="api">
        <div className="container-marketing">
          <div className="mx-auto max-w-3xl text-center">
            <Zap className="mx-auto h-12 w-12 text-primary-400" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Powerful API for developers
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Build custom integrations and extend functionality with our comprehensive REST API
              and webhooks.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="#"
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white transition-all hover:bg-primary-700"
              >
                View API Docs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Code example */}
          <div className="mx-auto mt-12 max-w-2xl">
            <div className="rounded-lg bg-gray-800 p-6 font-mono text-sm">
              <div className="text-gray-400"># Send a message to your chatbot</div>
              <div className="mt-2">
                <span className="text-green-400">curl</span>{" "}
                <span className="text-gray-300">-X POST https://api.chatbotpro.com/v1/chat \</span>
              </div>
              <div className="text-gray-300">
                {"  "}-H {'"'}Authorization: Bearer YOUR_API_KEY{'"'} \
              </div>
              <div className="text-gray-300">
                {"  "}-d {'"'}{"{"}{'"'}message{'"'}: {'"'}Hello!{'"'}, {'"'}chatbot_id{'"'}:{" "}
                {'"'}bot_123{'"'}{"}"}{'"'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
}
