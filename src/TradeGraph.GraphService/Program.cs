using DotNetEnv;
using Neo4j.Driver;
using Serilog;
using StackExchange.Redis;
using TradeGraph.GraphService.Data;
using TradeGraph.GraphService.Graph;
using TradeGraph.GraphService.Services;
using TradeGraph.GraphService.Workers;
using TradeGraph.GraphService.Endpoints;

Env.TraversePath().Load();
var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}"));

var neo4jUri = builder.Configuration.GetConnectionString("Neo4j")!;
var neo4jUser = builder.Configuration.GetConnectionString("Neo4jUser")!;
var neo4jPass = builder.Configuration.GetConnectionString("Neo4jPassword")!;

builder.Services.AddSingleton<IDriver>(_ => GraphDatabase.Driver(neo4jUri, AuthTokens.Basic(neo4jUser, neo4jPass)));
builder.Services.AddSingleton<Neo4jRepository>();

builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")!));

builder.Services.AddSingleton<ImpactAnalyzer>();
builder.Services.AddHostedService<EventSubscriber>();
builder.Services.AddGrpc(opt => opt.EnableDetailedErrors = builder.Environment.IsDevelopment());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGrpcService<GraphGrpcService>();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "graph-neo4j", timestamp = DateTime.UtcNow }));

app.MapRelationshipEndpoints();

app.Run();
