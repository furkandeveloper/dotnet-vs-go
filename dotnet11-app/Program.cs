using Npgsql;
using StackExchange.Redis;
using System.Text.Json;

// Prevent ThreadPool ramp-up lag under sudden high concurrency.
// Default rate is 2 threads/sec which causes severe queueing at 1000 VUs.
ThreadPool.SetMinThreads(200, 200);

var builder = WebApplication.CreateBuilder(args);

// Allow >1000 simultaneous connections (k6 concurrency test reaches 1000 VUs)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxConcurrentConnections = 2000;
    options.Limits.MaxRequestBodySize = 10 * 1024;
});

// JSON: snake_case for both HTTP and manual serialization
var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    PropertyNameCaseInsensitive = true,
};

builder.Services.ConfigureHttpJsonOptions(opts =>
{
    opts.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    opts.SerializerOptions.PropertyNameCaseInsensitive = true;
});

// PostgreSQL — NpgsqlDataSourceBuilder used to set MaxPoolSize (Npgsql 9.x ignores "Max Pool Size" keyword)
var pgConnStr = builder.Configuration.GetConnectionString("Postgres")
    ?? "Host=localhost;Database=benchmark;Username=postgres;Password=postgres";
var dataSourceBuilder = new NpgsqlDataSourceBuilder(pgConnStr);
dataSourceBuilder.ConnectionStringBuilder.MaxPoolSize = 100;
var dataSource = dataSourceBuilder.Build();
builder.Services.AddSingleton(dataSource);

// Redis
var redisConnStr = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
var muxer = await ConnectionMultiplexer.ConnectAsync(redisConnStr);
builder.Services.AddSingleton<IConnectionMultiplexer>(muxer);

// Structured JSON logging
builder.Logging.AddJsonConsole();

var app = builder.Build();

// Health
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// CPU-bound
app.MapPost("/api/discount", (DiscountRequest req) =>
{
    var price = req.Price;
    var applied = 0;

    foreach (var rule in req.Rules)
    {
        switch (rule.Type)
        {
            case "percentage":
                price *= 1 - rule.Value / 100.0;
                applied++;
                break;
            case "fixed":
                price -= rule.Value;
                applied++;
                break;
        }
    }

    if (price < 0) price = 0;

    return Results.Ok(new DiscountResponse(req.Price, Math.Round(price, 2), applied));
});

// IO-bound
app.MapGet("/api/product/{id}", async (string id, NpgsqlDataSource db, IConnectionMultiplexer mux) =>
{
    var cache = mux.GetDatabase();
    var cacheKey = $"product:{id}";

    var cached = await cache.StringGetAsync(cacheKey);
    if (cached.HasValue)
    {
        var product = JsonSerializer.Deserialize<ProductResponse>((string)cached!, jsonOptions);
        return product is null ? Results.NotFound() : Results.Ok(product with { Cached = true });
    }

    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT id, name, price FROM products WHERE id = $1";
    cmd.Parameters.AddWithValue(id);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
        return Results.NotFound();

    var result = new ProductResponse(
        reader.GetString(0),
        reader.GetString(1),
        (double)reader.GetDecimal(2),
        false
    );

    await cache.StringSetAsync(cacheKey, JsonSerializer.Serialize(result, jsonOptions), TimeSpan.FromSeconds(60));

    return Results.Ok(result);
});

app.Run();

record DiscountRule(string Type, double Value);
record DiscountRequest(double Price, List<DiscountRule> Rules);
record DiscountResponse(double OriginalPrice, double DiscountedPrice, int AppliedRules);
record ProductResponse(string Id, string Name, double Price, bool Cached);
