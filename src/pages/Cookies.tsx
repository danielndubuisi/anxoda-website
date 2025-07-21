
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Cookies = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">Cookie Policy</h1>
          
          <div className="space-y-8 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. What Are Cookies</h2>
              <p className="mb-4">
                Cookies are small text files that are placed on your device when you visit our website. 
                They help us provide you with a better browsing experience and allow certain features to work properly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Cookies</h2>
              <p className="mb-4">We use cookies to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Remember your preferences and settings</li>
                <li>Analyze how our website is used</li>
                <li>Improve our website's performance</li>
                <li>Provide personalized content</li>
                <li>Enable security features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Types of Cookies We Use</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Essential Cookies</h3>
                  <p>These cookies are necessary for the website to function properly and cannot be disabled.</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Analytics Cookies</h3>
                  <p>These cookies help us understand how visitors interact with our website by collecting anonymous information.</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Functional Cookies</h3>
                  <p>These cookies remember your preferences and provide enhanced features.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Managing Cookies</h2>
              <p className="mb-4">
                You can control and manage cookies in several ways:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Browser settings: Most browsers allow you to block or delete cookies</li>
                <li>Cookie preferences: You can adjust your cookie preferences on our website</li>
                <li>Opt-out tools: You can use various opt-out tools for analytics cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Third-Party Cookies</h2>
              <p className="mb-4">
                Our website may contain links to third-party websites or services that may set their own cookies. 
                We do not control these cookies and recommend reviewing their privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Updates to This Policy</h2>
              <p className="mb-4">
                We may update this Cookie Policy from time to time. Any changes will be posted on this page 
                with an updated revision date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Contact Us</h2>
              <p className="mb-4">
                If you have any questions about our use of cookies, please contact us at:
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

export default Cookies;
