import React, { useState } from 'react';
import { MessageSquare, Sparkles, FileText, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QuestionInputProps {
  onQuestionSubmit: (question?: string) => void;
  isProcessing: boolean;
}

const SUGGESTED_QUESTIONS = [
  {
    category: "Business Insights",
    icon: TrendingUp,
    questions: [
      "What are the key trends in this data?",
      "Which metrics show the best performance?",
      "What patterns can help improve business decisions?"
    ]
  },
  {
    category: "Customer Analysis",
    icon: Users,
    questions: [
      "What insights about customer behavior can you find?",
      "Which customer segments are most valuable?",
      "What demographic patterns emerge from this data?"
    ]
  },
  {
    category: "Financial Analysis",
    icon: DollarSign,
    questions: [
      "What financial insights and recommendations can you provide?",
      "Which revenue streams are performing best?",
      "What cost optimization opportunities exist?"
    ]
  },
  {
    category: "Data Quality",
    icon: FileText,
    questions: [
      "What data quality issues should I be aware of?",
      "Are there any outliers or anomalies in the data?",
      "What data completeness insights can you provide?"
    ]
  }
];

export const QuestionInput: React.FC<QuestionInputProps> = ({ onQuestionSubmit, isProcessing }) => {
  const [question, setQuestion] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = () => {
    onQuestionSubmit(question.trim() || undefined);
  };

  const handleSuggestionClick = (suggestedQuestion: string) => {
    setQuestion(suggestedQuestion);
    setShowSuggestions(false);
  };

  const handleQuickAnalyze = () => {
    onQuestionSubmit(undefined);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <span>Analysis Question (Optional)</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ask a specific question about your data to get targeted insights, or leave blank for general analysis.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Textarea
            placeholder="e.g., What are the sales trends by region? Which customers generate the most revenue?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[80px] resize-none"
            disabled={isProcessing}
          />
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleSubmit} 
              disabled={isProcessing}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {question.trim() ? 'Analyze with Question' : 'Smart Analysis'}
            </Button>
            
            {!showSuggestions && (
              <Button 
                variant="outline" 
                onClick={() => setShowSuggestions(true)}
                disabled={isProcessing}
              >
                View Suggestions
              </Button>
            )}
          </div>
        </div>

        {showSuggestions && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Suggested Questions</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSuggestions(false)}
              >
                Hide
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((category) => {
                const IconComponent = category.icon;
                return (
                  <div key={category.category} className="space-y-2">
                    <Badge variant="secondary" className="text-xs">
                      <IconComponent className="h-3 w-3 mr-1" />
                      {category.category}
                    </Badge>
                    <div className="space-y-1">
                      {category.questions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(q)}
                          className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors block w-full p-2 rounded hover:bg-muted"
                          disabled={isProcessing}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};