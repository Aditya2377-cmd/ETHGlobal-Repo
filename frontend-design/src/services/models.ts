import { AIModel } from '../types';

/**
 * Standard AI Model Catalog on Groq AI Gateway
 * Token costs are transparently mapped to Hedera HBAR & Tinybars
 * 1 HBAR = 100,000,000 tinybars
 */
export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'Groq',
    description: 'Flagship reasoning and instruction-tuned model. Balanced speed and deep analytical precision.',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    tinybarsPer1kInput: 1800,  // ~0.000018 HBAR / 1K tokens
    tinybarsPer1kOutput: 4200, // ~0.000042 HBAR / 1K tokens
    hbarRatePer1mInput: 0.018,
    hbarRatePer1mOutput: 0.042,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'Groq',
    description: 'Ultra-low latency model ideal for rapid summarization, data extraction, and quick queries.',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    tinybarsPer1kInput: 400,
    tinybarsPer1kOutput: 900,
    hbarRatePer1mInput: 0.004,
    hbarRatePer1mOutput: 0.009,
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B MoE',
    provider: 'Groq',
    description: 'Sparse mixture-of-experts model optimized for structured outputs, programming code, and multi-lingual tasks.',
    contextWindow: 32768,
    maxOutputTokens: 4096,
    tinybarsPer1kInput: 1200,
    tinybarsPer1kOutput: 2800,
    hbarRatePer1mInput: 0.012,
    hbarRatePer1mOutput: 0.028,
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B IT',
    provider: 'Groq',
    description: 'High-efficiency open model by Google DeepMind with compact footprint and sharp conversational comprehension.',
    contextWindow: 8192,
    maxOutputTokens: 2048,
    tinybarsPer1kInput: 600,
    tinybarsPer1kOutput: 1400,
    hbarRatePer1mInput: 0.006,
    hbarRatePer1mOutput: 0.014,
  },
];

export const DEFAULT_MODEL_ID = 'llama-3.3-70b-versatile';

export const getModelById = (id: string): AIModel => {
  return AVAILABLE_MODELS.find((m) => m.id === id) || AVAILABLE_MODELS[0];
};

/**
 * Calculate expected charge based on exact token usage
 */
export const calculateCharge = (
  modelId: string,
  promptTokens: number,
  completionTokens: number
) => {
  const model = getModelById(modelId);
  const inputTinybars = Math.ceil((promptTokens / 1000) * model.tinybarsPer1kInput);
  const outputTinybars = Math.ceil((completionTokens / 1000) * model.tinybarsPer1kOutput);
  const totalTinybars = Math.max(100, inputTinybars + outputTinybars); // Min 100 tinybars
  const totalHbar = totalTinybars / 100000000;
  const inputHbar = inputTinybars / 100000000;
  const outputHbar = outputTinybars / 100000000;

  return {
    inputTinybars,
    outputTinybars,
    totalTinybars,
    inputHbar,
    outputHbar,
    totalHbar,
  };
};

