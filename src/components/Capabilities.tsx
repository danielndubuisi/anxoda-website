import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, FileSpreadsheet, FileText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Capabilities = () => {
    const { user } = useAuth();
    const profitProHref = user
        ? "/dashboard?tool=cvp-analyzer"
        : "/auth?redirect=cvp-analyzer";
    const spreadsheetHref = user
        ? "/dashboard?tool=spreadsheet-analyzer"
        : "/auth?redirect=spreadsheet-analyzer";
    const reportsHref = user ? "/dashboard?tab=reports" : "/auth";

    const cards = [
        {
            icon: Target,
            title: "Find your break-even point",
            desc: "Discover the exact sales volume where you stop losing money and start profiting.",
            href: profitProHref,
        },
        {
            icon: TrendingUp,
            title: "Hit your profit goal",
            desc: "Know how many units or sales you need to reach your target profit.",
            href: profitProHref,
        },
        {
            icon: FileSpreadsheet,
            title: "Analyze business spreadsheets",
            desc: "Upload an Excel or CSV file and get plain-English insights in seconds.",
            href: spreadsheetHref,
        },
        {
            icon: FileText,
            title: "Generate business reports",
            desc: "Shareable PDF reports for your team, clients, or business records.",
            href: reportsHref,
        },
        {
            icon: Sparkles,
            title: "AI-powered recommendations",
            desc: "Prescriptive next steps tailored to your numbers and your industry.",
            href: profitProHref,
        },
    ];

    return (
        <section
            id="capabilities"
            className="py-12 sm:py-16 lg:py-20 bg-background"
            aria-label="What Anxoda helps you do">
            <div className="container mx-auto px-4">
                <div className="text-center mb-10 sm:mb-14 animate-fade-in">
                    <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium mb-4">
                        What Anxoda helps you do
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
                        Everything you need to
                        <span className="text-primary"> run a profitable business</span>
                    </h2>
                    <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
                        From break-even math to AI-powered recommendations — clear,
                        practical, and built for the way small businesses really work.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                    {cards.map((c, i) => (
                        <Link key={c.title} to={c.href} className="block group">
                            <Card
                                className="h-full hover:shadow-elegant hover:-translate-y-1 transition-all duration-300 animate-slide-up"
                                style={{ animationDelay: `${i * 80}ms` }}>
                                <CardContent className="p-5 sm:p-6 space-y-3 sm:space-y-4">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <c.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <h3 className="font-semibold text-base sm:text-lg text-foreground leading-tight">
                                        {c.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {c.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Capabilities;
