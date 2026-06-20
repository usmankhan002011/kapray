import React from "react";

import MoreDescriptionOptionScreen from "@/components/product/add-product/MoreDescriptionOptionScreen";

const OPTIONS = [
  "Premium quality master replica with fine finishing.",
  "Designer-inspired craftsmanship at an affordable price.",
  "Inspired by leading Pakistani luxury designers.",
  "High-quality replica offering elegant finishing.",
  "Expertly recreated design with premium detailing.",
  "A designer-inspired ensemble crafted with care.",
  "Luxury-inspired outfit at a competitive price.",
  "Carefully crafted replica with attention to detail.",
  "An affordable alternative to high-end couture.",
  "Designer-style elegance without the premium price tag.",
  "Premium inspired design with exceptional workmanship.",
];

export default function ReplicaModal() {
  return (
    <MoreDescriptionOptionScreen
      title="Designer Inspired"
      options={OPTIONS}
    />
  );
}
