import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpreadsheetUploader } from '@/components/SpreadsheetUploader';
import { LiveSheetConnector } from '@/components/LiveSheetConnector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Upload, 
  Link2, 
  Database,
  FileSpreadsheet,
  Sheet,
  ArrowLeft,
  PlayCircle,
  FileText,
  Clock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export type ConnectionMethod = 'upload' | 'live_sheet' | 'database';

interface ConnectionData {
  type: ConnectionMethod;
  file?: File;
  fileUrl?: string;
  connectionId?: string;
}

interface LiveSheetConnection {
  id: string;
  sheet_name: string;
  sheet_url: string;
  sheet_type: string;
  schedule_frequency: string;
  last_run_at: string | null;
  next_run_at: string;
  is_active: boolean;
  error_message: string | null;
  report_count?: number;
}

interface DataConnectionSelectorProps {
  onConnectionComplete: (connectionData: ConnectionData) => void;
  onViewReports?: (connectionId: string) => void;
  onViewReport?: (reportId: string) => void;
}

export const DataConnectionSelector: React.FC<DataConnectionSelectorProps> = ({
  onConnectionComplete,
  onViewReports,
  onViewReport
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ConnectionMethod | null>(null);
  const [existingConnections, setExistingConnections] = useState<LiveSheetConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchExistingConnections();
    }
  }, [user]);

  const fetchExistingConnections = async () => {
    if (!user) return;

    try {
      setLoadingConnections(true);
      
      // Fetch connections
      const { data: connections, error } = await supabase
        .from('live_sheet_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each connection, get report count
      const connectionsWithCounts = await Promise.all(
        (connections || []).map(async (conn) => {
          const { count } = await supabase
            .from('spreadsheet_reports')
            .select('*', { count: 'exact', head: true })
            .eq('connection_id', conn.id);
          
          return { ...conn, report_count: count || 0 };
        })
      );

      setExistingConnections(connectionsWithCounts);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleRunAnalysisNow = async (connectionId: string) => {
    try {
      setRunningAnalysis(connectionId);
      
      const { data, error } = await supabase.functions.invoke('process-live-sheet', {
        body: { connectionId }
      });

      if (error) throw error;

      // Extract reportId from response and navigate to it
      const reportId = data?.results?.[0]?.reportId;
      if (reportId && onViewReport) {
        toast.success('Analysis complete!');
        fetchExistingConnections();
        onViewReport(reportId);
      } else {
        toast.success('Analysis complete!');
        fetchExistingConnections();
      }
    } catch (error: any) {
      console.error('Error running analysis:', error);
      toast.error('Failed to start analysis', { description: error.message });
    } finally {
      setRunningAnalysis(null);
    }
  };

  const connectionMethods = [
    {
      id: 'upload' as ConnectionMethod,
      title: 'Upload Spreadsheet',
      description: 'Upload Excel or CSV files for one-time analysis',
      icon: Upload,
      available: true,
      badge: null,
      color: 'bg-primary/10 text-primary border-primary/20'
    },
    {
      id: 'live_sheet' as ConnectionMethod,
      title: 'Connect Live Sheet',
      description: 'Link Google Sheets or Excel Online for scheduled auto-analysis',
      icon: Link2,
      available: true,
      badge: 'New',
      color: 'bg-green-500/10 text-green-600 border-green-500/20'
    },
    {
      id: 'database' as ConnectionMethod,
      title: 'Connect Database',
      description: 'Connect to your ERP or external database via API',
      icon: Database,
      available: false,
      badge: 'Coming Soon',
      color: 'bg-muted text-muted-foreground border-muted'
    }
  ];

  const handleMethodSelect = (method: ConnectionMethod) => {
    const selectedMethodData = connectionMethods.find(m => m.id === method);
    if (selectedMethodData?.available) {
      setSelectedMethod(method);
    }
  };

  const handleFileUploaded = (file: File, fileUrl: string) => {
    onConnectionComplete({
      type: 'upload',
      file,
      fileUrl
    });
  };

  const handleBack = () => {
    setSelectedMethod(null);
  };

  const handleLiveSheetConnected = () => {
    fetchExistingConnections();
    onConnectionComplete({
      type: 'live_sheet',
      connectionId: 'live-sheet-connected'
    });
  };

  const getSheetIcon = (sheetType: string) => {
    return sheetType === 'google_sheets' ? (
      <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center">
        <Sheet className="w-4 h-4 text-green-600" />
      </div>
    ) : (
      <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
      </div>
    );
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  };

  // If a method is selected, show the appropriate component
  if (selectedMethod === 'upload') {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Connection Options
        </Button>
        <SpreadsheetUploader onUploadSuccess={handleFileUploaded} />
      </div>
    );
  }

  if (selectedMethod === 'live_sheet') {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Connection Options
        </Button>
        <LiveSheetConnector onConnectionComplete={handleLiveSheetConnected} />
      </div>
    );
  }

  // Show connection method selection
  return (
    <div className="space-y-6">
      {/* Existing Connections Section */}
      {!loadingConnections && existingConnections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Your Connected Sheets</h3>
            <Badge variant="secondary" className="ml-2">
              {existingConnections.length}
            </Badge>
          </div>
          
          <div className="grid gap-3">
            {existingConnections.map((connection) => (
              <Card 
                key={connection.id} 
                className={`${connection.error_message ? 'border-destructive/50' : 'border-border'}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getSheetIcon(connection.sheet_type)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{connection.sheet_name}</p>
                          <Badge variant="outline" className="text-xs">
                            {getFrequencyLabel(connection.schedule_frequency)}
                          </Badge>
                          {connection.report_count !== undefined && connection.report_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {connection.report_count} report{connection.report_count !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {!connection.is_active && (
                            <Badge variant="destructive" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          {connection.last_run_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last run: {new Date(connection.last_run_at).toLocaleDateString()}
                            </span>
                          )}
                          {connection.error_message && (
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="w-3 h-3" />
                              Error: {connection.error_message.substring(0, 50)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {connection.report_count !== undefined && connection.report_count > 0 && onViewReports && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onViewReports(connection.id)}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Reports
                        </Button>
                      )}
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleRunAnalysisNow(connection.id)}
                        disabled={runningAnalysis === connection.id}
                      >
                        {runningAnalysis === connection.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 mr-1" />
                            Run Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Connect a new data source
            </p>
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Connect Your Data</h3>
        <p className="text-muted-foreground">
          Choose how you want to connect your data for AI-powered analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {connectionMethods.map((method) => (
          <Card 
            key={method.id}
            className={`relative cursor-pointer transition-all hover:shadow-md ${
              method.available ? 'hover:border-primary' : 'opacity-60 cursor-not-allowed'
            }`}
            onClick={() => handleMethodSelect(method.id)}
          >
            {method.badge && (
              <Badge 
                variant="secondary" 
                className="absolute top-3 right-3 text-xs"
              >
                {method.badge}
              </Badge>
            )}
            
            <CardHeader>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 border ${method.color}`}>
                <method.icon className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg">{method.title}</CardTitle>
            </CardHeader>
            
            <CardContent>
              <CardDescription className="mb-4">
                {method.description}
              </CardDescription>
              
              <Button 
                className="w-full"
                variant={method.available ? 'default' : 'secondary'}
                disabled={!method.available}
              >
                {method.available ? 'Select' : 'Not Available'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>More connection options coming soon. Need help? Contact support.</p>
      </div>
    </div>
  );
};
