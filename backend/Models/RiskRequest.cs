using System.Text.Json.Serialization;

namespace ProjectEdi.Api.Models
{
    public class RiskScoreRequest
    {
        [JsonPropertyName("account_age")]
        public int AccountAge { get; set; }

        [JsonPropertyName("account_type")]
        public int AccountType { get; set; }

        [JsonPropertyName("kyc")]
        public int Kyc { get; set; }

        [JsonPropertyName("rkyc")]
        public int Rkyc { get; set; }

        [JsonPropertyName("is_punished")]
        public int IsPunished { get; set; }

        [JsonPropertyName("govt_defaulter")]
        public int GovtDefaulter { get; set; }

        [JsonPropertyName("constitution_type")]
        public string ConstitutionType { get; set; } = "ss";

        [JsonPropertyName("customer_type")]
        public int CustomerType { get; set; }

        [JsonPropertyName("customer_status")]
        public int CustomerStatus { get; set; }

        [JsonPropertyName("category")]
        public int Category { get; set; }

        [JsonPropertyName("is_blacklisted")]
        public int IsBlacklisted { get; set; }

        [JsonPropertyName("poi")]
        public int Poi { get; set; }

        [JsonPropertyName("poa")]
        public string Poa { get; set; } = "Aadhaar";

        [JsonPropertyName("customer_special")]
        public string CustomerSpecial { get; set; } = "No";

        [JsonPropertyName("account_status")]
        public int AccountStatus { get; set; }

        [JsonPropertyName("poi_alt")]
        public int PoiAlt { get; set; }

        [JsonPropertyName("model_name")]
        public string ModelName { get; set; } = "random_forest";
    }

    public class RiskScoreResponse
    {
        [JsonPropertyName("risk_level")]
        public string RiskLevel { get; set; } = string.Empty;

        [JsonPropertyName("risk_level_code")]
        public int RiskLevelCode { get; set; }

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("risk_score")]
        public int RiskScore { get; set; }

        [JsonPropertyName("probabilities")]
        public Dictionary<string, double> Probabilities { get; set; } = new();

        [JsonPropertyName("model_used")]
        public string ModelUsed { get; set; } = string.Empty;
    }
}
