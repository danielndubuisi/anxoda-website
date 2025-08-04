
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Database, 
  Settings, 
  TrendingUp, 
  Shield, 
  Zap,
  ArrowRight,
  PersonStanding
} from "lucide-react";

const services = [
  {
    icon: Settings,
    title: "Tailored Software Tools",
    description: "Custom software solutions designed specifically for your business needs, enhancing operational efficiency and productivity.",
    features: ["Custom Development", "System Integration", "Process Automation"]
  },
  {
    icon: Database,
    title: "Strategic Data Consultancy",
    description: "Transform your data into actionable insights with our comprehensive data analytics and strategic consulting services.",
    features: ["Data Analysis", "Business Intelligence", "Strategic Planning"]
  },
  {
    icon: Brain,
    title: "Artificial Intelligence Solutions",
    description: "Leverage cutting-edge AI technologies to automate processes, improve decision-making, and drive innovation.",
    features: ["Machine Learning", "Predictive Analytics", "Automation"]
  },
  {
    icon: TrendingUp,
    title: "Growth Optimization",
    description: "Comprehensive strategies to drive sustainable business growth through technology and data-driven insights.",
    features: ["Performance Metrics", "Growth Strategies", "Market Analysis"]
  },
  {
    icon: Shield,
    title: "Digital Security",
    description: "Protect your business with robust cybersecurity solutions and best practices for the digital age.",
    features: ["Security Audits", "Data Protection", "Compliance"]
  },
  {
    icon: Zap,
    title: "Digital Transformation",
    description: "Complete digital transformation services to modernize your business and stay competitive.",
    features: ["Technology Upgrade", "Process Digitization", "Change Management"]
  }
];

const Services = () => {
  return (
    <section id="services" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium mb-4">
            Our Services
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Comprehensive Solutions for
            <span className="text-primary block sm:inline"> Your Business</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            We provide end-to-end solutions that transform how small businesses operate, 
            compete, and grow in the digital landscape.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <service.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold">{service.title}</CardTitle>
                <CardDescription className="text-muted-foreground text-sm sm:text-base">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 mb-4 sm:mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-xs sm:text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  variant="ghost" 
                  className="group h-auto text-primary hover:text-secondary text-sm p-2 sm:p-3 flex items-center justify-between w-full"
                  onClick={() => {
                    const contactSection = document.getElementById('contact-form');
                    if (contactSection) {
                      contactSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  Learn More
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-subtle rounded-xl sm:rounded-2xl p-8 sm:p-12 animate-fade-in">
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Business?
          </h3>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            Let's discuss how our solutions can help your business thrive in the digital economy.
          </p>
            <Button variant="hero" size="lg" className="group w-full sm:w-auto" onClick={() => {
              const contactSection = document.getElementById('contact-form');
              if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}>
              <PersonStanding className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              Schedule Consultation
            </Button>
        </div>
      </div>
    </section>
  );
};

export default Services;
