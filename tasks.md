# GitLens AI — Tasks, Milestones & Work Breakdown Structure (WBS)

**Version:** 1.0 | **Status:** Approved / Actionable Execution Plan | **Last Updated:** 2026-08-23  
**Scope:** Milestone 1 (Foundation) through Milestone 10 (Productionization)  

Each task is defined with: **Task ID**, **Title**, **Detailed Description & Acceptance Criteria**, **Target Package / File Path**, **Dependencies**, and **T-shirt Estimate** ($S \le 0.5\text{d}, M \approx 1\text{d}, L \approx 2\text{--}3\text{d}, XL > 3\text{d}$).

---

## Milestone 1 — Foundation & Monorepo Infrastructure

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M1-01** | Monorepo & TypeScript Scaffold | Root (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`) | Initialize pnpm monorepo with `apps/web`, `apps/api`, `workers/analyzer`, `packages/shared-types`, `packages/parser-core`, `packages/graph-core`, `packages/llm`, `packages/config`, `packages/utils`. Configure strict TypeScript project references, ESLint, Prettier, and root build/typecheck scripts. | — | M |
| **M1-02** | Next.js 14 Web App Scaffold | `apps/web` | Next.js App Router scaffold with TypeScript, Tailwind CSS, Lucide icons, Radix UI primitives, dark mode theme tokens, and `/health` page. | M1-01 | S |
| **M1-03** | Fastify API Server Scaffold | `apps/api` | Fastify v4 server with `@fastify/cors`, `@fastify/sensible`, Pino logger with `requestId` correlation, Zod error interceptor, and `GET /health` endpoint with DB/Redis liveness checks. | M1-01 | M |
| **M1-04** | PostgreSQL + pgvector DDL & ORM | `packages/database` or `apps/api/src/db` | Complete Drizzle/Prisma migrations creating `users`, `repositories`, `repository_analyses`, `files`, `symbols`, `graph_edges`, `api_routes`, `technologies`, `code_chunks`, `chat_sessions`, `chat_messages` tables with HNSW and GIN indexes. | M1-01 | L |
| **M1-05** | Redis Client & BullMQ Base | `packages/config`, `apps/api` | Shared ioredis connection pool wrapper with health checks, reconnection strategies, and BullMQ queue factory. | M1-01 | S |
| **M1-06** | Docker Local Environment | `docker/docker-compose.dev.yml` | Docker Compose setup containing `pgvector/pgvector:pg16` on port `5432` and `redis:7-alpine` on port `6379` with persistent volumes. | M1-04 | S |
| **M1-07** | Zod Environment Config Engine | `packages/config` | Strict schema validation for `.env` variables (`DATABASE_URL`, `REDIS_URL`, `LLM_API_KEY`, `GITHUB_TOKEN`, etc.) preventing application boot on invalid configuration. | M1-03 | S |
| **M1-08** | Basic Repository CRUD API | `apps/api/src/modules/repositories` | `POST /api/repositories` (validates GitHub URL, inserts row into `repositories` table), `GET /api/repositories/:id`. | M1-03, M1-04 | M |

**Milestone 1 Exit Criteria:**
- `docker compose -f docker/docker-compose.dev.yml up -d` boots Postgres with `vector` extension and Redis.
- `pnpm -r typecheck` and `pnpm -r lint` succeed with zero errors across all workspaces.
- `POST /api/repositories` successfully validates URL and creates a durable database record.

---

## Milestone 2 — GitHub Ingestion & Asynchronous Worker Pipeline

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M2-01** | Strict GitHub URL Validator | `packages/utils/src/github-url.ts` | Regex & URL parser validating `https://github.com/:owner/:repo`. Rejects internal IPs, non-HTTPS protocols, and malformed characters. Unit tests covering 20+ valid/invalid/SSRF permutations. | M1-08 | S |
| **M2-02** | Octokit Metadata Client | `workers/analyzer/src/ingestion/metadata.ts` | Typed wrapper fetching repository metadata (owner, name, default branch, language breakdown, size in KB, and current HEAD commit SHA). Typed error mapping for 404, 403 rate limits. | M2-01 | M |
| **M2-03** | Recursive Tree Ingestion & Fallback | `workers/analyzer/src/ingestion/tree.ts` | Fetches full Git tree at pinned SHA (`/git/trees/:sha?recursive=1`). Detects `truncated: true` and activates breadth-first iterative directory fetcher. Rate-limit backoff handler. | M2-02 | L |
| **M2-04** | Multi-Tier File Filtering Engine | `workers/analyzer/src/filtering/index.ts` | Filters out binaries (`.png`, `.wasm`, `.zip`), vendor directories (`node_modules`, `dist`, `build`, `.git`), minified files (entropy/line-length heuristics), and files > 500KB. | M2-03 | M |
| **M2-05** | Blob Ingestion & SHA-256 Hashing | `workers/analyzer/src/ingestion/blobs.ts` | Streams file content blobs from GitHub API, calculates SHA-256 `content_hash`, and batch inserts into `files` table linked to `analysis_id`. | M2-04 | M |
| **M2-06** | BullMQ Analysis Producer & Job Lifecycle | `apps/api/src/modules/analysis` | `POST /api/repositories/:id/analyze` creates `repository_analyses` row and enqueues job in BullMQ `repo-analysis` queue. Handles deduplication by repo ID + commit SHA. | M2-05 | M |
| **M2-07** | Analyzer Worker Daemon | `workers/analyzer/src/worker.ts` | BullMQ worker daemon processing jobs, managing lifecycle (`QUEUED` $\rightarrow$ `RUNNING` $\rightarrow$ `COMPLETED` / `FAILED`), recording duration metrics, and publishing progress events to Redis. | M2-06 | L |
| **M2-08** | Real-Time SSE Progress Stream | `apps/api/src/modules/analysis/progress.ts` | `GET /api/analyses/:id/progress` Server-Sent Events endpoint streaming real-time stage updates, percentages, and processed file counts. | M2-07 | M |

**Milestone 2 Exit Criteria:**
- Pasting `https://github.com/expressjs/express` enqueues an analysis job.
- Worker fetches, filters, and persists file metadata and content hashes without blocking Fastify HTTP threads.
- SSE stream emits staged progress (`FETCHING` $\rightarrow$ `FILTERING` $\rightarrow$ `FINALIZING`) to client.

---

## Milestone 3 — Tree-sitter Static Analysis & Symbol Engine

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M3-01** | Parser Core & WebAssembly Loader | `packages/parser-core/src/loader.ts` | Initializes Tree-sitter WASM runtime and compiles grammar loaders for TypeScript, TSX, JavaScript, Python, and Go. | M2-05 | L |
| **M3-02** | AST Symbol Extraction | `packages/parser-core/src/symbols.ts` | Tree-sitter S-expression queries extracting functions, methods, classes, interfaces, types, enums, variables, components with start/end lines, columns, parent IDs, and signatures. | M3-01 | XL |
| **M3-03** | Import / Export Resolution Engine | `packages/parser-core/src/imports.ts` | Extracts named, default, namespace imports and re-exports. Resolves relative paths (`./`, `../`), tsconfig alias paths (`@/*`), and index file lookups. External packages map to external module nodes. | M3-02 | L |
| **M3-04** | Static Call Graph Extractor | `packages/parser-core/src/calls.ts` | Identifies `CallExpression` and `MemberExpression` AST nodes. Binds calls to imported symbols in lexical scope. Grades confidence: `static` (unambiguous) vs. `inferred` (name match). | M3-03 | L |
| **M3-05** | Class Inheritance & Interface Realization | `packages/parser-core/src/heritage.ts` | Extracts `EXTENDS` (class inheritance) and `IMPLEMENTS` (interface realization) edges from AST heritage clauses. | M3-02 | S |
| **M3-06** | Code Complexity & Metrics Engine | `packages/parser-core/src/metrics.ts` | Computes cyclomatic complexity estimates (branch node counting: `if`, `else`, `case`, `for`, `while`, `catch`, `?`), LOC, and parameter counts per symbol/file. | M3-02 | M |
| **M3-07** | Per-File Parse Fault Isolation | `packages/parser-core/src/parser.ts` | Wraps AST parsing in per-file try/catch handlers. Records errors in `files.error` column, logs warnings, and ensures analysis continues for the rest of the repository. | M3-02 | S |
| **M3-08** | Synthetic AST Test Fixture Suite | `tests/fixtures/parser` | Test suite with synthetic repos: clean Express app, nested TS interfaces, circular imports, JSX components, and deliberately corrupted syntax files. | M3-02 | M |

**Milestone 3 Exit Criteria:**
- $\ge 95\%$ of symbols and imports in test fixture repositories extracted with exact line/column coordinates.
- Broken syntax in one file generates an isolated error log without halting repository analysis.

---

## Milestone 4 — Graph Construction & Graph Algorithms

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M4-01** | Graph Core Package & Model | `packages/graph-core/src/graph.ts` | Directed Multigraph $\mathcal{G} = (\mathcal{V}, \mathcal{E})$ data structure supporting typed nodes (`file`, `symbol`, `route`, `table`, `infra`) and typed edges (`IMPORTS`, `CALLS`, `EXTENDS`, `ROUTES_TO`, `READS`, `WRITES`). | M3-03 | M |
| **M4-02** | Graph Edge Ingestion Pipeline | `workers/analyzer/src/graph/builder.ts` | Constructs graph edges from AST parser output and batch persists them into `graph_edges` table with confidence tags. | M4-01 | M |
| **M4-03** | Traversal & Reachability Utilities | `packages/graph-core/src/traversal.ts` | Depth-first search (DFS) and breadth-first search (BFS) utilities for dependency tree generation, forward/reverse impact queries, and subgraph extraction. | M4-01 | M |
| **M4-04** | Tarjan's SCC Cycle Detection Engine | `packages/graph-core/src/cycles.ts` | Implements Tarjan's Strongly Connected Components algorithm. Flags circular dependency cycles and returns component clusters with break recommendations. | M4-03 | M |
| **M4-05** | PageRank & Architectural Centrality | `packages/graph-core/src/centrality.ts` | Computes degree centrality and PageRank ($\alpha=0.85$). Evaluates architectural importance score: $\text{Score} = 2 \cdot \text{InDegree} + 5 \cdot \text{RouteRefs} + \text{Exports} + 3 \cdot \text{PageRank}$. | M4-03 | M |
| **M4-06** | Graph REST API | `apps/api/src/modules/graph` | `GET /api/repositories/:id/graph?mode=architecture\|dependency\|flow` returning React-Flow-ready nodes and edges payload with Redis caching. | M4-02 | M |

**Milestone 4 Exit Criteria:**
- `GET /api/repositories/:id/graph` returns complete node/edge topology in $< 100\text{ms}$ from Redis cache.
- Circular dependencies in fixture repo are identified into isolated SCC clusters.

---

## Milestone 5 — Visual Workspace & Interactive Canvas

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M5-01** | Three-Pane Responsive Workspace Shell | `apps/web/features/repository/WorkspaceLayout.tsx` | Top bar (Repo info, commit SHA, branch selector, search, analysis badge), Left pane (File & symbol explorer), Center pane (Canvas), Right pane (AI Chat), Bottom pane (Monaco Code Viewer). | M1-02 | M |
| **M5-02** | Virtualized File & Symbol Tree | `apps/web/features/repository/FileTree.tsx` | High-performance virtualized file tree component supporting 10,000+ nodes with language icons, search filter, and symbol expander. | M5-01, M2-05 | M |
| **M5-03** | React Flow Architecture Canvas | `apps/web/features/architecture/GraphCanvas.tsx` | React Flow (@xyflow/react) implementation with custom node components (`ModuleNode`, `FileNode`, `RouteNode`, `DatabaseNode`), Dagre/ELK auto-layout, minimap, and smooth pan/zoom. | M5-01, M4-06 | L |
| **M5-04** | Node Inspection Sidebar | `apps/web/features/architecture/NodeDetails.tsx` | Clicking a node displays symbol declarations, cyclomatic complexity, incoming/outgoing dependencies, and detected technology tags. | M5-03 | M |
| **M5-05** | Dependency Highlighting Engine | `apps/web/features/architecture/useHighlightDeps.ts` | Toggles dimming of unrelated nodes while highlighting upstream (dependents) and downstream (dependencies) edges in distinctive accent colors. | M5-04 | S |
| **M5-06** | Module Clustering & Collapse | `apps/web/features/architecture/ModuleCluster.tsx` | Collapses directory clusters into compact module group nodes without breaking edge routing. | M5-03 | M |
| **M5-07** | Graph Omnibar Search | `apps/web/features/architecture/GraphSearch.tsx` | Fuzzy search for symbols and files with keyboard shortcuts (`Cmd+K`); zooms and centers the canvas on selected node. | M5-03 | M |
| **M5-08** | Monaco Code Viewer Integration | `apps/web/features/code-viewer/MonacoViewer.tsx` | Read-only Monaco Editor instance with VS Code theme, syntax highlighting, minimap, line numbering, and custom line-range highlight decorations. | M5-01 | M |
| **M5-09** | Deep Link Navigation Engine | `apps/web/lib/stores/useWorkspaceStore.ts` | Clicking a symbol, node, or citation opens Monaco Viewer scrolled to the exact line range with a glowing highlight. | M5-08 | S |
| **M5-10** | Real-Time SSE Progress UI | `apps/web/features/repository/AnalysisProgress.tsx` | Visual progress bar with animated stage milestones, files counter, and auto-dismiss upon completion. | M5-01, M2-08 | M |

**Milestone 5 Exit Criteria:**
- Full MVP exploration loop operates seamlessly: Submit GitHub URL $\rightarrow$ SSE Progress $\rightarrow$ Render Tree & Graph $\rightarrow$ Click Node $\rightarrow$ Monaco opens at exact line range.

---

## Milestone 6 — API Route Extraction & Request-Flow Traversal

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M6-01** | Express Route Extraction Engine | `workers/analyzer/src/detectors/express.ts` | AST parser detecting `app.get()`, `router.post()`, `router.route().get()` invocations with HTTP method, path string literal, and handler symbol. | M3-02 | M |
| **M6-02** | Fastify Route Extraction Engine | `workers/analyzer/src/detectors/fastify.ts` | AST parser detecting `fastify.get()`, `fastify.post()`, `fastify.route({...})` route registrations. | M6-01 | S |
| **M6-03** | Nested Router Mount Prefix Resolver | `workers/analyzer/src/detectors/router-composition.ts` | Recursively resolves `app.use('/prefix', subRouter)` hierarchies into canonical fully-qualified endpoint paths. | M6-01 | M |
| **M6-04** | Route-to-Handler Linker (`ROUTES_TO`) | `workers/analyzer/src/graph/routes-linker.ts` | Maps handler identifier to its declaring symbol node; creates `ROUTES_TO` graph edge; persists into `api_routes` table. | M6-01, M3-03 | M |
| **M6-05** | API Routes Explorer UI | `apps/web/features/request-flow/RoutesList.tsx` | Workspace panel listing detected endpoints grouped by method/tag with instant search. | M6-04 | S |
| **M6-06** | Constrained Flow Traversal Engine | `packages/graph-core/src/flow-tracer.ts` | Depth-limited traversal tracing `Route` $\rightarrow$ `Handler` $\rightarrow$ `Service` $\rightarrow$ `Repository` $\rightarrow$ `Database Table` with hop confidence calculations. | M6-04, M4-03 | L |
| **M6-07** | Visual Request-Flow Canvas | `apps/web/features/request-flow/FlowCanvas.tsx` | Stepper and interactive flowchart rendering request execution steps; dashed lines for inferred hops; hop click opens source. | M6-06, M5-03 | M |

**Milestone 6 Exit Criteria:**
- In fixture Express app, `POST /orders` is traced through Controller $\rightarrow$ Service $\rightarrow$ Repository $\rightarrow$ Database with correct confidence ratings.

---

## Milestone 7 — Code-Aware Semantic & Lexical RAG

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M7-01** | AST-Guided Semantic Chunker | `workers/analyzer/src/embeddings/chunker.ts` | Chunks source code along AST function/class boundaries; prepends file and symbol context headers; splits oversized functions (> 512 tokens) with 50-token overlap. | M3-02 | L |
| **M7-02** | Batched Embedding Pipeline | `workers/analyzer/src/embeddings/embedder.ts` | Batched embedding requests via provider abstraction (`text-embedding-3-small` 1536d) with exponential backoff and rate-limit throttling. | M7-01 | M |
| **M7-03** | pgvector HNSW Storage & Indexing | `workers/analyzer/src/embeddings/storage.ts` | Upserts chunk vectors into `code_chunks` table; builds/maintains HNSW cosine distance index (`m=16, ef_construction=64`). | M7-02 | M |
| **M7-04** | Lexical Search Engine (tsvector + pg_trgm) | `apps/api/src/modules/search/lexical.ts` | Full-text tsquery search and trigram string similarity queries targeting exact identifiers, camelCase terms, and symbol names. | M7-03 | M |
| **M7-05** | Reciprocal Rank Fusion (RRF) Hybrid Retriever | `apps/api/src/modules/search/retriever.ts` | Fuses vector similarity rankings, lexical search rankings, and graph centrality weights using RRF ($k=60$) into top-k relevant chunks. | M7-04 | L |
| **M7-06** | Code Retrieval Evaluation Benchmark | `tests/evaluation/retrieval-eval.ts` | Automated benchmark running 50+ curated questions with known ground-truth citations; verifies $\text{Hit}@5 \ge 80\%$. | M7-05 | L |

**Milestone 7 Exit Criteria:**
- Hybrid retriever yields $\ge 80\% \text{ Hit}@5$ accuracy on evaluation suite.
- Re-analysis of unchanged files skips embedding generation using SHA-256 `content_hash` matching.

---

## Milestone 8 — Grounded AI Assistant & Tool Execution

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M8-01** | LLM Provider Gateway & Streaming Adapter | `packages/llm/src/gateway.ts` | Unified provider interface supporting OpenAI, Anthropic Claude, Gemini, and Groq with streaming token delivery and JSON schema mode. | M1-07 | M |
| **M8-02** | Backend-Controlled Tool Execution Layer | `apps/api/src/modules/chat/tools.ts` | Implements `search_code`, `get_file`, `get_symbol`, `get_dependencies`, `find_route`, `trace_request`, `get_architecture_summary` tools with strict parameter validation. | M7-05, M4-06 | L |
| **M8-03** | Intent Classifier & Query Router | `apps/api/src/modules/chat/classifier.ts` | Classifies user queries (conceptual, identifier lookup, dependency trace, route flow) to optimize initial tool context. | M8-02 | M |
| **M8-04** | Context Budget Manager | `apps/api/src/modules/chat/context-builder.ts` | Token-budgeted context assembler combining system prompt, grounding evidence, tool outputs, and sliding conversation history. | M8-03 | M |
| **M8-05** | Grounded System Prompt & Anti-Injection Defense | `apps/api/src/modules/chat/prompt.ts` | System prompt enforcing mandatory citations (`[path:lines]`), `<untrusted_source_code>` data isolation, and qualified refusal protocols. | M8-04 | M |
| **M8-06** | Citation Verification & Click-Through Chips | `apps/web/features/chat/MessageItem.tsx` | Parses markdown citations from AI stream; renders interactive badge chips; clicking chip opens Monaco Viewer at cited lines. | M8-05, M5-09 | M |
| **M8-07** | Chat Session & Message Persistence | `apps/api/src/modules/chat/session.ts` | Persists conversations into `chat_sessions` and `chat_messages` with structured evidence JSON and token usage counters. | M8-05 | S |
| **M8-08** | LLM Graceful Degradation Handler | `apps/api/src/modules/chat/degradation.ts` | Returns informative fallback message when AI provider is unavailable; confirms non-AI features remain 100% operational. | M8-01 | S |

**Milestone 8 Exit Criteria:**
- $\ge 90\%$ of factual statements in assistant responses carry valid, clickable file/line citations.
- Adversarial prompt injection payloads inside source code fail to override assistant instructions.

---

## Milestone 9 — Advanced Architectural Insights & Diagnostics

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M9-01** | Circular Dependency Dashboard | `apps/web/features/architecture/CyclesDashboard.tsx` | Visualizes Tarjan SCC dependency cycles with member file paths, impact severity, and automated cycle-break suggestions. | M4-04 | M |
| **M9-02** | Hotspot Matrix (Complexity $\times$ Centrality) | `apps/web/features/architecture/HotspotsMatrix.tsx` | Scatter plot and sortable table ranking files by cyclomatic complexity multiplied by PageRank centrality. | M3-06, M4-05 | M |
| **M9-03** | Architectural Smell & Layer Violation Detector | `packages/graph-core/src/smell-detector.ts` | Flags architectural rule violations: Controllers directly accessing DB without Service layer, God Modules (> 50 outgoing deps), and Orphaned Modules. | M4-05 | L |
| **M9-04** | Technology Detection Audit View | `apps/web/features/architecture/TechStackView.tsx` | Displays detected stack (frameworks, DBs, caches, infra) with clickable evidence strings and confidence scores. | M4-06 | M |
| **M9-05** | Repository Architecture Health Score | `packages/graph-core/src/health-score.ts` | Calculates composite 0–100 health score based on cycle frequency, layer violations, average complexity, and test file coverage. | M9-01–03 | M |
| **M9-06** | Pull Request Impact Analysis Engine | `packages/graph-core/src/impact-analyzer.ts` | Given a list of modified files, traverses reverse dependencies to output all affected upstream modules and API routes. | M4-03, M6-04 | M |

**Milestone 9 Exit Criteria:**
- Insights panel correctly identifies cycles, layer violations, and technology evidence on benchmark repos.

---

## Milestone 10 — Productionization, Hardening & Deployment

| ID | Task | Target Path / Package | Details & Acceptance Criteria | Deps | Est |
|---|---|---|---|---|---|
| **M10-01** | GitHub OAuth Authentication | `apps/api/src/modules/auth` | GitHub OAuth login; JWT session cookies; user profile linkage; tokens never leaked to browser client. | M1-08 | L |
| **M10-02** | Private Repository Support (GitHub App) | `apps/api/src/modules/github-app` | GitHub App installation flow; encrypted token storage at rest (AES-256-GCM); scoped repository permissions. | M10-01 | XL |
| **M10-03** | Distributed Rate Limiting & Quotas | `apps/api/src/middleware/rate-limiter.ts` | Redis-backed token bucket rate limiter: 10 analyses/hour per user, 60 AI chat queries/hour, 5 concurrent worker analyses. | M10-01 | M |
| **M10-04** | Multi-Tier Cache Verification & Hardening | `packages/utils/src/cache.ts` | Complete integration of all Redis and memory cache keys with versioned prefixes (`v1:parse:...`). | M4-06, M7-03 | M |
| **M10-05** | Observability & OpenTelemetry Instrumentation | `packages/utils/src/telemetry.ts` | Distributed tracing spans for HTTP, BullMQ, Tree-sitter, Postgres, and LLM calls; Prometheus `/metrics` exporter. | M2-07 | L |
| **M10-06** | Secret Redaction & Security Hardening | `packages/utils/src/sanitizer.ts` | Pre-LLM secret redaction pipeline (AWS keys, tokens, private keys, connection strings) verified via automated test suite. | M8-05 | L |
| **M10-07** | Production Containerization & Helm/Compose | `docker/` | Production multi-stage Dockerfiles for `apps/web`, `apps/api`, and `workers/analyzer`; non-root users; minimal Alpine/Debian base. | M1-06 | L |
| **M10-08** | GitHub Actions CI/CD Pipeline | `.github/workflows/ci.yml` | Automated pipeline running lint, typecheck, unit tests, integration fixtures, and Docker container build on every PR. | M10-07 | M |
| **M10-09** | End-to-End Integration & Load Test Suite | `tests/e2e` | End-to-end test validating ingestion of top-10 open-source repositories; validates memory stability under concurrency. | M2–M8 | XL |

**Milestone 10 Exit Criteria:**
- Deployed system successfully executes end-to-end analysis on public and private repositories.
- Zero raw secrets or sensitive data leak into application logs or LLM payloads.

---

## 30-Step Linear Implementation Task List

For engineers seeking a sequential checklist:

- [ ] **1.** Initialize pnpm monorepo, strict TypeScript configurations, and shared package stubs.
- [ ] **2.** Scaffold Next.js 14 web app with Tailwind CSS, Radix UI, and theme tokens.
- [ ] **3.** Scaffold Fastify API server with Pino logger, Zod error interceptors, and CORS.
- [ ] **4.** Spin up local Docker Compose environment with `postgres:16` (`pgvector`) and `redis:7`.
- [ ] **5.** Execute PostgreSQL DDL migrations creating all 10 core tables and HNSW indexes.
- [ ] **6.** Build `POST /api/repositories` with SSRF URL validation.
- [ ] **7.** Implement Octokit metadata client for HEAD commit SHA and repository statistics.
- [ ] **8.** Build Git Tree recursive ingestion with directory BFS truncation fallback.
- [ ] **9.** Implement multi-tier file filtering (size, binary, vendor, and minified heuristics).
- [ ] **10.** Configure BullMQ `repo-analysis` queue and dispatch initial analysis jobs.
- [ ] **11.** Build Analyzer Worker daemon with staged Redis progress publishing.
- [ ] **12.** Implement `GET /api/analyses/:id/progress` Server-Sent Events stream.
- [ ] **13.** Integrate Tree-sitter WASM runtime with TypeScript, JavaScript, Python grammars.
- [ ] **14.** Implement AST symbol extraction for functions, classes, interfaces, and methods.
- [ ] **15.** Build import/export resolution engine with tsconfig alias path support.
- [ ] **16.** Build static call graph extractor with static vs. inferred confidence tagging.
- [ ] **17.** Construct directed Multigraph data structure and persist `graph_edges`.
- [ ] **18.** Implement Tarjan's SCC algorithm for circular dependency cluster detection.
- [ ] **19.** Compute PageRank centrality and architectural importance scoring.
- [ ] **20.** Build `GET /api/repositories/:id/graph` endpoint with Redis caching.
- [ ] **21.** Build React Flow architecture canvas with custom nodes and auto-layout.
- [ ] **22.** Implement read-only Monaco Editor code viewer with line-range highlighting.
- [ ] **23.** Build Express and Fastify route detectors with nested router prefix composition.
- [ ] **24.** Implement constrained request-flow traversal from API route to database table.
- [ ] **25.** Build AST-guided semantic chunker with context header injection.
- [ ] **26.** Implement pgvector embedding pipeline with `text-embedding-3-small`.
- [ ] **27.** Build Reciprocal Rank Fusion (RRF) hybrid retriever (vector + lexical + graph).
- [ ] **28.** Implement backend-controlled AI tool execution layer (`search_code`, `get_file`, etc.).
- [ ] **29.** Build grounded AI chat endpoint with clickable citation verification chips.
- [ ] **30.** Harden secret redaction pipeline, configure rate limiters, and set up Docker deploy.
