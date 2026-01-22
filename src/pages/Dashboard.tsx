import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SpreadsheetUploader } from "@/components/SpreadsheetUploader";
import spreadsheetImage from "@/assets/spreadsheet-analyzer-demo.webp";
import anxodaLogo from "@/assets/logo.webp";
import { ReportList } from "@/components/ReportList";
import { ReportViewer } from "@/components/ReportViewer";
import { AnalyzerWorkflow } from "@/components/AnalyzerWorkflow";
import { ReportHistory } from "@/components/ReportHistory";
import { ToolsGrid } from "@/components/ToolsGrid";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
    User,
    Building2,
    LogOut,
    Crown,
    Shield,
    Sparkles,
    Calendar,
    TrendingUp,
    Users,
    FileText,
    Mail,
    FileSpreadsheet,
    ArrowRight,
    LayoutDashboard,
    Wrench,
    Settings,
} from "lucide-react";

interface Profile {
    id: string;
    user_id: string;
    business_name: string | null;
    contact_person: string | null;
    phone: string | null;
    company_size: string | null;
    industry: string | null;
    avatar_url: string | null;
}

interface Subscription {
    id: string;
    user_id: string;
    plan: "free" | "basic" | "premium" | "enterprise";
    subscription_status: string;
    current_period_end: string | null;
}

const Dashboard = () => {
    const { user, signOut, loading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("tools");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(
        null
    );
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [analysisQuestion, setAnalysisQuestion] = useState<
        string | undefined
    >(undefined);
    // Removed redundant 'uploaded' state
    const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [currentReport, setCurrentReport] = useState<any>(null);
    const [polling, setPolling] = useState(false);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [reportCount, setReportCount] = useState<number>(0);
    const [connectionCount, setConnectionCount] = useState<number>(0);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    // Fetch user profile and subscription
    const fetchProfile = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", user?.id)
                .single();

            if (error && error.code !== "PGRST116") {
                throw error;
            }

            setProfile(data);
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    }, [user]);

    const fetchSubscription = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("user_subscriptions")
                .select("*")
                .eq("user_id", user?.id)
                .single();

            if (error && error.code !== "PGRST116") {
                throw error;
            }

            setSubscription(data);
        } catch (error) {
            console.error("Error fetching subscription:", error);
        }
    }, [user]);

    const fetchReportCount = useCallback(async () => {
        try {
            const { count, error } = await supabase
                .from("spreadsheet_reports")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user?.id);

            if (error) throw error;
            setReportCount(count || 0);
        } catch (error) {
            console.error("Error fetching report count:", error);
        }
    }, [user]);

    const fetchConnectionCount = useCallback(async () => {
        try {
            const { count, error } = await supabase
                .from("live_sheet_connections")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user?.id);

            if (error) throw error;
            setConnectionCount(count || 0);
        } catch (error) {
            console.error("Error fetching connection count:", error);
        }
    }, [user]);

    const updateProfile = async (updatedData: Partial<Profile>) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.from("profiles").upsert({
                user_id: user?.id,
                ...updatedData,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id'
            });

            if (error) throw error;

            toast({
                title: "Profile updated successfully",
                description: "Your profile information has been saved.",
            });

            // Clear the form after successful update
            setProfile(null);
        } catch (error) {
            toast({
                title: "Update failed",
                description:
                    error instanceof Error ? error.message : String(error),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmEmail !== user?.email) {
            toast({
                title: "Email mismatch",
                description: "Please enter your email address to confirm deletion.",
                variant: "destructive",
            });
            return;
        }

        setIsDeletingAccount(true);
        try {
            // Delete user's data from custom tables
            await supabase.from("profiles").delete().eq("user_id", user?.id);
            await supabase.from("user_subscriptions").delete().eq("user_id", user?.id);
            await supabase.from("spreadsheet_reports").delete().eq("user_id", user?.id);

            toast({
                title: "Account deleted",
                description: "Your account has been permanently deleted.",
            });

            // Sign out and redirect
            await signOut();
            navigate("/");
        } catch (error) {
            console.error("Delete account error:", error);
            toast({
                title: "Deletion failed",
                description: error instanceof Error ? error.message : "Failed to delete account",
                variant: "destructive",
            });
        } finally {
            setIsDeletingAccount(false);
            setShowDeleteDialog(false);
            setDeleteConfirmEmail("");
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate("/");
    };

    const getPlanIcon = (plan: string) => {
        switch (plan) {
            case "basic":
                return <Shield className="w-5 h-5" />;
            case "premium":
                return <Crown className="w-5 h-5" />;
            case "enterprise":
                return <Sparkles className="w-5 h-5" />;
            default:
                return <User className="w-5 h-5" />;
        }
    };

    // Fetch profile, subscription, report count, and connection count on mount
    useEffect(() => {
        if (user) {
            fetchProfile();
            fetchSubscription();
            fetchReportCount();
            fetchConnectionCount();
        }
    }, [user, fetchProfile, fetchSubscription, fetchReportCount, fetchConnectionCount]);

    const getPlanColor = (plan: string) => {
        switch (plan) {
            case "basic":
                return "bg-blue-500";
            case "premium":
                return "bg-purple-500";
            case "enterprise":
                return "bg-gold-500";
            default:
                return "bg-gray-500";
        }
    };

    const handleQuestionSubmit = async (question: string) => {
        if (!uploadedFile) return;
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
            toast({
                title: "Not authenticated",
                description: "Please log in.",
            });
            return;
        }
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("filename", uploadedFile.name);
        formData.append("question", question);

        const response = await fetch(
            "https://pjevyfyvrgvjgspxfikd.supabase.co/functions/v1/process-spreadsheet",
            {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData,
            }
        );
        const { reportId } = await response.json();
        setPolling(true);
        pollReport(reportId, accessToken);
        setAnalysisQuestion(question || undefined);
        setRefreshTrigger((prev) => prev + 1);
    };

    const pollReport = async (reportId: string, accessToken: string) => {
        if (!accessToken || !reportId) return;
        let report;
        let done = false;
        while (!done) {
            const res = await fetch(
                `https://pjevyfyvrgvjgspxfikd.supabase.co/functions/v1/get-reports?reportId=${reportId}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            report = await res.json();
            setCurrentReport(report);
            // Log chart data, summary, and recommendations when report is completed
            if (
                report.processing_status === "completed" &&
                report.text_summary
            ) {
                console.log("Summary:", report.text_summary.summary);
                console.log("Key Findings:", report.text_summary.keyFindings);
                console.log(
                    "Recommendations:",
                    report.text_summary.recommendations
                );
            }
            if (
                report.processing_status === "completed" ||
                report.processing_status === "failed"
            ) {
                done = true;
                // Trigger refresh of report list when polling is done
                setRefreshTrigger((prev) => prev + 1);
            } else {
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        }
        setPolling(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                        Loading your dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-gradient-subtle flex w-full">
                {/* Desktop Sidebar - hidden on mobile */}
                <div className="hidden md:block">
                    <DashboardSidebar 
                        activeTab={activeTab} 
                        onTabChange={setActiveTab} 
                    />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-x-hidden">
                    <header className="bg-background border-b">
                        <div className="container mx-auto px-2 sm:px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-0">
                                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        <img 
                                            src={anxodaLogo} 
                                            alt="Anxoda Logo" 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <h1 className="text-lg sm:text-xl font-bold truncate max-w-[140px] sm:max-w-none">
                                            Dashboard
                                        </h1>
                                        <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[140px] sm:max-w-none">
                                            Welcome back,{" "}
                                            {profile?.contact_person || user?.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 sm:space-x-4 mt-2 sm:mt-0">
                                    <Badge
                                        variant="secondary"
                                        className="flex items-center space-x-1 px-2 py-1 text-xs sm:text-sm">
                                        {getPlanIcon(subscription?.plan || "free")}
                                        <span className="capitalize">
                                            {subscription?.plan || "Free"} Plan
                                        </span>
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        onClick={handleSignOut}
                                        className="px-3 py-2 text-xs sm:text-sm hover:bg-red-100 hover:text-red-600 transition-colors">
                                        <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
                                        <span className="hidden xs:inline">
                                            Sign Out
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 flex-1 w-full">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            {/* Mobile Hamburger Menu */}
                            <div className="md:hidden mb-4 flex justify-between items-center">
                                <span className="text-lg font-semibold">
                                    {(() => {
                                        switch (activeTab) {
                                            case "overview":
                                                return "Overview";
                                            case "tools":
                                                return "Tools";
                                            case "reports":
                                                return "Reports";
                                            case "settings":
                                                return "Settings";
                                            default:
                                                return "Menu";
                                        }
                                    })()}
                                </span>
                                <button
                                    className="p-2 rounded-md border border-border bg-background shadow-sm focus:outline-none"
                                    onClick={() => setMobileMenuOpen((v) => !v)}
                                    aria-label="Open tab menu">
                                    <svg
                                        className="w-6 h-6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                    </svg>
                                </button>
                                {mobileMenuOpen && (
                                    <div className="absolute top-20 left-0 w-full z-50 bg-background border-b border-border shadow-lg animate-fade-in">
                                        <ul className="flex flex-col divide-y divide-border">
                                            <li>
                                                <button
                                                    className={`w-full text-left px-6 py-4 flex items-center gap-2 ${
                                                        activeTab === "overview"
                                                            ? "bg-primary/10 font-bold"
                                                            : ""
                                                    }`}
                                                    onClick={() => {
                                                        setActiveTab("overview");
                                                        setMobileMenuOpen(false);
                                                    }}>
                                                    <LayoutDashboard className="w-4 h-4" />
                                                    Overview
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    className={`w-full text-left px-6 py-4 flex items-center gap-2 ${
                                                        activeTab === "tools"
                                                            ? "bg-primary/10 font-bold"
                                                            : ""
                                                    }`}
                                                    onClick={() => {
                                                        setActiveTab("tools");
                                                        setMobileMenuOpen(false);
                                                    }}>
                                                    <Wrench className="w-4 h-4" />
                                                    Tools
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    className={`w-full text-left px-6 py-4 flex items-center gap-2 ${
                                                        activeTab === "reports"
                                                            ? "bg-primary/10 font-bold"
                                                            : ""
                                                    }`}
                                                    onClick={() => {
                                                        setActiveTab("reports");
                                                        setMobileMenuOpen(false);
                                                    }}>
                                                    <FileText className="w-4 h-4" />
                                                    Reports
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    className={`w-full text-left px-6 py-4 flex items-center gap-2 ${
                                                        activeTab === "settings"
                                                            ? "bg-primary/10 font-bold"
                                                            : ""
                                                    }`}
                                                    onClick={() => {
                                                        setActiveTab("settings");
                                                        setMobileMenuOpen(false);
                                                    }}>
                                                    <Settings className="w-4 h-4" />
                                                    Settings
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center space-x-2">
                                                <TrendingUp className="w-8 h-8 text-primary" />
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        Growth Rate (Tentative)
                                                    </p>
                                                    <p className="text-2xl font-bold">
                                                        +12.5%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Based on projected metrics
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center space-x-2">
                                                <Users className="w-8 h-8 text-primary" />
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        Team Members
                                                    </p>
                                                    <p className="text-2xl font-bold">1</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Across all projects
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card 
                                        className="cursor-pointer hover:bg-primary/5 transition-colors"
                                        onClick={() => setActiveTab("reports")}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex items-center space-x-2">
                                                <FileText className="w-8 h-8 text-primary" />
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        Reports Generated
                                                    </p>
                                                    <p className="text-2xl font-bold">{reportCount}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Total analyses completed
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-8 h-8 text-primary" />
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        Active Connections
                                                    </p>
                                                    <p className="text-2xl font-bold">{connectionCount}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Live data sources
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Recent Activity</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-3 p-3 rounded-lg bg-primary/5">
                                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                    <p className="text-sm">
                                                        Account created successfully
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                                                    <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Explore available tools to
                                                        get started
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Quick Actions</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <Button
                                                className="w-full justify-start"
                                                onClick={() => {
                                                    setActiveTab("tools");
                                                    setSelectedTool("spreadsheet-analyzer");
                                                }}>
                                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                                Start Spreadsheet Analysis
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start"
                                                onClick={() => setActiveTab("reports")}>
                                                <FileText className="w-4 h-4 mr-2" />
                                                View All Reports
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start"
                                                onClick={() => {
                                                    const element = document.getElementById('contact');
                                                    if (element) {
                                                        window.scrollTo({
                                                            top: element.offsetTop,
                                                            behavior: 'smooth'
                                                        });
                                                    } else {
                                                        window.location.href = '/#contact';
                                                    }
                                                }}>
                                                <Calendar className="w-4 h-4 mr-2" />
                                                Schedule Consultation
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start"
                                                onClick={() => window.location.href = 'mailto:info@anxoda.com'}
                                            >
                                                <Mail className="w-4 h-4 mr-2" />
                                                Customer Support
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="reports" className="space-y-6">
                                {selectedReportId ? (
                                    <ReportViewer 
                                        reportId={selectedReportId}
                                        onBack={() => setSelectedReportId(null)}
                                    />
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-2xl font-bold mb-2">Reports & Analysis History</h2>
                                            <p className="text-muted-foreground">
                                                View, compare, and manage all your generated reports
                                            </p>
                                        </div>
                                        <ReportHistory 
                                            onViewReport={(reportId) => setSelectedReportId(reportId)}
                                            refreshTrigger={refreshTrigger}
                                        />
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="tools" className="space-y-6">
                                {selectedReportId ? (
                                    <ReportViewer 
                                        reportId={selectedReportId}
                                        onBack={() => {
                                            setSelectedReportId(null);
                                            setSelectedTool(null);
                                        }}
                                    />
                                ) : selectedTool === "spreadsheet-analyzer" ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-2xl font-bold">A.S.S</h2>
                                            <Button
                                                variant="outline"
                                                onClick={() => setSelectedTool(null)}
                                            >
                                                ← Back to Tools
                                            </Button>
                                        </div>
                                        <AnalyzerWorkflow 
                                            onReportGenerated={() => {
                                                setRefreshTrigger(prev => prev + 1);
                                                fetchConnectionCount();
                                            }}
                                            onViewReports={() => setActiveTab("reports")}
                                            hasExistingConnections={connectionCount > 0}
                                        />
                                    </div>
                                ) : selectedTool ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-2xl font-bold capitalize">{selectedTool.replace(/-/g, ' ')}</h2>
                                            <Button
                                                variant="outline"
                                                onClick={() => setSelectedTool(null)}
                                            >
                                                ← Back to Tools
                                            </Button>
                                        </div>
                                        <Card className="p-12 text-center">
                                            <div className="space-y-4">
                                                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Sparkles className="w-10 h-10 text-primary" />
                                                </div>
                                                <h3 className="text-xl font-semibold">Coming Soon!</h3>
                                                <p className="text-muted-foreground max-w-md mx-auto">
                                                    This powerful tool is currently under development. We're working hard to bring you advanced {selectedTool.replace(/-/g, ' ')} capabilities.
                                                </p>
                                                <Button onClick={() => setSelectedTool(null)} className="mt-4">
                                                    Explore Other Tools
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                ) : (
                                    <ToolsGrid 
                                        onToolSelect={(toolId) => {
                                            setSelectedTool(toolId);
                                            if (toolId !== "spreadsheet-analyzer") {
                                                toast({
                                                    title: "Coming Soon!",
                                                    description: `The ${toolId.replace(/-/g, ' ')} tool is currently under development.`,
                                                });
                                            }
                                        }}
                                    />
                                )}
                            </TabsContent>

                            {/* Settings Tab - Consolidated from Profile, Subscription, and Settings */}
                            <TabsContent value="settings" className="space-y-6">
                                {/* Profile Section */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Profile Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="business_name">
                                                    Business Name
                                                </Label>
                                                <Input
                                                    id="business_name"
                                                    value={profile?.business_name || ""}
                                                    onChange={(e) =>
                                                        setProfile((prev) =>
                                                            prev
                                                                ? {
                                                                      ...prev,
                                                                      business_name:
                                                                          e.target
                                                                              .value,
                                                                  }
                                                                : null
                                                        )
                                                    }
                                                    placeholder="Your business name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="contact_person">
                                                    Contact Person
                                                </Label>
                                                <Input
                                                    id="contact_person"
                                                    value={
                                                        profile?.contact_person || ""
                                                    }
                                                    onChange={(e) =>
                                                        setProfile((prev) =>
                                                            prev
                                                                ? {
                                                                      ...prev,
                                                                      contact_person:
                                                                          e.target
                                                                              .value,
                                                                  }
                                                                : null
                                                        )
                                                    }
                                                    placeholder="Your name"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Phone</Label>
                                                <Input
                                                    id="phone"
                                                    value={profile?.phone || ""}
                                                    onChange={(e) =>
                                                        setProfile((prev) =>
                                                            prev
                                                                ? {
                                                                      ...prev,
                                                                      phone: e.target
                                                                          .value,
                                                                  }
                                                                : null
                                                        )
                                                    }
                                                    placeholder="Your phone number"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="industry">
                                                    Industry
                                                </Label>
                                                <Input
                                                    id="industry"
                                                    value={profile?.industry || ""}
                                                    onChange={(e) =>
                                                        setProfile((prev) =>
                                                            prev
                                                                ? {
                                                                      ...prev,
                                                                      industry:
                                                                          e.target
                                                                              .value,
                                                                  }
                                                                : null
                                                        )
                                                    }
                                                    placeholder="Your industry"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="company_size">
                                                Company Size
                                            </Label>
                                            <Input
                                                id="company_size"
                                                value={profile?.company_size || ""}
                                                onChange={(e) =>
                                                    setProfile((prev) =>
                                                        prev
                                                            ? {
                                                                  ...prev,
                                                                  company_size:
                                                                      e.target.value,
                                                              }
                                                            : null
                                                    )
                                                }
                                                placeholder="e.g., 1-10 employees"
                                            />
                                        </div>

                                        <Button
                                            onClick={() =>
                                                profile && updateProfile(profile)
                                            }
                                            disabled={isLoading}
                                            className="w-full md:w-auto">
                                            {isLoading
                                                ? "Updating..."
                                                : "Update Profile"}
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Subscription Section */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Current Plan</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center space-x-4 mb-6">
                                            <div
                                                className={`w-12 h-12 ${getPlanColor(
                                                    subscription?.plan || "free"
                                                )} rounded-lg flex items-center justify-center text-white`}>
                                                {getPlanIcon(
                                                    subscription?.plan || "free"
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold capitalize">
                                                    {subscription?.plan || "Free"} Plan
                                                </h3>
                                                <p className="text-muted-foreground">
                                                    {subscription?.subscription_status ===
                                                    "active"
                                                        ? "Active"
                                                        : "Inactive"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <Card className="border-2 border-primary">
                                                <CardContent className="p-4 text-center">
                                                    <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
                                                    <h4 className="font-semibold">
                                                        Basic Plan
                                                    </h4>
                                                    <p className="text-2xl font-bold">
                                                        $29/mo
                                                    </p>
                                                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                                                        <li>✓ 5 Projects</li>
                                                        <li>✓ Email Support</li>
                                                        <li>✓ Basic Analytics</li>
                                                    </ul>
                                                    <Button
                                                        className="w-full mt-3"
                                                        variant="outline">
                                                        Upgrade
                                                    </Button>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <Crown className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                                                    <h4 className="font-semibold">
                                                        Premium Plan
                                                    </h4>
                                                    <p className="text-2xl font-bold">
                                                        $99/mo
                                                    </p>
                                                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                                                        <li>✓ Unlimited Projects</li>
                                                        <li>✓ Priority Support</li>
                                                        <li>✓ Advanced Analytics</li>
                                                    </ul>
                                                    <Button className="w-full mt-3">
                                                        Upgrade
                                                    </Button>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardContent className="p-4 text-center">
                                                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                                                    <h4 className="font-semibold">
                                                        Enterprise
                                                    </h4>
                                                    <p className="text-2xl font-bold">
                                                        Custom
                                                    </p>
                                                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                                                        <li>✓ Everything Included</li>
                                                        <li>✓ Dedicated Support</li>
                                                        <li>✓ Custom Integration</li>
                                                    </ul>
                                                    <Button
                                                        className="w-full mt-3"
                                                        variant="secondary">
                                                        Contact Us
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Account Settings Section */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Account Settings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Email</Label>
                                            <Input value={user?.email || ""} disabled />
                                            <p className="text-sm text-muted-foreground">
                                                Email cannot be changed. Contact support
                                                if you need to update your email.
                                            </p>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h4 className="font-semibold text-destructive mb-2">
                                                Danger Zone
                                            </h4>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Once you delete your account, there is
                                                no going back. Please be certain.
                                            </p>
                                            <Button 
                                                variant="destructive"
                                                onClick={() => setShowDeleteDialog(true)}
                                            >
                                                Delete Account
                                            </Button>

                                            {/* Delete Confirmation Dialog */}
                                            {showDeleteDialog && (
                                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                                    <div className="bg-background p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                                                        <h3 className="text-lg font-semibold text-destructive mb-2">
                                                            Delete Account - Are you absolutely sure?
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground mb-4">
                                                            This action cannot be undone. This will permanently delete your account,
                                                            all your reports, and remove all associated data from our servers.
                                                        </p>
                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="confirm-email">
                                                                    Type your email <strong>{user?.email}</strong> to confirm:
                                                                </Label>
                                                                <Input
                                                                    id="confirm-email"
                                                                    type="email"
                                                                    value={deleteConfirmEmail}
                                                                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                                                                    placeholder="Enter your email"
                                                                />
                                                            </div>
                                                            <div className="flex gap-3">
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setShowDeleteDialog(false);
                                                                        setDeleteConfirmEmail("");
                                                                    }}
                                                                    className="flex-1"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    onClick={handleDeleteAccount}
                                                                    disabled={deleteConfirmEmail !== user?.email || isDeletingAccount}
                                                                    className="flex-1"
                                                                >
                                                                    {isDeletingAccount ? "Deleting..." : "Delete Account"}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default Dashboard;
