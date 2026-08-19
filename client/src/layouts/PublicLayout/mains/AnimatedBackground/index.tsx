"use client";

// libs
import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Mail,
  Users,
  Music,
  Video,
  Camera,
  Image,
  Film,
  Headphones,
  Calendar,
  FileText,
  BookOpen,
  PenTool,
  Briefcase,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  Package,
  Map,
  Navigation,
  Globe,
  Plane,
  Car,
  Settings,
  Search,
  Bell,
  Lock,
  Shield,
  Wifi,
  Zap,
  Cpu,
  Gamepad2,
  Star,
  Heart,
  Bookmark,
  DollarSign,
  BarChart2,
  TrendingUp,
  Smartphone,
  Monitor
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Defined outside component — never recreated
const ALL_ICONS: LucideIcon[] = [
  // Social & Communication
  MessageCircle,
  Mail,
  Users,
  Bell,
  Search,
  // Media & Entertainment
  Music,
  Video,
  Camera,
  Image,
  Film,
  Headphones,
  Gamepad2,
  Star,
  // Productivity & Work
  Calendar,
  FileText,
  BookOpen,
  PenTool,
  Briefcase,
  // Shopping & Finance
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  Package,
  DollarSign,
  BarChart2,
  TrendingUp,
  // Travel & Navigation
  Map,
  Navigation,
  Globe,
  Plane,
  Car,
  // System & Utility
  Settings,
  Lock,
  Shield,
  Wifi,
  Zap,
  Cpu,
  Smartphone,
  Monitor,
  // Lifestyle
  Heart,
  Bookmark
];

interface IconPosition {
  Icon: LucideIcon;
  x: number;
  y: number;
}

const AnimatedBackground = () => {
  const [positions, setPositions] = useState<IconPosition[]>([]);
  const [mounted, setMounted] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const maskLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const width = window.innerWidth;
    const height = window.innerHeight;

    const iconsPerRow = 8;
    const numRows = 5;
    const colWidth = width / iconsPerRow;
    const rowHeight = height / numRows;
    const iconOffset = 20;

    const generatedPositions: IconPosition[] = [];
    let iconIndex = 0;

    for (let row = 0; row < numRows && iconIndex < ALL_ICONS.length; row++) {
      const isEvenRow = row % 2 === 1;
      const offsetX = isEvenRow ? colWidth / 2 : 0;

      for (
        let col = 0;
        col < iconsPerRow && iconIndex < ALL_ICONS.length;
        col++
      ) {
        generatedPositions.push({
          Icon: ALL_ICONS[iconIndex],
          x: col * colWidth + colWidth / 2 + offsetX - iconOffset,
          y: row * rowHeight + rowHeight / 2 - iconOffset
        });
        iconIndex++;
      }
    }

    setPositions(generatedPositions);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const duration = 9890;
    const startTime = Date.now();
    let animationId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % duration) / duration;
      const angle = progress * Math.PI * 2;
      const scale = Math.sin(angle);

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const x = centerX + Math.cos(angle) * (window.innerWidth * 0.35);
      const y = centerY + scale * (window.innerHeight * 0.35);

      // Direct DOM manipulation — zero React re-renders
      // Use transform (composite only) instead of left/top (layout-triggering)
      // translate(x - 450px, y - 450px) replicates the old left/top + -translate-x/y-1/2 centering
      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate(calc(${x}px - 450px), calc(${y}px - 450px))`;
      }
      if (maskLayerRef.current) {
        const mask = `radial-gradient(circle 525px at ${x}px ${y}px, white 0%, transparent 100%)`;
        maskLayerRef.current.style.maskImage = mask;
        maskLayerRef.current.style.webkitMaskImage = mask;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="bg-background absolute inset-0" />
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute size-[900px]"
        style={{ top: 0, left: 0 }}
      >
        <div
          className="h-full w-full rounded-full blur-[150px]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--primary) 35%, transparent) 0%, color-mix(in oklch, var(--primary) 20%, transparent) 30%, transparent 70%)"
          }}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(circle at 20% 20%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 20%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 80%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 80%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, transparent 50%)"
          ].join(", ")
        }}
      />
      <div className="absolute inset-0">
        {positions.map((pos, idx) => (
          <div
            key={idx}
            className="absolute"
            style={{
              left: pos.x,
              top: pos.y,
              opacity: 0.15,
              color: "var(--muted-foreground)"
            }}
          >
            <pos.Icon size={40} strokeWidth={1.5} />
          </div>
        ))}
      </div>
      <div
        ref={maskLayerRef}
        className="absolute inset-0"
        style={{ maskImage: "none", WebkitMaskImage: "none" }}
      >
        {positions.map((pos, idx) => (
          <div
            key={idx}
            className="absolute"
            style={{ left: pos.x, top: pos.y, color: "var(--primary)" }}
          >
            <pos.Icon size={40} strokeWidth={1.5} />
          </div>
        ))}
      </div>
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklch, var(--foreground) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--foreground) 5%, transparent) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
