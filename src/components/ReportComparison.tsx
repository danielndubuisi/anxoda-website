import React from "react";
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { calculateChange, formatChangePercentage } from "@/lib/reportComparison";

interface Report {
    id: string;
    title: string;
    original_filename: string;
    created_at: string;
    text_summary?: {
        summary?: string;
        keyFindings?: string[];
        recommendations?: string[];
    };
    kpis?: Array<{
        label: string;
        value: string | number;
    }>;
}

interface ReportComparisonProps {
    reportA: Report;
    reportB: Report;
    onClose: () => void;
}

export const ReportComparison: React.FC<ReportComparisonProps> = ({
    reportA,
    reportB,
    onClose,
}) => {
    // Determine which is older
    const isAOlder = new Date(reportA.created_at) < new Date(reportB.created_at);
    const olderReport = isAOlder ? reportA : reportB;
    const newerReport = isAOlder ? reportB : reportA;

    const renderChangeIndicator = (change: number) => {
        if (change > 0) {
            return (
                <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    {formatChangePercentage(change)}
                </span>
            );
        } else if (change < 0) {
            return (
                <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                    <TrendingDown className="w-4 h-4" />
                    {formatChangePercentage(change)}
                </span>
            );
        } else {
            return (
                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Minus className="w-4 h-4" />
                    No change
                </span>
            );
        }
    };

    const compareKPIs = () => {
        const olderKPIs = olderReport.kpis || [];
        const newerKPIs = newerReport.kpis || [];

        const comparisonMap = new Map<string, { old: number | null; new: number | null }>();

        olderKPIs.forEach((kpi) => {
            const numValue = typeof kpi.value === 'number' ? kpi.value : parseFloat(String(kpi.value).replace(/[^0-9.-]/g, ''));
            if (!isNaN(numValue)) {
                comparisonMap.set(kpi.label, { old: numValue, new: null });
            }
        });

        newerKPIs.forEach((kpi) => {
            const numValue = typeof kpi.value === 'number' ? kpi.value : parseFloat(String(kpi.value).replace(/[^0-9.-]/g, ''));
            if (!isNaN(numValue)) {
                const existing = comparisonMap.get(kpi.label);
                if (existing) {
                    existing.new = numValue;
                } else {
                    comparisonMap.set(kpi.label, { old: null, new: numValue });
                }
            }
        });

        return Array.from(comparisonMap.entries());
    };

    const kpiComparisons = compareKPIs();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            Report Comparison
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={onClose}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to History
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 border rounded-lg bg-muted/30">
                            <Badge variant="secondary" className="mb-2">
                                Report A (Older)
                            </Badge>
                            <h3 className="font-semibold text-lg mb-1">
                                {olderReport.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {formatDistanceToNow(new Date(olderReport.created_at), {
                                    addSuffix: true,
                                })}
                            </div>
                        </div>

                        <div className="p-4 border rounded-lg bg-primary/5 border-primary/30">
                            <Badge variant="default" className="mb-2">
                                Report B (Newer)
                            </Badge>
                            <h3 className="font-semibold text-lg mb-1">
                                {newerReport.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {formatDistanceToNow(new Date(newerReport.created_at), {
                                    addSuffix: true,
                                })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Comparison */}
            {kpiComparisons.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Key Performance Indicators</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {kpiComparisons.map(([label, values]) => {
                                const change = calculateChange(values.old, values.new);
                                return (
                                    <div
                                        key={label}
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg"
                                    >
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground mb-1">
                                                Metric
                                            </div>
                                            <div className="font-semibold">{label}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <div className="text-sm text-muted-foreground mb-1">
                                                    Older
                                                </div>
                                                <div className="font-medium">
                                                    {values.old !== null ? values.old.toLocaleString() : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground mb-1">
                                                    Newer
                                                </div>
                                                <div className="font-medium">
                                                    {values.new !== null ? values.new.toLocaleString() : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end">
                                            {values.old !== null && values.new !== null && renderChangeIndicator(change)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle>Summary Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="font-semibold text-sm text-muted-foreground">
                                Report A (Older)
                            </div>
                            <div className="p-4 border rounded-lg bg-muted/30">
                                <p className="text-sm">
                                    {olderReport.text_summary?.summary || "No summary available"}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="font-semibold text-sm text-muted-foreground">
                                Report B (Newer)
                            </div>
                            <div className="p-4 border rounded-lg bg-primary/5">
                                <p className="text-sm">
                                    {newerReport.text_summary?.summary || "No summary available"}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Key Findings Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle>Key Findings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="font-semibold text-sm text-muted-foreground">
                                Report A (Older)
                            </div>
                            <div className="p-4 border rounded-lg bg-muted/30">
                                {olderReport.text_summary?.keyFindings?.length ? (
                                    <ul className="space-y-1 text-sm list-disc list-inside">
                                        {olderReport.text_summary.keyFindings.map((finding, i) => (
                                            <li key={i}>{finding}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No findings available
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="font-semibold text-sm text-muted-foreground">
                                Report B (Newer)
                            </div>
                            <div className="p-4 border rounded-lg bg-primary/5">
                                {newerReport.text_summary?.keyFindings?.length ? (
                                    <ul className="space-y-1 text-sm list-disc list-inside">
                                        {newerReport.text_summary.keyFindings.map((finding, i) => (
                                            <li key={i}>{finding}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No findings available
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recommendations Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="font-semibold text-sm text-muted-foreground">
                                Report A (Older)
                            </div>
                            <div className="p-4 border rounded-lg bg-muted/30">
                                {olderReport.text_summary?.recommendations?.length ? (
                                    <ul className="space-y-1 text-sm list-disc list-inside">
                                        {olderReport.text_summary.recommendations.map((rec, i) => (
                                            <li key={i}>{rec}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No recommendations available
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="font-semibold text-sm text-muted-foreground">
                                Report B (Newer)
                            </div>
                            <div className="p-4 border rounded-lg bg-primary/5">
                                {newerReport.text_summary?.recommendations?.length ? (
                                    <ul className="space-y-1 text-sm list-disc list-inside">
                                        {newerReport.text_summary.recommendations.map((rec, i) => (
                                            <li key={i}>{rec}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No recommendations available
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
