import React from "react";

import MoreDescriptionOptionScreen from "@/components/product/add-product/MoreDescriptionOptionScreen";

const OPTIONS = [
  "Paired with a matching silk trouser.",
  "Includes a straight trouser with embroidered hem.",
  "Comes with a traditional gharara for a classic look.",
  "Matched with a plain dyed trouser for balance.",
  "Includes a stylish sharara to complete the festive appeal.",
  "Finished with embroidered organza border on the hem.",
  "Comes with a jamawar trouser for a rich traditional finish.",
  "Paired with a tailored grip trouser for modern elegance.",
  "Includes a beautifully stitched flared trouser.",
  "Coordinated bottom enhances the overall silhouette.",
];

export default function TrouserModal() {
  return (
    <MoreDescriptionOptionScreen
      title="Trouser"
      options={OPTIONS}
    />
  );
}
