import React, { useState, useEffect } from "react";
import {
    FileSpreadsheet,
    Calendar,
    BarChart,
    Trash2,
    Eye,
    GitCompare,
    Search,
    Filter,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ReportComparison } from "./ReportComparison";

interface Report {
    id: string;
    title: string;
    original_filename: string;
    processing_status: "processing" | "completed" | "failed";
    created_at: string;
    row_count?: number;
    column_count?: number;
    text_summary?: any;
    kpis?: any;
}

interface ReportHistoryProps {
    onViewReport: (reportId: string) => void;
    refreshTrigger: number;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({
    onViewReport,
    refreshTrigger,
}) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [filteredReports, setFilteredReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [showComparison, setShowComparison] = useState(false);
    const { toast } = useToast();

    const fetchReports = async () => {
        setLoading(true);
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) {
                setReports([]);
                setLoading(false);
                return;
            }

            const response = await fetch(
                `https://pjevyfyvrgvjgspxfikd.supabase.co/functions/v1/get-reports`,
                {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                }
            );

            if (!response.ok) {
                setReports([]);
                setLoading(false);
                throw new Error("Failed to fetch reports");
            }

            const data = await response.json();
            const reportsList = Array.isArray(data) ? data : [];
            setReports(reportsList);
            setFilteredReports(reportsList);
        } catch (error) {
            setReports([]);
            toast({
                title: "Error",
                description: "Failed to load reports",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const deleteReport = async (reportId: string) => {
        setDeleting(reportId);
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                `https://pjevyfyvrgvjgspxfikd.supabase.co/functions/v1/delete-report`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ reportId }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete report");
            }

            toast({
                title: "Success",
                description: "Report deleted successfully",
            });

            fetchReports();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete report",
                variant: "destructive",
            });
        } finally {
            setDeleting(null);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [refreshTrigger]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredReports(reports);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = reports.filter(
                (report) =>
                    report.title.toLowerCase().includes(query) ||
                    report.original_filename.toLowerCase().includes(query)
            );
            setFilteredReports(filtered);
        }
    }, [searchQuery, reports]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "default";
            case "processing":
                return "secondary";
            case "failed":
                return "destructive";
            default:
                return "outline";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "completed":
                return "Completed";
            case "processing":
                return "Processing";
            case "failed":
                return "Failed";
            default:
                return "Unknown";
        }
    };

    const toggleReportSelection = (reportId: string) => {
        setSelectedReports((prev) => {
            if (prev.includes(reportId)) {
                return prev.filter((id) => id !== reportId);
            } else if (prev.length < 2) {
                return [...prev, reportId];
            } else {
                // Replace the first selected with the new one
                return [prev[1], reportId];
            }
        });
    };

    const handleCompare = () => {
        if (selectedReports.length === 2) {
            setShowComparison(true);
        }
    };

    if (showComparison && selectedReports.length === 2) {
        const reportA = reports.find((r) => r.id === selectedReports[0]);
        const reportB = reports.find((r) => r.id === selectedReports[1]);
        
        if (reportA && reportB) {
            return (
                <ReportComparison
                    reportA={reportA}
                    reportB={reportB}
                    onClose={() => {
                        setShowComparison(false);
                        setSelectedReports([]);
                    }}
                />
            );
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 animate-spin" />
                        Loading Report History...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className="w-12 h-12 bg-muted-foreground/20 rounded"></div>
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 bg-muted-foreground/20 rounded w-1/3"></div>
                                            <div className="h-3 bg-muted-foreground/20 rounded w-1/4"></div>
                                        </div>
                                    </div>
                                    <div className="h-8 bg-muted-foreground/20 rounded w-20"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (reports.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Previous Reports & Analysis History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                        No Reports Yet
                    </h3>
                    <p className="text-muted-foreground">
                        Your analysis history will appear here once you complete your first report.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Previous Reports & Analysis History
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {selectedReports.length > 0 && (
                            <Badge variant="secondary">
                                {selectedReports.length} selected
                            </Badge>
                        )}
                        <Button
                            size="sm"
                            onClick={handleCompare}
                            disabled={selectedReports.length !== 2}
                            className="gap-2"
                        >
                            <GitCompare className="w-4 h-4" />
                            Compare
                        </Button>
                    </div>
                </div>
                <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search reports by title or filename..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {filteredReports.map((report) => (
                        <div
                            key={report.id}
                            className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                                selectedReports.includes(report.id)
                                    ? "border-primary bg-primary/5"
                                    : "border-border"
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedReports.includes(report.id)}
                                        onChange={() => toggleReportSelection(report.id)}
                                        disabled={report.processing_status !== "completed"}
                                        className="w-4 h-4 flex-shrink-0"
                                    />
                                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-sm sm:text-base truncate">
                                            {report.title}
                                        </h3>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs text-muted-foreground mt-1 space-y-1 sm:space-y-0">
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                                <span className="truncate">
                                                    {formatDistanceToNow(
                                                        new Date(report.created_at),
                                                        { addSuffix: true }
                                                    )}
                                                </span>
                                            </div>
                                            {report.row_count &&
                                                report.column_count && (
                                                    <div className="flex items-center space-x-1">
                                                        <BarChart className="h-3 w-3 flex-shrink-0" />
                                                        <span className="truncate">
                                                            {report.row_count} rows,{" "}
                                                            {report.column_count}{" "}
                                                            columns
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0">
                                    <Badge
                                        variant={getStatusColor(
                                            report.processing_status
                                        )}
                                        className="text-xs"
                                    >
                                        {getStatusText(report.processing_status)}
                                    </Badge>

                                    <div className="flex space-x-2">
                                        {report.processing_status ===
                                            "completed" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    onViewReport(report.id)
                                                }
                                                className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                                            >
                                                <Eye className="h-4 w-4" />
                                                <span className="sr-only sm:not-sr-only sm:ml-2">
                                                    View
                                                </span>
                                            </Button>
                                        )}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => deleteReport(report.id)}
                                            disabled={deleting === report.id}
                                            className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only sm:not-sr-only sm:ml-2">
                                                Delete
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
