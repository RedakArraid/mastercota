"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
  PAYSTACK_COUNTRIES,
} from "@/lib/countries";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
  countryIso: string;
  onCountryChange: (iso: string) => void;
  national: string;
  onNationalChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
};

export function PhoneInput({
  countryIso,
  onCountryChange,
  national,
  onNationalChange,
  id = "phone",
  className,
  disabled,
}: PhoneInputProps) {
  const country = getCountryByIso(countryIso || DEFAULT_COUNTRY_ISO);

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={country.iso}
        onValueChange={onCountryChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[138px] shrink-0">
          <span className="flex items-center gap-1.5 text-sm">
            <span aria-hidden>{country.flag}</span>
            <span className="font-medium">{country.dial}</span>
          </span>
        </SelectTrigger>
        <SelectContent align="start" className="max-h-72 min-w-[260px]">
          {PAYSTACK_COUNTRIES.map((c) => (
            <SelectItem key={c.iso} value={c.iso}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span className="font-medium tabular-nums">{c.dial}</span>
                <span className="text-muted-foreground">{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        inputMode="numeric"
        maxLength={country.nationalLength}
        value={national}
        onChange={(e) =>
          onNationalChange(
            e.target.value.replace(/\D/g, "").slice(0, country.nationalLength)
          )
        }
        placeholder={country.placeholder}
        className="flex-1 tracking-wider"
        required
        disabled={disabled}
        autoComplete="tel-national"
      />
    </div>
  );
}
