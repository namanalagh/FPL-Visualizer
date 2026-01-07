using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

// CORS: allow Angular dev server
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration
           .GetSection("Cors:AllowedOrigins")
           .Get<string[]>();

        policy
            .WithOrigins(allowedOrigins ?? Array.Empty<string>())
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddHttpClient();

var app = builder.Build();

app.UseCors();

// Health check
app.MapGet("/", () => "FPL Backend running");

app.MapGet("/api/standings/{leagueId:int}", async (int leagueId, IHttpClientFactory httpFactory) =>
{
    var client = httpFactory.CreateClient();

    var url = $"https://fantasy.premierleague.com/api/leagues-classic/{leagueId}/standings/";
    var response = await client.GetAsync(url);

    if (!response.IsSuccessStatusCode)
    {
        return Results.Problem("Failed to fetch FPL data");
    }

    var json = await response.Content.ReadAsStringAsync();
    return Results.Content(json, "application/json");
});

app.MapGet("/api/entry/{playerId:int}/event/{gw:int}/picks/", async (int playerId, int gw, IHttpClientFactory httpFactory) =>
{
    var client = httpFactory.CreateClient();

    var url = $"https://fantasy.premierleague.com/api/entry/{playerId}/event/{gw}/picks/";
    var response = await client.GetAsync(url);

    if (!response.IsSuccessStatusCode)
    {
        return Results.Problem("Failed to fetch FPL data");
    }

    var json = await response.Content.ReadAsStringAsync();
    return Results.Content(json, "application/json");
});

app.MapGet("/api/entry/{playerId:int}/", async (int playerId, IHttpClientFactory httpFactory) =>
{
    var client = httpFactory.CreateClient();

    var url = $"https://fantasy.premierleague.com/api/entry/{playerId}/";
    var response = await client.GetAsync(url);

    if (!response.IsSuccessStatusCode)
    {
        return Results.Problem("Failed to fetch FPL data");
    }

    var json = await response.Content.ReadAsStringAsync();
    return Results.Content(json, "application/json");
});

app.MapGet("/api/bootstrap-static", async (IHttpClientFactory httpFactory) =>
{
    var client = httpFactory.CreateClient();

    var response = await client.GetAsync(
        "https://fantasy.premierleague.com/api/bootstrap-static/"
    );

    if (!response.IsSuccessStatusCode)
    {
        return Results.Problem("Failed to fetch FPL data");
    }

    var json = await response.Content.ReadAsStringAsync();
    return Results.Content(json, "application/json");
});

app.MapGet("/api/element-summary/{playerId:int}", async (int playerId, IHttpClientFactory httpFactory) =>
{
    var client = httpFactory.CreateClient();

    var url = $"https://fantasy.premierleague.com/api/element-summary/{playerId}";
    var response = await client.GetAsync(url);

    if (!response.IsSuccessStatusCode)
    {
        return Results.Problem("Failed to fetch FPL data");
    }

    var json = await response.Content.ReadAsStringAsync();
    return Results.Content(json, "application/json");
});

app.Run();
