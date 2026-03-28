using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Serilog;
using StackExchange.Redis;
using TradeGraph.CatalogService.Data;
using TradeGraph.CatalogService.Endpoints;
using TradeGraph.CatalogService.Services;
using TradeGraph.Shared.Interfaces;

Env.TraversePath().Load();
var builder = WebApplication.CreateBuilder(args);

// Serilog
builder.Host.UseSerilog((ctx, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}"));

// PostgreSQL + EF Core
builder.Services.AddDbContext<CatalogDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

// Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")!));
builder.Services.AddScoped<IEventBus, RedisEventBus>();

// gRPC
builder.Services.AddGrpc(opt => opt.EnableDetailedErrors = builder.Environment.IsDevelopment());

// OpenAPI / Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
    await db.Database.EnsureDeletedAsync();
    await db.Database.EnsureCreatedAsync();
}

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// gRPC service endpoint
app.MapGrpcService<CatalogGrpcService>();

// REST endpoints
app.MapProductEndpoints();
app.MapPriceEndpoints();
app.MapSupplierEndpoints();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "catalog", timestamp = DateTime.UtcNow }))
   .WithTags("Health");

app.Run();
