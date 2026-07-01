import React from "react";

import MoreDescriptionOptionScreen from "@/components/product/add-product/MoreDescriptionOptionScreen";

const OPTIONS = [
  "The shirt features detailed embroidery with fine craftsmanship.",
  "Intricate zari, dabka and sequin work enhances its luxurious appeal.",
  "Fully embroidered front with delicate hand embellishments.",
  "Premium fabric base with rich traditional artistry.",
  "Adorned with heavy thread and sequin embroidery throughout.",
  "Beautifully embellished neckline with pearls and crystal accents.",
  "Fine resham embroidery adds depth and texture to the design.",
  "Enhanced with traditional zardozi and nakshi detailing.",
  "Delicate spray work on the back complements the ornate front.",
  "Handcrafted embellishments reflect superior finishing quality.",
  "Expertly designed panels with intricate embroidery patterns.",
  "Embellished sleeves add extra elegance to the overall look.",
];

export default function FabricWorkModal() {
  return (
    <MoreDescriptionOptionScreen
      title="Fabric & Work"
      options={OPTIONS}
    />
  );
}
