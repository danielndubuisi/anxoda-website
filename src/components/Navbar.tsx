
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, Mail } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      {/* Top Contact Bar */}
      <div className="bg-primary text-primary-foreground py-2 px-4">
        <div className="container mx-auto flex justify-between items-center text-xs sm:text-sm">
          <div className="hidden sm:flex items-center space-x-4 lg:space-x-6">
            <div className="flex items-center space-x-2">
              <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>+123 456 7890</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>info@anxoda.com</span>
            </div>
          </div>
          <div className="text-center sm:text-right text-xs sm:text-sm">
            <span>Office Hours: 9:00 AM - 6:00 PM</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-background shadow-card sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-xl sm:text-2xl font-bold text-primary">
                Anxoda
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <a href="#home" className="text-foreground hover:text-primary transition-colors text-sm xl:text-base">
                Home
              </a>
              <a href="#about" className="text-foreground hover:text-primary transition-colors text-sm xl:text-base">
                About
              </a>
              <a href="#services" className="text-foreground hover:text-primary transition-colors text-sm xl:text-base">
                Services
              </a>
              <a href="#process" className="text-foreground hover:text-primary transition-colors text-sm xl:text-base">
                Process
              </a>
              <a href="#contact" className="text-foreground hover:text-primary transition-colors text-sm xl:text-base">
                Contact
              </a>
              <Button variant="hero" size="sm">
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button variant="ghost" size="icon" onClick={toggleMenu} className="h-10 w-10">
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-border bg-background">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <a
                  href="#home"
                  className="block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base"
                  onClick={toggleMenu}
                >
                  Home
                </a>
                <a
                  href="#about"
                  className="block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base"
                  onClick={toggleMenu}
                >
                  About
                </a>
                <a
                  href="#services"
                  className="block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base"
                  onClick={toggleMenu}
                >
                  Services
                </a>
                <a
                  href="#process"
                  className="block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base"
                  onClick={toggleMenu}
                >
                  Process
                </a>
                <a
                  href="#contact"
                  className="block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base"
                  onClick={toggleMenu}
                >
                  Contact
                </a>
                <div className="px-3 py-3">
                  <Button variant="hero" size="sm" className="w-full">
                    Get Started
                  </Button>
                </div>
                
                {/* Mobile Contact Info */}
                <div className="px-3 py-3 space-y-2 border-t border-border mt-2">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>+123 456 7890</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>info@anxoda.com</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
