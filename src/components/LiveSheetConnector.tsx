import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  AlertCircle
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
}

export const LiveSheetConnector: React.FC<LiveSheetConnectorProps> = ({ onConnectionComplete }) => {
  const { user } = useAuth();
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>('daily');
  const [isLoading, setIsLoading] = useState(false);
  const [connections, setConnections] = useState<LiveSheetConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);

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

      const frequencyText = scheduleFrequency === 'daily' ? 'daily' : scheduleFrequency === 'weekly' ? 'weekly' : 'monthly';
      toast.success('Connected! Running first analysis now...', {
        description: `Subsequent analyses will run ${frequencyText} starting ${nextRunAt.toLocaleDateString()}`
      });

      setSheetUrl('');
      setSheetName('');
      setScheduleFrequency('daily');
      fetchConnections();
      
      // Trigger immediate first analysis
      triggerAnalysis(data.id);
      
      onConnectionComplete?.();
    } catch (error: any) {
      console.error('Error connecting sheet:', error);
      toast.error('Failed to connect sheet', { description: error.message });
    } finally {
      setIsLoading(false);
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
        toast.info('Initial analysis started! You\'ll receive an email when complete.');
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

  return (
    <div className="space-y-6">
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
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRunNow(connection.id)}
                        title="Run analysis now"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(connection.id, connection.is_active)}
                        title={connection.is_active ? 'Pause' : 'Resume'}
                      >
                        {connection.is_active ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(connection.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
