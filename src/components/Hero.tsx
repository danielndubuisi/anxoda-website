import { Button } from "@/components/ui/button";
import { ArrowRight, FileSpreadsheet, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
    const { user } = useAuth();

    // HashRouter-safe deep links
    const profitProHref = user
        ? "/dashboard?tool=cvp-analyzer"
        : "/auth?redirect=cvp-analyzer";
    const spreadsheetHref = user
        ? "/dashboard?tool=spreadsheet-analyzer"
        : "/auth?redirect=spreadsheet-analyzer";

    return (
        <section
            id="home"
            className="relative min-h-screen bg-gradient-subtle overflow-hidden"
            aria-label="Hero - Know if your business is truly profitable in minutes">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>

            <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-32">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Content */}
                    <div className="space-y-6 sm:space-y-8 animate-fade-in text-center lg:text-left">
                        <div className="space-y-4">
                            <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium">
                                AI Business Intelligence for African SMBs
                            </span>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                                Know if your business is
                                <span className="text-primary block sm:inline">
                                    {" "}truly profitable
                                </span>
                                {" "}— in minutes.
                            </h1>
                            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                Anxoda helps small businesses understand their
                                numbers, find their break-even point, analyze
                                spreadsheets, and make smarter profit decisions
                                using AI.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                            <Link to={profitProHref} className="w-full sm:w-auto">
                                <Button
                                    variant="hero"
                                    size="lg"
                                    className="w-full group">
                                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                    Start ProfitPro Free
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>

                            <Link to={spreadsheetHref} className="w-full sm:w-auto">
                                <Button
                                    variant="professional"
                                    size="lg"
                                    className="w-full group">
                                    <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                    Analyze a Spreadsheet
                                </Button>
                            </Link>
                        </div>

                        {/* Proof points */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 pt-6 sm:pt-8 border-t border-border">
                            <div className="text-center lg:text-left">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">
                                    Minutes
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    To find your break-even point
                                </div>
                            </div>
                            <div className="text-center lg:text-left">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">
                                    Plain English
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    Insights, not jargon
                                </div>
                            </div>
                            <div className="text-center lg:text-left">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">
                                    ₦ Naira-First
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    Built for African businesses
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Video */}
                    <div className="relative animate-slide-up order-first lg:order-last mt-20 sm:mt-0">
                        <div className="relative mx-auto w-full max-w-[90%] md:max-w-[720px] aspect-video rounded-2xl overflow-hidden shadow-elegant">
                            <iframe
                                className="w-full h-full rounded-2xl"
                                src="https://www.youtube.com/embed/i436UAbhMoI?rel=0&modestbranding=1"
                                title="Anxoda - Profit planning and business intelligence for African SMBs"
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                aria-label="Anxoda demo video"></iframe>
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl pointer-events-none"></div>
                        </div>

                        <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-primary text-primary-foreground p-3 sm:p-4 rounded-xl shadow-glow animate-scale-in z-40">
                            <div className="text-xs sm:text-sm font-medium">
                                Profit Insights
                            </div>
                        </div>
                        <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-background border border-border p-3 sm:p-4 rounded-xl shadow-card animate-scale-in z-40">
                            <div className="text-xs sm:text-sm font-medium text-primary">
                                Break-even Ready
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
