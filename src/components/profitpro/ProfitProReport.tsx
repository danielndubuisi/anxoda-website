import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CVPDashboard } from "./CVPDashboard";
import { Loader2 } from "lucide-react";

interface ProfitProReportProps {
  analysisId: string;
  onBack: () => void;
}

export const ProfitProReport = ({ analysisId, onBack }: ProfitProReportProps) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("profitpro_analyses")
        .select("*")
        .eq("id", analysisId)
        .single();
      if (!error && data) setAnalysis(data);
      setLoading(false);
    };
    fetch();
  }, [analysisId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis || !analysis.cvp_results) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        Analysis not found or still processing.
      </div>
    );
  }

  return (
    <CVPDashboard
      cvpResults={analysis.cvp_results}
      aiInsights={analysis.ai_insights}
      title={analysis.title}
      onBack={onBack}
      onNewAnalysis={onBack}
    />
  );
};
