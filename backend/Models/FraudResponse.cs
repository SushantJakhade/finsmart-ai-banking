using System.Text.Json.Serialization;

namespace ProjectEdi.Api.Models
{
    public class FraudResponse
    {
        [JsonPropertyName("fraud_probability")]
        public double FraudProbability { get; set; }

        [JsonPropertyName("risk_score")]
        public int RiskScore { get; set; }

        [JsonPropertyName("risk_level")]
        public string RiskLevel { get; set; } = string.Empty;

        [JsonPropertyName("is_anomaly")]
        public bool IsAnomaly { get; set; }

        [JsonPropertyName("raw_decision_score")]
        public double RawDecisionScore { get; set; }
    }
}