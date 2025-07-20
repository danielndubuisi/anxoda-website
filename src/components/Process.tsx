
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Search, 
  Lightbulb, 
  Code, 
  Rocket, 
  Headphones,
  ArrowRight,
  ArrowDown
} from "lucide-react";

const processSteps = [
  {
    icon: MessageSquare,
    title: "Consultation & Discovery",
    description: "We start by understanding your business goals, challenges, and current systems through comprehensive consultation.",
    details: ["Initial assessment", "Requirements gathering", "Goal definition", "Timeline planning"]
  },
  {
    icon: Search,
    title: "Analysis & Strategy",
    description: "Our experts analyze your data, processes, and market position to develop a tailored strategy.",
    details: ["Data analysis", "Process mapping", "Strategy development", "Solution design"]
  },
  {
    icon: Lightbulb,
    title: "Solution Design",
    description: "We design custom solutions that align with your business objectives and technical requirements.",
    details: ["System architecture", "User experience design", "Integration planning", "Security framework"]
  },
  {
    icon: Code,
    title: "Development & Integration",
    description: "Our development team builds and integrates solutions using the latest technologies and best practices.",
    details: ["Custom development", "System integration", "Quality assurance", "Security implementation"]
  },
  {
    icon: Rocket,
    title: "Deployment & Launch",
    description: "We ensure smooth deployment with minimal disruption to your business operations.",
    details: ["Staged deployment", "Staff training", "Go-live support", "Performance monitoring"]
  },
  {
    icon: Headphones,
    title: "Support & Optimization",
    description: "Ongoing support and continuous optimization to ensure long-term success and growth.",
    details: ["24/7 support", "Performance optimization", "Feature updates", "Strategic guidance"]
  }
];

const Process = () => {
  return (
    <section id="process" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium mb-4">
            Our Process
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            How We Transform
            <span className="text-primary block sm:inline"> Your Business</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            Our proven 6-step methodology ensures successful digital transformation 
            from initial consultation to ongoing support and optimization.
          </p>
        </div>

        {/* Process Steps */}
        <div className="relative">
          {/* Connection Line - Hidden on mobile */}
          <div className="hidden xl:block absolute left-1/2 transform -translate-x-1/2 top-24 bottom-24 w-px bg-gradient-to-b from-primary via-primary/50 to-primary"></div>
          
          <div className="space-y-12 sm:space-y-16">
            {processSteps.map((step, index) => (
              <div 
                key={index} 
                className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center animate-slide-up ${
                  index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                }`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                {/* Content */}
                <div className={`space-y-4 sm:space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-base sm:text-lg">
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <step.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">{step.title}</h3>
                    <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">{step.description}</p>
                    
                    <ul className="space-y-2">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center text-sm sm:text-base text-muted-foreground">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Visual Element */}
                <div className={`${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                  <Card className="group hover:shadow-elegant transition-all duration-300">
                    <CardHeader className="pb-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-primary rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:shadow-glow transition-all">
                        <step.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-center text-lg sm:text-xl">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center pt-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Step {index + 1} of {processSteps.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Arrow for desktop - Hidden on mobile */}
                {index < processSteps.length - 1 && (
                  <div className="hidden xl:block absolute left-1/2 transform -translate-x-1/2 mt-8">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center">
                      <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16 sm:mt-20 animate-fade-in">
          <div className="bg-gradient-subtle rounded-xl sm:rounded-2xl p-8 sm:p-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Ready to Start Your Transformation?
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              Let's begin your journey to digital success with our proven methodology.
            </p>
            <Button variant="hero" size="lg" className="group w-full sm:w-auto">
              Start Your Project
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
