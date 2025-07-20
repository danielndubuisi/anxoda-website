import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import heroImage from "@/assets/hero-professional.jpg";

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen bg-gradient-subtle overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
      
      <div className="container mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                Empowering Small Businesses
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Transform Your Business with
                <span className="text-primary"> AI-Powered Solutions</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Anxoda empowers small-scale businesses with tailored software tools, strategic data consultancy, 
                and cutting-edge AI that enhance productivity, drive growth, and foster sustainable success in 
                today's rapidly evolving digital economy.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="group">
                Get Started Today
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="professional" size="lg" className="group">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-col sm:flex-row gap-8 pt-8 border-t border-border">
              <div className="text-center sm:text-left">
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Businesses Transformed</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-3xl font-bold text-primary">98%</div>
                <div className="text-sm text-muted-foreground">Client Satisfaction</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-3xl font-bold text-primary">5+</div>
                <div className="text-sm text-muted-foreground">Years Experience</div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative animate-slide-up">
            <div className="relative">
              <img
                src={heroImage}
                alt="Professional consultant with tablet"
                className="w-full h-auto rounded-2xl shadow-elegant"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl"></div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 bg-primary text-primary-foreground p-4 rounded-xl shadow-glow animate-scale-in">
              <div className="text-sm font-medium">AI Powered</div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-background border border-border p-4 rounded-xl shadow-card animate-scale-in">
              <div className="text-sm font-medium text-primary">Data Driven</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;