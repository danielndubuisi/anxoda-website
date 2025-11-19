import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    signUp: (
        email: string,
        password: string,
        metadata?: any
    ) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        // Set up auth state listener FIRST
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (event === "SIGNED_IN") {
                window.location.href = "/dashboard";
            } else if (event === "SIGNED_OUT") {
                window.location.href = "/";
            }
        });

        // THEN check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, metadata?: any) => {
        try {
            const redirectUrl = `${window.location.origin}/`;

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: metadata,
                },
            });

            if (error) {
                toast({
                    title: "Sign up failed",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Sign up successful!",
                    description:
                        "Please check your email to confirm your account.",
                });
            }

            return { error };
        } catch (error: any) {
            toast({
                title: "Sign up failed",
                description: error.message,
                variant: "destructive",
            });
            return { error };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast({
                    title: "Sign in failed",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Welcome back!",
                    description: "You have successfully signed in.",
                });
            }

            return { error };
        } catch (error: any) {
            toast({
                title: "Sign in failed",
                description: error.message,
                variant: "destructive",
            });
            return { error };
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            toast({
                title: "Signed out",
                description: "You have been successfully signed out.",
            });
        } catch (error: any) {
            toast({
                title: "Sign out failed",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    // Google OAuth sign-in
    const signInWithGoogle = async () => {
        const redirectUrl = `${window.location.origin}/dashboard`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: redirectUrl,
            },
        });
        if (error) {
            toast({
                title: "Google sign-in failed",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const value = {
        user,
        session,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
