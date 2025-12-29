using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

// CORS: allow Angular dev server
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddHttpClient();

var app = builder.Build();

app.UseCors();

// Health check
app.MapGet("/", () => "FPL Backend running");

// FPL standings proxy
//app.MapGet("/api/{**path}", async (string path, IHttpClientFactory httpFactory) =>
//{
//    var client = httpFactory.CreateClient();
//    var fplUrl = $"https://fantasy.premierleague.com/api/{path}";
//    var response = await client.GetAsync(fplUrl);
//    response.EnsureSuccessStatusCode();

//    var content = await response.Content.ReadAsStringAsync();
//    return Results.Content(content, "application/json");
//});

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

app.Run();
