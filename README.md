# TradeGraph Microservices Architecture

TradeGraph is an event-driven wholesale supply chain management system built on **.NET 10**.

The architecture uses a polyglot persistence model, routing logic through an API Gateway to decoupled microservices that communicate asynchronously over a Valkey (Redis) event bus and synchronously via high-performance gRPC.

## System Components

1. **API Gateway (`TradeGraph.Gateway`)**
   - Built on YARP (Yet Another Reverse Proxy).
   - Listens on `http://localhost:5000`.
   - Routes traffic dynamically to the underlying REST and gRPC endpoints of the Catalog and Graph services.

2. **Catalog Service (`TradeGraph.CatalogService`)**
   - Manages Inventory, Products, and Suppliers.
   - Database: **PostgreSQL** (Relational model).
   - Event Publisher: Emits `supplier.updated`, `product.updated`, and `price.changed` messages over the Valkey bus when mutations occur.
   - UI: [Swagger](http://localhost:5001/swagger) on `http://localhost:5001`.

3. **Graph Service (`TradeGraph.GraphService`)**
   - Manages the complex edges and relationships of the supply chain network constraint problem.
   - Database: **Neo4j** (Native Graph DB) driven by Cypher queries.
   - Listens to inventory events from the Catalog and synchronizes `Product` and `Supplier` nodes recursively in Neo4j.
   - Performs rapid mathematical cascade traversal (Ripple Effect Computation) to compute the impact of an upstream price change on downstream distributors.
   - Event Publisher: Emits `alert.created` upon detecting a critical severity impact cascade.
   - UI: [Swagger](http://localhost:5002/swagger) on `http://localhost:5002`.

4. **Notification Worker (`TradeGraph.NotificationWorker`)**
   - Background worker service (`.NET Hosted Service`).
   - Strictly subscribes to the `alert.created` channel on Valkey.
   - Translates domain system alerts into external world events (Simulates sending Email/SMS alerts via heavy Console logging).

5. **Shared Library (`TradeGraph.Shared`)**
   - Class library shipped to all domain workers.
   - Houses strongly-typed Domain Models, Domain Events (e.g. `PriceChangedEvent`), and `.proto` Protobuf definitions compiled by `Grpc.Tools`.

## Requirements

To run this locally, ensure you have:
- .NET 10 SDK (`dotnet --version`)
- A local PostgreSQL Instance running on port `:5432` (`postgres:postgres`)
- A local Neo4j Instance running on port `:7687` (`neo4j:password`)
- A Valkey/Redis connection string exported in `appsettings.json`

## Getting Started

Because the system is configured securely, you do not need Docker to spin up the .NET services. You simply build and run them natively:

1. Restore dependencies and verify compilation:
```powershell
dotnet build TradeGraph.slnx
```

2. Start the API Gateway:
```powershell
dotnet run --project src\TradeGraph.Gateway
```

3. Start the Services & Workers (in separate terminals!):
```powershell
dotnet run --project src\TradeGraph.CatalogService
dotnet run --project src\TradeGraph.GraphService
dotnet run --project src\TradeGraph.NotificationWorker
```

*(Note: The CatalogService database drops and automatically builds its tables using EF Core `EnsureCreatedAsync()` upon startup to guarantee a pristine relational state during development).*

## Testing Real-Time Events

1. Via the Catalog Swagger, create a new Supplier and then a Product. (You'll see them immediately show up in the Neo4j instance as GraphService syncs them over Valkey).
2. Via the Graph Swagger, POST a new Relationship linking your Supplier to another node.
3. Update the Product's price in Catalog.
4. Watch the GraphService execute nested Cypher queries to compute the rippling impact, finishing by dispatching a warning to the NotificationWorker console!
