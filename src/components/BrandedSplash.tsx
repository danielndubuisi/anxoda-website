import logo from "@/assets/logo.webp";

interface BrandedSplashProps {
  message?: string;
}

export const BrandedSplash = ({ message = "Loading Anxoda…" }: BrandedSplashProps) => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-screen w-full flex flex-col items-center justify-center bg-background gap-4"
  >
    <img
      src={logo}
      alt="Anxoda"
      className="w-16 h-16 animate-pulse"
    />
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" />
    </div>
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

export default BrandedSplash;