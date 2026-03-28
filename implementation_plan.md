# TradeGraph — .NET 8 Microservices Backend

Wholesale supply chain management system built as a multi-project .NET 8 solution.
Manages products, supplier relationships, price changes, graph traversal impact analysis,
and real-time alerts — all event-driven via Redis Pub/Sub.

> [!IMPORTANT]
> **Local PostgreSQL & Redis.** The solution now includes a `docker-compose.yml` to spin up a local PostgreSQL 16 instance and Redis 7. This replaces the need for any external database services for local development.

> [!IMPORTANT]
> **Connection Strings.** Default connection strings in `appsettings.json` will point to `Host=localhost;Database=tradegraph;Username=admin;Password=password123`.

---

## Solution Structure

```
d:\forMyMom/
├── TradeGraph.sln
├── docker-compose.yml                  ← spins up Postgres & Redis locally
├── src/
│   ├── TradeGraph.Shared/              ← class library (DTOs, events, interfaces, Protos)
│   ├── TradeGraph.CatalogService/      ← ASP.NET Core Web API + gRPC Service :5001
│   ├── TradeGraph.GraphService/        ← ASP.NET Core Web API + gRPC Service :5002
│   ├── TradeGraph.NotificationWorker/  ← .NET Worker Service (gRPC Client)
│   └── TradeGraph.Gateway/            ← ASP.NET Core + YARP   :5000
└── README.md
```

---

## Proposed Changes

### 1 · Shared Library — `TradeGraph.Shared`

#### [NEW] [TradeGraph.Shared.csproj](file:///d:/forMyMom/src/TradeGraph.Shared/TradeGraph.Shared.csproj)
Targets `net8.0`. No web dependencies — pure DTOs and contracts.

#### [NEW] Protos/
- `catalog.proto`: Define `GetProduct`, `UpdatePrice` gRPC methods.
- `graph.proto`: Define `AnalyzeImpact`, `GetSupplyChainHealth` gRPC methods.
- `notifications.proto`: Define `SendAlert` gRPC methods.

#### [NEW] Models/
- `Product.cs`, `Supplier.cs`, `SupplyRelationship.cs`, `PriceHistory.cs`, `Alert.cs`, `Retailer.cs`

#### [NEW] Events/
- `PriceChangedEvent.cs`, `SupplyDisruptionEvent.cs`, `AlertCreatedEvent.cs`

#### [NEW] Interfaces/
- `IEventBus.cs`

---

### 2 · Catalog Service — `TradeGraph.CatalogService` (:5001)

#### [NEW] Data/CatalogDbContext.cs
EF Core DbContext using PostgreSQL.

#### [NEW] Endpoints/
- Product, Price, Supplier, and Stock endpoints (REST for Gateway).

#### [NEW] Services/CatalogGrpcService.cs
- Implementation of `catalog.proto` for internal gRPC calls from other services.

---

### 3 · Graph Service — `TradeGraph.GraphService` (:5002)

#### [NEW] Graph/ImpactAnalyzer.cs
Traverses the supply chain graph for impact analysis.

#### [NEW] Services/GraphGrpcService.cs
- Implementation of `graph.proto` for internal gRPC calls.

#### [NEW] Workers/EventSubscriber.cs
Background listener for Redis events.

---

### 4 · Notification Worker — `TradeGraph.NotificationWorker`

#### [NEW] Worker.cs
Subscribes to alerts and dispatches notifications (logs to console for now).

---

### 5 · API Gateway — `TradeGraph.Gateway` (:5000)

#### [NEW] Program.cs
YARP reverse proxy configuration with JWT auth placeholder.

---

### 6 · Database Schema (Local PostgreSQL)

Applied via EF Core migrations.

---

### 7 · Infrastructure

#### [NEW] [docker-compose.yml](file:///d:/forMyMom/docker-compose.yml)
```yaml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tradegraph
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password123
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Open Questions

> [!IMPORTANT]
> **JWT Auth.** I'll include a simple token-issuing dummy endpoint in the Gateway for testing convenience. Is that okay?

> [!WARNING]
> **Notification Channel.** I'll default to console logging for notifications. Do you want a real SMTP (email) or SMS integration now?

---

## Verification Plan

### Build Check
`dotnet build TradeGraph.sln`

### Smoke Tests
- Verify `docker compose up -d` starts infra.
- Verify migrations apply.
- Use Swagger on `:5001`, `:5002`, and Route through `:5000`.

{
  "id": "297512e4-62f0-483f-abf1-3231a1a7da44",
  "name": "string",
  "contactEmail": "string",
  "region": "string",
  "isActive": true,
  "createdAt": "2026-03-28T06:35:13.2113519Z",
  "products": [],
  "outgoingRelationships": [],
  "incomingRelationships": []
}