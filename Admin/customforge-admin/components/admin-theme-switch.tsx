"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const choices = [
  { value: "light", label: "Light", description: "Bright, focused workspace", Icon: Sun },
  { value: "dark", label: "Dark", description: "The original Forge palette", Icon: Moon },
  { value: "system", label: "System", description: "Follow your device settings", Icon: Monitor },
];

/** next-themes persists the choice and applies it before paint; defer its UI until hydration. */
export function AdminThemeSwitch({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isLight = mounted && resolvedTheme === "light";
  const Icon = isLight ? Sun : Moon;

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className={`fa-icon-button fa-theme-switch ${className}`} aria-label="Change appearance" title="Change appearance">
        <Icon size={19} aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="fa-theme-menu" aria-label="Appearance preferences">
      <DropdownMenuLabel>Appearance</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup value={mounted ? theme : "dark"} onValueChange={setTheme}>
        {choices.map(({ value, label, description, Icon: ChoiceIcon }) => <DropdownMenuRadioItem key={value} value={value}>
          <ChoiceIcon size={17} aria-hidden="true" />
          <span className="fa-theme-option"><strong>{label}</strong><small>{description}</small></span>
        </DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
