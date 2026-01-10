import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, TrendingUp, MapPin, Target } from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "active" | "coming-soon";
  gradientFrom: string;
  gradientTo: string;
}

const tools: Tool[] = [
  {
    id: "spreadsheet-analyzer",
    name: "A.S.S",
    description: "Upload spreadsheets and get AI-powered insights, trends, and recommendations from the Auto Spreadsheet Summarizer (A.S.S)",
    icon: FileSpreadsheet,
    status: "active",
    gradientFrom: "from-blue-500",
    gradientTo: "to-cyan-500",
  },
  {
    id: "cvp-analyzer",
    name: "ProfitPro",
    description: "Analyze Cost-Volume-Profit relationships to optimize pricing and profitability",
    icon: TrendingUp,
    status: "coming-soon",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-teal-500",
  },
  {
    id: "regional-mapper",
    name: "Mapper",
    description: "Visualize your client distribution across regions with interactive maps",
    icon: MapPin,
    status: "coming-soon",
    gradientFrom: "from-purple-500",
    gradientTo: "to-pink-500",
  },
  {
    id: "swot-analysis",
    name: "SWOT Genie",
    description: "Generate comprehensive SWOT analysis for strategic business planning",
    icon: Target,
    status: "coming-soon",
    gradientFrom: "from-orange-500",
    gradientTo: "to-red-500",
  },
];

interface ToolsGridProps {
  onToolSelect: (toolId: string) => void;
}

export const ToolsGrid = ({ onToolSelect }: ToolsGridProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Business Intelligence Tools</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose from our suite of AI-powered tools to analyze your business data and gain actionable insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card
              key={tool.id}
              className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-border bg-card"
              onClick={() => onToolSelect(tool.id)}
            >
              {/* Gradient Background Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tool.gradientFrom} ${tool.gradientTo} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}
              />

              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div
                    className={`p-3 rounded-lg bg-gradient-to-br ${tool.gradientFrom} ${tool.gradientTo} shadow-lg`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <Badge
                    variant={tool.status === "active" ? "default" : "secondary"}
                    className={
                      tool.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {tool.status === "active" ? "Active" : "Coming Soon"}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-semibold text-foreground mt-4">
                  {tool.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="relative">
                <p className="text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>

                {/* Demo Visualization */}
                <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                  {tool.id === "spreadsheet-analyzer" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="h-2 bg-primary/20 rounded flex-1" />
                        <div className="h-2 bg-primary/20 rounded flex-1" />
                        <div className="h-2 bg-primary/20 rounded flex-1" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-2 bg-primary/30 rounded flex-1" />
                        <div className="h-2 bg-primary/30 rounded flex-1" />
                        <div className="h-2 bg-primary/30 rounded flex-1" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-2 bg-primary/40 rounded flex-1" />
                        <div className="h-2 bg-primary/40 rounded flex-1" />
                        <div className="h-2 bg-primary/40 rounded flex-1" />
                      </div>
                    </div>
                  )}

                  {tool.id === "cvp-analyzer" && (
                    <div className="relative h-20">
                      <svg className="w-full h-full" viewBox="0 0 200 80">
                        <line x1="10" y1="70" x2="190" y2="70" stroke="currentColor" className="text-border" strokeWidth="2" />
                        <line x1="10" y1="10" x2="10" y2="70" stroke="currentColor" className="text-border" strokeWidth="2" />
                        <path d="M 10 70 Q 100 10 190 10" stroke="currentColor" className="text-emerald-500" strokeWidth="2" fill="none" />
                        <circle cx="100" cy="40" r="4" className="fill-emerald-500" />
                      </svg>
                    </div>
                  )}

                  {tool.id === "regional-mapper" && (
                    <div className="relative h-20">
                      <svg className="w-full h-full" viewBox="0 0 200 80">
                        <circle cx="50" cy="30" r="3" className="fill-purple-500" />
                        <circle cx="100" cy="45" r="3" className="fill-purple-500" />
                        <circle cx="150" cy="25" r="3" className="fill-purple-500" />
                        <circle cx="75" cy="55" r="3" className="fill-purple-500" />
                        <circle cx="130" cy="50" r="3" className="fill-purple-500" />
                        <path d="M 20 60 Q 40 40 60 50 T 100 55 Q 120 60 140 50 T 180 60" 
                          stroke="currentColor" className="text-border" strokeWidth="1" fill="none" strokeDasharray="2,2" />
                      </svg>
                    </div>
                  )}

                  {tool.id === "swot-analysis" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="aspect-[3/1] rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">S</span>
                      </div>
                      <div className="aspect-[3/1] rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">W</span>
                      </div>
                      <div className="aspect-[3/1] rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">O</span>
                      </div>
                      <div className="aspect-[3/1] rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">T</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hover Arrow Indicator */}
                <div className="mt-4 flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  <span className="font-medium">
                    {tool.status === "active" ? "Launch Tool" : "View Details"}
                  </span>
                  <svg
                    className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
