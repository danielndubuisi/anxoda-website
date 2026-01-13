import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataConnectionSelector } from '@/components/DataConnectionSelector';
import { QuestionInput } from '@/components/QuestionInput';
import { ReportViewer } from '@/components/ReportViewer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  MessageSquare, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  FileSpreadsheet,
  Sparkles,
  FileText
} from 'lucide-react';

interface AnalyzerWorkflowProps {
  onReportGenerated?: () => void;
  onViewReports?: () => void;
}

type WorkflowStep = 'upload' | 'question' | 'processing' | 'results';

export const AnalyzerWorkflow: React.FC<AnalyzerWorkflowProps> = ({ onReportGenerated, onViewReports }) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisQuestion, setAnalysisQuestion] = useState<string>('');
  const { toast } = useToast();

  const steps = [
    {
      id: 'upload',
      title: 'Connect Data',
      description: 'Connect your data source',
      icon: Upload,
      completed: !!uploadedFile
    },
    {
      id: 'question',
      title: 'Analysis Question',
      description: 'Define your analysis focus',
      icon: MessageSquare,
      completed: currentStep === 'processing' || currentStep === 'results'
    },
    {
      id: 'processing',
      title: 'AI Analysis',
      description: 'Processing your data',
      icon: Sparkles,
      completed: currentStep === 'results'
    },
    {
      id: 'results',
      title: 'View Report',
      description: 'Explore insights & recommendations',
      icon: BarChart3,
      completed: currentStep === 'results'
    }
  ];

  const handleConnectionComplete = (connectionData: any) => {
    // For now, we only handle upload type
    if (connectionData.type === 'upload' && connectionData.file && connectionData.fileUrl) {
      setUploadedFile(connectionData.file);
      setUploadedFileUrl(connectionData.fileUrl);
      setCurrentStep('question');
    }
  };

  const handleViewReport = (reportIdToView: string) => {
    // Set the report ID and jump to results view
    setReportId(reportIdToView);
    setCurrentStep('results');
  };

  const handleQuestionSubmitted = async (question?: string) => {
    if (!uploadedFile) return;
    
    setCurrentStep('processing');
    setIsProcessing(true);
    setAnalysisQuestion(question || '');
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('filename', uploadedFile.name);
      if (question) {
        formData.append('question', question);
      }

      // Call the process-spreadsheet edge function
      const { data, error } = await supabase.functions.invoke('process-spreadsheet', {
        body: formData,
      });

      if (error) {
        console.error('Processing error:', error);
        throw new Error(error.message || 'Failed to process spreadsheet');
      }

      if (data?.reportId) {
        setReportId(data.reportId);
        
        // Poll for report completion instead of immediately showing results
        await pollForReportCompletion(data.reportId);
      } else {
        throw new Error('No report ID returned from processing');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setIsProcessing(false);
      setCurrentStep('question');
      
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An error occurred during analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pollForReportCompletion = async (reportId: string) => {
    const maxAttempts = 60; // 3 minutes with 3-second intervals
    let attempts = 0;

    const checkStatus = async (): Promise<void> => {
      try {
        const { data: report, error } = await supabase
          .from('spreadsheet_reports')
          .select('processing_status')
          .eq('id', reportId)
          .single();

        if (error) {
          throw new Error('Failed to check report status');
        }

        attempts++;

        if (report.processing_status === 'completed') {
          setCurrentStep('results');
          setIsProcessing(false);
          onReportGenerated?.();
          
          toast({
            title: "Analysis Complete",
            description: "Your spreadsheet has been analyzed successfully.",
          });
          return;
        } else if (report.processing_status === 'failed') {
          throw new Error('Report processing failed');
        } else if (attempts >= maxAttempts) {
          throw new Error('Processing timeout - please try again');
        }

        // Continue polling
        setTimeout(checkStatus, 3000);
      } catch (error) {
        console.error('Polling error:', error);
        setIsProcessing(false);
        setCurrentStep('question');
        
        toast({
          title: "Analysis Failed",
          description: error instanceof Error ? error.message : "Processing failed. Please try again.",
          variant: "destructive",
        });
      }
    };

    // Start polling
    setTimeout(checkStatus, 2000); // Initial delay
  };

  const resetWorkflow = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setUploadedFileUrl(null);
    setReportId(null);
    setIsProcessing(false);
    setAnalysisQuestion('');
  };

  const goToStep = (stepId: WorkflowStep) => {
    // Only allow going backwards or to completed steps
    const stepOrder = ['upload', 'question', 'processing', 'results'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const targetIndex = stepOrder.indexOf(stepId);
    
    if (targetIndex <= currentIndex) {
      setCurrentStep(stepId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            AI Spreadsheet Analyzer Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`flex items-center gap-3 cursor-pointer transition-colors ${
                    step.id === currentStep ? 'text-primary' : 
                    step.completed ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                  onClick={() => goToStep(step.id as WorkflowStep)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step.id === currentStep ? 'border-primary bg-primary/10' :
                    step.completed ? 'border-green-600 bg-green-50' : 'border-muted-foreground/30'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : step.id === currentStep && isProcessing ? (
                      <Clock className="w-5 h-5 animate-spin" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="font-medium text-sm">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 mx-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          <Badge variant={currentStep === 'results' ? 'default' : 'secondary'} className="mb-4">
            Step {steps.findIndex(s => s.id === currentStep) + 1} of {steps.length}
          </Badge>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 'upload' && (
            <div className="space-y-4">
              {/* View Previous Reports Button - At Top */}
              {onViewReports && (
                <div className="pb-4 border-b">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Already have reports?</h4>
                      <p className="text-xs text-muted-foreground">
                        View and compare your previous analysis
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={onViewReports}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Reports
                    </Button>
                  </div>
                </div>
              )}
              
              <DataConnectionSelector 
                onConnectionComplete={handleConnectionComplete} 
                onViewReport={handleViewReport}
              />
            </div>
          )}

          {currentStep === 'question' && uploadedFile && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Define Your Analysis</h3>
                <p className="text-muted-foreground">
                  What specific insights would you like from your data?
                </p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Uploaded: {uploadedFile.name}</span>
                </div>
              </div>

              <QuestionInput 
                onQuestionSubmit={handleQuestionSubmitted}
                isProcessing={isProcessing}
              />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                  Back to Upload
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'processing' && (
            <div className="text-center space-y-6 py-12">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">AI is Analyzing Your Data</h3>
                <p className="text-muted-foreground mb-4">
                  Our AI is performing comprehensive analysis including:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-muted/50 p-3 rounded">
                    <div className="font-medium">Domain Detection</div>
                    <div className="text-muted-foreground">Identifying data context</div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded">
                    <div className="font-medium">Statistical Analysis</div>
                    <div className="text-muted-foreground">Computing insights</div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded">
                    <div className="font-medium">Visualizations</div>
                    <div className="text-muted-foreground">Generating charts</div>
                  </div>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          )}

          {currentStep === 'results' && reportId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Analysis Complete!</h3>
                  <p className="text-muted-foreground">Your comprehensive AI analysis is ready</p>
                </div>
                <Button variant="outline" onClick={resetWorkflow}>
                  Start New Analysis
                </Button>
              </div>
              <ReportViewer reportId={reportId} onBack={() => setCurrentStep('upload')} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};