<p align="center">
  <img src="docs/assets/logo.png" alt="GitLens AI Logo" width="130" style="border-radius: 28px; box-shadow: 0 16px 36px rgba(0,0,0,0.5);" />
  <h1 align="center">GitLens AI</h1>
  <p align="center">
    <strong>Production-Grade AI-Powered Codebase Intelligence & Architecture Explorer</strong><br/>
    <em>Deterministic AST Parsing, Interactive Dependency Graphs, API Flow Traversal, Hybrid Code RAG, and Grounded AI Q&A.</em>
  </p>
  <p align="center">
    <a href="#-quick-start"><img src="https://img.shields.io/badge/Docker-dev_stack-2496ED?logo=docker&logoColor=white" alt="Docker"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22c55e.svg" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Parser-Tree--sitter_Wasm-4B32C3" alt="Tree-sitter">
    <img src="https://img.shields.io/badge/Vector_DB-pgvector_16-336791?logo=postgresql&logoColor=white" alt="pgvector">
    <img src="https://img.shields.io/badge/Graph-React_Flow_11-FF0072" alt="React Flow">
    <img src="https://img.shields.io/badge/Framework-Next.js_14_%2B_Fastify-000000?logo=next.js&logoColor=white" alt="Next.js + Fastify">
    <img src="https://img.shields.io/badge/Queue-BullMQ_%2B_Redis-D82C20?logo=redis&logoColor=white" alt="Redis + BullMQ">
    <img src="https://img.shields.io/badge/AI_Law-Evidence_Over_Inference-10B981" alt="Evidence Over Inference">
  </p>
  <p align="center">
    <a href="#-what-is-gitlens-ai">About</a> · 
    <a href="#-the-problem">The Problem</a> · 
    <a href="#-features">Features</a> · 
    <a href="#-architecture">Architecture</a> · 
    <a href="#-pipeline-workflow">Pipeline</a> · 
    <a href="#-feature-comparison">Comparison</a> · 
    <a href="#-quick-start">Quick Start</a> · 
    <a href="#-configuration-reference">Configuration</a> · 
    <a href="#-api-documentation">API Docs</a> · 
    <a href="#-monorepo-structure">Structure</a>
  </p>
</p>

---

## What is GitLens AI?

**GitLens AI** is an enterprise-grade, interactive codebase intelligence and architecture reasoning platform. It ingests public and private GitHub repositories and transforms them into living, navigable architecture graphs, end-to-end API request-flow maps, and a grounded AI engineering assistant.

Modern codebases are large, modular, and multi-layered. Developers spend over 60% of their time reading, tracing, and reverse-engineering unfamiliar code. Traditional tools either provide static CLI graph outputs without interactive visualization, or rely on naive LLM wrappers that slice code into arbitrary text chunks, producing severe hallucinations.

GitLens AI solves this with a strict **Evidence Over Inference** philosophy:

- **100% Deterministic Static Analysis** — High-performance AST parsing with Tree-sitter, symbol resolution, and import/export graph construction execute completely independent of LLMs.
- **Interactive Architecture & Dependency Canvas** — Explore file dependencies, module clusters, circular references (Tarjan's SCC), and blast radius impacts on a reactive React Flow canvas.
- **Automated API & Request-Flow Traversal** — Automatically traces HTTP endpoints from router definitions through middlewares, controller methods, and service layers down to database queries.
- **AST-Aware Hybrid Code RAG** — Combines dense semantic embeddings (`pgvector`) with sparse lexical matching (`pg_trgm` / trigram identifiers) chunked along natural AST boundaries (functions, classes, interfaces).
- **Grounded AI Engineering Assistant** — Multi-provider AI reasoning (Groq, OpenAI, Anthropic, Gemini) grounded in verifiable static code receipts with clickable line-range citations `[path/file.ts#L10-L40]`.
- **Integrated Monaco Code Viewer** — Read-only code inspector with symbol-level deep linking, syntax highlighting, and bidirectional graph synchronization.

---

## The Problem

Navigating unfamiliar codebases with traditional tools or generic AI wrappers leads to blind spots and hallucinations:

| What you want to do | Traditional Tools / Generic AI Chat | With GitLens AI |
|---|---|---|
| **Understand repo architecture** | Outdated READMEs or clicking folder trees | **Interactive Living Graph** with module clusters, metrics, and dependency depth |
| **Trace HTTP request flows** | Manual grepping across controllers and services | **Deterministic Flow Maps** linking route $\rightarrow$ handler $\rightarrow$ service $\rightarrow$ ORM query |
| **Calculate blast radius of changes** | Mental reverse-engineering or waiting for CI failures | **Graph Traversal Engine** showing instant upstream & downstream dependent nodes |
| **Detect circular dependencies** | Running complex linters or discovering runtime deadlocks | **Tarjan's Strongly Connected Components (SCC)** auto-detected and visually flagged |
| **Ask questions about the codebase** | Naive 500-token chunks lose symbols and hallucinate | **AST-Grounded Assistant** citing exact code lines with zero hallucinations |
| **Inspect database & infrastructure topology** | Reading manifest files that list unused packages | **Static Model Extraction** detecting Prisma, Drizzle, TypeORM, Redis & BullMQ |
| **Self-hosted & decoupled resilience** | Cloud vendor lock-in; fails when AI provider is down | **Total LLM Decoupling**: Static graph and code viewer work with 0 external AI availability |

---

## Features

### 1. Deterministic AST & Tree-sitter Parsing Engine
- Multi-language tolerant parser core powered by **Tree-sitter WebAssembly / Native bindings**.
- First-class grammar support for **TypeScript, JavaScript, TSX, JSX, Python, and Go**.
- Single-File Fault Boundary: A syntax error in one file never halts analysis of the remaining repository.
- Extracts comprehensive symbol tables: functions, classes, interfaces, types, imports, exports, and call expressions.

### 2. Interactive Architecture & Dependency Graph Canvas
- High-performance canvas powered by **React Flow (`@xyflow/react`)** with smooth zoom, pan, minimap, and node search.
- **Circular Dependency Detection**: Implements Tarjan's Strongly Connected Components (SCC) algorithm to flag cyclic dependencies.
- **Blast Radius Analysis**: Select any node to calculate upstream dependents and downstream dependencies up to $N$ hops.
- **Component Clustering**: Automatically groups modules by architectural layers (Presentation, Domain, Infrastructure, Data).

### 3. API Route Extraction & Request-Flow Traversal
- Automatically identifies REST routes across major frameworks (**Fastify, Express, Next.js App Router, NestJS**).
- Maps HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) and parameterized paths (`/api/v1/users/:id`).
- Traverses call chains from entrypoint handlers through service layers, utility functions, to ORM / query calls.

### 4. Code-Aware Semantic & Lexical Hybrid RAG
- **AST Chunking**: Splits code strictly along structural AST boundaries (classes, functions, types) preserving parent symbol context.
- **pgvector Dense Vector Search**: 1536-dimensional embeddings with cosine similarity for high-level architectural queries.
- **Trigram Lexical Search**: PostgreSQL `pg_trgm` index for exact identifier, function name, and variable matching.
- **Reciprocal Rank Fusion (RRF)**: Merges dense vector and sparse lexical rankings for optimal code retrieval.

### 5. Grounded AI Engineering Assistant
- Multi-provider AI Gateway supporting **Groq (Free Tier / Ultra-Fast), OpenAI (GPT-4o), Anthropic (Claude 3.5), and Gemini**.
- Tool-use orchestration: The assistant queries the database, retrieves symbol definitions, inspects graph edges, and traces flows.
- Strict citation enforcement: Every assertion includes verified file paths and line ranges `[src/auth.ts#L45-L89]`.
- Real-time streaming responses via **Server-Sent Events (SSE)**.

### 6. Read-Only Monaco Code Viewer & Symbol Deep Linking
- Integrated **Monaco Editor** with dark editorial theme and full syntax highlighting.
- Bidirectional interaction: Clicking a graph node or chat citation immediately jumps to the exact line span in the editor.
- Symbol hover cards displaying AST types, export status, and incoming reference counts.

### 7. Database, ORM & Infrastructure Topology Detection
- Detects database schemas and entity relationships across **Prisma (`schema.prisma`), Drizzle, TypeORM, Mongoose, and SQL migrations**.
- Identifies background queues (**BullMQ, Celery**), caches (**Redis**), and third-party integrations from active AST call sites.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GitLens AI Web (Next.js 14)                        │
│    Graph Canvas (React Flow) · Monaco Code Viewer · AI Chat · Diagnostics   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / SSE / REST
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                          GitLens AI API (Fastify v4)                        │
│   Analysis Controller · Graph Engine · Search · Chat Orchestrator · Health  │
└──────────────┬───────────────────────┬───────────────────────┬──────────────┘
               │                       │                       │
       BullMQ  │            PostgreSQL │ + pgvector            │ AI Gateway
┌──────────────▼─────────────┐ ┌───────▼────────────────┐ ┌────▼──────────────┐
│  Async Analyzer Worker     │ │   PostgreSQL 16 DB     │ │  LLM Providers    │
│  - GitHub Octokit Ingestion│ │   - Repositories       │ │  - Groq (Default) │
│  - Tree-sitter AST Engine  │ │   - AST Nodes & Edges  │ │  - OpenAI (GPT-4o)│
│  - Graph & SCC Analyzer    │ │   - Symbols & Routes   │ │  - Anthropic      │
│  - Hybrid Chunking & RAG   │ │   - Vector Embeddings  │ │  - Gemini         │
└────────────────────────────┘ └────────────────────────┘ └───────────────────┘
```

---

## Pipeline Workflow

```
┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│  GitHub  │    │ Tree-sitter │    │   Symbol     │    │  Dependency │    │  API Route  │
│  Repo    ├───►│  AST Parser ├───►│  Resolution  ├───►│  Graph &    ├───►│  Extraction │
│  Ingest  │    │  (TS/JS/Py) │    │  & Imports   │    │  SCC Engine │    │  & Flows    │
└──────────┘    └─────────────┘    └──────────────┘    └─────────────┘    └──────┬──────┘
                                                                                 │
┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐           │
│ Grounded │    │  pgvector   │    │ AST Chunking │    │ Topology    │           │
│ AI & Web │◄───┤  Embeddings │◄───┤  & Trigram   │◄───┤ Detection   │◄──────────┘
│ Canvas   │    │  Stored     │    │  Indexation  │    │ (DB/Queues) │
└──────────┘    └─────────────┘    └──────────────┘    └─────────────┘
```

---

## Feature Comparison

| Capability | GitLens AI | GitHub UI | Dependency-Cruiser | Generic Chat-with-Repo | CodeQL |
|---|:---:|:---:|:---:|:---:|:---:|
| **Interactive Graph Canvas** | ✅ **React Flow** | ❌ | ⚠️ Static SVG/Dot | ❌ | ❌ |
| **Deterministic AST Parsing** | ✅ **Tree-sitter** | ⚠️ Text-only | ✅ TS/JS only | ❌ Naive Chunks | ✅ Query-based |
| **API Flow Traversal** | ✅ **Automated** | ❌ | ❌ | ❌ | ⚠️ Complex Query |
| **Circular Dependency (SCC)**| ✅ **Tarjan's Algo**| ❌ | ✅ CLI only | ❌ | ❌ |
| **AST-Aware Hybrid RAG** | ✅ **pgvector + BM25**| ❌ | ❌ | ⚠️ Fixed 500 Tokens | ❌ |
| **Zero-Hallucination AI Citations**| ✅ **Strict Line Ranges**| ❌ | ❌ | ❌ Hallucinates | ❌ |
| **Monaco Symbol Linking** | ✅ **Integrated** | ⚠️ Basic Jump | ❌ | ❌ | ❌ |
| **Total LLM Decoupling** | ✅ **100% Functional**| ✅ | ✅ | ❌ Useless | ✅ |
| **Self-Hosted Docker Stack** | ✅ **One Command** | ❌ | ⚠️ CLI | ⚠️ Variable | ⚠️ Complex |

---

## Quick Start

### Prerequisites
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** installed and running
- **[Node.js 20+](https://nodejs.org/)** & `npm`
- **Git**

---

### Step 1: Clone and Configure

```bash
git clone https://github.com/keshavagr273/GitLens-AI.git
cd GitLens-AI
cp .env.example .env
```

Edit `.env` with your database and LLM API keys:

```env
# Server & Database
PORT=3001
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/gitlens"
REDIS_URL="redis://localhost:6379"

# AI Provider (Groq Free Tier or OpenAI)
LLM_PROVIDER="groq"
GROQ_API_KEY="gsk_your_groq_api_key_here"
GROQ_MODEL="openai/gpt-oss-120b"

# Optional GitHub Token (Increases API rate limits for ingestion)
GITHUB_TOKEN=""
```

---

### Step 2: Start Infrastructure Containers

```bash
# Start PostgreSQL with pgvector and Redis 7 in the background
docker compose -f docker/docker-compose.dev.yml up -d
```

This starts:
- 🐘 **PostgreSQL 16 + pgvector** on port `5432`
- ⚡ **Redis 7** on port `6379` (BullMQ queues & caching)

---

### Step 3: Run Typecheck & Start Development Servers

```bash
# Install all monorepo dependencies
npm install

# Start all applications (API, Web Frontend, Worker) in parallel
npm run dev
```

Or start individual services in dedicated terminals:
```bash
# Terminal 1: Fastify API Server (Port 3001)
npm run dev:api

# Terminal 2: Next.js Web App (Port 3000)
npm run dev:web

# Terminal 3: BullMQ Analyzer Worker
npm run dev:worker
```

### Access Your Applications:
- 🌐 **Frontend Web Workspace**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend REST API**: [http://localhost:3001](http://localhost:3001)
- 🩺 **System Health & Diagnostics**: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)

---

## Configuration Reference

All application parameters are environment-driven and validated via Zod schemas:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend Fastify API server port |
| `HOST` | `0.0.0.0` | Host binding interface |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string with `pgvector` enabled |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL for BullMQ and cache |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API endpoint URL used by Next.js frontend |
| `LLM_PROVIDER` | `groq` | Active AI provider (`groq`, `openai`, `anthropic`, `gemini`, `mock`) |
| `GROQ_API_KEY` | *(optional)* | Groq Cloud API key for ultra-fast free tier reasoning |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq LLM model name |
| `LLM_API_KEY` | *(optional)* | General OpenAI/Anthropic/Gemini API key |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Vector embedding model for code chunks |
| `EMBEDDING_DIMENSION` | `1536` | Embedding vector dimensionality |
| `GITHUB_TOKEN` | *(optional)* | GitHub Personal Access Token to avoid rate limiting |
| `MAX_REPOSITORY_SIZE_MB`| `100` | Maximum repository size allowed for analysis |
| `MAX_CONCURRENT_ANALYSES`| `4` | Maximum parallel repository ingestion jobs |

---

## API Documentation

GitLens AI provides a high-throughput REST and SSE API:

### Key Endpoints:
- `POST /api/v1/repositories/analyze` — Trigger background repository ingestion and AST analysis
- `GET  /api/v1/repositories/:id/status` — Poll real-time worker analysis progress and phase status
- `GET  /api/v1/graph/:repoId` — Fetch the full interactive dependency graph (nodes, edges, SCC clusters)
- `GET  /api/v1/graph/:repoId/blast-radius` — Calculate upstream/downstream blast radius for a given node
- `GET  /api/v1/routes/:repoId` — Retrieve all extracted API routes and end-to-end request flows
- `GET  /api/v1/symbols/:repoId` — Query symbol table (classes, functions, interfaces) with line numbers
- `GET  /api/v1/search/:repoId` — Execute hybrid semantic vector + trigram lexical code search
- `POST /api/v1/chat/:repoId` — SSE streaming conversational AI with grounded AST citations
- `GET  /api/v1/diagnostics/:repoId` — Export comprehensive architectural health report

---

## Monorepo Structure

```text
GitLens-AI/
├── apps/
│   ├── api/                     # Fastify REST API, SSE Handlers, Route Controllers
│   │   └── src/modules/         # Analysis, Graph, Routes, Symbols, Search, Chat, Health
│   └── web/                     # Next.js 14 Web Workspace & Frontend Shell
│       ├── app/                 # App Router (Workspace, Health, Layout)
│       ├── features/            # Graph Canvas, Code Viewer, Chat Panel, Node Inspector
│       └── lib/                 # Zustand State Stores, Axios Client, Types
├── packages/
│   ├── ai-core/                 # LLM Provider Gateway, Grounded Prompts, Tool Orchestration
│   ├── config/                  # Central Zod Environment Validation & Defaults
│   ├── database/                # PostgreSQL Connection, pgvector Client, Schema DDL
│   ├── graph-core/              # Graph Algorithms, Tarjan's SCC, Blast Radius Engine
│   ├── ingestion/               # GitHub Octokit Cloner, Tree Ingester, File Filter
│   ├── parser-core/             # Tree-sitter Grammar Pipelines (TS/JS, Python, Go)
│   ├── rag-core/                # AST Chunking, pgvector Embeddings, Trigram Search
│   ├── shared-types/            # Shared TypeScript Interfaces, DTOs, Enums
│   ├── telemetry/               # OpenTelemetry Tracing, Pino Structured Logger
│   └── utils/                   # Shared Helper Functions, Hash Generators, Formatters
├── workers/
│   └── analyzer/                # BullMQ Async Ingestion, AST Parsing & Embedding Worker
├── docker/
│   ├── docker-compose.dev.yml   # PostgreSQL + pgvector & Redis 7 Infrastructure
│   ├── Dockerfile.api           # Fastify API Production Container
│   ├── Dockerfile.web           # Next.js Web App Production Container
│   └── Dockerfile.worker        # Analyzer Worker Container
├── docs/                        # Assets, Logo, and Technical Documentation
├── architecture.md              # Exhaustive System Architecture & Engineering Blueprint
├── prd.md                       # Product Requirements Document & Functional Specs
├── tasks.md                     # Work Breakdown Structure & Implementation Milestones
├── checkpoint.md                # Verification Ledger & Quality Assurance Checkpoints
├── .env.example                 # Environment Variables Template
└── README.md                    # Project Documentation
```

---

## Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/my-new-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feat/my-new-feature`)
5. **Open** a Pull Request

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>GitLens AI</strong><br/>
  <em>Empowering Engineering Teams with Grounded Codebase Intelligence & AST Precision.</em>
</p>
