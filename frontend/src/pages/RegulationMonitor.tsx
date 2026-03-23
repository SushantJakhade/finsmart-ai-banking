import { useState } from "react";
import {
  Search,
  Filter,
  FileText,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Shield,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { regulations } from "@/data/mockData";
import { cn } from "@/lib/utils";

export default function RegulationMonitor() {
  const [selectedRegulation, setSelectedRegulation] = useState<string | null>(null);
  const [regulatorFilter, setRegulatorFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRegulations = regulations.filter((reg) => {
    const matchesSearch =
      reg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.referenceId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegulator = regulatorFilter === "All" || reg.regulator === regulatorFilter;
    const matchesRisk = riskFilter === "All" || reg.riskLevel === riskFilter;
    return matchesSearch && matchesRegulator && matchesRisk;
  });

  const selectedReg = regulations.find((r) => r.id === selectedRegulation);

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "High":
        return "destructive";
      case "Medium":
        return "warning";
      default:
        return "success";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Regulation & Compliance NLP</h1>
        <p className="text-muted-foreground mt-1">
          Scan RBI, SEBI, and GST regulations for potential compliance risks
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search regulations, sections, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-banking pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={regulatorFilter}
              onChange={(e) => setRegulatorFilter(e.target.value)}
              className="input-banking w-auto min-w-[120px]"
            >
              <option value="All">All Regulators</option>
              <option value="RBI">RBI</option>
              <option value="SEBI">SEBI</option>
              <option value="GST">GST</option>
            </select>
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="input-banking w-auto min-w-[120px]"
          >
            <option value="All">All Risk Levels</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </Card>

      {/* Main Content - Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regulations List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Regulations ({filteredRegulations.length})
          </h3>
          {filteredRegulations.map((reg) => (
            <Card
              key={reg.id}
              className={cn(
                "cursor-pointer transition-all",
                selectedRegulation === reg.id && "ring-2 ring-primary shadow-elevated"
              )}
              padding="none"
              onClick={() => setSelectedRegulation(reg.id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          reg.regulator === "RBI"
                            ? "default"
                            : reg.regulator === "SEBI"
                            ? "default"
                            : "default"
                        }
                      >
                        {reg.regulator}
                      </Badge>
                      <Badge variant={getRiskBadgeVariant(reg.riskLevel)}>
                        {reg.riskLevel} Risk
                      </Badge>
                    </div>
                    <h4 className="font-medium text-foreground line-clamp-2">{reg.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span>{reg.date}</span>
                      <span className="font-mono text-xs">{reg.referenceId}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Regulation Detail */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {selectedReg ? (
            <div className="space-y-4 animate-fade-in">
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{selectedReg.regulator}</Badge>
                      <Badge variant={getRiskBadgeVariant(selectedReg.riskLevel)}>
                        {selectedReg.riskLevel} Risk
                      </Badge>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">{selectedReg.title}</h2>
                  </div>
                  <button className="btn-outline px-3 py-2">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Reference ID</span>
                    <p className="font-mono font-medium">{selectedReg.referenceId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date</span>
                    <p className="font-medium">{selectedReg.date}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Key Clauses</h4>
                  <ul className="space-y-2">
                    {selectedReg.clauses.map((clause, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card className="bg-accent/5 border-accent/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <Shield className="w-5 h-5" />
                    AI Risk Summary
                  </CardTitle>
                </CardHeader>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Risk Rating</span>
                    <div className="mt-1">
                      <Badge variant={getRiskBadgeVariant(selectedReg.riskLevel)} size="md">
                        {selectedReg.riskLevel}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Impacted Areas</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedReg.impactedAreas.map((area) => (
                        <span key={area} className="chip">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {selectedReg.riskPoints.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Flagged Risk Points
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-3">
                    {selectedReg.riskPoints.map((point, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                      >
                        <p className="text-sm font-medium text-foreground mb-1">
                          "{point.clause}"
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="destructive">{point.riskType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Suggested Action: </span>
                          {point.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-muted-foreground">Select a Regulation</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Click on a regulation from the list to view details
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
