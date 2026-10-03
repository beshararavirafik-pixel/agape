"use client";
import { useEffect, useState } from "react";
import { formatDate, parseDate } from "@/lib/dates";
export default function DateInput({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
}) {
  const [text, setText] = useState(formatDate(value));
  useEffect(() => setText(formatDate(value)), [value]);
  return (
    <input
      {...props}
      value={text}
      placeholder="MM/DD/YYYY"
      inputMode="numeric"
      pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        const date = parseDate(v);
        e.target.setCustomValidity(
          v && !date ? "Enter a valid date in MM/DD/YYYY format" : "",
        );
        if (date || !v) onChange(date);
      }}
    />
  );
}
