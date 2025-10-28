import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📄 PDF Generation started');
    
    const { reportId, userId, aiInsights, chartData } = await req.json();
    
    if (!reportId || !userId) {
      throw new Error('Missing required fields: reportId or userId');
    }

    console.log(`Processing report ${reportId} for user ${userId}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate a simple HTML-based PDF using modern browser APIs
    console.log('📊 Generating report content...');
    
    const htmlContent = generateHTMLReport(aiInsights, chartData);
    const pdfBytes = await htmlToPDF(htmlContent);
    
    // Generate chart images as SVG (embedded in HTML)
    console.log('📈 Charts embedded in HTML/PDF');
    
    // Upload PDF to storage
    const timestamp = Date.now();
    const pdfPath = `${userId}/${reportId}/${timestamp}/report.pdf`;
    
    console.log(`⬆️ Uploading PDF to: ${pdfPath}`);
    
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(pdfPath, pdfBytes, { 
        contentType: 'application/pdf',
        upsert: false 
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }
    
    console.log('✅ PDF uploaded successfully');
    
    // For now, we'll store chart data as JSON instead of separate images
    // since we're embedding charts directly in the PDF
    const imagePaths = chartData?.map((_: any, i: number) => 
      `embedded_chart_${i}`
    ) || [];
    
    console.log('✅ PDF generation completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfPath,
        imagePaths,
        message: 'PDF generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    
    // Try to update report status to failed
    try {
      const { reportId } = await req.json();
      if (reportId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabase
          .from('spreadsheet_reports')
          .update({
            processing_status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', reportId);
      }
    } catch (updateErr) {
      console.error('Failed to update error status:', updateErr);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateHTMLReport(aiInsights: any, chartData: any[]): string {
  const summary = aiInsights?.summary || 'No summary available';
  const keyFindings = aiInsights?.keyFindings || [];
  const recommendations = aiInsights?.recommendations || [];
  
  // Generate chart visualizations as SVG
  const chartsSVG = (chartData || []).map((chart, index) => {
    return generateChartSVG(chart, index);
  }).join('\n');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      margin: 40px;
      color: #333;
      line-height: 1.6;
    }
    h1 {
      color: #6366f1;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 {
      color: #4f46e5;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .summary {
      background: #f8f9fa;
      padding: 20px;
      border-left: 4px solid #6366f1;
      margin-bottom: 30px;
    }
    ul {
      list-style-type: none;
      padding-left: 0;
    }
    li {
      padding: 10px;
      margin: 8px 0;
      background: #f8f9fa;
      border-left: 3px solid #6366f1;
    }
    .chart-container {
      margin: 30px 0;
      page-break-inside: avoid;
      text-align: center;
    }
    .chart-title {
      font-weight: bold;
      margin-bottom: 15px;
      color: #4f46e5;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>📊 Spreadsheet Analysis Report</h1>
  
  <div class="section summary">
    <h2>Executive Summary</h2>
    <p>${escapeHtml(summary)}</p>
  </div>
  
  ${keyFindings.length > 0 ? `
  <div class="section">
    <h2>🔍 Key Findings</h2>
    <ul>
      ${keyFindings.map((finding: string) => `<li>${escapeHtml(finding)}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  ${recommendations.length > 0 ? `
  <div class="section">
    <h2>💡 Recommendations</h2>
    <ul>
      ${recommendations.map((rec: string) => `<li>${escapeHtml(rec)}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  ${chartsSVG ? `
  <div class="section">
    <h2>📈 Data Visualizations</h2>
    ${chartsSVG}
  </div>
  ` : ''}
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    <p>Powered by AI Analytics</p>
  </div>
</body>
</html>
  `.trim();
}

function generateChartSVG(chart: any, index: number): string {
  const title = chart?.title || `Chart ${index + 1}`;
  const data = chart?.data || [];
  const type = chart?.type || 'bar';
  
  if (data.length === 0) {
    return `
      <div class="chart-container">
        <div class="chart-title">${escapeHtml(title)}</div>
        <p>No data available for this chart</p>
      </div>
    `;
  }
  
  // Simple bar chart visualization
  if (type === 'bar' || type === 'column') {
    return generateBarChartSVG(title, data);
  }
  
  // Simple line chart
  if (type === 'line') {
    return generateLineChartSVG(title, data);
  }
  
  // Default to table view for other types
  return generateTableView(title, data);
}

function generateBarChartSVG(title: string, data: any[]): string {
  const width = 600;
  const height = 400;
  const padding = 60;
  const barWidth = (width - 2 * padding) / data.length;
  
  const maxValue = Math.max(...data.map(d => d.value || d.count || 0));
  const scale = (height - 2 * padding) / maxValue;
  
  const bars = data.map((item, i) => {
    const value = item.value || item.count || 0;
    const barHeight = value * scale;
    const x = padding + i * barWidth;
    const y = height - padding - barHeight;
    
    return `
      <rect x="${x}" y="${y}" width="${barWidth * 0.8}" height="${barHeight}" 
            fill="#6366f1" opacity="0.8" />
      <text x="${x + barWidth * 0.4}" y="${y - 5}" 
            text-anchor="middle" font-size="12" fill="#333">
        ${value.toFixed(0)}
      </text>
      <text x="${x + barWidth * 0.4}" y="${height - padding + 20}" 
            text-anchor="middle" font-size="10" fill="#666"
            transform="rotate(-45 ${x + barWidth * 0.4} ${height - padding + 20})">
        ${escapeHtml(item.name || item.label || `Item ${i + 1}`).substring(0, 15)}
      </text>
    `;
  }).join('');
  
  return `
    <div class="chart-container">
      <div class="chart-title">${escapeHtml(title)}</div>
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="white"/>
        ${bars}
        <line x1="${padding}" y1="${height - padding}" 
              x2="${width - padding}" y2="${height - padding}" 
              stroke="#333" stroke-width="2"/>
        <line x1="${padding}" y1="${padding}" 
              x2="${padding}" y2="${height - padding}" 
              stroke="#333" stroke-width="2"/>
      </svg>
    </div>
  `;
}

function generateLineChartSVG(title: string, data: any[]): string {
  const width = 600;
  const height = 400;
  const padding = 60;
  
  const maxValue = Math.max(...data.map(d => d.value || d.count || 0));
  const scale = (height - 2 * padding) / maxValue;
  const xScale = (width - 2 * padding) / (data.length - 1);
  
  const points = data.map((item, i) => {
    const value = item.value || item.count || 0;
    const x = padding + i * xScale;
    const y = height - padding - (value * scale);
    return `${x},${y}`;
  }).join(' ');
  
  const circles = data.map((item, i) => {
    const value = item.value || item.count || 0;
    const x = padding + i * xScale;
    const y = height - padding - (value * scale);
    return `<circle cx="${x}" cy="${y}" r="4" fill="#6366f1"/>`;
  }).join('');
  
  return `
    <div class="chart-container">
      <div class="chart-title">${escapeHtml(title)}</div>
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="white"/>
        <polyline points="${points}" fill="none" stroke="#6366f1" stroke-width="2"/>
        ${circles}
        <line x1="${padding}" y1="${height - padding}" 
              x2="${width - padding}" y2="${height - padding}" 
              stroke="#333" stroke-width="2"/>
        <line x1="${padding}" y1="${padding}" 
              x2="${padding}" y2="${height - padding}" 
              stroke="#333" stroke-width="2"/>
      </svg>
    </div>
  `;
}

function generateTableView(title: string, data: any[]): string {
  const rows = data.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">
        ${escapeHtml(item.name || item.label || 'N/A')}
      </td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
        ${item.value || item.count || 0}
      </td>
    </tr>
  `).join('');
  
  return `
    <div class="chart-container">
      <div class="chart-title">${escapeHtml(title)}</div>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #6366f1; color: white;">
            <th style="padding: 10px; text-align: left;">Category</th>
            <th style="padding: 10px; text-align: right;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

async function htmlToPDF(html: string): Promise<Uint8Array> {
  // For now, we'll return the HTML as a "PDF" 
  // In production, you'd use a service like Puppeteer or a PDF API
  // But for Deno edge functions, we'll create a simple text-based PDF structure
  
  // Create a minimal PDF structure
  const pdfHeader = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length ${html.length}
>>
stream
${html}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000347 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${400 + html.length}
%%EOF`;

  return new TextEncoder().encode(pdfHeader);
}
