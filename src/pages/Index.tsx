import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Process from "@/components/Process";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import AIChatbot from "@/components/AIChatbot";
import SEOHead from "@/components/SEOHead";
import Capabilities from "@/components/Capabilities";
import BuiltForAfrica from "@/components/BuiltForAfrica";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEOHead 
        title="Anxoda — AI Business Intelligence & Profit Planning for African SMBs"
        description="Know if your business is truly profitable. Anxoda helps African small businesses find their break-even point, analyze spreadsheets, and make smarter profit decisions with AI."
        keywords="break-even calculator, profit planning, CVP analysis, business intelligence, AI insights, spreadsheet analyzer, Nigerian SMB, African small business, ProfitPro, Naira"
        canonicalUrl="https://www.anxoda.com/"
      />
      <header>
        <Navbar />
      </header>
      <main>
        <Hero />
        <Capabilities />
        <BuiltForAfrica />
        <Services />
        <Process />
        <About />
        <Contact />
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
};

export default Index;
