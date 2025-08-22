import { Button } from "@/components/ui/button";
import { ArrowRight, Play, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
    const scrollToContact = () => {
        const contactSection = document.getElementById("contact-form");
        if (contactSection) {
            // Mobile: scroll to top of section
            if (window.innerWidth < 1024) {
                const y =
                    contactSection.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: y, behavior: "smooth" });
            } else {
                contactSection.scrollIntoView({ behavior: "smooth" });
            }
        } else {
            // fallback: scroll to bottom of page
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth",
            });
        }
    };

    const user = useAuth();

    return (
        <section
            id="home"
            className="relative min-h-screen bg-gradient-subtle overflow-hidden"
            aria-label="Hero section - Transform your business with AI-powered solutions">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>

            <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-32">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Content */}
                    <div className="space-y-6 sm:space-y-8 animate-fade-in text-center lg:text-left">
                        <div className="space-y-4">
                            <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium">
                                Empowering Small Businesses
                            </span>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                                Transform Your Business with
                                <span className="text-primary block sm:inline">
                                    {" "}
                                    AI-Powered Solutions
                                </span>
                            </h1>
                            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                Anxoda empowers small-scale businesses with
                                tailored software tools, strategic data
                                consultancy, and cutting-edge AI that enhance
                                productivity, drive growth, and foster
                                sustainable success in today's rapidly evolving
                                digital economy.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                            <div>
                                {user ? (
                                    <Link to="/dashboard">
                                        <Button
                                            variant="hero"
                                            size="lg"
                                            className="w-full">
                                            Get Started Today
                                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Link to="/auth">
                                        <Button
                                            variant="hero"
                                            size="lg"
                                            className="w-full">
                                            Try tools
                                        </Button>
                                    </Link>
                                )}
                            </div>

                            <Button
                                variant="professional"
                                size="lg"
                                className="group w-full sm:w-auto cursor-pointer z-10"
                                style={{
                                    position: "relative",
                                    zIndex: 10,
                                    pointerEvents: "auto",
                                }}
                                onClick={scrollToContact}
                                type="button"
                                tabIndex={0}>
                                <User className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                                Book Demo
                            </Button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 pt-6 sm:pt-8 border-t border-border">
                            <div className="text-center lg:text-left">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">
                                    50+
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    Businesses Transformed
                                </div>
                            </div>
                            <div className="text-center lg:text-left">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">
                                    98%
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    Client Satisfaction
                                </div>
                            </div>
                            <div className="text-center lg:text-left">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">
                                    5+
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    Proven Tools
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Image or video embed */}
                    <div className="relative animate-slide-up order-first lg:order-last mt-20 sm:mt-0">
                        {/* YouTube Video Embed with gradient overlay */}
                        <div className="relative mx-auto w-full max-w-[90%] md:max-w-[720px] aspect-video rounded-2xl overflow-hidden shadow-elegant">
                            <iframe
                                className="w-full h-full rounded-2xl"
                                src="https://www.youtube.com/embed/i436UAbhMoI?rel=0&modestbranding=1"
                                title="Anxoda Business Intelligence Demo - AI-Powered Solutions"
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                aria-label="Anxoda business intelligence demonstration video"></iframe>

                            {/* Optional gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl pointer-events-none"></div>
                        </div>

                        {/* Floating Elements */}
                        <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-primary text-primary-foreground p-3 sm:p-4 rounded-xl shadow-glow animate-scale-in z-40">
                            <div className="text-xs sm:text-sm font-medium">
                                AI Powered
                            </div>
                        </div>
                        <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-background border border-border p-3 sm:p-4 rounded-xl shadow-card animate-scale-in z-40">
                            <div className="text-xs sm:text-sm font-medium text-primary">
                                Data Driven
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
