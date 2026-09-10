import type { Page, Locator } from '@playwright/test';
import {
  SelfHealingDescriptor,
  SelectorStrategy,
  AIConfig,
  EngineConfig,
} from './types';

export interface InteractiveCandidate {
  index: number;
  tagName: string;
  role: string;
  text: string;
  ariaLabel: string;
  testId: string;
  placeholder: string;
  id: string;
  name: string;
  className: string;
  suggestedSelector: string;
}

export interface AIRecoveryResult {
  locator: Locator;
  strategy: SelectorStrategy;
  recoveryEngine: 'ai-remote' | 'ai-local';
  durationMs: number;
}

/**
 * Extracts visible interactive elements from the live browser DOM.
 */
export async function extractInteractiveCandidates(page: Page): Promise<InteractiveCandidate[]> {
  try {
    return await page.evaluate(() => {
      const candidates: any[] = [];
      const selectorQuery = 'button, input, select, textarea, a, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';
      const elements = Array.from(document.querySelectorAll(selectorQuery));

      let idx = 0;
      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        const style = window.getComputedStyle(htmlEl);
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        ) {
          continue;
        }

        const tagName = htmlEl.tagName.toLowerCase();
        const role = htmlEl.getAttribute('role') || '';
        const text = (htmlEl.textContent || (htmlEl as HTMLInputElement).value || '').trim().slice(0, 100);
        const ariaLabel = htmlEl.getAttribute('aria-label') || '';
        const testId = htmlEl.getAttribute('data-testid') || '';
        const placeholder = (htmlEl as HTMLInputElement).placeholder || '';
        const id = htmlEl.id || '';
        const name = (htmlEl as HTMLInputElement).name || '';
        const className = (htmlEl.className && typeof htmlEl.className === 'string') ? htmlEl.className : '';
        const parentCard = htmlEl.closest('[data-testid]')?.getAttribute('data-testid') || '';

        // Formulate deterministic CSS selector for candidate
        let suggestedSelector = '';
        if (testId) {
          suggestedSelector = `[data-testid="${testId}"]`;
        } else if (parentCard && className) {
          const firstClass = className.split(/\s+/)[0];
          suggestedSelector = `[data-testid="${parentCard}"] .${firstClass}`;
        } else if (id) {
          suggestedSelector = `#${id}`;
        } else if (placeholder && (tagName === 'input' || tagName === 'textarea')) {
          suggestedSelector = `${tagName}[placeholder="${placeholder}"]`;
        } else if (ariaLabel) {
          suggestedSelector = `[aria-label="${ariaLabel}"]`;
        } else if (name) {
          suggestedSelector = `${tagName}[name="${name}"]`;
        } else if (text && text.length < 40) {
          suggestedSelector = `${tagName}:has-text("${text.replace(/"/g, '\\"')}")`;
        } else if (className) {
          const firstClass = className.split(/\s+/)[0];
          suggestedSelector = `${tagName}.${firstClass}`;
        } else {
          suggestedSelector = tagName;
        }

        candidates.push({
          index: idx++,
          tagName,
          role,
          text,
          ariaLabel,
          testId: testId || parentCard,
          placeholder,
          id,
          name,
          className,
          suggestedSelector,
        });

        if (candidates.length >= 150) break;
      }

      return candidates;
    });
  } catch (err) {
    return [];
  }
}

/**
 * Tokenizes text and identifiers into clean semantic keywords.
 */
function tokenize(input: string): string[] {
  if (!input) return [];
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase split
    .replace(/[-_.:/]/g, ' ')            // kebab/snake split
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
}

/**
 * Computes token similarity between a set of target keywords and candidate attributes.
 */
function computeSemanticScore(
  descriptor: SelfHealingDescriptor,
  candidate: InteractiveCandidate
): number {
  const targetKeywords = new Set([
    ...tokenize(descriptor.name),
    ...tokenize(descriptor.primary.value),
    ...tokenize(descriptor.aiHint || ''),
    ...descriptor.fallbacks.flatMap((f) => tokenize(f.value)),
  ]);

  const candidateKeywords = [
    ...tokenize(candidate.text),
    ...tokenize(candidate.ariaLabel),
    ...tokenize(candidate.testId),
    ...tokenize(candidate.placeholder),
    ...tokenize(candidate.name),
    ...tokenize(candidate.id),
  ];

  let matches = 0;
  for (const word of candidateKeywords) {
    if (targetKeywords.has(word)) {
      matches += 1.5;
    } else {
      // Substring match
      for (const targetWord of targetKeywords) {
        if (targetWord.length >= 4 && (word.includes(targetWord) || targetWord.includes(word))) {
          matches += 1.0;
          break;
        }
      }
    }
  }

  // Role / tag relevance boost
  const isButtonTarget =
    descriptor.name.toLowerCase().includes('button') ||
    descriptor.primary.value.toLowerCase().includes('button') ||
    descriptor.primary.value.toLowerCase().includes('btn') ||
    descriptor.primary.value.toLowerCase().includes('submit');

  if (isButtonTarget && (candidate.tagName === 'button' || candidate.role === 'button')) {
    matches += 1.2;
  }

  const isInputTarget =
    descriptor.name.toLowerCase().includes('input') ||
    descriptor.name.toLowerCase().includes('field') ||
    descriptor.primary.value.toLowerCase().includes('input');

  if (isInputTarget && (candidate.tagName === 'input' || candidate.tagName === 'textarea')) {
    matches += 1.2;
  }

  return matches;
}

/**
 * Local semantic inference engine: evaluates interactive candidates using token similarity,
 * role weighting, and contextual relevance.
 */
export function queryLocalSemanticEngine(
  descriptor: SelfHealingDescriptor,
  candidates: InteractiveCandidate[]
): { candidate: InteractiveCandidate; confidence: number } | null {
  if (!candidates || candidates.length === 0) return null;

  let bestCandidate: InteractiveCandidate | null = null;
  let highestScore = 0;

  for (const candidate of candidates) {
    const score = computeSemanticScore(descriptor, candidate);
    if (score > highestScore) {
      highestScore = score;
      bestCandidate = candidate;
    }
  }

  // Confidence threshold: requires sufficient semantic resonance
  if (bestCandidate && highestScore >= 1.5) {
    const confidence = Math.min(0.98, Math.max(0.65, highestScore / 4));
    return { candidate: bestCandidate, confidence: Number(confidence.toFixed(2)) };
  }

  return null;
}

/**
 * Queries remote LLM (Gemini / OpenAI / custom) to semantically select the target element.
 */
export async function queryRemoteLLM(
  descriptor: SelfHealingDescriptor,
  candidates: InteractiveCandidate[],
  aiConfig: AIConfig
): Promise<{ selector: string; confidence: number } | null> {
  const apiKey = aiConfig.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  const isGemini = aiConfig.provider === 'gemini' || (!aiConfig.provider && Boolean(process.env.GEMINI_API_KEY));
  const isOpenAI = aiConfig.provider === 'openai' || (!aiConfig.provider && Boolean(process.env.OPENAI_API_KEY));

  if (!apiKey && !aiConfig.endpoint) {
    return null;
  }

  const candidateSummary = candidates.map((c) => ({
    index: c.index,
    tag: c.tagName,
    text: c.text,
    testId: c.testId,
    role: c.role,
    placeholder: c.placeholder,
    aria: c.ariaLabel,
    suggestedSelector: c.suggestedSelector,
  }));

  const systemPrompt = `You are an expert QA Test Automation Agent.
A primary locator in Playwright failed. You must identify which DOM element is the intended target based on semantic meaning.
Return strictly a valid JSON object with the following schema:
{
  "selectedIndex": <number>,
  "suggestedSelector": "<string>",
  "confidence": <number between 0 and 1>,
  "rationale": "<string>"
}`;

  const userPrompt = `Target Element Name: "${descriptor.name}"
Failed Primary Selector: [${descriptor.primary.type}] "${descriptor.primary.value}"
${descriptor.aiHint ? `Semantic Hint: "${descriptor.aiHint}"` : ''}

Candidate Visible Elements on Page:
${JSON.stringify(candidateSummary, null, 2)}

Identify the best matching element and output the JSON response.`;

  try {
    if (isGemini && apiKey) {
      const model = aiConfig.model || 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!response.ok) return null;
      const data: any = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return null;
      const parsed = JSON.parse(rawText);
      const selected = candidates.find((c) => c.index === parsed.selectedIndex);
      return {
        selector: parsed.suggestedSelector || selected?.suggestedSelector || '',
        confidence: parsed.confidence || 0.9,
      };
    } else if (isOpenAI && apiKey) {
      const model = aiConfig.model || 'gpt-4o-mini';
      const endpoint = aiConfig.endpoint || 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) return null;
      const data: any = await response.json();
      const rawText = data?.choices?.[0]?.message?.content;
      if (!rawText) return null;
      const parsed = JSON.parse(rawText);
      const selected = candidates.find((c) => c.index === parsed.selectedIndex);
      return {
        selector: parsed.suggestedSelector || selected?.suggestedSelector || '',
        confidence: parsed.confidence || 0.9,
      };
    }
  } catch (err) {
    // Network or API failure, fallback gracefully
  }

  return null;
}

/**
 * Master AI recovery coordinator:
 * 1. Captures visible interactive DOM elements
 * 2. Queries Remote LLM (if configured) or Local Semantic Intelligence
 * 3. Validates candidate live on the page
 * 4. Returns verified locator and strategy
 */
export async function recoverElementWithAI(
  page: Page,
  descriptor: SelfHealingDescriptor,
  config: EngineConfig
): Promise<AIRecoveryResult | null> {
  const startTime = Date.now();
  const aiConfig: AIConfig = config.ai || {};

  if (aiConfig.enabled === false) {
    return null;
  }

  if (config.verbose) {
    console.warn(`🤖 [AI Semantic Recovery] Initiating AI locator inference for "${descriptor.name}"...`);
  }

  // 1. Extract interactive candidate elements from DOM
  const candidates = await extractInteractiveCandidates(page);
  if (candidates.length === 0) {
    return null;
  }

  let recoveryEngine: 'ai-remote' | 'ai-local' = 'ai-local';
  let candidateSelector = '';
  let confidenceScore = 0.85;

  // 2. Attempt Remote LLM if API Key or Endpoint is present
  const hasRemoteKey = Boolean(aiConfig.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || aiConfig.endpoint);
  if (hasRemoteKey && aiConfig.provider !== 'local') {
    const remoteResult = await queryRemoteLLM(descriptor, candidates, aiConfig);
    if (remoteResult && remoteResult.selector) {
      candidateSelector = remoteResult.selector;
      confidenceScore = remoteResult.confidence;
      recoveryEngine = 'ai-remote';
    }
  }

  // 3. Fallback to Local Semantic Intelligence Engine if remote not used or failed
  if (!candidateSelector) {
    const localResult = queryLocalSemanticEngine(descriptor, candidates);
    if (localResult) {
      candidateSelector = localResult.candidate.suggestedSelector;
      confidenceScore = localResult.confidence;
      recoveryEngine = 'ai-local';
    }
  }

  if (!candidateSelector) {
    return null;
  }

  // 4. Validate Candidate Locator live on the browser DOM
  try {
    const locator = page.locator(candidateSelector).first();
    await locator.waitFor({ state: 'visible', timeout: 2500 });

    const durationMs = Date.now() - startTime;
    if (config.verbose) {
      console.info(
        `🧠 [AI Semantic Recovery] Successfully inferred and verified target for "${descriptor.name}" via ${recoveryEngine} (${candidateSelector}, confidence: ${(confidenceScore * 100).toFixed(0)}%) in ${durationMs}ms`
      );
    }

    return {
      locator,
      strategy: {
        type: 'ai-semantic',
        value: candidateSelector,
        confidence: confidenceScore,
      },
      recoveryEngine,
      durationMs,
    };
  } catch {
    // Inferred locator was not valid/visible on page
    return null;
  }
}
