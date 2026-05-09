import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BrandedSplash from "@/components/BrandedSplash";

/**
 * OAuth/email callback landing route.
 * Supabase parses tokens from the URL automatically once the client mounts;
 * we just wait for a session and forward the user to the dashboard.
 * Keeps a branded splash on screen — no NotFound flash.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const finish = (path: string) => {
      if (!cancelled) navigate(path, { replace: true });
    };

    // If a session is already present, go straight in.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish("/dashboard");
    });

    // Otherwise wait for SIGNED_IN.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) finish("/dashboard");
    });

    // Safety net — if nothing happens in 8s, send to /auth with an error flag.
    const timer = window.setTimeout(() => finish("/auth?error=oauth"), 8000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [navigate]);

  return <BrandedSplash message="Signing you in…" />;
};

export default AuthCallback;