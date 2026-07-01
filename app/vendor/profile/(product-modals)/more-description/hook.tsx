import React from "react";

import MoreDescriptionOptionScreen from "@/components/product/add-product/MoreDescriptionOptionScreen";

const OPTIONS = [
  "This stunning ensemble is beautifully adorned with intricate detailing.",
  "A breathtaking outfit crafted for timeless elegance.",
  "Step into sophistication with this exquisitely designed attire.",
  "An epitome of grace and luxury for modern women.",
  "This elegant masterpiece reflects refined craftsmanship and premium finishing.",
  "Designed to make you stand out at every special occasion.",
  "A luxurious creation that blends tradition with contemporary charm.",
  "Experience unmatched elegance with this beautifully curated outfit.",
  "A graceful attire that captures the essence of festive glamour.",
  "This captivating design is tailored for women who appreciate fine artistry.",
  "Elevate your formal wardrobe with this statement ensemble.",
  "A regal design inspired by classic bridal aesthetics.",
];

export default function HookModal() {
  return (
    <MoreDescriptionOptionScreen
      title="Luxury Hook"
      options={OPTIONS}
    />
  );
}
