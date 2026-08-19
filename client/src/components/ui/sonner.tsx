"use client";

// libs
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
// types
import type { CSSProperties } from "react";
import type { ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={3000}
      richColors
      position="top-center"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)"
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
