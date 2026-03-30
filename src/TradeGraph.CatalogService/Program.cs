using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Serilog;
using StackExchange.Redis;
using TradeGraph.CatalogService.Data;
using TradeGraph.CatalogService.Endpoints;
using TradeGraph.CatalogService.Services;
using TradeGraph.Shared.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

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

// JWT Authentication setup natively on Catalog Service
var jwtKey = builder.Configuration["Jwt:Key"] ?? "TradeGraph-SuperSecret-Key-For-Development-Only-12345!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();

// OpenAPI / Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Fix circular reference: Supplier.Products → Product.Supplier → Supplier...
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(opt =>
    opt.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);

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

app.UseAuthentication();
app.UseAuthorization();

// gRPC service endpoint
app.MapGrpcService<CatalogGrpcService>();

// REST endpoints
app.MapProductEndpoints();
app.MapRetailerEndpoints();
app.MapPriceEndpoints();
app.MapSupplierEndpoints();
app.MapGet("/health", async (CatalogDbContext db) =>
{
    var canConnect = await db.Database.CanConnectAsync();
    return Results.Ok(new
    {
        status = canConnect ? "healthy" : "degraded",
        service = "catalog",
        database = canConnect ? "connected" : "disconnected",
        timestamp = DateTime.UtcNow
    });
}).WithTags("Health");

app.Run();
