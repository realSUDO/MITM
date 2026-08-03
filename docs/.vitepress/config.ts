import { defineConfig } from "vitepress";

export default defineConfig({
  title: "MITM AI SDK",
  description: "Man in the Middle AI SDK — TypeScript-first agent SDK with tools, memory, guardrails, handoffs, and tracing.",
  lang: "en-US",

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    ["meta", { name: "theme-color", content: "#6366f1" }],
    ["meta", { property: "og:title", content: "MITM AI SDK" }],
    ["meta", { property: "og:description", content: "TypeScript-first agent SDK — tools, memory, guardrails, handoffs, tracing." }],
  ],

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "mitm-ai",

    nav: [
      { text: "Guide", link: "/guide/quick-start" },
      { text: "API Reference", link: "/api/agent" },
      { text: "npm", link: "https://www.npmjs.com/package/mitm-ai" },
      { text: "GitHub", link: "https://github.com/YOUR_USERNAME/mitm-ai" },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Quick Start", link: "/guide/quick-start" },
          { text: "Providers", link: "/guide/providers" },
        ],
      },
      {
        text: "Core Features",
        items: [
          { text: "Tools", link: "/guide/tools" },
          { text: "Memory & Sessions", link: "/guide/memory" },
          { text: "Guardrails", link: "/guide/guardrails" },
          { text: "Agent Handoffs", link: "/guide/handoffs" },
          { text: "Structured Output", link: "/guide/structured-output" },
        ],
      },
      {
        text: "Observability",
        items: [
          { text: "Events", link: "/guide/events" },
          { text: "Tracing", link: "/guide/tracing" },
          { text: "Reliability", link: "/guide/reliability" },
        ],
      },
      {
        text: "API Reference",
        items: [
          { text: "Agent", link: "/api/agent" },
          { text: "Interfaces", link: "/api/interfaces" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/YOUR_USERNAME/mitm-ai" },
      { icon: "npm", link: "https://www.npmjs.com/package/mitm-ai" },
    ],

    editLink: {
      pattern: "https://github.com/YOUR_USERNAME/mitm-ai/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright 2026 MITM AI SDK",
    },

    search: {
      provider: "local",
    },
  },
});
