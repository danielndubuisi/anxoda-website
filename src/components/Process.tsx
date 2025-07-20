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
    <section id="process" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Our Process
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            How We Transform
            <span className="text-primary"> Your Business</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our proven 6-step methodology ensures successful digital transformation 
            from initial consultation to ongoing support and optimization.
          </p>
        </div>

        {/* Process Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 top-24 bottom-24 w-px bg-gradient-to-b from-primary via-primary/50 to-primary"></div>
          
          <div className="space-y-16">
            {processSteps.map((step, index) => (
              <div 
                key={index} 
                className={`grid lg:grid-cols-2 gap-12 items-center animate-slide-up ${
                  index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                }`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                {/* Content */}
                <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-4">{step.title}</h3>
                    <p className="text-lg text-muted-foreground mb-6">{step.description}</p>
                    
                    <ul className="space-y-2">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center text-muted-foreground">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Visual Element */}
                <div className={`${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                  <Card className="group hover:shadow-elegant transition-all duration-300">
                    <CardHeader>
                      <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow transition-all">
                        <step.icon className="w-10 h-10 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-center text-xl">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-sm text-muted-foreground">
                        Step {index + 1} of {processSteps.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Arrow for desktop */}
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 mt-8">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <ArrowDown className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-20 animate-fade-in">
          <div className="bg-gradient-subtle rounded-2xl p-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Ready to Start Your Transformation?
            </h3>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Let's begin your journey to digital success with our proven methodology.
            </p>
            <Button variant="hero" size="lg" className="group">
              Start Your Project
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;