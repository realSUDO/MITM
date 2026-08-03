# Providers

MITM decouples agents from LLM providers via the `IModelProvider` interface.

## OpenAI (Built-in)

```ts
import { OpenAIProvider } from "mitm-ai";

new OpenAIProvider({
  apiKey: "sk-...",                          // defaults to OPENAI_API_KEY env var
  baseURL: "https://api.openai.com/v1",     // any OpenAI-compatible endpoint
  model: "gpt-4o-mini",                     // default
})
```

Works with any OpenAI-compatible API — OpenRouter, Groq, Together, local Ollama, etc:

```ts
new OpenAIProvider({
  apiKey: "...",
  baseURL: "https://openrouter.ai/api/v1",
  model: "anthropic/claude-3.5-sonnet",
})
```

## Custom Provider

Implement `IModelProvider` for any LLM:

```ts
import type { IModelProvider, IMessage, IModelResponse } from "mitm-ai";

class GeminiProvider implements IModelProvider {
  async chat(
    systemPrompt: string,
    history: IMessage[],
  ): Promise<IModelResponse> {
    // call Google Gemini API
    const response = await callGemini(systemPrompt, history);
    return {
      text: response.text,
      usage: {
        promptTokens: response.usageMetadata.promptTokenCount,
        completionTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      },
    };
  }
}

Agent.builder()
  .setProvider(new GeminiProvider())
  .build();
```

## IModelResponse

Every provider must return:

```ts
interface IModelResponse {
  text: string;          // the model's raw text response
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

Token usage is accumulated into the run trace automatically.
