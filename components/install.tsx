"use client";
import { useEffect, useState } from "react";
type Prompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function Install() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Prompt);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  if (!prompt) return null;
  return (
    <button
      className="small"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
    >
      Install app
    </button>
  );
}
