using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class LoanController : ControllerBase
{
    private readonly HttpClient _client;

    public LoanController(IHttpClientFactory httpClientFactory)
    {
        _client = httpClientFactory.CreateClient("FraudModelClient");
    }

    [HttpPost("score")]
    public async Task<IActionResult> Score([FromBody] LoanScoreRequest req)
    {
        var pyResponse = await _client.PostAsJsonAsync("loan/score", new
        {
            applicantIncome = req.ApplicantIncome,
            coapplicantIncome = req.CoapplicantIncome,
            loanAmount = req.LoanAmount,
            tenureMonths = req.TenureMonths,
            creditScore = req.CreditScore,
            existingLoans = req.ExistingLoans,
            employmentYears = req.EmploymentYears,
            age = req.Age,
            propertyArea = req.PropertyArea,
            education = req.Education,
            married = req.Married,
            dependents = req.Dependents,
            model_name = req.ModelName
        });

        var body = await pyResponse.Content.ReadAsStringAsync();
        if (!pyResponse.IsSuccessStatusCode)
            return StatusCode((int)pyResponse.StatusCode, body);

        return Content(body, "application/json");
    }

    [HttpPost("score-all")]
    public async Task<IActionResult> ScoreAll([FromBody] LoanScoreRequest req)
    {
        var pyResponse = await _client.PostAsJsonAsync("loan/score-all", new
        {
            applicantIncome = req.ApplicantIncome,
            coapplicantIncome = req.CoapplicantIncome,
            loanAmount = req.LoanAmount,
            tenureMonths = req.TenureMonths,
            creditScore = req.CreditScore,
            existingLoans = req.ExistingLoans,
            employmentYears = req.EmploymentYears,
            age = req.Age,
            propertyArea = req.PropertyArea,
            education = req.Education,
            married = req.Married,
            dependents = req.Dependents,
            model_name = req.ModelName
        });

        var body = await pyResponse.Content.ReadAsStringAsync();
        if (!pyResponse.IsSuccessStatusCode)
            return StatusCode((int)pyResponse.StatusCode, body);

        return Content(body, "application/json");
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var response = await _client.GetAsync("loan/metrics");
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, body);
        return Content(body, "application/json");
    }

    [HttpGet("dataset-stats")]
    public async Task<IActionResult> GetDatasetStats()
    {
        var response = await _client.GetAsync("loan/dataset-stats");
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, body);
        return Content(body, "application/json");
    }
}
