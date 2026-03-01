// app/vendor/profile/(product-modals)/dyeing/palette.ts

import React from "react";

export interface DyeShade {
  id: string;
  hex: string;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

export function generateDyePalette(): DyeShade[] {
  const hues = [
    0, // Red
    330, // Pink
    30, // Orange
    50, // Yellow
    120, // Green
    170, // Teal
    220, // Blue
    260, // Purple
    30 // Browns / neutrals handled via low saturation
  ];

  const shades: DyeShade[] = [];

  hues.forEach((hue, hueIndex) => {
    for (let i = 0; i < 10; i++) {
      const lightness = 85 - i * 6; // light → dark

      const saturation =
        hueIndex === 8
          ? 25 // neutral/brown band lower saturation
          : 70;

      const hex = hslToHex(hue, saturation, lightness);

      shades.push({
        id: `shade_${hueIndex}_${i}`,
        hex
      });
    }
  });

  return shades;
}

// ✅ Expo Router treats this file as a route because it's inside /app.
// Provide a default component export to remove the warning.
export default function PaletteRoute() {
  return null;
}