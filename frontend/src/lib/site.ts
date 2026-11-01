export const siteConfig = {
  name: "ORACY",
  tagline: "Beyond Answers. Towards Excellence.",
  photography: {
    hero: "https://imgcdn.stablediffusionweb.com/2025/1/16/7dfe4116-61b3-41c2-8778-5e9d4b41a83c.jpg",
    preview: "https://www.lightxeditor.com/blog/wp-content/uploads/2026/06/051276882b5a4aaa8fe64a3c40aeb9e7_1024x680.webp?x46858",
    cta: null,
  },
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1",
} as const;

export const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
] as const;

export const MAX_RESUME_MB = 5;
