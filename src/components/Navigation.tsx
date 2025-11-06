import { useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Pracherey
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("home")}
              className="text-foreground hover:text-accent transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("services")}
              className="text-foreground hover:text-accent transition-colors"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="text-foreground hover:text-accent transition-colors"
            >
              About
            </button>
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="gap-2"
            >
              <LogIn size={18} />
              Login
            </Button>
            <Button
              onClick={() => scrollToSection("contact")}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-foreground"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4 animate-fade-in">
            <button
              onClick={() => scrollToSection("home")}
              className="block w-full text-left py-2 text-foreground hover:text-accent transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("services")}
              className="block w-full text-left py-2 text-foreground hover:text-accent transition-colors"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="block w-full text-left py-2 text-foreground hover:text-accent transition-colors"
            >
              About
            </button>
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="w-full gap-2"
            >
              <LogIn size={18} />
              Login
            </Button>
            <Button
              onClick={() => scrollToSection("contact")}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Get Started
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
