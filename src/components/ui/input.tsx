import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "border-input bg-card placeholder:text-muted-foreground aria-[invalid=true]:border-destructive flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "border-input bg-card placeholder:text-muted-foreground aria-[invalid=true]:border-destructive flex min-h-24 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "border-input bg-card flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";
