"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { FadeInOnScroll, GradientBlob } from "./parallax";

const testimonials = [
  {
    content:
      "ChatBot Pro transformed our customer support. We've reduced response times by 80% and our customers love the instant, accurate responses.",
    author: {
      name: "Sarah Chen",
      role: "Head of Customer Success",
      company: "TechStart Inc",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    },
    rating: 5,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    content:
      "The knowledge base feature is incredible. We uploaded our entire documentation and the AI instantly became an expert on our product.",
    author: {
      name: "Michael Roberts",
      role: "CTO",
      company: "DataFlow Systems",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    },
    rating: 5,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    content:
      "We deployed chatbots across 5 channels in a single afternoon. The workflow builder made it easy to create complex conversation flows.",
    author: {
      name: "Emily Watson",
      role: "Operations Director",
      company: "Global Retail Co",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    },
    rating: 5,
    gradient: "from-orange-500 to-red-500",
  },
];

export function Testimonials() {
  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-b from-white via-gray-50/50 to-white">
      {/* Decorative blobs */}
      <GradientBlob className="w-[500px] h-[500px] bg-gradient-to-r from-primary-200/30 to-purple-200/30 -top-40 -right-60" />
      <GradientBlob className="w-[400px] h-[400px] bg-gradient-to-r from-cyan-200/30 to-blue-200/30 bottom-0 -left-40" />

      <div className="container-marketing relative">
        <FadeInOnScroll>
          <div className="mx-auto max-w-2xl text-center">
            <motion.span
              className="inline-block text-base font-semibold leading-7 bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Testimonials
            </motion.span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Loved by teams{" "}
              <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                worldwide
              </span>
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              See what our customers have to say about transforming their business with ChatBot Pro.
            </p>
          </div>
        </FadeInOnScroll>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <FadeInOnScroll key={index} delay={index * 0.15}>
              <motion.div
                className="group relative h-full"
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {/* Gradient border effect on hover */}
                <div
                  className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r ${testimonial.gradient} opacity-0 group-hover:opacity-100 blur transition-opacity duration-300`}
                />

                <div className="relative flex h-full flex-col rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200 group-hover:ring-0 transition-all">
                  {/* Quote icon */}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${testimonial.gradient} shadow-lg`}
                  >
                    <Quote className="h-5 w-5 text-white" />
                  </div>

                  {/* Rating */}
                  <div className="mt-4 flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>

                  <blockquote className="mt-4 flex-1">
                    <p className="text-gray-700 leading-relaxed">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>
                  </blockquote>

                  <div className="mt-6 flex items-center gap-4 pt-4 border-t border-gray-100">
                    <div className="relative">
                      <div
                        className={`absolute -inset-1 rounded-full bg-gradient-to-r ${testimonial.gradient} opacity-0 group-hover:opacity-100 blur-sm transition-opacity`}
                      />
                      <Image
                        src={testimonial.author.image}
                        alt={testimonial.author.name}
                        width={48}
                        height={48}
                        className="relative h-12 w-12 rounded-full object-cover ring-2 ring-white"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {testimonial.author.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {testimonial.author.role}
                      </p>
                      <p
                        className={`text-xs font-medium bg-gradient-to-r ${testimonial.gradient} bg-clip-text text-transparent`}
                      >
                        {testimonial.author.company}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
