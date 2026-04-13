import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FieldMapper, FieldMapping } from "./FieldMapper";
import { CVPDashboard } from "./CVPDashboard";
import { Database, FileSpreadsheet, Settings, BarChart3, Loader2, CheckCircle } from "lucide-react";

type Step = "select" | "map" | "configure" | "processing" | "results";

interface DataSource {
  type: "report" | "connection";
  id: string;
  title: string;
  filename: string;
  filePath: string;
}

interface ProfitProWorkflowProps {
  onBack: () => void;
}

export const ProfitProWorkflow = ({ onBack }: ProfitProWorkflowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("select");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping | null>(null);
  const [config, setConfig] = useState({ unitPrice: "", title: "ProfitPro Analysis" });
  const [loading, setLoading] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [cvpResults, setCvpResults] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Fetch available data sources
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: reports } = await supabase
        .from("spreadsheet_reports")
        .select("id, title, original_filename, file_path, processing_status")
        .eq("user_id", user.id)
        .eq("processing_status", "completed")
        .order("created_at", { ascending: false })
        .limit(50);

      const sources: DataSource[] = (reports || []).map(r => ({
        type: "report" as const,
        id: r.id,
        title: r.title,
        filename: r.original_filename,
        filePath: r.file_path,
      }));
      setDataSources(sources);
    };
    load();
  }, [user]);

  const handleSelectSource = async (source: DataSource) => {
    setSelectedSource(source);
    setLoading(true);
    try {
      // Download and parse the file to get columns
      const { data: fileData, error } = await supabase.storage
        .from("spreadsheets")
        .download(source.filePath);
      if (error || !fileData) throw new Error("Failed to download file");

      const arrayBuf = await fileData.arrayBuffer();
      // We'll send this to the edge function later; for now extract column names client-side
      // Using a simple approach: read first line for CSV or use the edge function
      const text = new TextDecoder().decode(new Uint8Array(arrayBuf).slice(0, 10000));
      const firstLine = text.split(/\r?\n/)[0];
      // Try CSV parsing
      const cols = firstLine.split(",").map(c => c.replace(/^["']|["']$/g, "").trim()).filter(Boolean);
      if (cols.length > 1) {
        setColumns(cols);
      } else {
        // Might be Excel - we'll let the edge function handle it, use a placeholder approach
        // Try tab-separated
        const tabCols = firstLine.split("\t").map(c => c.trim()).filter(Boolean);
        setColumns(tabCols.length > 1 ? tabCols : ["Unable to detect columns - the edge function will parse the file"]);
      }
      setStep("map");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleMappingComplete = (mapping: FieldMapping) => {
    setFieldMapping(mapping);
    setStep("configure");
  };

  const handleStartAnalysis = async () => {
    if (!selectedSource || !fieldMapping || !user) return;
    setStep("processing");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-profitpro", {
        body: {
          sourceReportId: selectedSource.type === "report" ? selectedSource.id : null,
          sourceConnectionId: selectedSource.type === "connection" ? selectedSource.id : null,
          fieldMapping,
          config: {
            unitPrice: config.unitPrice ? parseFloat(config.unitPrice) : null,
            title: config.title || "ProfitPro Analysis",
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAnalysisId(data.analysisId);
      setCvpResults(data.cvpResults);
      setAiInsights(data.aiInsights);
      setStep("results");

      toast({ title: "Analysis Complete", description: "Your CVP analysis is ready." });
    } catch (err: any) {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
      setStep("configure");
    }
  };

  const resetWorkflow = () => {
    setStep("select");
    setSelectedSource(null);
    setColumns([]);
    setFieldMapping(null);
    setConfig({ unitPrice: "", title: "ProfitPro Analysis" });
    setAnalysisId(null);
    setCvpResults(null);
    setAiInsights(null);
  };

  const steps = [
    { key: "select", label: "Select Data", icon: Database },
    { key: "map", label: "Map Fields", icon: FileSpreadsheet },
    { key: "configure", label: "Configure", icon: Settings },
    { key: "results", label: "Results", icon: BarChart3 },
  ];

  const stepIndex = ["select", "map", "configure", "processing", "results"].indexOf(step);

  // Results view
  if (step === "results" && cvpResults) {
    return (
      <CVPDashboard
        cvpResults={cvpResults}
        aiInsights={aiInsights}
        title={config.title}
        onBack={onBack}
        onNewAnalysis={resetWorkflow}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.key === step || (step === "processing" && s.key === "results");
          const isDone = stepIndex > i;
          return (
            <div key={s.key} className="flex items-center gap-2 shrink-0">
              {i > 0 && <div className={`w-8 h-px ${isDone ? "bg-primary" : "bg-border"}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" :
                isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <CheckCircle className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step: Select Data Source */}
      {step === "select" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Select Data Source</h3>
            <p className="text-sm text-muted-foreground">
              Choose from your existing reports or upload a new spreadsheet for CVP analysis.
            </p>
          </div>
          {dataSources.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">No data sources found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a spreadsheet using A.S.S first, then come back to run a CVP analysis on it.
                </p>
                <Button variant="outline" onClick={onBack} className="mt-4">← Back to Tools</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dataSources.map(ds => (
                <Card
                  key={ds.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => !loading && handleSelectSource(ds)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{ds.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{ds.filename}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">Report</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center p-4 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading columns...
            </div>
          )}
        </div>
      )}

      {/* Step: Map Fields */}
      {step === "map" && (
        <FieldMapper
          columns={columns}
          onMappingComplete={handleMappingComplete}
          onBack={() => setStep("select")}
        />
      )}

      {/* Step: Configure */}
      {step === "configure" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Configure Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set optional parameters to refine your CVP analysis.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Analysis Title</Label>
                <Input
                  id="title"
                  value={config.title}
                  onChange={e => setConfig(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Q1 2024 CVP Analysis"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Override Unit Price (optional)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  value={config.unitPrice}
                  onChange={e => setConfig(p => ({ ...p, unitPrice: e.target.value }))}
                  placeholder="Leave blank to auto-detect from data"
                />
                <p className="text-xs text-muted-foreground">
                  If your data doesn't have a unit price column, enter it here. Otherwise leave blank.
                </p>
              </div>

              {/* Summary of mappings */}
              {fieldMapping && (
                <div className="p-3 rounded-md bg-muted/30 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Field Mapping Summary</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(fieldMapping).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("map")}>← Back</Button>
            <Button onClick={handleStartAnalysis}>Run CVP Analysis →</Button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === "processing" && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Analyzing Your Data</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Running CVP calculations and generating AI-powered profitability insights. This may take 30-60 seconds.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
