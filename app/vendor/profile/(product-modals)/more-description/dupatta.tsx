import React from "react";

import MoreDescriptionOptionScreen from "@/components/product/add-product/MoreDescriptionOptionScreen";

const OPTIONS = [
  "Paired with a beautifully embroidered dupatta featuring a detailed border.",
  "Comes with a matching dupatta finished with scalloped edges.",
  "Includes a contrast dupatta with intricate embellishments.",
  "A delicately embroidered dupatta completes the graceful look.",
  "Finished with a four-sided heavy border for added elegance.",
  "Adorned with fine lace and embellishment detailing.",
  "Lightweight dupatta enhanced with subtle spray work.",
  "Comes with a richly embroidered net dupatta.",
  "Detailed pallu work adds sophistication to the ensemble.",
  "Paired with a soft flowing dupatta for a timeless appeal.",
  "Includes a dupatta with kiran lace finishing.",
  "Contrasting dupatta enhances the overall color harmony.",
];

export default function DupattaModal() {
  return (
    <MoreDescriptionOptionScreen
      title="Dupatta"
      options={OPTIONS}
    />
  );
}
