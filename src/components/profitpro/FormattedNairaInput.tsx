import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: string; // raw numeric string (no commas)
  onChange: (raw: string) => void;
  placeholder?: string;
  id?: string;
  withSymbol?: boolean; // show ₦ prefix
  className?: string;
}

function formatWithCommas(raw: string): string {
  if (!raw) return "";
  // Allow a single trailing dot or partial decimal
  const [intPart, decPart] = raw.split(".");
  const cleanInt = intPart.replace(/\D/g, "");
  if (!cleanInt && decPart === undefined) return "";
  const withCommas = cleanInt ? Number(cleanInt).toLocaleString("en-NG") : "0";
  return decPart !== undefined ? `${withCommas}.${decPart.replace(/\D/g, "")}` : withCommas;
}

function stripToNumeric(input: string): string {
  // Keep digits and at most one dot
  const cleaned = input.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

export const FormattedNairaInput = ({
  value, onChange, placeholder, id, withSymbol = true, className,
}: Props) => {
  return (
    <div className="relative">
      {withSymbol && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₦</span>
      )}
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={cn(withSymbol && "pl-8", className)}
        value={formatWithCommas(value)}
        onChange={(e) => onChange(stripToNumeric(e.target.value))}
        placeholder={placeholder || "0"}
      />
    </div>
  );
};

export const FormattedNumberInput = (props: Omit<Props, "withSymbol">) => (
  <FormattedNairaInput {...props} withSymbol={false} />
);