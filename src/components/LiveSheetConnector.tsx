import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Link2, 
  Sheet, 
  FileSpreadsheet, 
  Calendar, 
  Mail,
  Loader2,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Pause,
  Play,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SheetType = 'google_sheets' | 'excel_online';
type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

interface LiveSheetConnection {
  id: string;
  sheet_url: string;
  sheet_type: SheetType;
  sheet_name: string;
  schedule_frequency: ScheduleFrequency;
  next_run_at: string;
  last_run_at: string | null;
  is_active: boolean;
  error_message: string | null;
  created_at: string;
}

interface LiveSheetConnectorProps {
  onConnectionComplete?: () => void;
  onViewReport?: (reportId: string) => void;
}

type AnalysisProgress = 'connecting' | 'analyzing' | 'complete' | 'error';

export const LiveSheetConnector: React.FC<LiveSheetConnectorProps> = ({ 
  onConnectionComplete,
  onViewReport 
}) => {
  const { user } = useAuth();
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>('daily');
  const [isLoading, setIsLoading] = useState(false);
  const [connections, setConnections] = useState<LiveSheetConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>('connecting');
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('live_sheet_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections((data as unknown as LiveSheetConnection[]) || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const detectSheetType = (url: string): SheetType | null => {
    if (url.includes('docs.google.com/spreadsheets') || url.includes('sheets.google.com')) {
      return 'google_sheets';
    }
    if (url.includes('onedrive.live.com') || url.includes('sharepoint.com') || url.includes('1drv.ms')) {
      return 'excel_online';
    }
    return null;
  };

  const calculateNextRun = (frequency: ScheduleFrequency): Date => {
    const now = new Date();
    const next = new Date(now);
    
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }
    
    // Set to 6 AM UTC for consistency
    next.setUTCHours(6, 0, 0, 0);
    return next;
  };

  const handleConnect = async () => {
    if (!user) {
      toast.error('Please log in to connect sheets');
      return;
    }

    if (!sheetUrl.trim()) {
      toast.error('Please enter a sheet URL');
      return;
    }

    if (!sheetName.trim()) {
      toast.error('Please enter a name for this connection');
      return;
    }

    const sheetType = detectSheetType(sheetUrl);
    if (!sheetType) {
      toast.error('Invalid URL. Please paste a Google Sheets or Excel Online URL');
      return;
    }

    setIsLoading(true);
    setShowProgressModal(true);
    setAnalysisProgress('connecting');

    try {
      const nextRunAt = calculateNextRun(scheduleFrequency);

      const { data, error } = await supabase
        .from('live_sheet_connections')
        .insert({
          user_id: user.id,
          sheet_url: sheetUrl.trim(),
          sheet_type: sheetType,
          sheet_name: sheetName.trim(),
          schedule_frequency: scheduleFrequency,
          next_run_at: nextRunAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setSheetUrl('');
      setSheetName('');
      setScheduleFrequency('daily');
      fetchConnections();
      
      // Trigger immediate first analysis with progress tracking
      await triggerAnalysisWithProgress(data.id);
      
      onConnectionComplete?.();
    } catch (error: any) {
      console.error('Error connecting sheet:', error);
      setAnalysisProgress('error');
      toast.error('Failed to connect sheet', { description: error.message });
      setTimeout(() => setShowProgressModal(false), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAnalysisWithProgress = async (connectionId: string) => {
    setAnalysisProgress('analyzing');
    
    try {
      const { data, error } = await supabase.functions.invoke('process-live-sheet', {
        body: { connectionId }
      });

      if (error) {
        console.error('Error triggering analysis:', error);
        setAnalysisProgress('error');
        toast.error('Analysis failed', { description: error.message });
        setTimeout(() => setShowProgressModal(false), 2000);
        return;
      }

      const reportId = data?.results?.[0]?.reportId;
      if (reportId) {
        setAnalysisProgress('complete');
        setPendingReportId(reportId);
        
        // Auto-navigate after brief delay to show success
        setTimeout(() => {
          setShowProgressModal(false);
          setAnalysisProgress('connecting');
          setPendingReportId(null);
          fetchConnections();
          onViewReport?.(reportId);
        }, 1500);
      } else {
        // No report ID but no error - still mark complete
        setAnalysisProgress('complete');
        setTimeout(() => {
          setShowProgressModal(false);
          setAnalysisProgress('connecting');
          fetchConnections();
        }, 1500);
        toast.info('Analysis started! You\'ll receive an email when complete.');
      }
    } catch (error: any) {
      console.error('Error triggering analysis:', error);
      setAnalysisProgress('error');
      toast.error('Analysis failed', { description: error.message });
      setTimeout(() => setShowProgressModal(false), 2000);
    }
  };

  const triggerAnalysis = async (connectionId: string) => {
    try {
      const { error } = await supabase.functions.invoke('process-live-sheet', {
        body: { connectionId }
      });

      if (error) {
        console.error('Error triggering analysis:', error);
      } else {
        toast.info('Analysis started! You\'ll receive an email when complete.');
      }
    } catch (error) {
      console.error('Error triggering analysis:', error);
    }
  };

  const handleDelete = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('live_sheet_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast.success('Connection removed');
      fetchConnections();
    } catch (error: any) {
      toast.error('Failed to remove connection', { description: error.message });
    }
  };

  const handleToggleActive = async (connectionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('live_sheet_connections')
        .update({ is_active: !isActive })
        .eq('id', connectionId);

      if (error) throw error;

      toast.success(isActive ? 'Analysis paused' : 'Analysis resumed');
      fetchConnections();
    } catch (error: any) {
      toast.error('Failed to update connection', { description: error.message });
    }
  };

  const handleRunNow = async (connectionId: string) => {
    toast.info('Starting analysis...');
    await triggerAnalysis(connectionId);
    fetchConnections();
  };

  const getSheetIcon = (type: SheetType) => {
    return type === 'google_sheets' ? Sheet : FileSpreadsheet;
  };

  const formatSchedule = (frequency: ScheduleFrequency) => {
    switch (frequency) {
      case 'daily': return 'Every day';
      case 'weekly': return 'Every week';
      case 'monthly': return 'Every month';
    }
  };

  const getProgressContent = () => {
    switch (analysisProgress) {
      case 'connecting':
        return {
          icon: <Loader2 className="w-12 h-12 text-primary animate-spin" />,
          title: 'Connecting your sheet...',
          description: 'Setting up your live data connection'
        };
      case 'analyzing':
        return {
          icon: <Sparkles className="w-12 h-12 text-primary animate-pulse" />,
          title: 'Analyzing your data...',
          description: 'Our AI is processing your spreadsheet and generating insights'
        };
      case 'complete':
        return {
          icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
          title: 'Analysis Complete!',
          description: 'Redirecting you to your report...'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-12 h-12 text-destructive" />,
          title: 'Analysis Failed',
          description: 'Something went wrong. Please try again.'
        };
    }
  };

  const progressContent = getProgressContent();

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Progress Modal */}
        <Dialog open={showProgressModal} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                {progressContent.icon}
                {analysisProgress === 'analyzing' && (
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                )}
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">{progressContent.title}</h3>
                <p className="text-muted-foreground text-sm">{progressContent.description}</p>
              </div>
              {analysisProgress === 'analyzing' && (
                <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '70%' }} />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add New Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Connect Live Sheet
            </CardTitle>
            <CardDescription>
              Paste a publicly shared Google Sheets or Excel Online URL. Analysis will run automatically on your schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sheetUrl">Sheet URL</Label>
                <Input
                  id="sheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Make sure the sheet is publicly accessible or shared with "Anyone with the link"
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sheetName">Connection Name</Label>
                <Input
                  id="sheetName"
                  placeholder="e.g., Monthly Sales Report"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Analysis Schedule</Label>
                <Select value={scheduleFrequency} onValueChange={(v) => setScheduleFrequency(v as ScheduleFrequency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Daily (every 24 hours)
                      </span>
                    </SelectItem>
                    <SelectItem value="weekly">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Weekly
                      </span>
                    </SelectItem>
                    <SelectItem value="monthly">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Monthly
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleConnect} 
                  disabled={isLoading || !sheetUrl || !sheetName}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect & Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>You'll receive an email notification each time a new analysis is complete.</span>
            </div>
          </CardContent>
        </Card>

        {/* Existing Connections */}
        {loadingConnections ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : connections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Connections</CardTitle>
              <CardDescription>
                Manage your live sheet connections and scheduled analyses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connections.map((connection) => {
                  const Icon = getSheetIcon(connection.sheet_type);
                  return (
                    <div
                      key={connection.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        connection.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          connection.sheet_type === 'google_sheets' 
                            ? 'bg-green-500/10 text-green-600' 
                            : 'bg-blue-500/10 text-blue-600'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{connection.sheet_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {formatSchedule(connection.schedule_frequency)}
                            </Badge>
                            {connection.error_message ? (
                              <span className="flex items-center gap-1 text-destructive">
                                <AlertCircle className="w-3 h-3" />
                                Error
                              </span>
                            ) : connection.last_run_at ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                Last run: {new Date(connection.last_run_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span>Pending first run</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRunNow(connection.id)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Run analysis now</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(connection.id, connection.is_active)}
                            >
                              {connection.is_active ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{connection.is_active ? 'Pause scheduled analysis' : 'Resume scheduled analysis'}</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete connection</p>
                            </TooltipContent>
                          </Tooltip>
                          <AlertContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Connection?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove "{connection.sheet_name}" and stop all scheduled analyses. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(connection.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};
