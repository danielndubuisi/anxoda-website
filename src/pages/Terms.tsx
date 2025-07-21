
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="space-y-8 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using Anxoda's services, you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Services Description</h2>
              <p className="mb-4">
                Anxoda provides software development, data consultancy, and AI solutions for small-scale businesses. 
                Our services include but are not limited to custom software development, business analytics, 
                and digital transformation consulting.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Responsibilities</h2>
              <p className="mb-4">You agree to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Provide accurate and complete information when using our services</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Use our services only for lawful purposes</li>
                <li>Not interfere with or disrupt our services</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Intellectual Property</h2>
              <p className="mb-4">
                All content, features, and functionality of our services are owned by Anxoda and are protected 
                by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Payment Terms</h2>
              <p className="mb-4">
                Payment terms will be specified in individual service agreements. All fees are non-refundable 
                unless otherwise specified in writing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Limitation of Liability</h2>
              <p className="mb-4">
                In no event shall Anxoda be liable for any indirect, incidental, special, consequential, 
                or punitive damages arising out of or related to your use of our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Termination</h2>
              <p className="mb-4">
                We may terminate or suspend your access to our services immediately, without prior notice, 
                for conduct that we believe violates these Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Contact Information</h2>
              <p className="mb-4">
                For questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gradient-subtle p-4 rounded-lg">
                <p>Email: anxoda.business@gmail.com</p>
                <p>Phone: +2349030673128</p>
                <p>Address: Lagos, Nigeria</p>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center text-sm text-muted-foreground">
            Last Updated: January 2024
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;
