import React from "react";

import MoreDescriptionOptionScreen from "@/components/product/add-product/MoreDescriptionOptionScreen";

const OPTIONS = [
  "Perfect for weddings and festive occasions.",
  "An ideal choice for engagements and formal gatherings.",
  "A must-have addition to your wedding wardrobe.",
  "Best suited for bridal events and celebratory functions.",
  "Ideal for mehndi, barat, and walima ceremonies.",
  "A perfect outfit for festive soirees and evening events.",
  "Designed for formal dinners and wedding receptions.",
  "An elegant choice for party wear and festive styling.",
  "Perfect for making a lasting impression at special occasions.",
  "A refined ensemble for both formal and semi-formal events.",
  "Ideal for bridesmaids and wedding guests.",
  "A timeless option for traditional family celebrations.",
];

export default function OccasionModal() {
  return (
    <MoreDescriptionOptionScreen
      title="Occasion"
      options={OPTIONS}
    />
  );
}
