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

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            const isMobile = window.innerWidth < 1024;
            // Adjust offset for mobile view
            const offset = isMobile ? 450 : 0; // adjust this if needed for a fixed navbar
            // Calculate the position to scroll to
            const y = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
        setIsMenuOpen(false);
    };

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
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { label: "Home", id: "home" },
        { label: "About", id: "about" },
        { label: "Services", id: "services" },
        { label: "Process", id: "process" },
        { label: "Contact", id: "contact" },
    ];

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
            <nav className="bg-background shadow-card sticky top-5 z-50">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-14 sm:h-16">
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

                        {/* Desktop Nav */}
                        <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
                            {navLinks.map(({ label, id }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => scrollToSection(id)}
                                    className={`bg-transparent border-none outline-none cursor-pointer text-foreground hover:text-primary transition-colors text-sm xl:text-base relative ${
                                        activeSection === id
                                            ? "text-primary border-b-2 border-primary pb-1"
                                            : ""
                                    }`}>
                                    {label}
                                </button>
                            ))}
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
                                {navLinks.map(({ label, id }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => scrollToSection(id)}
                                        className={`block px-3 py-3 text-left w-full text-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors text-base ${
                                            activeSection === id
                                                ? "text-primary bg-primary/10 border-l-4 border-primary"
                                                : ""
                                        }`}>
                                        {label}
                                    </button>
                                ))}

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
