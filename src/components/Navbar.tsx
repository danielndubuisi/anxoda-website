import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, Mail, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.webp";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("home");
    const { user } = useAuth();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    // Active section detection
    useEffect(() => {
        const handleScroll = () => {
            const sections = [
                "home",
                "about",
                "services",
                "process",
                "contact",
            ];
            const scrollPosition = window.scrollY + 100;

            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const offsetTop = element.offsetTop;
                    const offsetHeight = element.offsetHeight;

                    if (
                        scrollPosition >= offsetTop &&
                        scrollPosition < offsetTop + offsetHeight
                    ) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll(); // Check initial position

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            {/* Top Contact Bar */}
            <div className="bg-primary text-primary-foreground py-2 px-4">
                <div className="container mx-auto flex justify-between items-center text-xs sm:text-sm">
                    <div className="hidden sm:flex items-center space-x-4 lg:space-x-6">
                        <div className="flex items-center space-x-2">
                            <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>+234 903 067 3128</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>info@anxoda.com</span>
                        </div>
                    </div>
                    <div className="text-center sm:text-right text-xs sm:text-sm">
                        <span>
                            Office Hours: 9:00 AM - 5:00 PM | Lagos, Nigeria
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Navbar */}
            <nav className="bg-background shadow-card sticky top-0 z-50">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        {/* Logo */}
                        <Link
                            to="/"
                            className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                            <img
                                src={logo}
                                alt="Anxoda Logo"
                                className="h-8 w-8 sm:h-10 sm:w-10"
                            />
                            <div className="text-xl sm:text-2xl font-bold text-primary">
                                Anxoda
                            </div>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
                            <a
                                href="#home"
                                className={`text-foreground hover:text-primary transition-colors text-sm xl:text-base relative ${
                                    activeSection === "home"
                                        ? "text-primary border-b-2 border-primary pb-1"
                                        : ""
                                }`}>
                                Home
                            </a>
                            <a
                                href="#about"
                                className={`text-foreground hover:text-primary transition-colors text-sm xl:text-base relative ${
                                    activeSection === "about"
                                        ? "text-primary border-b-2 border-primary pb-1"
                                        : ""
                                }`}>
                                About
                            </a>
                            <a
                                href="#services"
                                className={`text-foreground hover:text-primary transition-colors text-sm xl:text-base relative ${
                                    activeSection === "services"
                                        ? "text-primary border-b-2 border-primary pb-1"
                                        : ""
                                }`}>
                                Services
                            </a>
                            <a
                                href="#process"
                                className={`text-foreground hover:text-primary transition-colors text-sm xl:text-base relative ${
                                    activeSection === "process"
                                        ? "text-primary border-b-2 border-primary pb-1"
                                        : ""
                                }`}>
                                Process
                            </a>
                            <a
                                href="#contact"
                                className={`text-foreground hover:text-primary transition-colors text-sm xl:text-base relative ${
                                    activeSection === "contact"
                                        ? "text-primary border-b-2 border-primary pb-1"
                                        : ""
                                }`}>
                                Contact
                            </a>
                            {user ? (
                                <Link to="/dashboard">
                                    <Button variant="hero" size="sm">
                                        <User className="w-4 h-4 mr-2" />
                                        Dashboard
                                    </Button>
                                </Link>
                            ) : (
                                <Link to="/auth">
                                    <Button variant="hero" size="sm">
                                        Try tools
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="lg:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMenu}
                                className="h-10 w-10">
                                {isMenuOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {isMenuOpen && (
                        <div className="lg:hidden border-t border-border bg-background">
                            <div className="px-2 pt-2 pb-3 space-y-1">
                                <a
                                    href="#home"
                                    className={`block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base ${
                                        activeSection === "home"
                                            ? "text-primary bg-primary/10 border-l-4 border-primary"
                                            : ""
                                    }`}
                                    onClick={toggleMenu}>
                                    Home
                                </a>
                                <a
                                    href="#about"
                                    className={`block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base ${
                                        activeSection === "about"
                                            ? "text-primary bg-primary/10 border-l-4 border-primary"
                                            : ""
                                    }`}
                                    onClick={toggleMenu}>
                                    About
                                </a>
                                <a
                                    href="#services"
                                    className={`block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base ${
                                        activeSection === "services"
                                            ? "text-primary bg-primary/10 border-l-4 border-primary"
                                            : ""
                                    }`}
                                    onClick={toggleMenu}>
                                    Services
                                </a>
                                <a
                                    href="#process"
                                    className={`block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base ${
                                        activeSection === "process"
                                            ? "text-primary bg-primary/10 border-l-4 border-primary"
                                            : ""
                                    }`}
                                    onClick={toggleMenu}>
                                    Process
                                </a>
                                <a
                                    href="#contact"
                                    className={`block px-3 py-3 text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base ${
                                        activeSection === "contact"
                                            ? "text-primary bg-primary/10 border-l-4 border-primary"
                                            : ""
                                    }`}
                                    onClick={toggleMenu}>
                                    Contact
                                </a>
                                <div className="px-3 py-3">
                                    {user ? (
                                        <Link
                                            to="/dashboard"
                                            onClick={toggleMenu}>
                                            <Button
                                                variant="hero"
                                                size="sm"
                                                className="w-full">
                                                <User className="w-4 h-4 mr-2" />
                                                Dashboard
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Link to="/auth" onClick={toggleMenu}>
                                            <Button
                                                variant="hero"
                                                size="sm"
                                                className="w-full">
                                                Try tools
                                            </Button>
                                        </Link>
                                    )}
                                </div>

                                {/* Mobile Contact Info */}
                                <div className="px-3 py-3 space-y-2 border-t border-border mt-2">
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                        <Phone className="w-4 h-4" />
                                        <span>+2349030673128</span>
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
