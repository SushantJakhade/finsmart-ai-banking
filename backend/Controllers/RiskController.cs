using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using ProjectEdi.Api.Models;

namespace ProjectEdi.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RiskController : ControllerBase
    {
        private readonly HttpClient _client;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public RiskController(IHttpClientFactory httpClientFactory)
        {
            _client = httpClientFactory.CreateClient("FraudModelClient");
        }

        // POST /api/risk/score - Score single customer with one model
        [HttpPost("score")]
        public async Task<IActionResult> Score([FromBody] RiskScoreRequest request)
        {
            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _client.PostAsync("risk/score", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, body);

            return Content(body, "application/json");
        }

        // POST /api/risk/score-all - Score with all 4 models
        [HttpPost("score-all")]
        public async Task<IActionResult> ScoreAll([FromBody] RiskScoreRequest request)
        {
            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _client.PostAsync("risk/score-all", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, body);

            return Content(body, "application/json");
        }

        // GET /api/risk/customers - List customers from dataset
        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers()
        {
            var response = await _client.GetAsync("risk/customers");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, body);

            return Content(body, "application/json");
        }

        // GET /api/risk/metrics - Model accuracy metrics
        [HttpGet("metrics")]
        public async Task<IActionResult> GetMetrics()
        {
            var response = await _client.GetAsync("risk/metrics");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, body);

            return Content(body, "application/json");
        }

        // GET /api/risk/dataset-stats - Dataset statistics
        [HttpGet("dataset-stats")]
        public async Task<IActionResult> GetDatasetStats()
        {
            var response = await _client.GetAsync("risk/dataset-stats");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, body);

            return Content(body, "application/json");
        }
    }
}
