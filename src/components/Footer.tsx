import { Button } from "@/components/ui/button";
import { 
  Mail, 
  Phone, 
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  ArrowRight
} from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-primary mb-4">Anxoda</h3>
              <p className="text-background/80 leading-relaxed">
                Empowering small-scale businesses with tailored software tools, 
                strategic data consultancy, and AI solutions for sustainable success.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-background/80">
                <Phone className="w-5 h-5 text-primary" />
                <span>+123 456 7890</span>
              </div>
              <div className="flex items-center space-x-3 text-background/80">
                <Mail className="w-5 h-5 text-primary" />
                <span>info@anxoda.com</span>
              </div>
              <div className="flex items-center space-x-3 text-background/80">
                <MapPin className="w-5 h-5 text-primary" />
                <span>California, TX 75204</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-background">Services</h4>
            <ul className="space-y-3">
              <li>
                <a href="#services" className="text-background/80 hover:text-primary transition-colors">
                  Software Development
                </a>
              </li>
              <li>
                <a href="#services" className="text-background/80 hover:text-primary transition-colors">
                  Data Consultancy
                </a>
              </li>
              <li>
                <a href="#services" className="text-background/80 hover:text-primary transition-colors">
                  AI Solutions
                </a>
              </li>
              <li>
                <a href="#services" className="text-background/80 hover:text-primary transition-colors">
                  Digital Transformation
                </a>
              </li>
              <li>
                <a href="#services" className="text-background/80 hover:text-primary transition-colors">
                  Business Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-background">Company</h4>
            <ul className="space-y-3">
              <li>
                <a href="#about" className="text-background/80 hover:text-primary transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#process" className="text-background/80 hover:text-primary transition-colors">
                  Our Process
                </a>
              </li>
              <li>
                <a href="#contact" className="text-background/80 hover:text-primary transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-background/80 hover:text-primary transition-colors">
                  Case Studies
                </a>
              </li>
              <li>
                <a href="#" className="text-background/80 hover:text-primary transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-background">Stay Updated</h4>
            <p className="text-background/80">
              Subscribe to our newsletter for the latest insights on digital transformation.
            </p>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2 rounded-md bg-background/10 border border-background/20 text-background placeholder:text-background/60 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button variant="hero" size="icon">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Social Links */}
            <div className="space-y-4">
              <h5 className="font-medium text-background">Follow Us</h5>
              <div className="flex space-x-4">
                <a 
                  href="#" 
                  className="w-10 h-10 bg-background/10 rounded-full flex items-center justify-center text-background/80 hover:bg-primary hover:text-background transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-background/10 rounded-full flex items-center justify-center text-background/80 hover:bg-primary hover:text-background transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-background/10 rounded-full flex items-center justify-center text-background/80 hover:bg-primary hover:text-background transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-background/10 rounded-full flex items-center justify-center text-background/80 hover:bg-primary hover:text-background transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-background/80 text-sm">
              © {currentYear} Anxoda. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-background/80 hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-background/80 hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-background/80 hover:text-primary transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;