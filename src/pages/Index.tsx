import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Process from "@/components/Process";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import AIChatbot from "@/components/AIChatbot";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEOHead 
        title="Anxoda - AI-Powered Business Solutions for Digital Transformation"
        description="Transform your business with Anxoda's AI-powered solutions. Custom software tools, data consultancy, and digital transformation services for small businesses in Africa. Get started today!"
        keywords="business intelligence, AI solutions, digital transformation, data consultancy, custom software, automation, small business, Africa, Lagos, Nigeria"
        canonicalUrl="https://www.anxoda.com/"
      />
      <header>
        <Navbar />
      </header>
      <main>
        <Hero />
        <About />
        <Services />
        <Process />
        <Contact />
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
};

export default Index;
