import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Database, 
  Settings, 
  TrendingUp, 
  Shield, 
  Zap,
  ArrowRight
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
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Our Services
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Comprehensive Solutions for
            <span className="text-primary"> Your Business</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We provide end-to-end solutions that transform how small businesses operate, 
            compete, and grow in the digital landscape.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <service.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-bold">{service.title}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" className="group p-0 h-auto text-primary hover:text-primary">
                  Learn More
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-subtle rounded-2xl p-12 animate-fade-in">
          <h3 className="text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Business?
          </h3>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Let's discuss how our solutions can help your business thrive in the digital economy.
          </p>
          <Button variant="hero" size="lg" className="group">
            Schedule Consultation
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Services;