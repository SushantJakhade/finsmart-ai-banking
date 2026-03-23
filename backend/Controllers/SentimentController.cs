using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace ProjectEdi.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SentimentController : ControllerBase
    {
        private readonly HttpClient _client;

        public SentimentController(IHttpClientFactory httpClientFactory)
        {
            _client = httpClientFactory.CreateClient("FraudModelClient");
        }

        // ── Single message analysis ──

        [HttpPost("analyze")]
        public async Task<IActionResult> Analyze([FromBody] JsonElement request)
        {
            var json = request.GetRawText();
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _client.PostAsync("sentiment/analyze", content);
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, body);
            return Content(body, "application/json");
        }

        // ── Batch message analysis ──

        [HttpPost("analyze-batch")]
        public async Task<IActionResult> AnalyzeBatch([FromBody] JsonElement request)
        {
            var json = request.GetRawText();
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _client.PostAsync("sentiment/analyze-batch", content);
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, body);
            return Content(body, "application/json");
        }

        // ── Model metrics ──

        [HttpGet("metrics")]
        public async Task<IActionResult> GetMetrics()
        {
            var response = await _client.GetAsync("sentiment/metrics");
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, body);
            return Content(body, "application/json");
        }
    }
}
