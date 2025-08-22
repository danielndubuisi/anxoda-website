import React, { useState, useEffect } from "react";
import {
    FileSpreadsheet,
    Calendar,
    BarChart,
    Trash2,
    Eye,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Report {
    id: string;
    title: string;
    original_filename: string;
    processing_status: "processing" | "completed" | "failed";
    created_at: string;
    row_count?: number;
    column_count?: number;
}

interface ReportListProps {
    onViewReport: (reportId: string) => void;
    refreshTrigger: number;
}

export const ReportList: React.FC<ReportListProps> = ({
    onViewReport,
    refreshTrigger,
}) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
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
            setReports(Array.isArray(data) ? data : []);
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

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-muted rounded"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-muted rounded w-32"></div>
                                        <div className="h-3 bg-muted rounded w-24"></div>
                                    </div>
                                </div>
                                <div className="h-8 bg-muted rounded w-20"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                        No Reports Yet
                    </h3>
                    <p className="text-muted-foreground">
                        Upload your first spreadsheet to get started with
                        AI-powered analysis.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {reports.map((report) => (
                <Card
                    key={report.id}
                    className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
                                    <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-base sm:text-lg truncate">
                                        {report.title}
                                    </h3>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-muted-foreground mt-1 space-y-1 sm:space-y-0">
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
                                    className="text-xs">
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
                                            className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
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
                                        className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only sm:not-sr-only sm:ml-2">
                                            Delete
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
