import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, User, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const AIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Hi! I'm Anxoda's AI assistant. I can help answer questions about our services, pricing, and how we can help transform your business. What would you like to know?",
        },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [shouldScrollToContact, setShouldScrollToContact] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isTyping]);

    // Handle scrolling to contact form
    useEffect(() => {
        if (shouldScrollToContact) {
            const contactSection = document.getElementById("contact");
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: "smooth" });
                setIsOpen(false);
            }
            setShouldScrollToContact(false);
        }
    }, [shouldScrollToContact]);

    const streamChat = async (userMessage: string) => {
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`;

        try {
            const response = await fetch(CHAT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                    messages: [...messages, { role: "user", content: userMessage }],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                if (response.status === 429) {
                    throw new Error("Too many requests. Please wait a moment and try again.");
                }
                
                if (response.status === 402) {
                    throw new Error("Service temporarily unavailable. Please try again later.");
                }
                
                throw new Error(errorData.message || "Failed to get response from AI");
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let textBuffer = "";
            let streamDone = false;
            let assistantMessage = "";

            // Add empty assistant message that we'll update
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            while (!streamDone) {
                const { done, value } = await reader.read();
                if (done) break;
                
                textBuffer += decoder.decode(value, { stream: true });

                let newlineIndex: number;
                while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
                    let line = textBuffer.slice(0, newlineIndex);
                    textBuffer = textBuffer.slice(newlineIndex + 1);

                    if (line.endsWith("\r")) line = line.slice(0, -1);
                    if (line.startsWith(":") || line.trim() === "") continue;
                    if (!line.startsWith("data: ")) continue;

                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === "[DONE]") {
                        streamDone = true;
                        break;
                    }

                    try {
                        const parsed = JSON.parse(jsonStr);
                        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                        
                        if (content) {
                            assistantMessage += content;
                            
                            // Update the last assistant message
                            setMessages((prev) => {
                                const newMessages = [...prev];
                                newMessages[newMessages.length - 1] = {
                                    role: "assistant",
                                    content: assistantMessage,
                                };
                                return newMessages;
                            });
                        }
                    } catch {
                        // Partial JSON, put it back
                        textBuffer = line + "\n" + textBuffer;
                        break;
                    }
                }
            }

            // Check if AI suggested contact form
            const lowerResponse = assistantMessage.toLowerCase();
            if (
                lowerResponse.includes("contact form") ||
                lowerResponse.includes("direct you to") ||
                (lowerResponse.includes("great") && lowerResponse.includes("team"))
            ) {
                // Add a follow-up message with clickable link
                setTimeout(() => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            content: "[CONTACT_FORM_LINK]",
                        },
                    ]);
                }, 500);
            }

            setIsTyping(false);
        } catch (error) {
            console.error("Chat error:", error);
            setIsTyping(false);
            
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to send message",
                variant: "destructive",
            });

            // Add fallback message
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "I apologize, but I'm having trouble responding right now. Please try again or contact us directly at info@anxoda.com or WhatsApp +2349030673128.",
                },
            ]);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage = inputMessage.trim();
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setInputMessage("");
        setIsTyping(true);

        await streamChat(userMessage);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleContactFormClick = () => {
        setShouldScrollToContact(true);
    };

    return (
        <>
            {/* Chat Button */}
            {!isOpen && (
                <div className="fixed bottom-6 right-6 flex flex-col items-end z-50">
                    <div className="relative mb-3 animate-pulse">
                        <div className="bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-lg px-4 py-2 text-sm text-foreground font-medium min-w-[140px] text-left">
                            Ask me anything
                        </div>
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
                            <ScrollArea className="flex-1 p-4 overflow-y-auto min-h-0">
                                <div className="space-y-4">
                                    {messages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`flex ${
                                                message.role === "assistant"
                                                    ? "justify-start"
                                                    : "justify-end"
                                            }`}>
                                            <div
                                                className={`max-w-[85%] rounded-lg p-3 ${
                                                    message.role === "assistant"
                                                        ? "bg-secondary text-secondary-foreground"
                                                        : "bg-primary text-primary-foreground"
                                                }`}>
                                                <div className="flex items-start space-x-2">
                                                    {message.role === "assistant" ? (
                                                        <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    ) : (
                                                        <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    )}
                                                    <div className="text-sm whitespace-pre-line break-words">
                                                        {message.content === "[CONTACT_FORM_LINK]" ? (
                                                            <button
                                                                onClick={handleContactFormClick}
                                                                className="text-primary underline hover:text-primary/80 transition-colors font-medium">
                                                                👉 Fill out our contact form
                                                            </button>
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
                                                                animationDelay: "0ms",
                                                            }}></div>
                                                        <div
                                                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                            style={{
                                                                animationDelay: "150ms",
                                                            }}></div>
                                                        <div
                                                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                            style={{
                                                                animationDelay: "300ms",
                                                            }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t border-border flex-shrink-0">
                                <div className="flex space-x-2">
                                    <Input
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type your message..."
                                        className="flex-1"
                                        disabled={isTyping}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        size="icon"
                                        disabled={isTyping || !inputMessage.trim()}
                                        className="flex-shrink-0">
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
