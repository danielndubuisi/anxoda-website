import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, User, Bot } from "lucide-react";

interface Message {
    id: string;
    content: string;
    isBot: boolean;
    timestamp: Date;
}

const AIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            content:
                "Hi! I'm Anxoda's AI assistant. I can help answer questions about our services, pricing, and how we can help transform your business. What would you like to know?",
            isBot: true,
            timestamp: new Date(),
        },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isTyping]);

    const businessFAQs = {
        services: {
            keywords: ["services", "what do you do", "offerings", "solutions"],
            response:
                "We provide comprehensive digital transformation solutions including:\n\n• Custom Software Development\n• AI & Machine Learning Solutions\n• Data Analytics & Consultancy\n• Business Process Automation\n• Cloud Migration & DevOps.\n\nWould you like to discuss your needs with our team?",
        },
        pricing: {
            keywords: ["pricing", "cost", "price", "how much", "rates", "fees"],
            response:
                "Our pricing is tailored to each business's specific needs. We offer:\n\n• Free initial consultation\n• Custom project quotes\n• Flexible payment plans\n• Subscription-based services for ongoing support.\n\nWould you like to get a custom quote or speak with our team?",
        },
        ai: {
            keywords: [
                "ai",
                "artificial intelligence",
                "machine learning",
                "automation",
            ],
            response:
                "Our AI solutions help businesses:\n\n• Automate repetitive tasks\n• Predict customer behavior\n• Optimize operations\n• Improve decision-making\n• Enhance customer experiences.\n\nWould you like to explore how AI can help your business?",
        },
        consultation: {
            keywords: ["consultation", "meeting", "call", "talk", "discuss"],
            response:
                "I'd love to connect you with our team! We offer:\n\n• Free 30-minute consultation calls\n• Business needs assessment\n• Solution recommendations\n• Custom project proposals\n\nWould you like to schedule a free consultation call?",
        },
        support: {
            keywords: ["support", "help", "maintenance", "training"],
            response:
                "We provide comprehensive support including:\n\n• 24/7 technical support\n• Staff training programs\n• Regular system updates\n• Performance optimization\n• Strategic guidance.\n\nWould you like to speak to our support team or learn more?",
        },
        process: {
            keywords: ["process", "how it works", "methodology", "timeline"],
            response:
                "Our proven 6-step process:\n\n1. Consultation & Discovery\n2. Analysis & Strategy\n3. Solution Design\n4. Development & Integration\n5. Deployment & Launch\n6. Support & Optimization\n\nWould you like to discuss how this process applies to your business?",
        },
    };

    // Track if last message was a CTA
    const lastWasCTARef = useRef(false);
    // Track if user should be redirected to form
    const [showForm, setShowForm] = useState(false);

    const affirmativeWords = [
        "yes",
        "yeah",
        "yep",
        "sure",
        "of course",
        "absolutely",
        "please",
        "ok",
        "okay",
        "yup",
        "certainly",
        "why not",
        "alright",
        "affirmative",
        "let's",
        "lets",
        "i do",
        "i would",
        "i want",
        "i'm interested",
        "interested",
        "sounds good",
        "go ahead",
        "schedule",
        "set up",
        "connect",
        "speak",
        "discuss",
        "get in touch",
        "contact",
    ];
    const negativeWords = [
        "no",
        "nope",
        "not now",
        "maybe later",
        "don't",
        "do not",
        "nah",
        "not interested",
        "not really",
        "cancel",
    ];

    const getAIResponse = (userMessage: string): string => {
        const lowerMessage = userMessage.toLowerCase();

        // If last message was a CTA, check for yes/no/affirmative
        if (lastWasCTARef.current) {
            if (affirmativeWords.some((word) => lowerMessage.includes(word))) {
                setShowForm(true);
                lastWasCTARef.current = false;
                return "Great! Please fill out our quick form so we can assist you further: [Open Contact Form]";
            }
            if (negativeWords.some((word) => lowerMessage.includes(word))) {
                lastWasCTARef.current = false;
                return "Thank you for your response! If you need any other assistance, feel free to ask another question.";
            }
            // If not clear, ask for clarification
            return "Just to confirm, would you like to proceed? Please reply 'yes' or 'no'.";
        }

        if (
            lowerMessage.includes("hello") ||
            lowerMessage.includes("hi") ||
            lowerMessage.includes("hey")
        ) {
            lastWasCTARef.current = false;
            return "Hello! I'm here to help you learn about Anxoda's services and how we can transform your business. What specific questions do you have?";
        }

        if (
            lowerMessage.includes("contact") ||
            lowerMessage.includes("phone") ||
            lowerMessage.includes("email")
        ) {
            lastWasCTARef.current = true;
            return "You can reach us at:\n\n📞 WhatsApp: +2349030673128\n📧 Email: info@anxoda.com\n📍 Location: Lagos, Nigeria\n🕒 Hours: 9:00 AM - 5:00 PM (Mon-Fri)\n\nWould you like to schedule a meeting?";
        }

        for (const [category, faq] of Object.entries(businessFAQs)) {
            if (
                faq.keywords.some((keyword) => lowerMessage.includes(keyword))
            ) {
                lastWasCTARef.current = true;
                return faq.response;
            }
        }

        lastWasCTARef.current = false;
        return "That's a great question! While I can help with basic information about our services, pricing, and processes, I'd recommend scheduling a free consultation with our team for more detailed discussion. Would you like to set that up?";
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        // If user is being redirected to form, scroll to form section on contact page
        if (showForm) {
            setShowForm(false);
            // Navigate to /contact#contact-form in the same tab
            window.location.href = "/contact#contact-form";
            setInputMessage("");
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            content: inputMessage,
            isBot: false,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setIsTyping(true);

        setTimeout(() => {
            const aiText = getAIResponse(inputMessage);
            // If bot message contains [Open Contact Form], make it a clickable link
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                content: aiText,
                isBot: true,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiResponse]);
            setIsTyping(false);
        }, 1000);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            {/* Chat Button */}
        {!isOpen && (
            <div className="fixed bottom-6 right-6 flex flex-col items-end z-50 group">
                {/* Thinking box above icon, with pulse, stem to the right */}
                <div className="relative mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-lg px-4 py-2 text-sm text-foreground font-medium min-w-[140px] text-left">
                        Ask me anything
                    </div>
                    {/* Speech bubble stem at bottom right */}
                    <span className="absolute -bottom-2 right-4 w-0 h-0 border-t-[10px] border-t-background border-x-[8px] border-x-transparent border-b-0"></span>
                    <span
                        className="absolute -bottom-2 right-4 w-0 h-0 border-t-[10px] border-t-border border-x-[8px] border-x-transparent border-b-0 z-[-1]"
                        style={{ right: "1.15rem", zIndex: 0 }}></span>
                </div>
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-glow hover:shadow-elegant transition-all duration-300"
                    size="icon"
                    aria-label="Open AI Assistant - Ask me anything">
                    <MessageCircle className="w-6 h-6" />
                </Button>
            </div>
        )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[90vh] max-h-[600px] z-50">
                    <Card className="h-full flex flex-col shadow-elegant border-primary/20">
                        <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Bot className="w-5 h-5" />
                                    <CardTitle className="text-lg">
                                        Anxoda AI Assistant
                                    </CardTitle>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOpen(false)}
                                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4 overflow-y-auto min-h-0">
                                <div className="space-y-4">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${
                                                message.isBot
                                                    ? "justify-start"
                                                    : "justify-end"
                                            }`}>
                                            <div
                                                className={`max-w-[85%] rounded-lg p-3 ${
                                                    message.isBot
                                                        ? "bg-secondary text-secondary-foreground"
                                                        : "bg-primary text-primary-foreground"
                                                }`}>
                                                <div className="flex items-start space-x-2">
                                                    {message.isBot ? (
                                                        <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    ) : (
                                                        <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    )}
                                                    <div className="text-sm whitespace-pre-line break-words">
                                                        {message.content.includes(
                                                            "[Open Contact Form]"
                                                        ) ? (
                                                            <>
                                                                {message.content.replace(
                                                                    "[Open Contact Form]",
                                                                    ""
                                                                )}
                                                                <a
                                                                    href="/#contact-form"
                                                                    className="text-primary underline ml-1"
                                                                    onClick={() =>
                                                                        setIsOpen(
                                                                            false
                                                                        )
                                                                    }>
                                                                    Fill the
                                                                    contact form
                                                                </a>
                                                            </>
                                                        ) : (
                                                            message.content
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && (
                                        <div className="flex justify-start">
                                            <div className="bg-secondary text-secondary-foreground rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <Bot className="w-4 h-4" />
                                                    <div className="flex space-x-1">
                                                        <div
                                                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                            style={{
                                                                animationDelay:
                                                                    "0ms",
                                                            }}></div>
                                                        <div
                                                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                            style={{
                                                                animationDelay:
                                                                    "150ms",
                                                            }}></div>
                                                        <div
                                                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                            style={{
                                                                animationDelay:
                                                                    "300ms",
                                                            }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* This ensures auto-scroll to latest message */}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            {/* Input */}
                            <div className="p-4 border-t border-border flex-shrink-0">
                                <div className="flex space-x-2">
                                    <Input
                                        value={inputMessage}
                                        onChange={(e) =>
                                            setInputMessage(e.target.value)
                                        }
                                        onKeyPress={handleKeyPress}
                                        placeholder="Ask me about our services..."
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        size="icon"
                                        disabled={
                                            !inputMessage.trim() || isTyping
                                        }>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
};

export default AIChatbot;
