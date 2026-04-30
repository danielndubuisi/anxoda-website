import { Card, CardContent } from "@/components/ui/card";
import { Utensils, ShoppingBag, Briefcase, LineChart, CheckCircle } from "lucide-react";

const useCases = [
    {
        icon: Utensils,
        title: "Restaurant or food vendor",
        desc: "Know your daily break-even covers and price each meal for profit.",
    },
    {
        icon: ShoppingBag,
        title: "Fashion or retail seller",
        desc: "Find the right markup and quantity to clear stock profitably.",
    },
    {
        icon: Briefcase,
        title: "Service business",
        desc: "Price your hours and packages to cover costs and hit profit goals.",
    },
    {
        icon: LineChart,
        title: "Business consultant",
        desc: "Run profitability diagnostics for your clients in minutes.",
    },
];

const pillars = [
    "Plain-English insights — no finance degree required",
    "Naira-native math, mobile-friendly",
    "Designed for owner-operators, small teams, and consultants",
];

const BuiltForAfrica = () => {
    return (
        <section
            id="built-for-africa"
            className="py-12 sm:py-16 lg:py-20 bg-gradient-subtle"
            aria-label="Built for African SMBs">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
                    {/* Left */}
                    <div className="space-y-5 sm:space-y-6 animate-slide-up">
                        <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium">
                            Built for African SMBs
                        </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                            Made for the businesses
                            <span className="text-primary"> driving Africa forward</span>
                        </h2>
                        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                            Anxoda is designed for small businesses, operators, and
                            consultants who need simple, plain-English business
                            insights — not enterprise dashboards or accountant jargon.
                            We meet you where you are: on your phone, in Naira, with
                            answers you can act on today.
                        </p>
                        <ul className="space-y-3 pt-2">
                            {pillars.map((p) => (
                                <li
                                    key={p}
                                    className="flex items-start space-x-3 text-sm sm:text-base text-foreground">
                                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span>{p}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right - use cases */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 animate-fade-in">
                        {useCases.map((u, i) => (
                            <Card
                                key={u.title}
                                className="hover:shadow-elegant transition-all duration-300 animate-slide-up"
                                style={{ animationDelay: `${i * 100}ms` }}>
                                <CardContent className="p-5 sm:p-6 space-y-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <u.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-foreground text-base">
                                        {u.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {u.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BuiltForAfrica;
