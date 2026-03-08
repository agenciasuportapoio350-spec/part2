import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { formatCurrencyInput, parseCurrencyToNumber } from "../lib/utils";

export function CurrencyInput({ value, onChange, placeholder = "0,00", ...props }) {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    // Quando o valor externo muda, atualiza o display
    if (value !== undefined && value !== null) {
      const numValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
      if (numValue > 0) {
        setDisplayValue(formatCurrencyInput((numValue * 100).toFixed(0)));
      } else {
        setDisplayValue("");
      }
    }
  }, [value]);

  const handleChange = (e) => {
    const input = e.target.value;
    const formatted = formatCurrencyInput(input);
    setDisplayValue(formatted);
    
    // Converte para número e chama onChange
    const numericValue = parseCurrencyToNumber(formatted);
    onChange(numericValue);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
        R$
      </span>
      <Input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10"
        {...props}
      />
    </div>
  );
}
