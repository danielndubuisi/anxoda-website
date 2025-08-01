import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Users, Target, Lightbulb, Award, Globe, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import teamCollaboration from "@/assets/team-collaboration.webp";

const AboutUs = () => {
  const scrollToContact = () => {
    window.location.href = "/#contact";
  };

  const values = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Client-Centric Approach",
      description: "We put our clients' needs first, ensuring every solution is tailored to their unique business requirements and goals."
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Results-Driven",
      description: "Our focus is on delivering measurable outcomes that drive real business growth and operational efficiency."
    },
    {
      icon: <Lightbulb className="w-8 h-8" />,
      title: "Innovation",
      description: "We leverage cutting-edge AI and technology to provide solutions that keep our clients ahead of the competition."
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Excellence",
      description: "We maintain the highest standards in everything we do, from initial consultation to final implementation."
    }
  ];

  const achievements = [
    {
      number: "500+",
      label: "Businesses Transformed",
      description: "Successfully helped over 500 small and medium businesses digitize their operations"
    },
    {
      number: "98%",
      label: "Client Satisfaction",
      description: "Consistently high satisfaction rates with our solutions and support services"
    },
    {
      number: "5+",
      label: "Years Experience",
      description: "Deep expertise in AI, data consultancy, and business automation solutions"
    },
    {
      number: "24/7",
      label: "Support Available",
      description: "Round-the-clock support to ensure your business operations run smoothly"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 bg-gradient-subtle overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
        
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              About Anxoda
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              Empowering Small Businesses Through
              <span className="text-primary block"> Innovation & Technology</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-3xl mx-auto">
              At Anxoda, we believe every small business deserves access to world-class technology solutions. 
              We specialize in AI-powered tools, strategic data consultancy, and custom software that drives 
              measurable growth and operational excellence.
            </p>
            <Button variant="hero" size="lg" className="group" onClick={scrollToContact}>
              Get Started Today
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  Our Mission
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  To democratize access to advanced technology solutions for small and medium businesses, 
                  enabling them to compete effectively in the digital economy while maintaining their 
                  unique identity and values.
                </p>
              </div>
              
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  Our Vision
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  To be the leading technology partner for small businesses across Africa, fostering 
                  sustainable growth through innovative AI solutions, data-driven insights, and 
                  strategic digital transformation.
                </p>
              </div>
            </div>
            
            <div className="relative">
              <img
                src={teamCollaboration}
                alt="Team collaboration at Anxoda"
                className="w-full h-auto rounded-2xl shadow-elegant"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 lg:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Our Core Values
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These values guide everything we do and shape how we interact with our clients and partners.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-border hover:shadow-elegant transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-lg">
                      {value.icon}
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Our Track Record
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Numbers that speak to our commitment to delivering exceptional results for our clients.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                  {achievement.number}
                </div>
                <div className="text-lg font-semibold text-foreground mb-2">
                  {achievement.label}
                </div>
                <p className="text-sm text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 lg:py-24 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary"></div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8">
              Join hundreds of businesses that have already experienced the power of our solutions. 
              Let's discuss how we can help you achieve your goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="professional" size="lg" className="group" onClick={scrollToContact}>
                <TrendingUp className="w-5 h-5 mr-2" />
                Start Your Journey
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Link to="/case-studies">
                <Button variant="outline" size="lg" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  <Globe className="w-5 h-5 mr-2" />
                  View Case Studies
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;