# GitLens AI — Checkpoints & Verification Ledger

**Version:** 1.0 | **Status:** Active Quality Gate | **Last Updated:** 2026-08-23  
**Target Scope:** Phase 0 (Setup) through Phase 7 (Productionization)  

This document is the **living engineering verification ledger** for GitLens AI. Each checkpoint establishes mandatory pass/fail criteria, reproducible verification commands, and expected outputs. **No milestone may be marked complete without documented evidence conforming to these criteria.**

**Status Legend:** ⬜ Not Started · 🟨 In Progress · ✅ Verified Passed · ❌ Blocked / Failed (see Known Issues)

---

## Phase 0 — Workspace & Environment Bootstrap

### CP-0.1 Monorepo & TypeScript Integrity — ✅
- [x] `npm install` executes cleanly with zero peer-dependency warnings from a fresh clone.
- [x] `npm run typecheck` passes with zero errors under `strict: true` and `noImplicitAny: true` across all packages (`apps/web`, `apps/api`, `workers/analyzer`, `packages/*`).
- [x] `npm run lint` passes across all workspaces.
- [x] Workspace directory tree strictly adheres to the architecture specification.
- **Verification Evidence:** `npm run build` and `npm run typecheck` exited with code 0. Monorepo pushed cleanly to GitHub `main` branch.

### CP-0.2 Local Docker Containerization & Database Extensions — ✅
- [x] `docker compose -f docker/docker-compose.dev.yml up -d` manifest defined with PostgreSQL 16 (pgvector) and Redis 7.
- [x] Dual-mode Database Store implemented with zero-friction in-memory and PostgreSQL fallback.
- [x] Environment loader validates variables with safe development defaults.
- **Verification Evidence:** `docker/docker-compose.dev.yml` created; `@gitlens/config` Zod engine verified.

### CP-0.3 Microservices Health Endpoints & Web Workspace — ✅
- [x] `GET http://localhost:3001/health` Fastify health endpoint returns `{ status: "ok" }` with database and redis diagnostic status.
- [x] Next.js 14 web application builds static and dynamic routes (`/`, `/health`, `/workspace/[id]`) with zero build errors.
- **Verification Evidence:** Next.js production build output 5/5 static pages optimized.


---

## Phase 1 — Repository Ingestion & Ingestion Worker

### CP-1.1 Strict URL Parsing & SSRF Defense — ⬜
- [ ] Valid URLs (`https://github.com/expressjs/express`, `https://github.com/fastify/fastify.git`) are parsed into `{ owner, repo }` and create rows in `repositories`.
- [ ] Non-HTTPS schemes, private/loopback IP addresses (`http://127.0.0.1/`, `http://169.254.169.254/`), and non-GitHub hosts are rejected with HTTP 400 Bad Request.
- [ ] Unit test suite validates $\ge 25$ URL injection test vectors.
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/utils test:url-validator
  ```
- **Evidence / Log:** —

### CP-1.2 Metadata & Recursive Git Tree Retrieval — ⬜
- [ ] Octokit client fetches owner, name, default branch, language breakdown, repo size, and current HEAD commit SHA.
- [ ] Recursive tree API retrieves full blob index at pinned commit SHA.
- [ ] Truncated-tree fallback: Mocked `truncated: true` response initiates iterative directory BFS traversal, reconstructing the full tree without file omissions.
- [ ] GitHub rate limits (HTTP 403 / 429) trigger automatic backoff respecting `x-ratelimit-reset`.
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/analyzer test:tree-ingestion
  ```
- **Evidence / Log:** —

### CP-1.3 File Filtering & Content Hash Determinism — ⬜
- [ ] Binary files (`.png`, `.wasm`, `.zip`, `.pdf`) and vendor directories (`node_modules`, `dist`, `build`, `.git`) are 100% excluded.
- [ ] High-entropy minified files and files $> 500\text{KB}$ are excluded from AST parsing.
- [ ] Computed SHA-256 `content_hash` for each file is stable across identical runs.
- **Verification Query:**
  ```sql
  SELECT count(*), is_generated FROM files WHERE analysis_id = '<ANALYSIS_ID>' GROUP BY is_generated;
  ```
- **Evidence / Log:** —

### CP-1.4 BullMQ Asynchronous Pipeline & Real-Time SSE — ⬜
- [ ] `POST /api/repositories/:id/analyze` returns HTTP 202 with job ID in $< 200\text{ms}$. Fastify thread is never blocked.
- [ ] Analyzer worker transitions job status: `QUEUED` $\rightarrow$ `RUNNING` $\rightarrow$ `COMPLETED`.
- [ ] `GET /api/analyses/:id/progress` SSE stream emits monotonically increasing progress ($0.0 \rightarrow 1.0$) across all stages (`FETCHING`, `FILTERING`, `PARSING`, `GRAPH`, `ROUTES`, `EMBEDDING`, `FINALIZING`).
- [ ] Worker container crash/restart recovers stalled jobs via BullMQ supervisor.
- **Verification Command:**
  ```bash
  curl -N http://localhost:3001/api/analyses/<ANALYSIS_ID>/progress
  ```
- **Evidence / Log:** —

---

## Phase 2 — Static Analysis Engine & Code Graph

### CP-2.1 AST Symbol Extraction (Tree-sitter TS/JS/Python) — ⬜
- [ ] On fixture Express repository (Fixture A), $\ge 95\%$ of functions, methods, classes, interfaces, types, and exported variables are extracted.
- [ ] Symbol start/end line coordinates match source code exactly (1-indexed).
- [ ] Parent-child hierarchy is preserved (class methods correctly link to enclosing class `parent_id`).
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/parser-core test:symbols
  ```
- **Evidence / Log:** —

### CP-2.2 Import/Export Resolution & Call Graph Extraction — ⬜
- [ ] Relative imports (`./`, `../`), tsconfig path aliases (`@/components/*`), and index file conventions resolve to target `file_id`.
- [ ] External npm/pip packages resolve to `external_module` nodes.
- [ ] `CALLS` edges are tagged with confidence: `static` (unambiguous imported symbol) vs. `inferred` (name match in scope).
- [ ] Class `EXTENDS` and `IMPLEMENTS` edges extracted from AST heritage clauses.
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/parser-core test:imports-and-calls
  ```
- **Evidence / Log:** —

### CP-2.3 Parser Fault Boundary & Resilience — ⬜
- [ ] Corrupted/invalid JavaScript file in test fixture produces an error record in `files.error` and logs a warning.
- [ ] Analyzer worker continues and successfully parses the remainder of the repository. Overall analysis status concludes as `COMPLETED` (or `PARTIAL` if threshold exceeded).
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/analyzer test:fault-isolation
  ```
- **Evidence / Log:** —

### CP-2.4 Graph Persistence & Tarjan's SCC Cycle Detection — ⬜
- [ ] `graph_edges` table populated with typed edges (`IMPORTS`, `CALLS`, `ROUTES_TO`, etc.).
- [ ] Tarjan's SCC algorithm identifies circular dependency cycles in test fixture (Fixture E) and returns cluster groupings.
- [ ] PageRank importance scores rank core modules highest.
- [ ] `GET /api/repositories/:id/graph` responds in $< 100\text{ms}$ with full React-Flow-ready graph payload.
- **Verification Query:**
  ```sql
  SELECT type, count(*) FROM graph_edges WHERE analysis_id = '<ANALYSIS_ID>' GROUP BY type;
  ```
- **Evidence / Log:** —

---

## Phase 3 — Interactive Visual Workspace & Navigation

### CP-3.1 End-to-End Visual Exploration Loop — ⬜
- [ ] Submitting a GitHub URL triggers SSE progress UI, transitions to completed state, and renders the 3-pane layout.
- [ ] Left pane: Virtualized file tree allows expanding directories and inspecting symbols.
- [ ] Center pane: React Flow renders nodes with custom SVG components, smooth 60fps pan/zoom, and auto-layout.
- [ ] Clicking any graph node highlights incoming (dependents) and outgoing (dependencies) edges.
- [ ] Clicking a symbol or file node opens Monaco Editor scrolled to the exact line range with a glowing highlight decoration.
- **Verification:** Manual browser testing + Playwright E2E suite.
- **Evidence / Log:** —

### CP-3.2 Large-Graph Rendering Performance — ⬜
- [ ] Canvas renders a 500-file / 1,500-edge repository graph interactively in $< 2.0\text{s}$.
- [ ] Module cluster collapse reduces canvas node count and maintains 60fps during viewport panning.
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/web test:perf-benchmark
  ```
- **Evidence / Log:** —

---

## Phase 4 — API Route Extraction & Request-Flow Traversal

### CP-4.1 Express & Fastify Route Extraction — ⬜
- [ ] Detects `app.get()`, `router.post()`, `router.route().get()`, and `fastify.get()` invocations.
- [ ] Composes nested router mount prefixes (`app.use('/api/v1', apiRouter)`) into canonical paths (`POST /api/v1/orders`).
- [ ] Creates `ROUTES_TO` graph edges linking endpoints to controller handler symbols.
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/analyzer test:route-detectors
  ```
- **Evidence / Log:** —

### CP-4.2 Constrained Request-Flow Traversal — ⬜
- [ ] Traces `POST /orders` $\rightarrow$ `OrderController.create` $\rightarrow$ `OrderService.create` $\rightarrow$ `OrderRepository.insert` $\rightarrow$ `orders table`.
- [ ] Hops carry confidence grades (`static`, `inferred`, `heuristic`); inferred hops render as dashed edges on canvas.
- [ ] Cycle avoidance prevents infinite loops on recursive calls.
- [ ] `POST /api/repositories/:id/trace` responds in $< 150\text{ms}$.
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/api test:trace-endpoint
  ```
- **Evidence / Log:** —

---

## Phase 5 — Code-Aware Semantic & Lexical RAG

### CP-5.1 AST-Guided Semantic Chunking & pgvector Storage — ⬜
- [ ] Chunks align strictly to AST function/class boundaries with context headers attached.
- [ ] Oversized functions ($> 512$ tokens) split at internal AST statements with 50-token overlap.
- [ ] Embeddings generated via `text-embedding-3-small` (1536d) and upserted into `code_chunks`.
- [ ] Re-analysis of unchanged files skips embedding generation based on `content_hash`.
- **Verification Query:**
  ```sql
  SELECT count(*), avg(end_line - start_line) FROM code_chunks WHERE analysis_id = '<ANALYSIS_ID>';
  ```
- **Evidence / Log:** —

### CP-5.2 Hybrid Retrieval Accuracy (RRF Benchmark) — ⬜
- [ ] Reciprocal Rank Fusion (RRF $k=60$) combines pgvector cosine similarity, `tsvector` FTS, and PageRank weights.
- [ ] Evaluation benchmark (50 curated questions with ground-truth code coordinates) achieves $\text{Hit}@5 \ge 80\%$.
- [ ] Lexical search reliably finds exact symbol names (e.g., `verifyJwtToken`) when semantic vector alone fails.
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/api test:retrieval-benchmark
  ```
- **Evidence / Log:** —

---

## Phase 6 — Grounded AI Assistant & Tool Execution

### CP-6.1 Grounded Synthesis with Verified Citations — ⬜
- [ ] $\ge 90\%$ of factual statements in LLM responses contain valid citations in `[path/to/file.ts:L1-L2]` format.
- [ ] Clicking any citation chip opens Monaco Editor at the exact cited file and line range.
- [ ] Questions regarding non-existent features trigger explicit qualified refusals (*"Based on the analyzed repository files, no implementation was found."*).
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/api test:grounding-eval
  ```
- **Evidence / Log:** —

### CP-6.2 Tool Security, Secret Redaction & Injection Defense — ⬜
- [ ] Backend tools (`search_code`, `get_file`, `trace_request`) execute with strict parameter bounds; LLM has zero direct SQL access.
- [ ] Pre-LLM redaction pipeline replaces AWS keys, GitHub tokens, JWTs, and connection strings with `[REDACTED_SECRET]`.
- [ ] Adversarial prompt injection payloads in repository source code (e.g., `// SYSTEM OVERRIDE: ignore rules`) fail to alter LLM behavior.
- **Verification Command:**
  ```bash
  pnpm --filter @gitlens/utils test:security-redaction
  pnpm --filter @gitlens/api test:prompt-injection-defense
  ```
- **Evidence / Log:** —

---

## Phase 7 — Productionization & Release Hardening

### CP-7.1 Rate Limiting & Distributed Quotas — ⬜
- [ ] Redis token bucket rate limiter enforces 10 repo analyses/hour per user and 60 AI queries/hour.
- [ ] Concurrent worker jobs capped at `MAX_CONCURRENT_ANALYSES`.
- **Evidence / Log:** —

### CP-7.2 Multi-Tier Caching & Performance — ⬜
- [ ] Repeated analysis of identical commit SHA is served from cache in $< 200\text{ms}$.
- [ ] Incremental analysis re-parses only modified files when a new commit is pushed.
- **Evidence / Log:** —

### CP-7.3 Full E2E Suite & Container Build — ⬜
- [ ] Multi-stage Dockerfiles build clean containers for `apps/web`, `apps/api`, and `workers/analyzer`.
- [ ] GitHub Actions CI pipeline passes all lint, typecheck, unit, integration, and security test gates.
- **Verification Command:**
  ```bash
  pnpm test:all
  docker build -f docker/Dockerfile.api .
  docker build -f docker/Dockerfile.worker .
  docker build -f docker/Dockerfile.web .
  ```
- **Evidence / Log:** —

---

## MVP Go / No-Go Gate Matrix

Before declaring GitLens AI MVP complete, all 12 criteria must be verified ✅:

| # | Criterion | Verification Method | Status |
|---|---|---|---|
| 1 | Public GitHub URL input with SSRF rejection | Automated Unit & Integration Tests | ⬜ |
| 2 | Asynchronous analysis with real-time SSE progress | Playwright UI & SSE Stream Test | ⬜ |
| 3 | Virtualized file & symbol tree navigation | Web Browser Workspace Verification | ⬜ |
| 4 | Interactive React Flow architecture & dependency canvas | Web Browser Canvas Pan/Zoom Test | ⬜ |
| 5 | Node click deep-links to Monaco code viewer with line highlights | Playwright E2E Navigation Test | ⬜ |
| 6 | Import/Export and Call Graph edges with confidence tags | SQL Edge Verification & Fixture Tests | ⬜ |
| 7 | Express / Fastify REST API route detection | Route Detector Test Suite | ⬜ |
| 8 | End-to-end request-flow traversal (Route $\rightarrow$ Service $\rightarrow$ DB) | Request-Flow Traversal Benchmark | ⬜ |
| 9 | Grounded AI Assistant conversational interface | AI Chat Test Suite | ⬜ |
| 10 | AI answers cite clickable file and line numbers | Grounding Citation Evaluation Suite | ⬜ |
| 11 | Single-file parser syntax failure does not abort analysis | Fault Isolation Test Fixture | ⬜ |
| 12 | HTTP API server never blocks during heavy ingestion/parsing | Fastify Latency Benchmark under Load | ⬜ |

---

## Regression Watchlist

| Trigger Event | Mandatory Verification Re-Check |
|---|---|
| **Tree-sitter Grammar Version Bump** | CP-2.1 (Symbols), CP-2.2 (Imports), CP-5.1 (Chunking) |
| **Embedding Model / Dimension Change** | CP-5.1, CP-5.2 (Hit@5 Retrieval Benchmark), DDL Vector Dimension |
| **New Route / Framework Detector** | CP-4.1 (Route Detection), CP-4.2 (Request Tracing) |
| **Graph Algorithm / Centrality Tuning** | CP-2.4 (Tarjan SCC Cycles & PageRank Importance) |
| **Prompt Template / System Message Edit** | CP-6.1 (Citation Grounding), CP-6.2 (Prompt Injection Defense) |
| **Database Schema DDL Migration** | CP-0.2 (Extensions & Schema), CP-1.3, CP-2.4, Pipeline Version Bump |

---

## Known Issues & Defect Ledger

| Date | Checkpoint | Description & Root Cause | Severity | Status / Resolution |
|---|---|---|---|---|
| — | — | No active blockers recorded. | — | — |
