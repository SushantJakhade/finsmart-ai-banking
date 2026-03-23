using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace ProjectEdi.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly HttpClient _client;

        public DashboardController(IHttpClientFactory httpClientFactory)
        {
            _client = httpClientFactory.CreateClient("FraudModelClient");
        }

        public class CustomerDto
        {
            public string Id { get; set; } = string.Empty;
            public int CustomerId { get; set; }
            public string RiskLevel { get; set; } = string.Empty;
            public int RiskScore { get; set; }
            public string Status { get; set; } = string.Empty;
            public bool IsBlacklisted { get; set; }
            public bool Kyc { get; set; }
        }

        public class RecentAlertDto
        {
            public string CustomerId { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
            public string RiskLevel { get; set; } = string.Empty;
            public int RiskScore { get; set; }
        }

        public class DashboardSummaryDto
        {
            public int TotalCustomers { get; set; }
            public int HighRiskCount { get; set; }
            public int FlaggedCount { get; set; }
            public double SystemHealth { get; set; }
            public double AiAccuracy { get; set; }
            public List<RecentAlertDto> RecentAlerts { get; set; } = new();
        }

        [HttpGet("summary")]
        public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
        {
            try
            {
                var response = await _client.GetAsync("risk/customers");
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    return StatusCode((int)response.StatusCode, body);

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var customers = JsonSerializer.Deserialize<List<CustomerDto>>(body, options)
                               ?? new List<CustomerDto>();

                // Get model metrics for AI accuracy
                var metricsResponse = await _client.GetAsync("risk/metrics");
                double aiAccuracy = 67.0;
                if (metricsResponse.IsSuccessStatusCode)
                {
                    var metricsBody = await metricsResponse.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(metricsBody);
                    if (doc.RootElement.TryGetProperty("random_forest", out var rf) &&
                        rf.TryGetProperty("accuracy", out var accVal))
                    {
                        aiAccuracy = accVal.GetDouble();
                    }
                }

                int totalCustomers = customers.Count;
                int highRisk = customers.Count(c => c.RiskLevel == "High");
                int flagged = customers.Count(c => c.Status == "Flagged");

                var recentAlerts = customers
                    .Where(c => c.RiskLevel == "High")
                    .OrderByDescending(c => c.RiskScore)
                    .Take(5)
                    .Select(c => new RecentAlertDto
                    {
                        CustomerId = c.Id,
                        RiskLevel = c.RiskLevel,
                        RiskScore = c.RiskScore,
                        Message = $"High-risk customer detected - Risk Score: {c.RiskScore}%"
                    })
                    .ToList();

                var dto = new DashboardSummaryDto
                {
                    TotalCustomers = totalCustomers,
                    HighRiskCount = highRisk,
                    FlaggedCount = flagged,
                    SystemHealth = 99.8,
                    AiAccuracy = aiAccuracy,
                    RecentAlerts = recentAlerts,
                };

                return Ok(dto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error building dashboard summary: {ex.Message}");
            }
        }
    }
}
