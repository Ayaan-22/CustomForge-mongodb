"use client";

import "@/app/forge-select.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ForgeSelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  describedBy?: string;
  disabled?: boolean;
  className?: string;
};

/** Shared filter field; Radix retains typeahead, keyboard control and focus return. */
export function ForgeSelectField({
  id,
  label,
  value,
  onValueChange,
  options,
  describedBy,
  disabled,
  className,
}: ForgeSelectFieldProps) {
  const labelId = `${id}-label`;
  return (
    <div className={cn("forge-select-field", className)}>
      <label htmlFor={id} id={labelId}>
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          className="forge-select-trigger"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="forge-select-menu"
          position="popper"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          aria-labelledby={labelId}
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              textValue={option.label}
              disabled={option.disabled}
              className="forge-select-option"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
