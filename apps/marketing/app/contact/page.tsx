"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, MessageSquare, Clock, Send } from "lucide-react";

const contactMethods = [
  {
    name: "Sales",
    description: "Talk to our sales team about pricing and enterprise features.",
    email: "sales@chatbotpro.com",
    icon: MessageSquare,
  },
  {
    name: "Support",
    description: "Get help with technical issues or account questions.",
    email: "support@chatbotpro.com",
    icon: Mail,
  },
  {
    name: "Press",
    description: "Media inquiries and press resources.",
    email: "press@chatbotpro.com",
    icon: Phone,
  },
];

const offices = [
  {
    city: "San Francisco",
    address: "100 Market Street, Suite 300",
    country: "United States",
  },
  {
    city: "London",
    address: "25 Old Broad Street",
    country: "United Kingdom",
  },
  {
    city: "Singapore",
    address: "1 Raffles Place, Tower 2",
    country: "Singapore",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
    subject: "sales",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      {/* Hero */}
      <section className="section-padding bg-white">
        <div className="container-marketing">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Get in touch
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Have questions about ChatBot Pro? We'd love to hear from you. Send us a message
              and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="pb-12 bg-white">
        <div className="container-marketing">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {contactMethods.map((method) => (
              <div
                key={method.name}
                className="rounded-2xl bg-gray-50 p-6 text-center ring-1 ring-gray-200"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary-600">
                  <method.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{method.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{method.description}</p>
                <a
                  href={`mailto:${method.email}`}
                  className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {method.email}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="section-padding bg-gray-50">
        <div className="container-marketing">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <Send className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">
                    Message sent successfully!
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">Send us a message</h2>
                  <p className="mt-2 text-gray-600">
                    Fill out the form below and we'll get back to you shortly.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="firstName"
                          className="block text-sm font-medium text-gray-700"
                        >
                          First name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          id="firstName"
                          required
                          value={formData.firstName}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="lastName"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Last name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          id="lastName"
                          required
                          value={formData.lastName}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="company"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Company
                        </label>
                        <input
                          type="text"
                          name="company"
                          id="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Phone (optional)
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          id="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                        What can we help you with?
                      </label>
                      <select
                        name="subject"
                        id="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="sales">Sales inquiry</option>
                        <option value="support">Technical support</option>
                        <option value="partnership">Partnership opportunity</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                        Message
                      </label>
                      <textarea
                        name="message"
                        id="message"
                        rows={4}
                        required
                        value={formData.message}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Sending..." : "Send message"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Offices */}
      <section className="section-padding bg-white">
        <div className="container-marketing">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Our offices</h2>
            <p className="mt-4 text-gray-600">
              Visit us at one of our global locations.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {offices.map((office) => (
              <div key={office.city} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <MapPin className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{office.city}</h3>
                <p className="mt-1 text-sm text-gray-500">{office.address}</p>
                <p className="text-sm text-gray-500">{office.country}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Response time */}
      <section className="py-12 bg-gray-50">
        <div className="container-marketing">
          <div className="flex items-center justify-center gap-4 text-center">
            <Clock className="h-5 w-5 text-primary-600" />
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">Average response time:</span>{" "}
              Under 24 hours for sales inquiries, 4 hours for support.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
