import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog - ChatBot Pro",
  description:
    "Stay updated with the latest insights on AI chatbots, customer experience, and conversational AI from the ChatBot Pro team.",
};

const posts = [
  {
    slug: "introducing-gpt4o-integration",
    title: "Introducing GPT-4o Integration: Faster, Smarter Chatbots",
    excerpt:
      "We're excited to announce native GPT-4o support in ChatBot Pro, bringing lightning-fast responses and improved reasoning to your chatbots.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
    author: {
      name: "Sarah Kim",
      role: "CTO",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    category: "Product",
    date: "January 25, 2025",
    readTime: "5 min read",
  },
  {
    slug: "scaling-customer-support-with-ai",
    title: "How to Scale Customer Support Without Scaling Costs",
    excerpt:
      "Learn how businesses are using AI chatbots to handle 80% of customer inquiries automatically while improving satisfaction scores.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop",
    author: {
      name: "Alex Thompson",
      role: "CEO",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    category: "Best Practices",
    date: "January 20, 2025",
    readTime: "8 min read",
  },
  {
    slug: "building-effective-knowledge-bases",
    title: "Building Effective Knowledge Bases for AI Chatbots",
    excerpt:
      "A comprehensive guide to structuring your documentation and content for optimal AI chatbot performance and accuracy.",
    image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800&h=400&fit=crop",
    author: {
      name: "Emily Chen",
      role: "VP of Product",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    category: "Guides",
    date: "January 15, 2025",
    readTime: "10 min read",
  },
  {
    slug: "omnichannel-strategy-2025",
    title: "Omnichannel Customer Support Strategy for 2025",
    excerpt:
      "Discover why meeting customers where they are is crucial and how to implement a seamless omnichannel experience.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop",
    author: {
      name: "Marcus Johnson",
      role: "VP of Engineering",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    },
    category: "Strategy",
    date: "January 10, 2025",
    readTime: "7 min read",
  },
  {
    slug: "measuring-chatbot-success",
    title: "The Metrics That Matter: Measuring Chatbot Success",
    excerpt:
      "Beyond resolution rate: the key performance indicators you should track to ensure your chatbot delivers real value.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop",
    author: {
      name: "Sarah Kim",
      role: "CTO",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    category: "Analytics",
    date: "January 5, 2025",
    readTime: "6 min read",
  },
  {
    slug: "chatbot-security-best-practices",
    title: "Security Best Practices for Enterprise Chatbots",
    excerpt:
      "How to ensure your AI chatbot meets enterprise security requirements while still delivering great experiences.",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=400&fit=crop",
    author: {
      name: "Alex Thompson",
      role: "CEO",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    category: "Security",
    date: "December 28, 2024",
    readTime: "9 min read",
  },
];

const categories = ["All", "Product", "Best Practices", "Guides", "Strategy", "Analytics", "Security"];

export default function BlogPage() {
  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <>
      {/* Hero */}
      <section className="section-padding bg-white">
        <div className="container-marketing">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Blog
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Insights, guides, and best practices for building exceptional AI-powered
              customer experiences.
            </p>
          </div>

          {/* Categories */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  category === "All"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="pb-12 bg-white">
        <div className="container-marketing">
          <Link href={`/blog/${featuredPost?.slug}`} className="group block">
            <article className="relative overflow-hidden rounded-2xl bg-gray-900">
              <Image
                src={featuredPost?.image ?? ""}
                alt={featuredPost?.title ?? ""}
                width={1200}
                height={600}
                className="h-[400px] w-full object-cover opacity-60 transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <span className="inline-flex w-fit rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
                  {featuredPost?.category}
                </span>
                <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
                  {featuredPost?.title}
                </h2>
                <p className="mt-3 max-w-2xl text-lg text-gray-300">{featuredPost?.excerpt}</p>
                <div className="mt-6 flex items-center gap-4">
                  <Image
                    src={featuredPost?.author.image ?? ""}
                    alt={featuredPost?.author.name ?? ""}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-white">{featuredPost?.author.name}</p>
                    <p className="text-gray-400">
                      {featuredPost?.date} · {featuredPost?.readTime}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </Link>
        </div>
      </section>

      {/* Other Posts */}
      <section className="section-padding bg-gray-50">
        <div className="container-marketing">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {otherPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="h-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      width={400}
                      height={200}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900">
                      {post.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
                    <div className="mt-4 flex items-center gap-3">
                      <Image
                        src={post.author.image}
                        alt={post.author.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <div className="text-xs">
                        <p className="font-medium text-gray-900">{post.author.name}</p>
                        <p className="text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readTime}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {/* Load more */}
          <div className="mt-12 text-center">
            <button className="btn-secondary">
              Load more articles
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="section-padding bg-primary-600">
        <div className="container-marketing">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Subscribe to our newsletter
            </h2>
            <p className="mt-4 text-lg text-primary-100">
              Get the latest articles, guides, and product updates delivered to your inbox.
            </p>
            <form className="mt-8 flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-lg border-0 px-4 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-600 shadow-sm hover:bg-primary-50"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
