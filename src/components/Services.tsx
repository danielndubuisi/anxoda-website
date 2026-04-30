import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Services = () => {
  const { user } = useAuth();
  const profitProHref = user
    ? "/dashboard?tool=cvp-analyzer"
    : "/auth?redirect=cvp-analyzer";
  const spreadsheetHref = user
    ? "/dashboard?tool=spreadsheet-analyzer"
    : "/auth?redirect=spreadsheet-analyzer";

  const profitProBullets = [
    "Break-even calculator with instant chart",
    "Target profit volume — sales needed to hit your goal",
    "What-if pricing & cost sandbox",
    "AI profit coach chat",
    "Naira-native, mobile-friendly",
  ];

  const spreadsheetBullets = [
    "Upload Excel or CSV files",
    "Live Google Sheets sync",
    "AI-generated plain-English insights",
    "Shareable PDF reports for your team, clients, or business records",
  ];

  return (
    <section
      id="services"
      className="py-12 sm:py-16 lg:py-20 bg-background"
      aria-label="Anxoda products - ProfitPro and Auto Spreadsheet Summarizer">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 animate-fade-in">
          <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium mb-4">
            Our Products
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Two tools. One clear path to
            <span className="text-primary"> profitability.</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            Start with ProfitPro to plan your profit. Use A.S.S to make sense of
            the spreadsheets you already have.
          </p>
        </div>

        {/* Products grid: ProfitPro hero + A.S.S secondary */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {/* ProfitPro - featured (spans 2 cols on lg) */}
          <Card className="lg:col-span-2 group hover:shadow-elegant transition-all duration-300 animate-slide-up overflow-hidden relative border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="relative pb-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
                </div>
                <Badge className="bg-primary text-primary-foreground">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Recommended
                </Badge>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold mt-4">
                ProfitPro
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-muted-foreground">
                The fastest way to know if your business is truly profitable.
                Find your break-even point, model what-if scenarios, and chat
                with an AI profit coach — all in plain English.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative pt-0 space-y-5">
              <ul className="grid sm:grid-cols-2 gap-2 sm:gap-3">
                {profitProBullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start space-x-2 text-sm sm:text-base text-foreground">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link to={profitProHref}>
                <Button variant="hero" size="lg" className="group w-full sm:w-auto">
                  Start ProfitPro Free
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* A.S.S - secondary */}
          <Card className="group hover:shadow-elegant transition-all duration-300 animate-slide-up overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent pointer-events-none" />
            <CardHeader className="relative pb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold mt-4">
                A.S.S — Auto Spreadsheet Summarizer
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-muted-foreground">
                Upload spreadsheets or connect a live Google Sheet to get
                plain-English business insights and shareable reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative pt-0 space-y-4">
              <ul className="space-y-2">
                {spreadsheetBullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start space-x-2 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link to={spreadsheetHref}>
                <Button variant="professional" size="lg" className="group w-full">
                  Analyze a Spreadsheet
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="text-center bg-gradient-subtle rounded-xl sm:rounded-2xl p-8 sm:p-12 animate-fade-in">
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Ready to know your real profit?
          </h3>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            Start with ProfitPro — free, in minutes, in plain English.
          </p>
          <Link to={profitProHref}>
            <Button variant="hero" size="lg" className="group w-full sm:w-auto">
              Start ProfitPro Free
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Services;
