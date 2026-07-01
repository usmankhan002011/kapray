import React from "react";

import MoreDescriptionOptionScreen from "@/components/product/add-product/MoreDescriptionOptionScreen";

const OPTIONS = [
  "This is an unstitched outfit.",
  "Slight variation in color may occur due to lighting effects.",
  "Accessories shown are not included.",
  "Custom stitching options are available upon request.",
  "Actual product color may vary slightly from the image.",
  "Semi-stitched design for easy customization.",
  "Ready-to-wear option available in standard sizes.",
  "Alteration facility available for perfect fitting.",
  "Unstitched fabric allows personalized tailoring.",
  "Embroidery and embellishments are crafted with precision.",
];

export default function DisclaimerModal() {
  return (
    <MoreDescriptionOptionScreen
      title="Stitching"
      options={OPTIONS}
      primaryCount={6}
    />
  );
}
