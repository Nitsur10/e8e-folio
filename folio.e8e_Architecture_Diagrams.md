# folio.e8e — Architecture Diagrams

Companion to *folio.e8e — Solution Architecture & MVP Build Plan v1.1*. Every diagram below maps to a section of that document. Use alongside the doc, not as a replacement.

---

## 1. System Architecture — Six Layers

*Reference: §3.1*

Layered view of the platform. Each layer has a single responsibility and a clean interface to the layers above and below.

```mermaid
flowchart TB
    subgraph L1["L1 — Presentation"]
        MOB[Expo Mobile App<br/>iOS + Android]
        WEB[Next.js Web<br/>responsive]
        REG[Component Registry<br/>~40 primitives]
        UCA[UI Context Assembler]
    end

    subgraph L2["L2 — Agent Runtime"]
        INN[Inngest Workflows]
        HARN[Harness<br/>Context · Constraints · Tracing]
        PR[Prompt Registry<br/>versioned]
        DRIFT[Behavior Drift Monitor]
    end

    subgraph L3["L3 — LLM Abstraction"]
        ROUT[Task Router]
        VAI[Vercel AI SDK]
        EVAL[Eval Harness<br/>CI gate]
    end

    subgraph L4["L4 — Signal & Data"]
        ING[Ingestion Workers]
        ENR[Haiku Enrichment]
        BUS[Signal Bus<br/>Redis Streams]
        HIST[Historical Store<br/>replay corpus]
    end

    subgraph L5["L5 — Execution"]
        EXEC[Execution Service]
        ALP[Alpaca Adapter]
        IBKR[IBKR Adapter<br/>Phase 2]
    end

    subgraph L6["L6 — Persistence & Observability"]
        PG[(Postgres<br/>Supabase + RLS)]
        R2[(R2 / S3<br/>prompts + traces)]
        KMS[KMS Vault<br/>broker keys]
        LF[Langfuse<br/>traces + evals]
        GRAF[Grafana + Sentry]
    end

    MOB --> UCA
    WEB --> UCA
    UCA --> REG
    UCA --> ROUT

    INN --> HARN
    HARN --> PR
    HARN --> ROUT
    HARN --> DRIFT

    ROUT --> VAI
    ROUT --> EVAL
    VAI -->|Claude / OpenAI / Gemini| EXT((LLM Providers))

    ING --> ENR
    ENR --> BUS
    BUS --> HARN
    HIST --> HARN

    HARN --> EXEC
    EXEC --> ALP
    EXEC --> IBKR
    ALP -->|paper/live| BRK((Broker APIs))

    HARN --> PG
    HARN --> R2
    EXEC --> PG
    KMS --> EXEC
    HARN --> LF
    EXEC --> GRAF

    classDef layer fill:#EAF1F8,stroke:#1F4E79,stroke-width:2px
    class L1,L2,L3,L4,L5,L6 layer
```

---

## 2. Agent Decision Sequence — Trigger to Execution

*Reference: §3.2, §4.1–4.5*

The full lifecycle of a single decision, including constraint gates and the two-phase commit for high-stakes actions.

```mermaid
sequenceDiagram
    autonumber
    participant T as Trigger<br/>(cron / signal / user)
    participant R as Agent Runtime
    participant CA as Context Assembler
    participant LLM as LLM Router
    participant CE as Constraint Engine
    participant EX as Execution Service
    participant BR as Broker (Alpaca)
    participant U as User (mobile)
    participant DB as Postgres + Traces

    T->>R: fire trigger
    R->>DB: load agent charter + state
    R->>CA: assemble context
    CA->>DB: query portfolio, signals, recent decisions
    CA-->>R: prompt + context manifest (hash)
    R->>LLM: complete(prompt, model=Sonnet, temp=0)
    LLM-->>R: structured proposal (JSON)

    Note over CE: 5 layers, all must pass
    R->>CE: validate(proposal)
    CE->>CE: L1 Structural · L2 Policy · L3 Simulated · L4 Rate · L5 Killswitch

    alt constraint fails
        CE-->>R: reject + error
        R->>LLM: retry (max 2) with error feedback
    else constraint passes
        CE-->>R: approved

        alt human-in-loop mode
            R->>U: push decision card
            U-->>R: approve / reject (1-tap)
        end

        R->>EX: confirm_trade (idempotency key)
        EX->>BR: submit order
        BR-->>EX: order_id + status
        EX->>BR: poll for fill (reconcile)
        BR-->>EX: filled / partial / rejected
    end

    EX->>DB: persist order + position update
    R->>DB: persist trace, prompt archive, response archive
    R->>U: push outcome + retrospective (async)
```

---

## 3. Signal Pipeline — Ingestion to Consumption

*Reference: §5.1*

Four-stage pipeline converting noisy external feeds into structured, scored signals agents consume.

```mermaid
flowchart LR
    subgraph SRC["Sources (MVP)"]
        BZ[Benzinga<br/>news]
        POLY[Polygon<br/>news + data]
        EDG[SEC EDGAR<br/>filings]
        ALPM[Alpaca<br/>market data]
    end

    subgraph S1["Stage 1 — Ingest"]
        W1[Workers<br/>auth · pagination · rate-limit]
        STR[(Normalized<br/>event stream)]
    end

    subgraph S2["Stage 2 — Filter & Enrich"]
        TE[Ticker extraction<br/>regex + NER]
        RS[Relevance scoring<br/>watchlist match]
        DD[Deduplication<br/>content hash]
        CW[Source credibility<br/>weighting]
        HK[Haiku enrichment<br/>sentiment · novelty · materiality]
    end

    subgraph S3["Stage 3 — Derive Signals"]
        SD[Sentiment delta]
        NV[Novelty flag]
        VL[Velocity]
        XA[Cross-asset<br/>Phase 2]
        EO[Event overlap<br/>Phase 2]
    end

    subgraph S4["Stage 4 — Consume"]
        BUS[(Signal Bus<br/>Redis Streams)]
        AG[Agents<br/>query by ticker + window]
    end

    BZ --> W1
    POLY --> W1
    EDG --> W1
    ALPM --> W1
    W1 --> STR
    STR --> TE --> RS --> DD --> CW --> HK
    HK --> SD
    HK --> NV
    HK --> VL
    HK --> XA
    HK --> EO
    SD --> BUS
    NV --> BUS
    VL --> BUS
    XA --> BUS
    EO --> BUS
    BUS --> AG

    classDef mvp fill:#EAF1F8,stroke:#1F4E79
    classDef p2 fill:#FDF2E9,stroke:#C55A11,stroke-dasharray: 5 5
    class XA,EO p2
```

---

## 4. Context Assembler — Section Flow

*Reference: §4.1*

Deterministic prompt assembly. Each section is a pure function returning string plus manifest entry. The LLM never chooses its own context.

```mermaid
flowchart TB
    TRIG[Agent Trigger] --> ASM[Context Assembler]

    ASM --> S1[SYSTEM_IDENTITY<br/>prompt registry]
    ASM --> S2[AGENT_CHARTER<br/>Postgres: agents table]
    ASM --> S3[HARD_CONSTRAINTS<br/>user + platform rules]
    ASM --> S4[PORTFOLIO_STATE<br/>live snapshot]
    ASM --> S5[MARKET_STATE<br/>VIX · regime · session]
    ASM --> S6[RELEVANT_SIGNALS<br/>signal bus query]
    ASM --> S7[RECENT_DECISIONS<br/>last 5 from decision log]
    ASM --> S8[AVAILABLE_TOOLS<br/>filtered by charter]
    ASM --> S9[CURRENT_TASK<br/>trigger payload]
    ASM --> S10[OUTPUT_CONTRACT<br/>Zod schema]

    S1 --> CONCAT[Concatenate<br/>in fixed order]
    S2 --> CONCAT
    S3 --> CONCAT
    S4 --> CONCAT
    S5 --> CONCAT
    S6 --> CONCAT
    S7 --> CONCAT
    S8 --> CONCAT
    S9 --> CONCAT
    S10 --> CONCAT

    CONCAT --> OUT{{"Final prompt +<br/>manifest hash"}}

    OUT --> LLM[LLM call]
    OUT --> LOG[(Persist manifest<br/>with decision)]

    classDef section fill:#F5F9FC,stroke:#2E75B6
    class S1,S2,S3,S4,S5,S6,S7,S8,S9,S10 section
```

---

## 5. Constraint Engine — Five Safety Layers

*Reference: §4.2, §4.9*

Every agent proposal runs this gauntlet. Failure at any layer rejects the action.

```mermaid
flowchart TB
    PROP[Agent Proposal<br/>structured JSON] --> L1

    L1{L1 — Structural<br/>Zod schema valid?<br/>ticker · quantity · type}
    L1 -->|fail| RETRY[Retry with error<br/>max 2 attempts]
    L1 -->|pass| L2

    L2{L2 — Policy<br/>position size · exposure<br/>trade count · blackouts}
    L2 -->|fail| REJ1[Hard reject<br/>log + notify user]
    L2 -->|pass| L3

    L3{L3 — Simulated Execution<br/>post-trade Greeks<br/>margin check}
    L3 -->|fail| REJ2[Hard reject<br/>log]
    L3 -->|pass| L4

    L4{L4 — Rate & Cost<br/>LLM tokens · daily cost<br/>API call rate}
    L4 -->|fail| THR[Throttle or halt agent]
    L4 -->|pass| L5

    L5{L5 — Kill Switch<br/>global · per-user · per-agent}
    L5 -->|halt active| ABORT[Immediate abort<br/>no side effects]
    L5 -->|pass| OK[APPROVED<br/>→ execution]

    RETRY -.-> L1

    classDef fail fill:#FDF2E9,stroke:#C55A11
    classDef pass fill:#EAF1F8,stroke:#1F4E79
    classDef term fill:#E8F5E9,stroke:#2E7D32
    class REJ1,REJ2,THR,ABORT,RETRY fail
    class L1,L2,L3,L4,L5 pass
    class OK term
```

---

## 6. Generative UI — Home Screen Composition

*Reference: §7.3, §7.4*

How an folio.e8e home screen gets composed on every app open. Streaming + caching + fallback make the magic fast.

```mermaid
sequenceDiagram
    autonumber
    participant U as User opens app
    participant APP as Mobile App
    participant CACHE as Layout Cache<br/>(30–60s TTL)
    participant CTX as UI Context Assembler
    participant LLM as Claude Haiku<br/>(layout model)
    participant REG as Component Registry
    participant DATA as Data Services

    U->>APP: foreground
    APP->>CACHE: lookup(context_hash)

    alt cache hit
        CACHE-->>APP: layout manifest
        APP->>REG: render components
        REG->>DATA: fetch props
        DATA-->>APP: stream data
        APP-->>U: instant render
    else cache miss
        APP-->>U: render last-known-good (fallback)
        APP->>CTX: assemble context
        CTX->>DATA: snapshot portfolio + market + signals
        DATA-->>CTX: structured packet
        CTX-->>APP: context + device class + time
        APP->>LLM: generate layout (stream)

        loop streaming components
            LLM-->>APP: next component {type, props}
            APP->>REG: instantiate
            APP-->>U: append to screen
        end

        APP->>CACHE: store(context_hash, manifest)
    end

    Note over APP: On background, pre-generate next layout<br/>so next foreground is instant
```

---

## 7. Deployment Topology

*Reference: §8.1*

How the services physically live. All managed; no self-hosted infrastructure except Langfuse.

```mermaid
flowchart LR
    subgraph CLIENT["Clients"]
        IOS[iOS App<br/>Expo]
        AND[Android App<br/>Expo]
        BROWSER[Web Browser]
    end

    subgraph VRC["Vercel"]
        NEXT[Next.js<br/>API routes + web]
        EDGE[Edge middleware]
    end

    subgraph INNG["Inngest Cloud"]
        WF[Agent workflows<br/>durable + retrying]
        SCHED[Schedulers<br/>cron triggers]
    end

    subgraph SUPA["Supabase"]
        PG[(Postgres + RLS)]
        AUTH[Auth]
        RT[Realtime]
        STOR[Storage]
    end

    subgraph UPST["Upstash"]
        REDIS[(Redis<br/>signal bus + cache)]
    end

    subgraph CF["Cloudflare"]
        R2[(R2<br/>prompt + trace archives)]
    end

    subgraph AWS["AWS"]
        KMS[KMS<br/>broker key envelope]
    end

    subgraph THIRD["Third-Party APIs"]
        ANT[Anthropic]
        OAI[OpenAI]
        ALP[Alpaca]
        POL[Polygon]
        BEN[Benzinga]
        SEC[SEC EDGAR]
    end

    subgraph OBS["Observability"]
        LF[Langfuse<br/>self-hosted VM]
        SEN[Sentry]
        GRAF[Grafana Cloud]
        PD[PagerDuty]
    end

    IOS --> EDGE
    AND --> EDGE
    BROWSER --> EDGE
    EDGE --> NEXT
    NEXT --> AUTH
    NEXT --> PG
    NEXT --> RT
    NEXT --> WF

    WF --> PG
    WF --> REDIS
    WF --> R2
    WF --> KMS
    WF --> ANT
    WF --> OAI
    WF --> LF

    SCHED --> WF

    NEXT --> ANT
    NEXT --> POL
    WF --> ALP
    WF --> POL
    WF --> BEN
    WF --> SEC

    NEXT --> SEN
    WF --> SEN
    NEXT --> GRAF
    WF --> GRAF
    SEN --> PD
    GRAF --> PD

    classDef mgd fill:#EAF1F8,stroke:#1F4E79
    classDef ext fill:#F5F5F5,stroke:#666
    class VRC,INNG,SUPA,UPST,CF,AWS,OBS mgd
    class THIRD ext
```

---

## 8. Eval & CI Gating Flow

*Reference: §6.5, §11.5*

How prompt, model, or constraint changes gate through evals before reaching production.

```mermaid
flowchart TB
    DEV[Developer PR<br/>prompt / constraint / model] --> CI[GitHub Actions]

    CI --> E1{Schema conformance<br/>≥ 99.0%}
    E1 -->|fail| BLOCK1[Block PR<br/>fix required]
    E1 -->|pass| E2

    E2{Golden decision replay<br/>≥ 95% match on 50 scenarios}
    E2 -->|fail| BLOCK2[Block PR<br/>review divergence]
    E2 -->|pass| E3

    E3{Constraint pass-rate<br/>≥ 90%}
    E3 -->|fail| BLOCK3[Block PR<br/>investigate outliers]
    E3 -->|pass| E4

    E4{News enrichment accuracy<br/>≥ 92% label agreement}
    E4 -->|fail| WARN[Warn + review<br/>non-blocking]
    E4 -->|pass| MERGE

    WARN --> MERGE[Merge to main]
    MERGE --> DEPLOY[Preview deploy]
    DEPLOY --> SHADOW[7-day paper shadow<br/>for new agents]

    SHADOW --> DRIFT{Behavior inside<br/>±2σ envelope?}
    DRIFT -->|no| ROLL[Rollback<br/>feature flag off]
    DRIFT -->|yes| PROD[Promote to production]

    PROD --> MON[Continuous monitoring<br/>drift · latency · cost]
    MON -->|drift detected| ROLL

    classDef gate fill:#EAF1F8,stroke:#1F4E79
    classDef fail fill:#FDF2E9,stroke:#C55A11
    classDef pass fill:#E8F5E9,stroke:#2E7D32
    class E1,E2,E3,E4,DRIFT gate
    class BLOCK1,BLOCK2,BLOCK3,ROLL fail
    class MERGE,PROD pass
```

---

## 9. Agent Lifecycle — State Transitions

*Reference: §4.6*

States an agent moves through, with concrete exit criteria for each forward transition.

```mermaid
stateDiagram-v2
    [*] --> Draft: user creates agent

    Draft --> Paper: valid config + constraint pre-check passes
    Draft --> [*]: user deletes

    Paper --> Staged: Phase 2+<br/>≥30 trading days<br/>≥20 decisions logged<br/>Sharpe > 1.0<br/>zero P0 incidents
    Paper --> Paused: user or circuit breaker
    Paper --> Retired: user archives

    Staged --> LiveAuto: Phase 2+<br/>≥30 days staged<br/>≥95% user-approval rate<br/>explicit live opt-in
    Staged --> Paused: user or circuit breaker
    Staged --> Retired: user archives

    LiveAuto --> Staged: drawdown trigger<br/>or user requests
    LiveAuto --> Paused: user or circuit breaker
    LiveAuto --> Retired: user archives

    Paused --> Paper: resume from Paper
    Paused --> Staged: resume from Staged
    Paused --> LiveAuto: resume from LiveAuto
    Paused --> Retired: user archives

    Retired --> [*]
```

---

## 10. Incident Response Flow

*Reference: §10.4*

How a P0 is classified and resolved. Speed here is the product.

```mermaid
flowchart TB
    DETECT[Signal detected<br/>alert · user report · monitor] --> TRIAGE{Classify severity}

    TRIAGE -->|P0 Safety| P0[P0 — Safety<br/>trades outside constraints<br/>data leak · key exposure]
    TRIAGE -->|P1 Availability| P1[P1 — Availability<br/>app down · runtime degraded]
    TRIAGE -->|P2 Correctness| P2[P2 — Correctness<br/>non-dangerous bug]
    TRIAGE -->|P3 Minor| P3[P3 — Normal queue]

    P0 --> KILL[Global kill-switch ON<br/>within 5 min]
    KILL --> IC[Designate<br/>incident commander]
    IC --> STATUS[Status page<br/>within 15 min]
    STATUS --> NOTIFY[User notification<br/>within 1 hour]
    NOTIFY --> FIX[Mitigate + verify]
    FIX --> REOPEN[Lift kill-switch<br/>gradual ramp]
    REOPEN --> PM[Post-mortem<br/>within 48 hours]
    PM --> GOLDEN[Add scenario<br/>to eval golden set]

    P1 --> ACK1[Ack within 10 min]
    ACK1 --> STATUS

    P2 --> ACK2[Ack within 1 hour]
    ACK2 --> NEXT[Next scheduled release]

    P3 --> QUEUE[Normal ticket queue]

    classDef p0 fill:#FDF2E9,stroke:#C55A11,stroke-width:3px
    classDef p1 fill:#FFF4E5,stroke:#B8860B
    classDef p2 fill:#EAF1F8,stroke:#1F4E79
    classDef p3 fill:#F5F5F5,stroke:#666
    class P0,KILL,IC,STATUS,NOTIFY,FIX,REOPEN,PM,GOLDEN p0
    class P1,ACK1 p1
    class P2,ACK2,NEXT p2
    class P3,QUEUE p3
```

---

## How to use these

Embed in your internal wiki (Notion, Confluence, GitHub repo README), or render with any mermaid-capable viewer. Each diagram is deliberately minimal — enough to orient, not so much that it decays when the implementation evolves. Update alongside the architecture doc; diagrams that drift from the doc are worse than no diagrams.

Suggested pairing with the main doc:
- Diagrams 1–2 during architecture kickoff
- Diagram 3 when onboarding the data engineer
- Diagrams 4–5 when onboarding the AI/prompt engineer
- Diagram 6 when onboarding the mobile engineer
- Diagram 7 for infrastructure setup
- Diagram 8 when wiring CI
- Diagrams 9–10 during ops-readiness review (Week 10)
