import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowRight,
    ExternalLink,
    TrendingUp,
    Users,
    DollarSign,
    Clock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const caseStudies = [
    {
        title: "E-commerce Platform Transformation",
        client: "Fashion Retail Company",
        industry: "Retail",
        challenge:
            "Outdated e-commerce platform with poor user experience and declining sales",
        solution:
            "Complete platform rebuild with modern UI/UX, mobile optimization, and AI-powered recommendations",
        results: [
            { metric: "Sales Increase", value: "150%", icon: TrendingUp },
            { metric: "User Engagement", value: "85%", icon: Users },
            { metric: "Revenue Growth", value: "$2.5M", icon: DollarSign },
            { metric: "Load Time", value: "3x Faster", icon: Clock },
        ],
        image: "/lovable-uploads/case-study-1.jpg",
        technologies: ["React", "Node.js", "MongoDB", "AWS", "AI/ML"],
    },
    {
        title: "Data Analytics Dashboard",
        client: "Manufacturing Company",
        industry: "Manufacturing",
        challenge:
            "Lack of real-time insights into production efficiency and quality metrics",
        solution:
            "Custom analytics dashboard with real-time data visualization and predictive maintenance alerts",
        results: [
            { metric: "Efficiency Gain", value: "40%", icon: TrendingUp },
            { metric: "Cost Reduction", value: "30%", icon: DollarSign },
            { metric: "Downtime Reduction", value: "60%", icon: Clock },
            { metric: "Quality Improvement", value: "95%", icon: Users },
        ],
        image: "/lovable-uploads/case-study-2.jpg",
        technologies: [
            "Python",
            "Power BI",
            "Azure",
            "IoT",
            "Machine Learning",
        ],
    },
    {
        title: "CRM System Implementation",
        client: "Service-Based SME",
        industry: "Professional Services",
        challenge:
            "Manual customer management processes leading to missed opportunities",
        solution:
            "Custom CRM system with automated workflows, lead scoring, and customer communication tools",
        results: [
            { metric: "Lead Conversion", value: "200%", icon: TrendingUp },
            { metric: "Customer Retention", value: "90%", icon: Users },
            { metric: "Revenue Growth", value: "$1.8M", icon: DollarSign },
            { metric: "Process Efficiency", value: "70%", icon: Clock },
        ],
        image: "/lovable-uploads/case-study-3.jpg",
        technologies: [
            "React",
            "Laravel",
            "MySQL",
            "API Integration",
            "Automation",
        ],
    },
];

const CaseStudies = () => {
    return (
        <div className="min-h-screen">
            <Navbar />

            {/* Hero Section */}
            <section className="bg-gradient-subtle py-20">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                            Success Stories
                        </span>
                        <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                            Real Results for
                            <span className="text-primary">
                                {" "}
                                Real Businesses
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Discover how we've helped businesses like yours
                            achieve remarkable growth and efficiency through
                            tailored digital solutions.
                        </p>
                    </div>
                </div>
            </section>

            {/* Case Studies */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="space-y-20">
                        {caseStudies.map((study, index) => (
                            <Card
                                key={index}
                                className="overflow-hidden shadow-elegant">
                                <div
                                    className={`grid lg:grid-cols-2 gap-8 ${
                                        index % 2 === 1 ? "lg:grid-cols-2" : ""
                                    }`}>
                                    <div
                                        className={`${
                                            index % 2 === 1 ? "lg:order-2" : ""
                                        }`}>
                                        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-4xl font-bold text-primary mb-2">
                                                    {study.client}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {study.industry}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`space-y-6 p-8 ${
                                            index % 2 === 1 ? "lg:order-1" : ""
                                        }`}>
                                        <div>
                                            <h3 className="text-2xl font-bold text-foreground mb-4">
                                                {study.title}
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold text-foreground mb-2">
                                                        Challenge
                                                    </h4>
                                                    <p className="text-muted-foreground">
                                                        {study.challenge}
                                                    </p>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-foreground mb-2">
                                                        Solution
                                                    </h4>
                                                    <p className="text-muted-foreground">
                                                        {study.solution}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Results */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {study.results.map(
                                                (result, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-gradient-subtle p-4 rounded-lg">
                                                        <div className="flex items-center space-x-2 mb-2">
                                                            <result.icon className="w-5 h-5 text-primary" />
                                                            <div className="font-semibold text-foreground">
                                                                {result.value}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {result.metric}
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {/* Technologies */}
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-2">
                                                Technologies Used
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {study.technologies.map(
                                                    (tech, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                                                            {tech}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-primary py-20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl font-bold text-primary-foreground mb-6">
                        Ready to Write Your Success Story?
                    </h2>
                    <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                        Let's discuss how we can help transform your business
                        and achieve similar results.
                    </p>
                    <Link to="/dashboard">
                        <Button
                            variant="professional"
                            size="lg"
                            className="group">
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Start Your Journey
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default CaseStudies;
