public class LoanScoreRequest
{
    public double ApplicantIncome { get; set; }
    public double CoapplicantIncome { get; set; }
    public double LoanAmount { get; set; }
    public int TenureMonths { get; set; }
    public int CreditScore { get; set; }
    public int ExistingLoans { get; set; }
    public int EmploymentYears { get; set; } = 5;
    public int Age { get; set; } = 35;
    public int PropertyArea { get; set; } = 0;
    public int Education { get; set; } = 1;
    public int Married { get; set; } = 1;
    public int Dependents { get; set; } = 0;
    public string ModelName { get; set; } = "ensemble";
}

public class LoanScoreResponse
{
    public double DefaultProbability { get; set; }
    public int RiskScore { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
    public string Prediction { get; set; } = string.Empty;
    public string ModelUsed { get; set; } = string.Empty;
}
