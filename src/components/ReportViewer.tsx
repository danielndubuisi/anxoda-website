import React, { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
    ArrowLeft,
    BarChart3,
    FileText,
    Lightbulb,
    Download,
    Calendar,
    Database,
    TrendingUp,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from "recharts";

// Enhanced interface for structured AI analysis
interface AnalysisData {
    keyFindings: string[];
    additionalKPIs: string[];
    recommendations: string[];
}

interface ReportData {
    id: string;
    title: string;
    original_filename: string;
    processing_status: string;
    text_summary: Json;
    chart_data: Json;
    row_count: number;
    column_count: number;
    created_at: string;
}

interface ReportViewerProps {
    reportId: string;
    onBack: () => void;
}

const CHART_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "hsl(var(--muted-foreground))",
    "hsl(var(--destructive))",
];

export const ReportViewer: React.FC<ReportViewerProps> = ({
    reportId,
    onBack,
}) => {
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchReport();
    }, [reportId]);

    useEffect(() => {
        // Auto-refresh for processing reports
        if (report?.processing_status === 'processing') {
            const interval = setInterval(() => {
                fetchReport();
            }, 3000);
            
            return () => clearInterval(interval);
        }
    }, [report?.processing_status]);

    const fetchReport = async () => {
        try {
            setLoading(true);

            // Fetch from Supabase table directly
            const { data, error } = await supabase
                .from("spreadsheet_reports")
                .select("*")
                .eq("id", reportId)
                .single();

            if (error) {
                console.error("Error fetching report:", error);
                toast({
                    title: "Error",
                    description: "Failed to load the report. Please try again.",
                    variant: "destructive",
                });
                return;
            }

            setReport(data as ReportData);
        } catch (error) {
            console.error("Error fetching report:", error);
            toast({
                title: "Error",
                description: "Failed to load the report. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const renderChart = (chartConfig: any, index: number) => {
        if (
            !chartConfig ||
            !chartConfig.data ||
            chartConfig.data.length === 0
        ) {
            return (
                <div className="text-center text-muted-foreground py-8">
                    No data available for this chart
                </div>
            );
        }

        const commonProps = {
            width: "100%",
            height: 300,
            data: chartConfig.data,
        };

        switch (chartConfig.type) {
            case "line":
                return (
                    <ResponsiveContainer {...commonProps}>
                        <LineChart data={chartConfig.data}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-muted"
                            />
                            <XAxis
                                dataKey={chartConfig.xKey || "index"}
                                className="text-muted-foreground text-sm"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                className="text-muted-foreground text-sm"
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "6px",
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey={chartConfig.yKey || "value"}
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={{
                                    fill: "hsl(var(--primary))",
                                    strokeWidth: 2,
                                    r: 4,
                                }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case "pie":
                return (
                    <ResponsiveContainer {...commonProps}>
                        <PieChart>
                            <Pie
                                data={chartConfig.data}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="hsl(var(--primary))"
                                dataKey={chartConfig.valueKey || "value"}
                                label={({ name, percent }) =>
                                    `${name} ${(percent * 100).toFixed(0)}%`
                                }>
                                {chartConfig.data.map(
                                    (entry: any, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={
                                                CHART_COLORS[
                                                    index % CHART_COLORS.length
                                                ]
                                            }
                                        />
                                    )
                                )}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "6px",
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                );

            default: // bar chart
                return (
                    <ResponsiveContainer {...commonProps}>
                        <BarChart data={chartConfig.data}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-muted"
                            />
                            <XAxis
                                dataKey={chartConfig.xKey || "name"}
                                className="text-muted-foreground text-sm"
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                className="text-muted-foreground text-sm"
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "6px",
                                }}
                            />
                            <Bar
                                dataKey={
                                    chartConfig.yKey ||
                                    chartConfig.data[0]?.count !== undefined
                                        ? "count"
                                        : chartConfig.data[0]?.average !==
                                          undefined
                                        ? "average"
                                        : "value"
                                }
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                );
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <Badge
                        variant="default"
                        className="bg-green-500/10 text-green-500 border-green-500/20">
                        Completed
                    </Badge>
                );
            case "processing":
                return <Badge variant="secondary">Processing</Badge>;
            case "failed":
                return <Badge variant="destructive">Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const parseAnalysisData = (summary: Json): AnalysisData => {
        if (
            typeof summary === "object" &&
            summary !== null &&
            !Array.isArray(summary)
        ) {
            const obj = summary as any;
            if (obj.keyFindings && obj.additionalKPIs && obj.recommendations) {
                return obj as AnalysisData;
            }
        }

        // Fallback for plain text summaries
        return {
            keyFindings: [
                typeof summary === "string" ? summary : "No analysis available",
            ],
            additionalKPIs: [],
            recommendations: [],
        };
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Reports
                    </Button>
                </div>
                <div className="space-y-4">
                    <div className="h-8 bg-muted rounded animate-pulse"></div>
                    <div className="h-32 bg-muted rounded animate-pulse"></div>
                    <div className="h-64 bg-muted rounded animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Reports
                    </Button>
                </div>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            Report Not Found
                        </h3>
                        <p className="text-muted-foreground text-center">
                            The report you're looking for doesn't exist or may
                            have been deleted.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show processing state
    if (report.processing_status === 'processing') {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Reports
                    </Button>
                </div>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <BarChart3 className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                        <h3 className="text-lg font-semibold">Processing Your Report</h3>
                        <p className="text-muted-foreground text-center">
                            AI is analyzing your data and generating insights.<br />
                            This usually takes 1-2 minutes.
                        </p>
                        <div className="w-full max-w-xs bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show failed state
    if (report.processing_status === 'failed') {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Reports
                    </Button>
                </div>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-destructive">
                            Processing Failed
                        </h3>
                        <p className="text-muted-foreground text-center mb-4">
                            There was an error processing your report. Please try uploading again.
                        </p>
                        <Button onClick={onBack}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const analysisData = parseAnalysisData(report.text_summary);

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Reports
                    </Button>
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Report
                </Button>
            </div>

            {/* Report Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-3">
                                <TrendingUp className="w-6 h-6 text-primary" />
                                {report.title}
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Original file: {report.original_filename}
                            </CardDescription>
                        </div>
                        {getStatusBadge(report.processing_status)}
                    </div>
                </CardHeader>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Total Rows
                                </p>
                                <p className="text-2xl font-bold">
                                    {report.row_count?.toLocaleString() ||
                                        "N/A"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Columns
                                </p>
                                <p className="text-2xl font-bold">
                                    {report.column_count || "N/A"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Created
                                </p>
                                <p className="text-lg font-semibold">
                                    {report.created_at
                                        ? new Date(
                                              report.created_at
                                          ).toLocaleDateString()
                                        : "N/A"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="summary" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                        value="summary"
                        className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Analysis & Insights
                    </TabsTrigger>
                    <TabsTrigger
                        value="recommendations"
                        className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Recommendations
                    </TabsTrigger>
                </TabsList>

                {/* Visualization Tab - Hidden for now */}
                {/* <TabsContent value="visualization" className="space-y-6">
                    {report.chart_data &&
                    Array.isArray(report.chart_data) &&
                    report.chart_data.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {(report.chart_data as any[]).map(
                                (chart, index) => (
                                    <Card key={index}>
                                        <CardHeader>
                                            <CardTitle className="text-lg">
                                                {chart.title ||
                                                    `Chart ${index + 1}`}
                                            </CardTitle>
                                            {chart.description && (
                                                <CardDescription>
                                                    {chart.description}
                                                </CardDescription>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            {renderChart(chart, index)}
                                        </CardContent>
                                    </Card>
                                )
                            )}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">
                                    No Visualizations Available
                                </h3>
                                <p className="text-muted-foreground text-center">
                                    Charts and graphs will appear here once the
                                    data analysis is complete.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent> */}

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Key Findings
                            </CardTitle>
                            <CardDescription>
                                Main insights from your data analysis
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {analysisData.keyFindings.length > 0 ? (
                                analysisData.keyFindings.map(
                                    (finding, index) => (
                                        <div
                                            key={index}
                                            className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                                            <p className="text-sm leading-relaxed">
                                                {finding}
                                            </p>
                                        </div>
                                    )
                                )
                            ) : (
                                <p className="text-muted-foreground">
                                    No analysis summary available.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {analysisData.additionalKPIs.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Additional KPIs
                                </CardTitle>
                                <CardDescription>
                                    Other relevant metrics discovered in your
                                    data
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {analysisData.additionalKPIs.map(
                                    (kpi, index) => (
                                        <div
                                            key={index}
                                            className="p-3 bg-secondary/50 rounded-lg">
                                            <p className="text-sm">{kpi}</p>
                                        </div>
                                    )
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5" />
                                Actionable Recommendations
                            </CardTitle>
                            <CardDescription>
                                Data-driven suggestions to improve your business
                                performance
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {analysisData.recommendations.length > 0 ? (
                                analysisData.recommendations.map(
                                    (recommendation, index) => (
                                        <div
                                            key={index}
                                            className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                                                    {index + 1}
                                                </div>
                                                <p className="text-sm leading-relaxed flex-1">
                                                    {recommendation}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )
                            ) : (
                                <div className="text-center py-8">
                                    <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">
                                        No recommendations available yet.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
