import React, { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DemoDataUploaderProps {
  onUploadSuccess: (reportId: string) => void;
}

export const DemoDataUploader: React.FC<DemoDataUploaderProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const generateDemoData = () => {
    const headers = ['Date', 'Product', 'Category', 'Sales', 'Quantity', 'Region', 'Salesperson'];
    const products = ['Widget A', 'Widget B', 'Gadget X', 'Tool Pro', 'Device Plus'];
    const categories = ['Electronics', 'Tools', 'Gadgets', 'Software', 'Hardware'];
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const salespeople = ['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'];
    
    const rows = [headers];
    
    for (let i = 0; i < 100; i++) {
      const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const product = products[Math.floor(Math.random() * products.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const sales = Math.floor(Math.random() * 10000) + 100;
      const quantity = Math.floor(Math.random() * 50) + 1;
      const region = regions[Math.floor(Math.random() * regions.length)];
      const salesperson = salespeople[Math.floor(Math.random() * salespeople.length)];
      
      rows.push([
        date.toISOString().split('T')[0],
        product,
        category,
        sales.toString(),
        quantity.toString(),
        region,
        salesperson
      ]);
    }
    
    return rows.map(row => row.join(',')).join('\n');
  };

  const uploadDemoData = async () => {
    setUploading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const csvContent = generateDemoData();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'demo_sales_data.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', 'demo_sales_data.csv');

      const response = await fetch(`https://pjevyfyvrgvjgspxfikd.supabase.co/functions/v1/process-spreadsheet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      toast({
        title: "Demo Data Uploaded",
        description: "Your demo sales data has been uploaded and is being processed.",
      });

      onUploadSuccess(result.reportId);
    } catch (error) {
      console.error('Demo upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload demo data",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
      <CardHeader className="text-center">
        <CardTitle className="text-lg flex items-center justify-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Try Demo Data</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload sample sales data to see the AI analyzer in action with 100 rows of realistic sales data including products, categories, sales figures, and regional information.
        </p>
        
        <Button 
          onClick={uploadDemoData}
          disabled={uploading}
          className="w-full"
          variant="outline"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              Processing Demo Data...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Demo Sales Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};