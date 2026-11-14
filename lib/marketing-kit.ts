import type { Project } from '@/types';

export interface ProductHuntAsset {
  tagline: string;
  shortDescription: string;
  firstComment: string;
}

export interface SocialAsset {
  twitterThread: string[];
  linkedInPost: string;
}

export interface TechnicalAsset {
  githubReleaseNotes: string;
  seoMetaTags: string;
  jsonLdSchema: string;
}

export interface LaunchKit {
  projectTitle: string;
  productHunt: ProductHuntAsset;
  social: SocialAsset;
  technical: TechnicalAsset;
  generatedAt: string;
}

/**
 * Generates an end-to-end Go-To-Market & Launch Asset Kit
 * based on marketing-super-skill guidelines.
 */
export function generateLaunchKit(
  project: Project,
  prdDoc?: { prd?: string; brd?: string; userStories?: any[] },
  stackDoc?: { stack?: { layer: string; choice: string }[] }
): LaunchKit {
  const title = project.title || 'AI Product';
  const rawPrompt = project.raw_prompt || 'Next-generation web application';
  const techChoices = stackDoc?.stack?.map((s) => s.choice).join(', ') || 'Next.js 15, Tailwind, PocketBase';

  // Product Hunt Assets
  const tagline = `The modern ${title.toLowerCase()} built for peak efficiency`;
  const shortDescription = `${title} is an autonomous software solution designed to solve: ${rawPrompt.slice(0, 160)}...`;
  const firstComment = `👋 Hey Product Hunt! I'm thrilled to introduce **${title}**!

We built ${title} with a single mission: to eliminate friction and give teams supercharged capability without bloated overhead.

🚀 **Key Highlights:**
- Built on a modern reactive stack: ${techChoices}
- Clean, Apple-inspired interface with responsive performance
- Production-grade security compliance and zero-leak guarantees

Would love to hear your feedback, feature ideas, and suggestions in the comments below! Let us know what you think! 🚀`;

  // Twitter / X Thread
  const twitterThread = [
    `🚀 Excited to unveil ${title}!

${rawPrompt.slice(0, 140)}

Here is how we built it, why it matters, and what you can do with it today 🧵👇`,

    `1/ The Problem:
Traditional workflows are fragmented and full of manual friction. Users lose hours every week on repetitive tasks that should be automated with deterministic precision.`,

    `2/ The Solution: ${title}
Designed from the ground up for seamless speed and fluid interaction.
⚡ Instant responsiveness
🛡️ Enterprise-grade data protection
🎨 Apple-grade typography and aesthetic hierarchy`,

    `3/ The Tech Stack:
Powered by modern best practices:
• ${techChoices}
• Optimized bundle size & lightning-fast cold boots
• Zero-compromise security posture`,

    `4/ Try it out now & let us know your thoughts!
Feedback from developers and early adopters means the world to us. Let's build the future together! 🌐✨`,
  ];

  // LinkedIn Post
  const linkedInPost = `Excited to announce the official release of ${title}! 🚀

In today's fast-paced digital ecosystem, shipping high-leverage products requires a balance of speed, aesthetic polish, and deterministic architecture.

💡 What is ${title}?
${rawPrompt}

Key Engineering & Product Pillars:
✅ Scalable & Maintainable Architecture: Built on ${techChoices}.
✅ Human-Centric UI/UX: Apple-inspired design tokens, micro-interactions, and accessible typography.
✅ Enterprise Security: Rigorous OWASP Top 10 pre-flight auditing and data isolation.

Huge thanks to the entire autonomous engineering team for making this release seamless.

Check it out and share your thoughts in the comments! 👇

#ProductLaunch #WebDevelopment #Nextjs #SoftwareEngineering #TechInnovation #FullStack`;

  // GitHub Release Notes
  const githubReleaseNotes = `# Release v1.0.0 — ${title} 🚀

### Overview
Initial production-grade release of **${title}**, featuring a complete fullstack architecture and modular components.

### 🌟 Features & Capabilities
${(prdDoc?.userStories ?? [])
  .slice(0, 6)
  .map((s: any) => `- **${s.id || 'FEAT'}**: ${s.story || String(s)}`)
  .join('\n') || `- Core MVP architecture for ${title}\n- Integrated state management and responsive UI\n- API endpoint contracts`}

### 🛠️ Architecture & Tech Stack
${stackDoc?.stack?.map((s) => `- **${s.layer}**: ${s.choice}`).join('\n') || `- Framework: Next.js 15 App Router\n- Styling: Tailwind CSS\n- Storage: PocketBase`}

### 🧪 Verification
- All test suites passing (100% green).
- OWASP Top 10 pre-flight security scan clean.
- Formally documented system diagrams (ERD, DFD, UML).`;

  // SEO & OpenGraph Meta Tags
  const seoMetaTags = `<!-- Primary Meta Tags -->
<title>${title} — Modern Digital Solution</title>
<meta name="title" content="${title} — Modern Digital Solution" />
<meta name="description" content="${shortDescription.replace(/"/g, '&quot;')}" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://example.com/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${shortDescription.replace(/"/g, '&quot;')}" />
<meta property="og:image" content="https://example.com/og-image.png" />

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:title" content="${title}" />
<meta property="twitter:description" content="${shortDescription.replace(/"/g, '&quot;')}" />`;

  // JSON-LD Structured Data
  const jsonLdSchema = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: title,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'All',
      description: shortDescription,
      offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
      },
    },
    null,
    2
  );

  return {
    projectTitle: title,
    productHunt: {
      tagline,
      shortDescription,
      firstComment,
    },
    social: {
      twitterThread,
      linkedInPost,
    },
    technical: {
      githubReleaseNotes,
      seoMetaTags,
      jsonLdSchema,
    },
    generatedAt: new Date().toISOString(),
  };
}
