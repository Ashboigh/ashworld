"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Target, Heart, Lightbulb, Users, ArrowRight, MapPin, Sparkles } from "lucide-react";
import { CTA } from "@/components/cta";
import { FadeInOnScroll, GradientBlob, ParallaxSection } from "@/components/parallax";

const stats = [
  { label: "Founded", value: "2022" },
  { label: "Team members", value: "50+" },
  { label: "Countries served", value: "30+" },
  { label: "Messages processed", value: "100M+" },
];

const values = [
  {
    name: "Customer First",
    description:
      "Every decision we make starts with asking: how does this help our customers succeed?",
    icon: Heart,
    gradient: "from-rose-500 to-pink-500",
  },
  {
    name: "Innovation",
    description:
      "We push the boundaries of what's possible with AI to deliver cutting-edge solutions.",
    icon: Lightbulb,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    name: "Transparency",
    description:
      "We believe in honest communication and building trust through openness.",
    icon: Target,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Collaboration",
    description:
      "Great products are built by diverse teams working together towards shared goals.",
    icon: Users,
    gradient: "from-purple-500 to-indigo-500",
  },
];

const team = [
  {
    name: "Alex Thompson",
    role: "CEO & Co-founder",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
    bio: "Former AI researcher at Google, passionate about making AI accessible to all businesses.",
  },
  {
    name: "Sarah Kim",
    role: "CTO & Co-founder",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop",
    bio: "Ex-Amazon engineer with 15 years of experience building scalable systems.",
  },
  {
    name: "Marcus Johnson",
    role: "VP of Engineering",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop",
    bio: "Led engineering teams at Stripe and Twilio before joining ChatBot Pro.",
  },
  {
    name: "Emily Chen",
    role: "VP of Product",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop",
    bio: "Product leader with experience at Slack and Intercom building communication tools.",
  },
];

const openings = [
  {
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "Remote (US/EU)",
    type: "Full-time",
  },
  {
    title: "Machine Learning Engineer",
    department: "AI/ML",
    location: "San Francisco, CA",
    type: "Full-time",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "New York, NY",
    type: "Full-time",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero with gradient background */}
      <section className="section-padding relative overflow-hidden bg-gradient-to-b from-white via-primary-50/30 to-white">
        <GradientBlob className="w-[600px] h-[600px] bg-gradient-to-r from-primary-300/40 to-purple-300/40 -top-40 -right-40" />
        <GradientBlob className="w-[400px] h-[400px] bg-gradient-to-r from-cyan-300/40 to-blue-300/40 bottom-0 -left-40" />

        <div className="container-marketing relative">
          <FadeInOnScroll>
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                className="mb-6 flex justify-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-purple-100 px-4 py-2 text-sm font-medium text-primary-700">
                  <Sparkles className="h-4 w-4" />
                  Our Story
                </span>
              </motion.div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Our mission is to democratize{" "}
                <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  intelligent conversations
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                We believe every business, regardless of size, should have access to powerful
                AI-driven customer experiences. ChatBot Pro makes that possible.
              </p>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Stats with gradient cards */}
      <section className="py-16 bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 bg-[length:200%_auto] animate-gradient">
        <div className="container-marketing">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <FadeInOnScroll key={stat.label} delay={index * 0.1}>
                <motion.div
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <p className="text-4xl font-bold text-white drop-shadow-lg">{stat.value}</p>
                  <p className="mt-1 text-sm text-primary-100">{stat.label}</p>
                </motion.div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Story with parallax */}
      <ParallaxSection
        className="section-padding"
        backgroundImage="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop"
        speed={0.3}
      >
        <div className="container-marketing relative">
          <FadeInOnScroll>
            <div className="mx-auto max-w-3xl glass rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Our story</h2>
              <div className="mt-6 space-y-6 text-gray-700">
                <p>
                  ChatBot Pro was founded in 2022 by Alex Thompson and Sarah Kim, two former
                  tech industry veterans who saw a gap in the market: while enterprise companies
                  had access to sophisticated AI chatbot solutions, small and medium businesses
                  were left behind.
                </p>
                <p>
                  We started with a simple idea: build a platform that combines the power of
                  cutting-edge AI with an intuitive interface that anyone can use. No coding
                  required. No expensive consultants. Just powerful tools that work.
                </p>
                <p>
                  Today, ChatBot Pro serves over 500 companies worldwide, processing more than
                  10 million messages every month. But we're just getting started. Our vision is
                  a world where every customer interaction is intelligent, helpful, and human.
                </p>
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </ParallaxSection>

      {/* Values with gradient icons */}
      <section className="section-padding relative overflow-hidden bg-white">
        <GradientBlob className="w-[500px] h-[500px] bg-gradient-to-r from-primary-200/50 to-purple-200/50 top-20 -right-60" />

        <div className="container-marketing relative">
          <FadeInOnScroll>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Our values</h2>
              <p className="mt-4 text-lg text-gray-600">
                These principles guide everything we do at ChatBot Pro.
              </p>
            </div>
          </FadeInOnScroll>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <FadeInOnScroll key={value.name} delay={index * 0.1}>
                <motion.div
                  className="text-center group"
                  whileHover={{ y: -5 }}
                >
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${value.gradient} shadow-lg shadow-${value.gradient.split('-')[1]}-500/30 group-hover:scale-110 transition-transform`}>
                    <value.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{value.name}</h3>
                  <p className="mt-2 text-sm text-gray-600">{value.description}</p>
                </motion.div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Team with hover effects */}
      <section className="section-padding bg-gradient-to-b from-gray-50 to-white">
        <div className="container-marketing">
          <FadeInOnScroll>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Meet our leadership
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Experienced leaders from top tech companies driving ChatBot Pro forward.
              </p>
            </div>
          </FadeInOnScroll>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {team.map((person, index) => (
              <FadeInOnScroll key={person.name} delay={index * 0.1}>
                <motion.div
                  className="text-center group"
                  whileHover={{ y: -10 }}
                >
                  <div className="relative mx-auto w-40 h-40">
                    {/* Gradient ring */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-full h-full rounded-full bg-white" />
                    </div>
                    <Image
                      src={person.image}
                      alt={person.name}
                      width={160}
                      height={160}
                      className="relative rounded-full object-cover w-full h-full p-1 group-hover:p-1.5 transition-all"
                    />
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{person.name}</h3>
                  <p className="text-sm bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent font-medium">
                    {person.role}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">{person.bio}</p>
                </motion.div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Careers with mesh gradient */}
      <section className="section-padding relative overflow-hidden" id="careers">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 bg-gray-900" />
        <div className="absolute inset-0 mesh-gradient opacity-30" />

        <div className="container-marketing relative">
          <FadeInOnScroll>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white">Join our team</h2>
              <p className="mt-4 text-lg text-gray-300">
                We're always looking for talented people to help us build the future of
                conversational AI.
              </p>
            </div>
          </FadeInOnScroll>

          <div className="mt-12 max-w-3xl mx-auto space-y-4">
            {openings.map((job, index) => (
              <FadeInOnScroll key={job.title} delay={index * 0.1}>
                <motion.div
                  className="group relative overflow-hidden rounded-xl"
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Gradient border effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative m-[1px] flex items-center justify-between rounded-xl bg-gray-800/90 backdrop-blur p-6">
                    <div>
                      <h3 className="font-semibold text-white">{job.title}</h3>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-400">
                        <span>{job.department}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                        <span>{job.type}</span>
                      </div>
                    </div>
                    <Link
                      href="#"
                      className="inline-flex items-center text-sm font-medium text-primary-400 hover:text-primary-300 group-hover:translate-x-1 transition-transform"
                    >
                      Apply
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </motion.div>
              </FadeInOnScroll>
            ))}
          </div>

          <FadeInOnScroll delay={0.4}>
            <div className="mt-8 text-center">
              <p className="text-gray-400">
                Don't see a role that fits?{" "}
                <Link href="/contact" className="text-primary-400 hover:text-primary-300 underline underline-offset-4">
                  Send us your resume
                </Link>
              </p>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      <CTA />
    </>
  );
}
