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
  const colorBands = [
    { hue: 0, saturation: 78, minLightness: 31 },
    { hue: 350, saturation: 74, minLightness: 31 },
    { hue: 330, saturation: 72, minLightness: 31 },
    { hue: 300, saturation: 60, minLightness: 31 },
    { hue: 280, saturation: 62, minLightness: 31 },
    { hue: 260, saturation: 66, minLightness: 31 },
    { hue: 235, saturation: 70, minLightness: 31 },
    { hue: 220, saturation: 72, minLightness: 31 },
    { hue: 200, saturation: 72, minLightness: 31 },
    { hue: 180, saturation: 66, minLightness: 31 },
    { hue: 165, saturation: 64, minLightness: 31 },
    { hue: 145, saturation: 62, minLightness: 31 },
    { hue: 120, saturation: 62, minLightness: 31 },
    { hue: 90, saturation: 62, minLightness: 31 },
    { hue: 65, saturation: 70, minLightness: 31 },
    { hue: 50, saturation: 78, minLightness: 31 },
    { hue: 38, saturation: 78, minLightness: 30 },
    { hue: 25, saturation: 74, minLightness: 30 },
    { hue: 15, saturation: 66, minLightness: 30 },
    { hue: 30, saturation: 42, minLightness: 25 },
    { hue: 28, saturation: 30, minLightness: 25 },
    { hue: 40, saturation: 16, minLightness: 26 },
    { hue: 210, saturation: 8, minLightness: 20 },
    { hue: 35, saturation: 8, minLightness: 20 },
    { hue: 0, saturation: 0, minLightness: 5 },
  ];

  const shades: DyeShade[] = [];

  colorBands.forEach((band, bandIndex) => {
    const layerCount = 14;
    const step = (96 - band.minLightness) / (layerCount - 1);
    const lightnessLayers = Array.from({ length: layerCount }, (_, index) =>
      Math.round(96 - step * index),
    );

    lightnessLayers.forEach((lightness, layerIndex) => {
      shades.push({
        id: `shade_${bandIndex}_${layerIndex}`,
        hex: hslToHex(band.hue, band.saturation, lightness),
      });
    });
  });

  return shades;
}
