using System.Text.Json.Serialization;

namespace ProjectEdi.Api.Models
{
    public class FraudRequest
    {
        [JsonPropertyName("amount")]
        public double Amount { get; set; }

        // keep the typo consistent with Python: tranction_type
        [JsonPropertyName("tranction_type")]
        public string TranctionType { get; set; } = string.Empty;

        [JsonPropertyName("merchant_country")]
        public string MerchantCountry { get; set; } = string.Empty;

        [JsonPropertyName("payment_mode")]
        public int PaymentMode { get; set; }

        // ISO-8601 formatted string
        [JsonPropertyName("time_stamp")]
        public string TimeStamp { get; set; } = string.Empty;
    }
}