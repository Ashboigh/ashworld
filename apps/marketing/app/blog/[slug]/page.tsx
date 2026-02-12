import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, Share2, Twitter, Linkedin, Facebook } from "lucide-react";
import { CTA } from "@/components/cta";

// This would typically come from a CMS or database
const posts: Record<string, {
  title: string;
  excerpt: string;
  image: string;
  author: { name: string; role: string; image: string };
  category: string;
  date: string;
  readTime: string;
  content: string;
}> = {
  "introducing-gpt4o-integration": {
    title: "Introducing GPT-4o Integration: Faster, Smarter Chatbots",
    excerpt:
      "We're excited to announce native GPT-4o support in ChatBot Pro, bringing lightning-fast responses and improved reasoning to your chatbots.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=600&fit=crop",
    author: {
      name: "Sarah Kim",
      role: "CTO",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    category: "Product",
    date: "January 25, 2025",
    readTime: "5 min read",
    content: `
Today, we're thrilled to announce the integration of GPT-4o into ChatBot Pro, marking a significant leap forward in AI-powered customer experiences.

## What is GPT-4o?

GPT-4o is OpenAI's latest multimodal model, designed to provide faster responses while maintaining the high-quality reasoning capabilities that GPT-4 is known for. The "o" stands for "omni," reflecting its ability to process and generate text, images, and audio.

## What This Means for Your Chatbots

### Lightning-Fast Responses

GPT-4o delivers responses up to 2x faster than previous models. This means your customers get answers almost instantly, dramatically improving the user experience and reducing wait times.

### Improved Understanding

The enhanced model demonstrates better comprehension of nuanced queries, context retention across long conversations, and more accurate responses to complex questions.

### Cost Efficiency

Despite its improved capabilities, GPT-4o is more cost-effective to run, which means you can serve more customers without increasing your operational costs.

## How to Enable GPT-4o

Enabling GPT-4o for your chatbots is simple:

1. Navigate to your chatbot settings
2. Select "AI Model" from the configuration panel
3. Choose "GPT-4o" from the dropdown menu
4. Save your changes

Your chatbot will immediately begin using the new model for all conversations.

## Best Practices

To get the most out of GPT-4o, we recommend:

- **Update your system prompts**: Take advantage of the improved reasoning by providing more detailed instructions
- **Review your knowledge base**: Ensure your documents are well-structured for optimal retrieval
- **Test thoroughly**: While GPT-4o is more capable, always test new configurations before deploying to production

## What's Next

This is just the beginning. We're actively working on additional integrations and features that will further enhance your chatbot capabilities. Stay tuned for updates on Claude 3.5 integration, advanced analytics, and more.

Have questions about the GPT-4o integration? [Contact our support team](/contact) or visit our [documentation](#).
    `,
  },
  "scaling-customer-support-with-ai": {
    title: "How to Scale Customer Support Without Scaling Costs",
    excerpt:
      "Learn how businesses are using AI chatbots to handle 80% of customer inquiries automatically while improving satisfaction scores.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop",
    author: {
      name: "Alex Thompson",
      role: "CEO",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    category: "Best Practices",
    date: "January 20, 2025",
    readTime: "8 min read",
    content: `
As businesses grow, so does the volume of customer inquiries. Traditional approaches to scaling support—hiring more agents—quickly become unsustainable. AI chatbots offer a better way.

## The Challenge of Scaling Support

Most businesses face a common dilemma: customer support costs grow linearly with customer base, while revenue growth often plateaus. This creates pressure to either:

- Compromise on support quality
- Accept lower margins
- Find a more efficient solution

## The AI Solution

AI chatbots can handle the majority of routine inquiries, freeing human agents to focus on complex issues that truly require their expertise.

### Real Results

Our customers have seen impressive results:

- **80% automation rate** for common inquiries
- **45% reduction** in average response time
- **23% improvement** in customer satisfaction scores
- **60% lower** cost per interaction

## Implementation Strategy

### Start with High-Volume, Low-Complexity Queries

Identify the questions your team answers most frequently. These are typically:

- Account and billing inquiries
- Password resets and login issues
- Product information and pricing
- Order status and tracking
- Return and refund policies

### Build a Comprehensive Knowledge Base

Your chatbot is only as good as the information it has access to. Invest time in creating:

- Clear, concise FAQ documents
- Step-by-step guides for common processes
- Product documentation and specifications

### Design Effective Escalation Paths

Not every query can be handled by AI. Design clear escalation paths that:

- Recognize when human intervention is needed
- Capture relevant context for the human agent
- Ensure smooth handoffs without customer frustration

### Continuous Improvement

Monitor your chatbot's performance and continuously refine:

- Review conversations that resulted in escalation
- Update knowledge bases with new information
- A/B test different conversation flows

## The Human Touch

AI chatbots aren't meant to replace human support entirely. Instead, they create a hybrid model where:

- AI handles routine, repetitive queries
- Humans focus on complex, emotionally sensitive issues
- Customers get faster responses overall
- Agents have more fulfilling work

## Getting Started

Ready to scale your support with AI? [Start your free trial](/register) or [contact our sales team](/contact) to learn how ChatBot Pro can help your business.
    `,
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: `${post.title} - ChatBot Pro Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) {
    return (
      <div className="section-padding">
        <div className="container-marketing text-center">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <Link href="/blog" className="mt-4 text-primary-600 hover:text-primary-700">
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <section className="pt-8 pb-12 bg-white">
        <div className="container-marketing">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to blog
          </Link>

          <div className="mt-8 max-w-3xl">
            <span className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
              {post.category}
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-4 text-xl text-gray-600">{post.excerpt}</p>

            <div className="mt-8 flex items-center gap-4">
              <Image
                src={post.author.image}
                alt={post.author.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-gray-900">{post.author.name}</p>
                <p className="text-sm text-gray-500">
                  {post.author.role} · {post.date}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      <div className="container-marketing pb-12">
        <Image
          src={post.image}
          alt={post.title}
          width={1200}
          height={600}
          className="w-full rounded-2xl object-cover"
        />
      </div>

      {/* Content */}
      <section className="pb-16 bg-white">
        <div className="container-marketing">
          <div className="mx-auto max-w-3xl">
            <article className="prose prose-lg prose-gray max-w-none prose-headings:font-bold prose-a:text-primary-600">
              {post.content.split("\n").map((paragraph, i) => {
                if (paragraph.startsWith("## ")) {
                  return (
                    <h2 key={i} className="mt-8 text-2xl font-bold text-gray-900">
                      {paragraph.replace("## ", "")}
                    </h2>
                  );
                }
                if (paragraph.startsWith("### ")) {
                  return (
                    <h3 key={i} className="mt-6 text-xl font-bold text-gray-900">
                      {paragraph.replace("### ", "")}
                    </h3>
                  );
                }
                if (paragraph.startsWith("- ")) {
                  return (
                    <li key={i} className="text-gray-700">
                      {paragraph.replace("- ", "")}
                    </li>
                  );
                }
                if (paragraph.match(/^\d+\. /)) {
                  return (
                    <li key={i} className="text-gray-700">
                      {paragraph.replace(/^\d+\. /, "")}
                    </li>
                  );
                }
                if (paragraph.trim()) {
                  return (
                    <p key={i} className="text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  );
                }
                return null;
              })}
            </article>

            {/* Share */}
            <div className="mt-12 border-t pt-8">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">Share this article</p>
                <div className="flex gap-3">
                  <a
                    href="#"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a
                    href="#"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href="#"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Author card */}
            <div className="mt-8 rounded-2xl bg-gray-50 p-6">
              <div className="flex items-start gap-4">
                <Image
                  src={post.author.image}
                  alt={post.author.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-gray-900">{post.author.name}</p>
                  <p className="text-sm text-gray-500">{post.author.role}</p>
                  <p className="mt-2 text-sm text-gray-600">
                    Building the future of AI-powered customer experiences at ChatBot Pro.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
}
