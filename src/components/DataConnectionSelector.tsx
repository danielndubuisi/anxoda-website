import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpreadsheetUploader } from '@/components/SpreadsheetUploader';
import { LiveSheetConnector } from '@/components/LiveSheetConnector';
import { 
  Upload, 
  Link2, 
  Database,
  FileSpreadsheet,
  Sheet,
  ArrowLeft
} from 'lucide-react';

export type ConnectionMethod = 'upload' | 'live_sheet' | 'database';

interface ConnectionData {
  type: ConnectionMethod;
  file?: File;
  fileUrl?: string;
  connectionId?: string;
}

interface DataConnectionSelectorProps {
  onConnectionComplete: (connectionData: ConnectionData) => void;
}

export const DataConnectionSelector: React.FC<DataConnectionSelectorProps> = ({
  onConnectionComplete
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ConnectionMethod | null>(null);

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
    onConnectionComplete({
      type: 'live_sheet',
      connectionId: 'live-sheet-connected'
    });
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
