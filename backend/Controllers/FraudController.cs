using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace ProjectEdi.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FraudController : ControllerBase
    {
        private readonly HttpClient _client;

        public FraudController(IHttpClientFactory httpClientFactory)
        {
            // This name MUST match the one in Program.cs
            _client = httpClientFactory.CreateClient("FraudModelClient");
        }

        // ----------------- DTOs -----------------

        public class FraudScoreRequest
        {
            public double Amount { get; set; }
            public string TranctionType { get; set; } = string.Empty;
            public string MerchantCountry { get; set; } = string.Empty;
            public int PaymentMode { get; set; }
            public string TimeStamp { get; set; } = string.Empty;
        }

        // This matches what Python /transactions returns
        public class FraudTransactionDto
        {
            public string Id { get; set; } = string.Empty;
            public string Date { get; set; } = string.Empty;
            public string Customer { get; set; } = string.Empty;
            public double Amount { get; set; }
            public string Channel { get; set; } = string.Empty;
            public int RiskScore { get; set; }
            public string Status { get; set; } = string.Empty;
        }

        public class FraudMetricsDto
        {
            public int TotalTransactions { get; set; }
            public int FlaggedSuspicious { get; set; }
            public int HighRiskClients { get; set; }
            public double AverageRiskScore { get; set; }
        }

        // ----------------- Live scoring proxy -----------------

        [HttpPost("score")]
        public async Task<IActionResult> Score([FromBody] FraudScoreRequest request)
        {
            var payload = new
            {
                amount = request.Amount,
                tranction_type = request.TranctionType,
                merchant_country = request.MerchantCountry,
                payment_mode = request.PaymentMode,
                time_stamp = request.TimeStamp
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _client.PostAsync("fraud/score", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, body);
            }

            return Content(body, "application/json");
        }

        // ----------------- Transactions proxy -----------------

        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions()
        {
            var response = await _client.GetAsync("transactions");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, body);
            }

            return Content(body, "application/json");
        }

        // ----------------- NEW: Metrics endpoint -----------------

        [HttpGet("metrics")]
        public async Task<ActionResult<FraudMetricsDto>> GetMetrics()
        {
            // Reuse Python /transactions output and aggregate in .NET
            var response = await _client.GetAsync("transactions");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, body);
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var rows = JsonSerializer.Deserialize<List<FraudTransactionDto>>(body, options)
                       ?? new List<FraudTransactionDto>();

            if (rows.Count == 0)
            {
                return new FraudMetricsDto
                {
                    TotalTransactions = 0,
                    FlaggedSuspicious = 0,
                    HighRiskClients = 0,
                    AverageRiskScore = 0
                };
            }

            // Simple demo logic – you can tweak thresholds if you like
            int totalTransactions = rows.Count;
            int flaggedSuspicious = rows.Count(r => r.RiskScore >= 70); // high risk
            int highRiskClients = rows
                .Where(r => r.RiskScore >= 80)
                .Select(r => r.Customer)
                .Distinct()
                .Count();
            double averageRiskScore = rows.Average(r => r.RiskScore);

            var metrics = new FraudMetricsDto
            {
                TotalTransactions = totalTransactions,
                FlaggedSuspicious = flaggedSuspicious,
                HighRiskClients = highRiskClients,
                AverageRiskScore = Math.Round(averageRiskScore, 1)
            };

            return Ok(metrics);
        }
    }
}