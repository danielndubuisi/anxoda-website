
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, ArrowRight, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const blogPosts = [
  {
    title: "The Future of Small Business Digital Transformation",
    excerpt: "Explore how AI and automation are reshaping the landscape for small businesses in 2024.",
    author: "Anxoda Team",
    date: "2024-01-15",
    readTime: "5 min read",
    category: "Digital Transformation",
    image: "/lovable-uploads/blog-1.jpg"
  },
  {
    title: "5 Essential Data Analytics Tools Every SME Should Know",
    excerpt: "Discover the most effective and affordable data analytics solutions for small and medium enterprises.",
    author: "Anxoda Team",
    date: "2024-01-10",
    readTime: "7 min read",
    category: "Data Analytics",
    image: "/lovable-uploads/blog-2.jpg"
  },
  {
    title: "How AI Can Boost Your Business Productivity by 300%",
    excerpt: "Real-world examples of how artificial intelligence is helping businesses streamline operations.",
    author: "Anxoda Team",
    date: "2024-01-05",
    readTime: "6 min read",
    category: "AI Solutions",
    image: "/lovable-uploads/blog-3.jpg"
  },
  {
    title: "Building a Customer-Centric Business Strategy",
    excerpt: "Learn how to put your customers at the center of your business strategy for sustainable growth.",
    author: "Anxoda Team",
    date: "2024-01-01",
    readTime: "8 min read",
    category: "Business Strategy",
    image: "/lovable-uploads/blog-4.jpg"
  }
];

const categories = ["All", "Digital Transformation", "Data Analytics", "AI Solutions", "Business Strategy"];

const Blog = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-subtle py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              Insights & Updates
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Business Growth
              <span className="text-primary"> Insights</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Stay ahead of the curve with our latest insights on digital transformation, 
              AI solutions, and business growth strategies.
            </p>
          </div>
        </div>
      </section>

      {/* Filter Categories */}
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {categories.map((category) => (
              <Button
                key={category}
                variant={category === "All" ? "hero" : "professional"}
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <Card key={index} className="overflow-hidden shadow-elegant hover:shadow-glow transition-shadow group">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-primary mb-2">{post.category}</div>
                    <div className="text-sm text-muted-foreground">Featured Article</div>
                  </div>
                </div>
                
                <CardHeader>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(post.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{post.author}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="group">
                      Read More
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="bg-gradient-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-primary-foreground mb-6">
            Never Miss an Update
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter for the latest business insights and digital transformation tips.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground"
            />
            <Button variant="professional" size="lg">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
