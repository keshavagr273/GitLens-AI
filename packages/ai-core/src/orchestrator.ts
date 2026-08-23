import { ChatMessage, Citation, SourceFile, SymbolNode, CodeChunk } from '@gitlens/shared-types';
import { generateUuid } from '@gitlens/utils';
import { HybridRetriever } from '@gitlens/rag-core';
import { config } from '@gitlens/config';
import { checkPromptSafety, sanitizeAiOutput } from './guardrails';
import { verifyCitations } from './citation-verifier';

export interface OrchestrationContext {
  repositoryId: string;
  sessionId?: string;
  userPrompt: string;
  files: SourceFile[];
  symbols: SymbolNode[];
  chunks: CodeChunk[];
}

export class GroundedAssistantOrchestrator {
  public async processQuery(context: OrchestrationContext): Promise<ChatMessage> {
    const { repositoryId, sessionId = 'default-session', userPrompt, files, symbols, chunks } = context;

    // 1. Guardrail Safety & Scope Screen
    const safety = checkPromptSafety(userPrompt);
    if (!safety.isSafe) {
      return {
        id: `msg-ai-${generateUuid().slice(0, 8)}`,
        sessionId,
        role: 'assistant',
        content: `I cannot fulfill this request because it triggered security guardrails: ${safety.violations.join(', ')}. Please ask a question about the repository's codebase architecture.`,
        citations: [],
        createdAt: new Date().toISOString(),
      };
    }

    if (safety.isOffTopic) {
      return {
        id: `msg-ai-${generateUuid().slice(0, 8)}`,
        sessionId,
        role: 'assistant',
        content: `I am GitLens AI, specialized exclusively in exploring and explaining the architecture, source code, and request flows of this repository. I can only assist with questions regarding the indexed codebase, its modules, API routes, database schemas, and dependencies.

Please ask a question related to this repository (e.g. *'How does document upload work?'*, *'Explain the request flow for /documents'*, *'Where are auth guards implemented?'*).`,
        citations: [],
        createdAt: new Date().toISOString(),
      };
    }

    // 2. Hybrid RAG Retrieval (BM25 + Dense Vectors + Structural Graph Boost)
    const retriever = new HybridRetriever(chunks);
    const searchResults = retriever.search(safety.sanitizedPrompt, 6);

    // 3. Collect candidate citations from retrieved chunks
    const candidateCitations: Citation[] = [];
    for (const res of searchResults) {
      candidateCitations.push({
        file: res.chunk.filePath,
        startLine: res.chunk.startLine,
        endLine: res.chunk.endLine,
        symbol: res.chunk.symbolName || undefined,
        reason: `RRF Score: ${(res.finalScore * 100).toFixed(1)}`,
      });
    }

    let responseText = '';
    const groqKey =
      config.GROQ_API_KEY ||
      config.LLM_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.LLM_API_KEY;

    // 4. Try Live LLM Generation via Groq if key is configured
    if (groqKey && (config.LLM_PROVIDER === 'groq' || groqKey.startsWith('gsk_'))) {
      const candidateModels = [
        config.GROQ_MODEL || 'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'qwen/qwen3.6-27b',
      ];

      // Assemble rich architectural grounding context
      const controllersList = symbols
        .filter((s) => s.name.includes('Controller'))
        .map((s) => s.name)
        .slice(0, 10)
        .join(', ');
      const servicesList = symbols
        .filter((s) => s.name.includes('Service'))
        .map((s) => s.name)
        .slice(0, 10)
        .join(', ');
      const sampleFilesList = files.slice(0, 15).map((f) => f.path).join(', ');

      const contextString = searchResults
        .map(
          (r, i) =>
            `[Source Chunk ${i + 1} | ${r.chunk.filePath}:${r.chunk.startLine}-${r.chunk.endLine}]\n${r.chunk.content}`
        )
        .join('\n\n---\n\n');

      const systemPrompt = `You are GitLens AI, an elite software architect and codebase intelligence assistant strictly grounded in the currently opened repository.

STRICT SCOPE & ANTI-MISUSE DIRECTIVES:
1. You MUST ONLY answer questions directly related to this repository, its architecture, source code files, API routes, database models, and implementation details.
2. DO NOT answer general programming homework, generic LeetCode problems, general math, poems, unrelated tutorials, or standalone coding exercises (e.g. "write a program of finding cycle in linked list", "write binary search", "tell me a story", "what is the capital of France").
3. If the user asks an unrelated general question or attempts to use you as a general-purpose LLM, politely decline by stating that you are specialized exclusively in analyzing and explaining this codebase, and ask them to formulate a question related to this repository.
4. Whenever answering valid questions about the repository, cite specific source files in format [file/path.ts:startLine-endLine].`;

      const userContent = `Repository Overview:
- Total Indexed Files: ${files.length} (including ${sampleFilesList})
- Core Controllers: ${controllersList || 'None detected'}
- Core Services: ${servicesList || 'None detected'}

Relevant Code Spans:
${contextString}

User Query:
${safety.sanitizedPrompt}`;

      for (const model of candidateModels) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey.trim()}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              temperature: 0.3,
              max_tokens: 1024,
            }),
          });

          if (groqRes.ok) {
            const data = (await groqRes.json()) as any;
            let generatedText = data.choices?.[0]?.message?.content;
            if (generatedText) {
              // Strip any Qwen thinking tags if present
              generatedText = generatedText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

              responseText = generatedText;

              // Extract inline citations from LLM response e.g. [apps/api/src/modules/documents/documents.controller.ts:12-25]
              const citationRegex = /\[([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+):(\d+)(?:-(\d+))?\]/g;
              let match: RegExpExecArray | null;
              while ((match = citationRegex.exec(generatedText)) !== null) {
                const file = match[1];
                const startLine = parseInt(match[2], 10);
                const endLine = match[3] ? parseInt(match[3], 10) : startLine + 10;
                candidateCitations.push({
                  file,
                  startLine,
                  endLine,
                  reason: `Cited by ${model}`,
                });
              }
              break; // Successfully obtained completion!
            }
          } else {
            const errBody = await groqRes.text();
            console.warn(`⚠️ Groq model ${model} returned HTTP ${groqRes.status}: ${errBody}`);
          }
        } catch (err) {
          console.warn(`⚠️ Groq request failed with model ${model}:`, err);
        }
      }
    }

    // 5. Fallback Deterministic Synthesis if Groq is unavailable
    if (!responseText) {
      if (searchResults.length === 0) {
        responseText = `I searched the indexed codebase architecture for "${userPrompt}", but did not find matching AST symbols or file definitions.`;
      } else {
        const topMatch = searchResults[0];
        responseText = `Based on static analysis of the ${files.length} indexed files:
- **Primary Matched Component**: \`${topMatch.chunk.symbolName || topMatch.chunk.filePath}\`
- **Location**: \`${topMatch.chunk.filePath}:${topMatch.chunk.startLine}-${topMatch.chunk.endLine}\`

Explore the verified code citations below to inspect implementation details in the editor.`;
      }
    }

    // 6. Post-Generation Citation Verification (100% precision gate)
    const verified = verifyCitations(candidateCitations, files, symbols);

    // 7. Output Sanitization & Secret Redaction
    const cleanContent = sanitizeAiOutput(responseText);

    return {
      id: `msg-ai-${generateUuid().slice(0, 8)}`,
      sessionId,
      role: 'assistant',
      content: cleanContent,
      citations: verified.validCitations,
      createdAt: new Date().toISOString(),
    };
  }
}

export const orchestrator = new GroundedAssistantOrchestrator();
export const aiOrchestrator = orchestrator;
