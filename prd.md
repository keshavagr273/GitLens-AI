# GitLens AI — Product Requirements Document (PRD)

**Version:** 1.0 | **Status:** Approved / Detailed Specification | **Last Updated:** 2026-08-23  
**Target Scope:** MVP → Advanced Production System  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Market Analysis](#2-problem-statement--market-analysis)
3. [Vision, Core Differentiator & Guiding Principles](#3-vision-core-differentiator--guiding-principles)
4. [Target Personas & Use Cases](#4-target-personas--use-cases)
5. [End-to-End User Journeys](#5-end-to-end-user-journeys)
6. [Detailed Functional Specifications](#6-detailed-functional-specifications)
   - [6.1 Repository Ingestion & Ingestion Pipeline (F-01)](#61-repository-ingestion--pipeline-f-01)
   - [6.2 Deterministic Static Analysis & AST Engine (F-02)](#62-deterministic-static-analysis--ast-engine-f-02)
   - [6.3 Architecture Intelligence & Technology Detection (F-03)](#63-architecture-intelligence--technology-detection-f-03)
   - [6.4 API Route Extraction & Request-Flow Traversal (F-04)](#64-api-route-extraction--request-flow-traversal-f-04)
   - [6.5 Database & Infrastructure Topology (F-05)](#65-database--infrastructure-topology-f-05)
   - [6.6 Code-Aware Semantic & Lexical RAG (F-06)](#66-code-aware-semantic--lexical-rag-f-06)
   - [6.7 Grounded AI Engineering Assistant (F-07)](#67-grounded-ai-engineering-assistant-f-07)
   - [6.8 Interactive Web Workspace & Visualization (F-08)](#68-interactive-web-workspace--visualization-f-08)
7. [Non-Functional & Production Requirements](#7-non-functional--production-requirements)
8. [Security, Privacy & Data Governance](#8-security-privacy--data-governance)
9. [MVP vs. Advanced Version Phasing](#9-mvp-vs-advanced-version-phasing)
10. [Success Metrics & Evaluation Benchmark](#10-success-metrics--evaluation-benchmark)
11. [Assumptions, Constraints & Limitations (What Not to Claim)](#11-assumptions-constraints--limitations-what-not-to-claim)
12. [Risks, Edge Cases & Mitigations](#12-risks-edge-cases--mitigations)

---

## 1. Executive Summary

GitLens AI is a production-grade, AI-powered **interactive codebase intelligence platform** that ingests public (and eventually private) GitHub repositories and transforms them into:
1. An interactive, navigable **Architecture & Dependency Graph**.
2. An automated **API & End-to-End Request-Flow Map**.
3. A rich, read-only **Code Viewer** with symbol-level deep linking.
4. A **Grounded AI Engineering Assistant** that reasons strictly over deterministic static analysis evidence and AST-derived context, citing exact source files and line spans for every claim.

The fundamental architectural principle of GitLens AI is **evidence over inference**. The deterministic static analysis pipeline stands completely independent of LLM availability: it parses the repository ASTs, resolves imports/exports, maps API endpoints to handlers, traces service/database interactions, and builds dependency graphs without making a single LLM call. The AI layer serves exclusively as a synthesis and natural language reasoning interface on top of verifiable static code evidence.

---

## 2. Problem Statement & Market Analysis

### 2.1 The Code Comprehension Bottleneck
Modern software repositories are large, modular, and multifaceted. Developers spend over 60% of their time reading, understanding, and navigating unfamiliar code rather than writing new features.

| Critical Question | Conventional Approach | Pain Point / Failure Mode |
|---|---|---|
| *"What is the high-level architecture of this repo?"* | Reading READMEs, clicking folders randomly | Documentation is outdated, incomplete, or absent. |
| *"How does an HTTP request flow from endpoint to DB?"* | Manual grep across controllers, services, repositories | Misses alias imports, nested routers, and indirect call sites. |
| *"What breaks if I modify module X?"* | Mental reverse-engineering, running test suites | No immediate visual graph of reverse dependents and circularities. |
| *"Which DBs, queues, and caches are actually used?"* | Inspecting manifests and config files | Manifests show what is installed, not what is actively instantiated. |
| *"Explain how auth token renewal works."* | Copy-pasting chunks into ChatGPT / Claude | LLM hallucinates without whole-repo symbols and exact call graphs. |

### 2.2 Shortcomings of Existing Tools
- **Static Graphers (Dependency-Cruiser, Madge, CodeQL):** Powerful CLI analysis but lack interactive web workspaces, request-flow visualizers, and conversational reasoning.
- **Generic "Chat-with-Repo" Wrappers:** Naively chunk files into fixed 500-token blocks without AST awareness, causing sliced declarations, missing imports, lost type definitions, and rampant hallucinations.
- **Heavy IDE Extensions:** Require cloning, local runtime installation, and environment configuration before providing any insight.

**GitLens AI Solution:** A zero-setup web application combining deterministic AST analysis, graph algorithms, hybrid code-aware RAG, and an LLM tool layer that produces grounded answers with interactive citations.

---

## 3. Vision, Core Differentiator & Guiding Principles

### 3.1 Vision Statement
> **"Build a code-intelligence platform with AI on top, not an AI chatbot with a repository attached."**

The deterministic pipeline (ingestion, AST parsing, symbol extraction, graph construction, route resolution, and technology detection) must remain 100% operational even if external LLM providers experience total outages.

### 3.2 Core Differentiator: Strict Resolution Hierarchy
When answering any architectural, structural, or navigational question, GitLens AI enforces a strict resolution hierarchy:

```
┌──────────────────────────────────────────────────────────┐
│ 1. Can Static AST Analysis answer it directly?           │ ──> Use Static Analysis
└──────────────────────────────────────────────────────────┘
                            │ No
┌──────────────────────────────────────────────────────────┐
│ 2. Can Graph Traversal (DFS/BFS/SCC/Shortest Path) do it?│ ──> Use Graph Engine
└──────────────────────────────────────────────────────────┘
                            │ No
┌──────────────────────────────────────────────────────────┐
│ 3. Is Semantic / Identifier Code Retrieval required?     │ ──> Use Hybrid RAG (pgvector + BM25/Trigram)
└──────────────────────────────────────────────────────────┘
                            │ Evidence Collected
┌──────────────────────────────────────────────────────────┐
│ 4. Synthesize, ground, and explain evidence in NL        │ ──> Invoke LLM with Strict Citations
└──────────────────────────────────────────────────────────┘
```

### 3.3 Guiding Engineering Principles
1. **Evidence Over Inference:** Always cite verifiable source files, line ranges, and symbol IDs.
2. **Honesty in Graph Relationships:** Mark every edge as `static`, `inferred`, or `heuristic`. Never claim certainty when a dynamic runtime behavior cannot be statically proven.
3. **Fault Isolation:** A malformed syntax error in one file must never abort repository analysis.
4. **Asynchronous Non-Blocking Processing:** Heavy ingestion, parsing, graph computation, and embedding happen exclusively in background worker processes.
5. **Untrusted Input Standard:** Treat all repository source code as hostile, unauthenticated input. Never execute repository code or scripts. Sanitize secrets before LLM dispatch.
6. **Reproducibility & Cache Integrity:** Analyses are pinned to exact repository commit SHAs and versioned pipelines (`parserVersion`, `detectorVersion`, `embeddingModelVersion`).

---

## 4. Target Personas & Use Cases

### 4.1 Persona Breakdown

#### P1: The Onboarding / Staff Engineer
- **Goal:** Rapidly comprehend the architecture of a 100k+ LOC repository within hours instead of weeks.
- **Key Actions:** Explores top-level architecture graph, filters by layer (Controllers → Services → Repositories), inspects technology stack, traces critical API endpoints.

#### P2: The Open-Source Contributor & Reviewer
- **Goal:** Understand where to hook a new feature or fix a bug without cloning or running a local dev environment.
- **Key Actions:** Asks *"Where is the webhook signature verification implemented?"*, reviews cited source code lines in Monaco viewer, checks reverse dependencies to avoid breaking changes.

#### P3: The Tech Lead & Architect
- **Goal:** Audit code health, identify architectural drift, evaluate dependency cycles, and review candidate repositories.
- **Key Actions:** Inspects circular dependency dashboard, complexity vs. centrality hotspot matrix, and detects layer violations (e.g., Controllers directly querying SQL/ORM).

#### P4: The Security & Compliance Auditor
- **Goal:** Detect third-party dependencies, unauthenticated API routes, exposed data models, and database access patterns.
- **Key Actions:** Views API route security middleware, READS/WRITES data access graph, and technology evidence audit trail.

---

## 5. End-to-End User Journeys

### 5.1 Journey 1: Repository Ingestion & Architecture Discovery
1. User enters `https://github.com/fastify/fastify` or `https://github.com/expressjs/express` on the landing page.
2. API validates the URL against SSRF rules and creates a `repository_analyses` record.
3. API dispatches a background job via BullMQ and returns an analysis ID and SSE stream URL.
4. Analyzer worker:
   - Fetches repository metadata and default branch HEAD commit SHA via GitHub REST API.
   - Fetches git tree (handling truncation recursively).
   - Filters out binaries, vendor dirs, minified files, lockfiles, and oversized blobs.
   - Parses source files into ASTs using Tree-sitter.
   - Extracts symbols, imports, exports, calls, class hierarchies, and route definitions.
   - Computes graph metrics (SCC cycles, in/out degrees, PageRank centrality).
   - Detects frameworks, libraries, databases, caches, queues, and infra configs.
   - Chunks code along AST boundaries and stores embeddings in PostgreSQL via `pgvector`.
5. Frontend receives SSE events: `FETCHING` → `FILTERING` → `PARSING` → `GRAPH` → `ROUTES` → `EMBEDDING` → `COMPLETED`.
6. Workspace UI displays:
   - Left pane: Interactive file tree with language badges.
   - Center pane: React Flow interactive architecture graph.
   - Right pane: AI Assistant ready for grounded Q&A.
   - Bottom pane: Monaco Editor code viewer.

### 5.2 Journey 2: Interactive Request-Flow Tracing
1. User clicks the "API Routes" tab in the workspace.
2. The UI lists detected HTTP routes grouped by method (`GET /api/v1/orders`, `POST /api/v1/orders`).
3. User selects `POST /api/v1/orders` and clicks **Trace Request Flow**.
4. System executes a constrained graph traversal:
   `POST /api/v1/orders` *(ROUTES_TO)* → `OrderController.create` *(CALLS static)* → `OrderService.createOrder` *(CALLS static)* → `PaymentClient.charge` *(CALLS inferred)* → `OrderRepository.save` *(CALLS static)* → `orders table` *(WRITES heuristic)*.
5. React Flow renders a dedicated Request-Flow Canvas highlighting the trace path.
6. User clicks on `OrderService.createOrder` hop: Monaco editor instantly scrolls to `src/services/order.service.ts` lines 45–82 with highlighting.

### 5.3 Journey 3: Grounded AI Assistant with Citations
1. User asks: *"How are expired sessions cleaned up in this codebase?"*
2. Assistant query classifier identifies this as a hybrid conceptual + identifier search.
3. System runs:
   - Vector similarity search on AST code chunks in `pgvector`.
   - Lexical trigram/tsvector search for `session`, `cleanup`, `expire`, `cron`.
   - Graph lookup for scheduled tasks, queues, and database write operations.
4. Aggregated evidence is compiled into an evidence payload with token budget management.
5. LLM generates a structured response citing exact files, line spans, and symbol IDs.
6. Frontend renders clickable citation badges: `[src/auth/session-cleaner.ts:25-50]`. Clicking any badge opens the exact file in Monaco at the specified line range.

---

## 6. Detailed Functional Specifications

### 6.1 Repository Ingestion & Pipeline (F-01)

| Requirement ID | Description | Acceptance Criteria | Priority |
|---|---|---|---|
| **F-01.1** | Canonical URL Validation | Accepts only `https://github.com/:owner/:repo` (optional trailing `.git` or `/`). Rejects non-GitHub domains, internal IPs, private IP ranges (SSRF protection), and malformed strings with HTTP 400. | P0 |
| **F-01.2** | Metadata & Branch Detection | Fetches repo owner, name, description, default branch, language breakdown, repo size in KB, and current HEAD commit SHA via Octokit. | P0 |
| **F-01.3** | Tree Retrieval with Truncation Fallback | Retrieves Git Tree at specific commit SHA using recursive tree API. If `truncated: true` is returned (GitHub > 100,000 entries / 7MB limit), falls back to breadth-first directory traversal. | P0 |
| **F-01.4** | Multi-Tier File Filtering | Filters files against: (1) `MAX_FILE_SIZE_KB` (default 500KB for parsing, 100KB for embeddings), (2) Denylisted directories (`node_modules`, `dist`, `build`, `vendor`, `.git`, `.next`, `coverage`, `__pycache__`), (3) Binary extensions (`.png`, `.jpg`, `.pdf`, `.zip`, `.wasm`, `.exe`, `.tar`), (4) Minified/Generated heuristics (average line length > 500 chars, comment ratio < 1%, `*.min.js`, `*.bundle.js`, `*.generated.*`). | P0 |
| **F-01.5** | Content Ingestion & Hash Tracking | Computes SHA-256 hash for each ingested file content. Stores hash on `files` table to enable deduplication and incremental analysis. | P0 |
| **F-01.6** | Rate-Limit & Backoff Resilience | Intercepts GitHub HTTP 403 / 429 rate-limit responses; parses `x-ratelimit-reset` and applies exponential backoff with jitter. | P0 |
| **F-01.7** | Asynchronous Job Queue | Dispatches ingestion to BullMQ Redis queue with configurable concurrency, job timeout, and automatic retry (3 attempts with exponential backoff). | P0 |

---

### 6.2 Deterministic Static Analysis & AST Engine (F-02)

| Requirement ID | Description | Acceptance Criteria | Priority |
|---|---|---|---|
| **F-02.1** | Tree-sitter Parser Integration | Integrates Tree-sitter grammars for TypeScript (`.ts`, `.tsx`), JavaScript (`.js`, `.jsx`, `.mjs`, `.cjs`), Python (`.py`), and Go (`.go`). | P0 |
| **F-02.2** | Normalized Symbol Extraction | Extracts functions, methods, classes, interfaces, types, enums, global variables, and UI components with name, start/end line numbers, start/end column numbers, parent scope symbol ID, and exported flag. | P0 |
| **F-02.3** | Module Resolution & Import/Export Edges | Resolves relative imports (`./`, `../`), absolute alias imports (`tsconfig.json` `paths` and `baseUrl`), and index file conventions. Creates `IMPORTS` and `EXPORTS` edges. Unresolved external packages are categorized as `external_module` nodes. | P0 |
| **F-02.4** | Static Call Graph Construction | Detects call expressions (`CallExpression`, `MemberExpression`) within AST. Resolves function calls against imported symbol names in local lexical scope. Marks edges with confidence (`static` if unambiguously resolved, `inferred` if name-matched without unambiguous type binding). | P0 |
| **F-02.5** | Class Inheritance & Interfaces | Extracts `EXTENDS` (class inheritance) and `IMPLEMENTS` (interface realization) edges from AST heritage clauses. | P1 |
| **F-02.6** | Code Complexity & Metrics | Computes line count, cyclomatic complexity estimate (counting branching constructs: `if`, `else`, `case`, `for`, `while`, `catch`, ternary `?`), parameter count, and nesting depth per function/method. | P1 |
| **F-02.7** | Fault-Tolerant Parse Isolation | Any Tree-sitter syntax error or unsupported construct in a file records an error record on `files.error`, emits a warning event, and allows the analysis of the remaining repository to proceed uninterrupted. | P0 |

---

### 6.3 Architecture Intelligence & Technology Detection (F-03)

| Requirement ID | Description | Acceptance Criteria | Priority |
|---|---|---|---|
| **F-03.1** | Manifest-Based Detection | Scans `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `pom.xml`, `Cargo.toml`, `Dockerfile`, `docker-compose.yml`, `terraform/*.tf`, and `.github/workflows/*.yml` to detect installed frameworks, libraries, databases, and infra. | P0 |
| **F-03.2** | Source-Convention Verification | Validates manifest findings against actual AST code usage (e.g., verifying `import express` is actually followed by `express()` initialization or route registration). Calculates a confidence score (0.0 to 1.0). | P0 |
| **F-03.3** | Evidence Audit Trail | Every detected technology records an array of explicit evidence strings (e.g., `["package.json: 'express': '^4.18.2'", "src/server.ts:14: 'app = express()'"]`). | P0 |
| **F-03.4** | Architectural Layer Classification | Classifies files into architectural layers based on AST contents, export types, and directory naming conventions: `routes`, `controllers`, `services`, `repositories`, `models`, `middleware`, `views/components`, `utils`, `config`. | P1 |
| **F-03.5** | Top-Level Architecture Graph | Assembles an abstract architectural graph showing subsystem boundaries: Frontend Client, API Gateway, Application Backend, Cache, Message Queue, Primary Database, and External Services. | P1 |

---

### 6.4 API Route Extraction & Request-Flow Traversal (F-04)

| Requirement ID | Description | Acceptance Criteria | Priority |
|---|---|---|---|
| **F-04.1** | Express / Fastify Route Detection | Extracts HTTP method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`), route path string, start line, and handler symbol from Express (`app.get()`, `router.post()`, `router.route().get()`) and Fastify (`fastify.get()`, `fastify.route()`). | P0 |
| **F-04.2** | Router Prefix & Composition Resolution | Traces router mounts (e.g., `app.use('/api/v1', apiRouter)` and `apiRouter.use('/users', userRouter)`) to calculate fully-qualified endpoint paths (e.g., `POST /api/v1/users`). | P0 |
| **F-04.3** | Next.js App / Pages Router Support | Extracts API routes from Next.js App Router (`app/api/**/route.ts` exporting `GET`, `POST`, etc.) and Pages Router (`pages/api/**/*.ts` exporting default handler). | P1 |
| **F-04.4** | FastAPI / Flask Decorator Support | Detects Python FastAPI (`@app.get("/path")`, `@router.post("/path")`) and Flask (`@app.route("/path", methods=["POST"])`) decorators and maps them to decorated function symbols. | P1 |
| **F-04.5** | Route-to-Handler Mapping (`ROUTES_TO`) | Creates a deterministic `ROUTES_TO` graph edge linking the `api_routes` node to the entry-point controller/handler symbol node. | P0 |
| **F-04.6** | Constrained Request-Flow Traversal | Given an API Route ID, traverses outgoing `ROUTES_TO` → `CALLS` → `READS`/`WRITES` edges up to depth limit (default 8) or terminal DB/queue node. Prevents infinite cycles using a visited node set. Returns an ordered flow path. | P0 |
| **F-04.7** | Flow Hop Confidence Grading | Marks each hop in the flow: `static` (1.0 - direct import call), `inferred` (0.6 - symbol name match without type proof), or `heuristic` (0.4 - pattern match). | P0 |

---

### 6.5 Database & Infrastructure Topology (F-05)

| Requirement ID | Description | Acceptance Criteria | Priority |
|---|---|---|---|
| **F-05.1** | ORM & Schema Model Detection | Extracts database entities/tables from Prisma schemas (`schema.prisma`), TypeORM entities (`@Entity()`), Mongoose schemas (`new Schema({...})`), Sequelize models, and SQL migration files (`CREATE TABLE ...`). | P0 |
| **F-05.2** | Data Access Relationship Extraction | Identifies service/repository interactions with database models. Creates `READS` (find, select, query) and `WRITES` (insert, update, delete, upsert) edges linking symbols to table nodes. | P1 |
| **F-05.3** | Cache & Queue Detection | Identifies Redis (`redis.get`, `redis.set`), Memcached, BullMQ (`new Queue()`, `queue.add()`), RabbitMQ (`amqplib`), and Kafka (`kafkajs`) producers and consumers. | P1 |
| **F-05.4** | Infrastructure Artifact Mapping | Identifies Dockerfiles, Docker Compose service definitions, Kubernetes manifests, and Terraform cloud resources; creates `infra` nodes in the architecture graph. | P1 |

---

### 6.6 Code-Aware Semantic & Lexical RAG (F-06)

| Requirement ID | Description | Acceptance Criteria | Priority |
|---|---|---|---|
| **F-06.1** | AST-Guided Semantic Chunking | Chunks code along AST boundaries (functions, methods, classes, types, interfaces). Attaches surrounding module context, file path, language, and symbol metadata to each chunk. Never breaks a function signature from its opening body block. | P0 |
| **F-06.2** | Oversized Chunk Splitting | For functions/methods exceeding the max token threshold (> 512 tokens), splits at internal AST statement boundaries with a 50-token overlap, prepending the function signature to each sub-chunk. | P0 |
| **F-06.3** | Dense Vector Embeddings via pgvector | Generates dense embeddings using provider abstraction (OpenAI `text-embedding-3-small` 1536d or alternative). Stores vectors in PostgreSQL with an HNSW index for sub-50ms cosine similarity queries. | P0 |
| **F-06.4** | Lexical Search Engine | Builds PostgreSQL Full Text Search (`tsvector` / `tsquery`) and trigram similarity (`pg_trgm`) indexes on symbols and code chunks for exact keyword, snake_case, and camelCase matching. | P0 |
| **F-06.5** | Reciprocal Rank Fusion (RRF) Hybrid Retrieval | Merges vector similarity rankings, lexical search rankings, and graph centrality weights using RRF ($k=60$) to construct the final retrieval context. | P0 |
| **F-06.6** | Content Hash Embedding Cache | Skips re-embedding for chunks whose `content_hash` has already been embedded under the same `embedding_model_version`. | P1 |

---

### 6.7 Grounded AI Engineering Assistant (F-07)

| Requirement ID | Description | Acceptance Criteria | Priority |
|---|---|---|---|
| **F-07.1** | LLM Provider Abstraction | Implements a unified interface supporting OpenAI (GPT-4o, GPT-4o-mini), Anthropic (Claude 3.5 Sonnet), Google Gemini (Gemini 1.5 Pro/Flash), and Groq with streaming support. | P0 |
| **F-07.2** | Backend-Controlled Tool Execution | Exposes internal tools to the LLM: `search_code`, `get_file`, `get_symbol`, `get_dependencies`, `find_route`, `trace_request`, `get_architecture_summary`. The LLM has zero direct database query access. | P0 |
| **F-07.3** | Strict Citation Enforcement | Every factual claim in an AI response must include a valid markdown citation linking to an exact file path and line span (e.g., `[src/auth/jwt.ts:45-62]`). | P0 |
| **F-07.4** | Qualified Refusal on Missing Evidence | When retrieved evidence does not support a definitive answer, the assistant must explicitly qualify or refuse: *"Based on the analyzed repository files, no implementation for X was found."* Hallucinations are strictly penalized. | P0 |
| **F-07.5** | Prompt Injection Immunity | Wraps all source code and repository data in passive data tags (`<repository_source_code>`). System prompt strictly forbids executing instructions or prompt modifications embedded in repository files. | P0 |
| **F-07.6** | Pre-LLM Secret Redaction | All source code chunks pass through a secret detection/redaction filter (regex + entropy) before being transmitted to the external LLM provider. | P0 |

---

### 6.8 Interactive Web Workspace & Visualization (F-08)

| Requirement ID | Description | Acceptance Criteria | Priority |
|---|---|---|---|
| **F-08.1** | Three-Pane Responsive Layout | Top bar (Repo info, commit SHA, branch, search, analysis status), Left pane (Virtualized file explorer + symbol tree), Center pane (React Flow graph canvas / Request-flow visualizer), Right pane (AI Assistant chat), Bottom pane (Collapsible Monaco code viewer). | P0 |
| **F-08.2** | React Flow Canvas Interactions | Custom nodes for Modules, Files, Symbols, Routes, Databases, Queues. Features: smooth pan/zoom, auto-layout (Dagre / ELK), incoming/outgoing edge highlight, module clustering/collapse, and minimap. | P0 |
| **F-08.3** | Monaco Editor Code Viewer | Embeds Monaco Editor in read-only mode with full syntax highlighting, line numbering, line range highlighting, and instant navigation from graph nodes or AI citations. | P0 |
| **F-08.4** | Real-Time SSE Progress Stream | Analysis progress displays detailed stage name, percentage bar, processed files vs. total files counter, and real-time activity log without page reload. | P0 |
| **F-08.5** | Multi-Mode Graph View | Allows instant switching between **Architecture Mode** (subsystems and infra), **Dependency Mode** (file-to-file imports and circularities), and **Request-Flow Mode** (endpoint-to-database execution chains). | P0 |

---

## 7. Non-Functional & Production Requirements

### 7.1 Performance & Scalability
- **HTTP Responsiveness:** `POST /api/repositories` and `POST /api/repositories/:id/analyze` must return HTTP 202/201 in `< 250ms`. All parsing, graph computation, and embeddings execute in background workers.
- **Repository Size Capacity:** Supports repositories up to 2,000 source files and 100MB uncompressed source in the MVP tier. Repositories exceeding thresholds degrade gracefully by prioritizing entry points, routes, and high-centrality modules.
- **Graph Render Performance:** React Flow canvas maintains 60fps pan/zoom performance for graphs up to 1,000 nodes and 2,500 edges using node virtualization and cluster collapsing.
- **Hybrid Retrieval Latency:** End-to-end retrieval (vector search + lexical search + RRF fusion) responds in `< 100ms`.

### 7.2 Reliability & Fault Tolerance
- **Grammar Failure Isolation:** A fatal Tree-sitter parse error in a single file must never crash the worker or fail the overall repository analysis.
- **Job Recovery:** BullMQ workers handle job stalling and crash recovery. Stalled jobs are automatically reclaimed and retried.
- **LLM Outage Decoupling:** If the LLM provider is down or rate-limited, the entire deterministic visual explorer (file tree, graph, routes, request tracing, Monaco viewer) continues functioning at 100% capacity. The AI chat displays a graceful degradation notice.

### 7.3 Observability & Telemetry
- **Structured JSON Logging:** Pino logging in API and workers with correlation IDs (`requestId`, `analysisId`, `repositoryId`).
- **Pipeline Metrics:** Emits metrics for files parsed/sec, AST parse failure rate, embedding token consumption, LLM latency, retrieval hit rate, and worker queue lag.
- **Trace Context Propagation:** OpenTelemetry spans trace requests across API server, BullMQ queue, analyzer worker, database queries, and external AI calls.

---

## 8. Security, Privacy & Data Governance

```
                               SECURITY ARCHITECTURE
                               
   Public Repo URL ──> [ SSRF URL Validator ] ──> [ GitHub Ingestion ]
                                                         │
                                                         ▼
                                                [ AST Text-Only Parser ]
                                                (No Code Execution)
                                                         │
                                                         ▼
    LLM Provider <── [ Secret Redaction ] <── [ Source / AST Chunks ]
   (Data Sandboxed)    - AWS / API Keys
                       - Private Keys / JWT
                       - High Entropy Tokens
```

1. **Zero Code Execution:** Ingested source files are strictly treated as passive plain text data. Neither the API server, analyzer worker, nor frontend ever executes repository code, scripts, or build processes.
2. **SSRF Hardening:** URL input is strictly validated against `https://github.com/`. Requests to localhost (`127.0.0.1`), loopback, link-local (`169.254.169.254`), and RFC 1918 private IP ranges are blocked at the network and DNS resolution layers.
3. **Secret Redaction Pipeline:** Before any source code chunk is sent to an external LLM API, it is scanned by a regex + Shannon entropy analyzer to detect and redact API keys, Bearer tokens, private keys, database passwords, and connection strings.
4. **Prompt Injection Mitigation:** All retrieved source code is delivered to the LLM enclosed in structured `<untrusted_source_code>` XML blocks. The system instructions explicitly enforce that code within these blocks must never be interpreted as instructions.
5. **No Secret / Code Logging:** Raw repository source files and detected credentials are never written to application logs.

---

## 9. MVP vs. Advanced Version Phasing

```
┌────────────────────────────────────────────────────────────────────────────┐
│ MVP Scope (Milestones 1–8)                                                 │
│ • Public GitHub TS/JS Repositories                                         │
│ • AST Parsing (Tree-sitter TS/JS)                                          │
│ • Symbol Extraction, Import/Export Graph, Call Graph (static/inferred)     │
│ • Express & Fastify Route Extraction + Handler Resolution                  │
│ • Request-Flow Traversal (Route -> Handler -> Service -> DB)               │
│ • React Flow Canvas + Monaco Code Viewer + File Explorer                   │
│ • Code-Aware Semantic + Lexical RAG (pgvector + tsvector)                  │
│ • Grounded AI Assistant with clickable file/line citations                 │
│ • Asynchronous BullMQ analysis pipeline with SSE progress                  │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Advanced Production Scope (Milestones 9–10 & Beyond)                       │
│ • Python (FastAPI/Flask/Django), Go (Gin/Fiber), Java (Spring Boot)        │
│ • Private Repository Support via GitHub App OAuth Installation             │
│ • PR Impact Analysis (Changed file -> Reverse dependencies + Broken APIs)  │
│ • Architecture Drift Detection (Detecting layer rule violations over time) │
│ • Circular Dependency Dashboard & Hotspot Refactoring Suggestions         │
│ • VS Code Extension & Team Architecture Collaboration Workspace            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Success Metrics & Evaluation Benchmark

| Category | Metric | MVP Target | Production Target |
|---|---|---|---|
| **Pipeline Reliability** | End-to-end analysis success rate on top-1000 open-source TS/JS repos | $\ge 95\%$ | $\ge 99.0\%$ |
| **Analysis Performance** | Time to interactive graph for repos $\le 500$ files | $< 90\text{ s}$ | $< 45\text{ s}$ |
| **Parser Resilience** | AST parse failure rate across all supported source files | $< 1.5\%$ | $< 0.5\%$ |
| **Retrieval Accuracy** | Hit@5 on curated Code Search Evaluation Benchmark (50+ queries) | $\ge 80\%$ | $\ge 92\%$ |
| **Grounding Integrity** | Percentage of factual AI claims backed by clickable, valid citations | $\ge 90\%$ | $\ge 98\%$ |
| **Hallucination Resistance** | Correct qualification/refusal rate on unanswerable/adversarial queries | $\ge 90\%$ | $\ge 99\%$ |
| **UI Responsiveness** | Graph canvas render latency on 500-node graph | $< 1.5\text{ s}$ | $< 0.8\text{ s}$ |

---

## 11. Assumptions, Constraints & Limitations (What Not to Claim)

To maintain absolute technical credibility, GitLens AI adheres to strict documentation standards regarding what static analysis can and cannot guarantee:

1. **Dynamic Language Limits:** In JavaScript and dynamic TypeScript, dynamic property access (`obj[dynamicVar]()`), reflection, dependency injection containers, and dynamic imports (`import(variable)`) cannot be statically resolved with 100% certainty. These are marked as `inferred` or `unresolved`.
2. **Runtime Configuration Independence:** GitLens AI analyzes static source files and manifests. It does not execute the application or read live runtime environment variables.
3. **No Perfect Call Graph Claim:** We do not claim to build a sound, complete call graph for all dynamic JS/TS idioms. We explicitly distinguish between statically bound calls, alias matches, and heuristic inferences.
4. **AI is an Explainer, Not a Compiler:** The LLM's role is to synthesize static analysis and graph retrieval outputs into clear, cited natural language explanations.

---

## 12. Risks, Edge Cases & Mitigations

| Risk / Edge Case | Consequence | Mitigation Strategy |
|---|---|---|
| **Massive Monorepos (> 100k files)** | Worker memory exhaustion, GitHub API rate exhaustion | Implement strict file filtering, directory-level truncation fallback, and module centrality importance scoring to analyze core packages first. |
| **GitHub API Rate Limiting** | Stalled ingestion jobs | Utilize GitHub App authentication (5,000 req/hr per installation), ETag conditional requests, and cache repository trees by commit SHA. |
| **Tree-sitter Syntax Panic** | Worker crash | Isolate per-file parsing inside `try/catch` wrappers. Log error on `files.error` column and proceed with next file. |
| **Adversarial Prompt Injection in Code** | LLM output hijacked | Treat repository content as untrusted data inside `<untrusted_source_code>` blocks; enforce structured JSON tool responses. |
| **High Vector Embedding Costs** | Cloud budget overrun | Calculate SHA-256 `content_hash` for each chunk; skip embedding generation if an identical chunk hash exists in the database. |
| **Complex Circular Dependencies** | Visual graph clutter and layout failure | Run Tarjan's Strongly Connected Components (SCC) algorithm to collapse cyclic subgraphs into grouped cluster nodes. |
