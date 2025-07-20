import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Award, 
  Users, 
  Target, 
  Clock,
  CheckCircle,
  Star,
  ArrowRight
} from "lucide-react";
import teamImage from "@/assets/team-collaboration.jpg";

const achievements = [
  {
    icon: Users,
    title: "500+",
    subtitle: "Satisfied Clients",
    description: "Businesses transformed across various industries"
  },
  {
    icon: Award,
    title: "98%",
    subtitle: "Success Rate",
    description: "Project completion with client satisfaction"
  },
  {
    icon: Clock,
    title: "5+",
    subtitle: "Years Experience",
    description: "Proven track record in business consulting"
  },
  {
    icon: Target,
    title: "100+",
    subtitle: "Projects Delivered",
    description: "Successful implementations and transformations"
  }
];

const certifications = [
  "Certified AI Solutions Partner",
  "Data Analytics Specialist",
  "Cloud Solutions Expert",
  "Digital Transformation Leader"
];

const About = () => {
  return (
    <section id="about" className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            About Anxoda
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Empowering Small Businesses to
            <span className="text-primary"> Thrive Digitally</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We believe every small business has the potential to succeed in the digital economy. 
            Our mission is to provide the tools, insights, and strategies needed to unlock that potential.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          {/* Content */}
          <div className="space-y-8 animate-slide-up">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-foreground">
                Why Choose Anxoda?
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                At Anxoda, we understand the unique challenges small businesses face in today's 
                competitive digital landscape. Our team of experts combines deep industry knowledge 
                with cutting-edge technology to deliver solutions that drive real results.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Tailored Solutions</h4>
                    <p className="text-muted-foreground">Every solution is customized to your specific business needs and goals.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Proven Methodology</h4>
                    <p className="text-muted-foreground">Our systematic approach ensures successful implementation and measurable results.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Ongoing Support</h4>
                    <p className="text-muted-foreground">We provide continuous support to ensure your success long after implementation.</p>
                  </div>
                </div>
              </div>
            </div>

            <Button variant="hero" size="lg" className="group">
              Learn More About Us
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Image */}
          <div className="relative animate-scale-in">
            <img
              src={teamImage}
              alt="Team collaboration"
              className="w-full h-auto rounded-2xl shadow-elegant"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-2xl"></div>
          </div>
        </div>

        {/* Achievements */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {achievements.map((achievement, index) => (
            <Card 
              key={index} 
              className="text-center group hover:shadow-elegant transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <achievement.icon className="w-8 h-8" />
                </div>
                <div className="text-3xl font-bold text-primary mb-2">{achievement.title}</div>
                <div className="font-semibold text-foreground mb-2">{achievement.subtitle}</div>
                <div className="text-sm text-muted-foreground">{achievement.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Certifications */}
        <div className="text-center animate-fade-in">
          <h3 className="text-2xl font-bold text-foreground mb-8">Certified Excellence</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {certifications.map((cert, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="px-4 py-2 text-sm hover:bg-primary hover:text-primary-foreground transition-colors cursor-default"
              >
                <Star className="w-4 h-4 mr-2" />
                {cert}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;