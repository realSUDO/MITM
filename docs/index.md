---
layout: home

hero:
  name: "MITM AI SDK"
  text: "Man in the Middle"
  tagline: TypeScript-first agent SDK — tools, memory, guardrails, handoffs, and tracing. Built for production.
  image:
    src: /logo.svg
    alt: MITM AI SDK
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/realsudo/mitm-ai
    - theme: alt
      text: npm install
      link: https://www.npmjs.com/package/mitm-ai

features:
  - icon: 
      src: /icons/tools.svg
    title: Tools & Validation
    details: Define typed tools with input schemas, automatic validation, retries, and timeouts. No boilerplate.

  - icon:
      src: /icons/memory.svg
    title: Memory & Sessions
    details: Multi-turn conversations with pluggable adapters. In-memory, file-based, or bring your own.

  - icon:
      src: /icons/guardrails.svg
    title: Guardrails
    details: Input, output, and per-tool guardrails. Block, modify, or pass through. Runs at every layer.

  - icon:
      src: /icons/handoff.svg
    title: Agent Handoffs
    details: Delegate tasks between agents with context preservation and automatic loop detection.

  - icon:
      src: /icons/trace.svg
    title: Tracing
    details: Full run traces with step timing, token usage, tool calls, handoffs, and errors.

  - icon:
      src: /icons/provider.svg
    title: Provider Abstraction
    details: Swap LLM providers with one line. OpenAI built-in. Implement IModelProvider for any other.
---
