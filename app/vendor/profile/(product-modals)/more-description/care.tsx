import React from "react";

import MoreDescriptionOptionScreen from "@/components/product/add-product/MoreDescriptionOptionScreen";

const OPTIONS = [
  "Dry clean recommended to maintain fabric quality.",
  "Handle with care to preserve delicate embellishments.",
  "Do not bleach or use harsh detergents.",
  "Iron on low heat from the reverse side.",
  "Store in a cool, dry place away from direct sunlight.",
  "Avoid wringing to maintain fabric texture.",
  "Keep away from moisture to prevent damage.",
  "Steam iron recommended for best results.",
  "Professional cleaning ensures long-lasting finish.",
  "Handle embroidery and embellishments with extra care.",
];

export default function CareModal() {
  return (
    <MoreDescriptionOptionScreen
      title="Care"
      options={OPTIONS}
      primaryCount={6}
    />
  );
}
