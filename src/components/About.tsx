
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
  ArrowRight,
  Linkedin,
  Mail
} from "lucide-react";
import { Link } from "react-router-dom";

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

const teamMembers = [
  {
    name: "Daniel Ndubuisi",
    role: "CTO & Co-Founder",
    bio: "Expert in AI solutions and software development with a focus on business transformation.",
    image: "https://media.licdn.com/dms/image/v2/D4D03AQH1fHoEjRglyA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1686343884759?e=1756339200&v=beta&t=ceWNTBDMbMnrl9171ipZSiLzATKzsmbct0QTHTja1KE",
    linkedin: "https://www.linkedin.com/in/pharmadevdaniel",
    email: "ndubeansdaniel97@gmail.com"
  },
  {
    name: "Ikenna M.D. Nwankwo",
    role: "COO & Co-Founder",
    bio: "Passionate about empowering small businesses through technology and data consulting.",
    image: "https://media.licdn.com/dms/image/v2/D4E03AQH-GudX48-fdg/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1727476374852?e=1756339200&v=beta&t=TtgHq8l3uHN3ZLj49JpFi4mRiRmfo0tJCXetu7pZDRo",
    linkedin: "https://www.linkedin.com/in/ikenna-m-d-nwankwo-3a2390258",
    email: "martin.nwankwo.169@gmail.com"
  }
];

const About = () => {
  return (
    <section id="about" className="py-12 sm:py-16 lg:py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium mb-4">
            About Anxoda
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Empowering Small Businesses to
            <span className="text-primary block sm:inline"> Thrive Digitally</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            We believe every small business has the potential to succeed in the digital economy. 
            Our mission is to provide the tools, insights, and strategies needed to unlock that potential.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16 lg:mb-20">
          {/* Content */}
          <div className="space-y-6 sm:space-y-8 animate-slide-up">
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                Why Choose Anxoda?
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                At Anxoda, we understand the unique challenges small businesses face in today's 
                competitive digital landscape. Our team of experts combines deep industry knowledge 
                with cutting-edge technology to deliver solutions that drive real results.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">Tailored Solutions</h4>
                    <p className="text-muted-foreground text-sm sm:text-base">Every solution is customized to your specific business needs and goals.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">Proven Methodology</h4>
                    <p className="text-muted-foreground text-sm sm:text-base">Our systematic approach ensures successful implementation and measurable results.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">Ongoing Support</h4>
                    <p className="text-muted-foreground text-sm sm:text-base">We provide continuous support to ensure your success long after implementation.</p>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/about-us">
              <Button variant="hero" size="lg" className="group w-full sm:w-auto">
                Learn More About Us
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Image */}
          <div className="relative animate-scale-in">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop"
              alt="African professionals collaborating in a modern office environment"
              className="w-full h-auto rounded-2xl shadow-elegant"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-2xl"></div>
          </div>
        </div>

        {/* Team Members Section */}
        <div className="mb-16 lg:mb-20">
          <div className="text-center mb-12 animate-fade-in">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Meet Our Team</h3>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Our experienced leaders are dedicated to driving your business success through innovative solutions and strategic guidance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {teamMembers.map((member, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-elegant transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 sm:p-8 text-center">
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover border-4 border-primary/10 group-hover:border-primary/30 transition-colors"
                    />
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">{member.name}</h4>
                  <p className="text-primary font-medium mb-3 sm:mb-4 text-sm sm:text-base">{member.role}</p>
                  <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">{member.bio}</p>
                  
                  <div className="flex justify-center space-x-4">
                    <Button variant="ghost" size="sm" className="p-2 h-auto">
                      <Linkedin className="w-4 h-4 text-primary hover:text-primary-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-2 h-auto">
                      <Mail className="w-4 h-4 text-primary hover:text-primary-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
          {achievements.map((achievement, index) => (
            <Card 
              key={index} 
              className="text-center group hover:shadow-elegant transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <achievement.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">{achievement.title}</div>
                <div className="font-semibold text-foreground mb-1 sm:mb-2 text-sm sm:text-base">{achievement.subtitle}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{achievement.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Certifications */}
        <div className="text-center animate-fade-in">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8">Certified Excellence</h3>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {certifications.map((cert, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover:bg-primary hover:text-primary-foreground transition-colors cursor-default"
              >
                <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
