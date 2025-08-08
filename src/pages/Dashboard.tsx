import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SpreadsheetUploader } from "@/components/SpreadsheetUploader";
import { ReportList } from "@/components/ReportList";
import { ReportViewer } from "@/components/ReportViewer";
import { DemoDataUploader } from "@/components/DemoDataUploader";
import { QuestionInput } from "@/components/QuestionInput";
import {
  User,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  Crown,
  Shield,
  Sparkles,
  Calendar,
  TrendingUp,
  Users,
  FileText,
  Mail,
  FileSpreadsheet
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
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
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
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [analysisQuestion, setAnalysisQuestion] = useState<string | undefined>(undefined);
  const [showUploader, setShowUploader] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch user profile and subscription
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSubscription();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSubscription(data);
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
    }
  };

  const updateProfile = async (updatedData: Partial<Profile>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          ...updatedData
        });

      if (error) throw error;

      toast({
        title: "Profile updated successfully",
        description: "Your profile information has been saved."
      });

      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'basic': return <Shield className="w-5 h-5" />;
      case 'premium': return <Crown className="w-5 h-5" />;
      case 'enterprise': return <Sparkles className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-blue-500';
      case 'premium': return 'bg-purple-500';
      case 'enterprise': return 'bg-gold-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Anxoda Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {profile?.contact_person || user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="flex items-center space-x-1">
                {getPlanIcon(subscription?.plan || 'free')}
                <span className="capitalize">{subscription?.plan || 'Free'} Plan</span>
              </Badge>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analyzer">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Spreadsheet Analyzer
            </TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                      <p className="text-2xl font-bold">+12.5%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Users className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                      <p className="text-2xl font-bold">8</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Projects</p>
                      <p className="text-2xl font-bold">24</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Messages</p>
                      <p className="text-2xl font-bold">12</p>
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
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-sm">Profile updated successfully</p>
                      <span className="text-xs text-muted-foreground ml-auto">2 hours ago</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-sm">New project consultation scheduled</p>
                      <span className="text-xs text-muted-foreground ml-auto">1 day ago</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-sm">Account created</p>
                      <span className="text-xs text-muted-foreground ml-auto">3 days ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Consultation
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    View Projects
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analyzer" className="space-y-6">
            {selectedReportId ? (
              <ReportViewer 
                reportId={selectedReportId} 
                onBack={() => setSelectedReportId(null)} 
              />
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="relative mb-6">
                    <img 
                      src="/src/assets/spreadsheet-analyzer-demo.jpg" 
                      alt="AI Spreadsheet Analyzer Dashboard" 
                      className="mx-auto rounded-lg shadow-lg w-full max-w-2xl h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-primary/5 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">AI Spreadsheet Analyzer</h2>
                  <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                    Upload your CSV or Excel files and get AI-powered insights with automatic data analysis, intelligent chart generation, and comprehensive business intelligence reports.
                  </p>
                </div>

                <div className="space-y-6">
                  <QuestionInput 
                    onQuestionSubmit={(question) => {
                      setAnalysisQuestion(question);
                      setShowUploader(true);
                    }}
                    isProcessing={false}
                  />
                  
                  {showUploader && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Upload Your Spreadsheet</h3>
                        <SpreadsheetUploader 
                          question={analysisQuestion}
                          onUploadSuccess={(reportId) => {
                            setRefreshTrigger(prev => prev + 1);
                            setShowUploader(false);
                            setAnalysisQuestion(undefined);
                          }} 
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Try Demo Data</h3>
                        <DemoDataUploader 
                          question={analysisQuestion}
                          onUploadSuccess={(reportId) => {
                            setRefreshTrigger(prev => prev + 1);
                            setShowUploader(false);
                            setAnalysisQuestion(undefined);
                          }} 
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Your Reports</h3>
                    <ReportList 
                      onViewReport={setSelectedReportId}
                      refreshTrigger={refreshTrigger}
                    />
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
                      value={profile?.business_name || ''}
                      onChange={(e) => setProfile(prev => prev ? {...prev, business_name: e.target.value} : null)}
                      placeholder="Your business name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={profile?.contact_person || ''}
                      onChange={(e) => setProfile(prev => prev ? {...prev, contact_person: e.target.value} : null)}
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile?.phone || ''}
                      onChange={(e) => setProfile(prev => prev ? {...prev, phone: e.target.value} : null)}
                      placeholder="Your phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={profile?.industry || ''}
                      onChange={(e) => setProfile(prev => prev ? {...prev, industry: e.target.value} : null)}
                      placeholder="Your industry"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_size">Company Size</Label>
                  <Input
                    id="company_size"
                    value={profile?.company_size || ''}
                    onChange={(e) => setProfile(prev => prev ? {...prev, company_size: e.target.value} : null)}
                    placeholder="e.g., 1-10 employees"
                  />
                </div>

                <Button 
                  onClick={() => profile && updateProfile(profile)} 
                  disabled={isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className={`w-12 h-12 ${getPlanColor(subscription?.plan || 'free')} rounded-lg flex items-center justify-center text-white`}>
                    {getPlanIcon(subscription?.plan || 'free')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold capitalize">{subscription?.plan || 'Free'} Plan</h3>
                    <p className="text-muted-foreground">
                      {subscription?.subscription_status === 'active' ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="border-2 border-primary">
                    <CardContent className="p-4 text-center">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <h4 className="font-semibold">Basic Plan</h4>
                      <p className="text-2xl font-bold">$29/mo</p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>✓ 5 Projects</li>
                        <li>✓ Email Support</li>
                        <li>✓ Basic Analytics</li>
                      </ul>
                      <Button className="w-full mt-3" variant="outline">Upgrade</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <Crown className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <h4 className="font-semibold">Premium Plan</h4>
                      <p className="text-2xl font-bold">$99/mo</p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>✓ Unlimited Projects</li>
                        <li>✓ Priority Support</li>
                        <li>✓ Advanced Analytics</li>
                      </ul>
                      <Button className="w-full mt-3">Upgrade</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                      <h4 className="font-semibold">Enterprise</h4>
                      <p className="text-2xl font-bold">Custom</p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>✓ Everything Included</li>
                        <li>✓ Dedicated Support</li>
                        <li>✓ Custom Integration</li>
                      </ul>
                      <Button className="w-full mt-3" variant="secondary">Contact Us</Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update your email.
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-destructive mb-2">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;