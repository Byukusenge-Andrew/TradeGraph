using DotNetEnv;
using Serilog;
using StackExchange.Redis;
using TradeGraph.NotificationWorker;

Env.TraversePath().Load();
var builder = Host.CreateApplicationBuilder(args);

// Serilog
builder.Services.AddSerilog((sp, cfg) =>
    cfg.ReadFrom.Configuration(builder.Configuration)
       .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] [NotificationWorker] {Message:lj}{NewLine}{Exception}"));

// Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")!));

// Worker
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
