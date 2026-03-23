using ProjectEdi.Api;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// HttpClient for Python model
builder.Services.AddHttpClient("FraudModelClient", client =>
{
    client.BaseAddress = new Uri("http://localhost:5050/");
});

// CORS so React can call .NET
var corsPolicy = "_corsPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: corsPolicy, policy =>
    {
        policy.WithOrigins("http://localhost:8080") // Vite dev server
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors(corsPolicy);

app.MapControllers();

app.Run();