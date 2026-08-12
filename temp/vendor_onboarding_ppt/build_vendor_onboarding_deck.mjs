import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = String.raw`C:\DEV\kapray\kapray\assets\Kapray vendors onboarfing_extracted images`;
const TMP_DIR = String.raw`C:\DEV\kapray\kapray\temp\vendor_onboarding_ppt`;
const FINAL_PPTX = String.raw`C:\DEV\kapray\kapray\Kapray Vendor Onboarding.pptx`;
const PREVIEW_DIR = path.join(TMP_DIR, "rendered");
const SOURCE_NOTES = path.join(TMP_DIR, "source-notes.txt");

const W = 1280;
const H = 720;
const C = {
  canvas: "#FFFFFF",
  ink: "#101828",
  muted: "#667085",
  faint: "#F2F4F7",
  panel: "#EAECF0",
  rule: "#B8BCC4",
  blue: "#2563EB",
  blueLight: "#EAF2FF",
  greenLight: "#E8F7EF",
  redLight: "#FDECEC",
};

const SOURCE_CHAT = "WhatsApp Chat with Kapray vendors onboarfing.txt";

const slides = [
  {
    kind: "cover",
    title: "Kapray Vendor Onboarding",
    subtitle: "Set up products, services, and orders from the vendor app screens.",
    eyebrow: "VENDOR APP WALKTHROUGH",
    images: [
      ["IMG-20260703-WA0168.jpg", "Choose dress types"],
      ["IMG-20260703-WA0188.jpg", "Review product"],
      ["IMG-20260703-WA0247.jpg", "Fulfil orders"],
    ],
  },
  {
    kind: "process",
    title: "Vendors work through one repeatable loop",
    subtitle: "Every product path follows the same operating rhythm: set up the listing, publish it, then manage buyer orders.",
    steps: [
      ["1", "Choose product path", "Unstitched, ready-to-wear, or made-to-order."],
      ["2", "Add product data", "Title, dress type, stock, price, shipping, media, and details."],
      ["3", "Publish listing", "Review the product record before it becomes visible."],
      ["4", "Maintain live offers", "Update stock, pricing, media, and sale price when needed."],
      ["5", "Fulfil orders", "Pack, dispatch with tracking, and mark delivered."],
    ],
    sources: [SOURCE_CHAT],
  },
  {
    kind: "fourPhones",
    title: "Choose the product path that matches the sale",
    subtitle: "The category choice determines the required fields and the buyer customization flow.",
    phones: [
      ["IMG-20260703-WA0172.jpg", "Unstitched plain"],
      ["IMG-20260710-WA0008.jpg", "Dyeing + tailoring"],
      ["IMG-20260710-WA0084.jpg", "Ready-to-wear"],
      ["IMG-20260712-WA0024.jpg", "Made-to-order"],
    ],
  },
  {
    kind: "leftTextThreePhones",
    title: "Unstitched plain captures fabric details",
    body: "For plain fabric, vendors define what is being sold first: product title, stock length, base price, and available fabric lengths by size.",
    callouts: ["Stock in meters", "Cost per meter", "Size-wise fabric length"],
    phones: [
      ["IMG-20260703-WA0170.jpg", "Product title"],
      ["IMG-20260703-WA0173.jpg", "Inventory"],
      ["IMG-20260703-WA0176.jpg", "Fabric length"],
    ],
  },
  {
    kind: "leftTextThreePhones",
    title: "Shipping and media make listings buyer-ready",
    body: "The listing becomes actionable after the vendor calculates shipping, adds images and video, and fills the product details buyers use to judge fit and quality.",
    callouts: ["Shipping calculator", "Product images and video", "Fabric, work, density, origin"],
    phones: [
      ["IMG-20260703-WA0179.jpg", "Shipping"],
      ["IMG-20260703-WA0181.jpg", "Images"],
      ["IMG-20260703-WA0184.jpg", "Details"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Review and publish the completed product record",
    subtitle: "The review screen gives vendors one last pass across basics, pricing, shipping, media, and description before saving.",
    phones: [
      ["IMG-20260703-WA0188.jpg", "Basics review"],
      ["IMG-20260703-WA0189.jpg", "Pricing and shipping"],
      ["IMG-20260703-WA0191.jpg", "Ready to save"],
      ["IMG-20260703-WA0192.jpg", "Saved confirmation"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Update live products with explicit confirmations",
    subtitle: "Vendors can revise stock, price, media, and sale pricing with explicit confirmation prompts.",
    phones: [
      ["IMG-20260703-WA0197.jpg", "Update product"],
      ["IMG-20260703-WA0201.jpg", "Confirm price"],
      ["IMG-20260703-WA0202.jpg", "Confirm stock"],
      ["IMG-20260703-WA0207.jpg", "Confirm sale"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Buyer views mirror the vendor setup",
    subtitle: "Once published, the customer sees the catalogue, product media, size or fabric choices, and delivery options created by the vendor.",
    phones: [
      ["IMG-20260703-WA0218.jpg", "Catalogue"],
      ["IMG-20260703-WA0220.jpg", "Product view"],
      ["IMG-20260703-WA0224.jpg", "Fabric length"],
      ["IMG-20260703-WA0227.jpg", "Delivery options"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Orders keep buyer choices through fulfilment",
    subtitle: "Order detail screens keep customization, buyer information, payment, delivery, shipping, and tracking together.",
    phones: [
      ["IMG-20260703-WA0226.jpg", "Place order"],
      ["IMG-20260703-WA0234.jpg", "Payment"],
      ["IMG-20260703-WA0235.jpg", "Order detail"],
      ["IMG-20260703-WA0236.jpg", "Delivery tracking"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Fulfil orders from the order detail",
    subtitle: "The order moves through packed, dispatched with courier details, and delivered states.",
    phones: [
      ["IMG-20260703-WA0246.jpg", "Orders tab"],
      ["IMG-20260703-WA0247.jpg", "Mark packed"],
      ["IMG-20260703-WA0249.jpg", "Dispatch"],
      ["IMG-20260703-WA0252.jpg", "Delivered"],
    ],
  },
  {
    kind: "leftTextThreePhones",
    title: "Dyeing and tailoring add service pricing",
    body: "For unstitched products with services, vendors add dyeing cost, tailoring cost, turnaround time, and one or more tailoring styles.",
    callouts: ["Dyeing cost", "Tailoring cost and days", "Reusable style cards"],
    phones: [
      ["IMG-20260710-WA0009.jpg", "Service costs"],
      ["IMG-20260710-WA0014.jpg", "Tailoring styles"],
      ["IMG-20260710-WA0018.jpg", "Saved styles"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Tailoring styles become buyer choices",
    subtitle: "A style can include title, images, extra price, allowed necks, sleeves, trouser options, and additional instructions.",
    phones: [
      ["IMG-20260710-WA0027.jpg", "Edit style"],
      ["IMG-20260710-WA0048.jpg", "Style cards"],
      ["IMG-20260710-WA0054.jpg", "Variations"],
      ["IMG-20260710-WA0055.jpg", "Vendor note"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Custom orders collect shade, style, and measurements",
    subtitle: "The buyer can choose dye shade, tailoring style, standard or exact measurements, then review the full service cost in checkout.",
    phones: [
      ["IMG-20260710-WA0046.jpg", "Shade"],
      ["IMG-20260710-WA0056.jpg", "Size choice"],
      ["IMG-20260710-WA0061.jpg", "Measurements"],
      ["IMG-20260710-WA0063.jpg", "Order summary"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Ready-to-wear uses stock by style and size",
    subtitle: "This path is built for finished stock: choose ready-to-wear, define piece count, add styles, and assign inventory per size.",
    phones: [
      ["IMG-20260710-WA0084.jpg", "Ready-to-wear"],
      ["IMG-20260710-WA0090.jpg", "Pieces"],
      ["IMG-20260710-WA0093.jpg", "Style stock"],
      ["IMG-20260710-WA0098.jpg", "Review"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Ready-to-wear buyers choose style, then size",
    subtitle: "The buyer journey stays simple because vendor stock rules are already structured by style and size.",
    phones: [
      ["IMG-20260710-WA0118.jpg", "Catalogue"],
      ["IMG-20260710-WA0122.jpg", "Choose style"],
      ["IMG-20260710-WA0125.jpg", "Choose size"],
      ["IMG-20260710-WA0130.jpg", "Order detail"],
    ],
  },
  {
    kind: "fourPhones",
    title: "Made-to-order focuses on design and lead time",
    subtitle: "The setup flow captures allowed sizes, package/shipping rules, design names, additional price, and estimated days.",
    phones: [
      ["IMG-20260712-WA0025.jpg", "Size applicability"],
      ["IMG-20260712-WA0028.jpg", "Shipping"],
      ["IMG-20260712-WA0031.jpg", "Design"],
      ["IMG-20260712-WA0040.jpg", "Review"],
    ],
  },
  {
    kind: "leftTextThreePhones",
    title: "Vendor profile builds trust behind the catalogue",
    body: "The app keeps shop identity, services, contact, regions, product list, and catalogue visibility close together so buyers know who is fulfilling the order.",
    callouts: ["Shop identity", "Services and regions", "Live catalogue"],
    phones: [
      ["IMG-20260712-WA0022.jpg", "Profile"],
      ["IMG-20260712-WA0023.jpg", "Services"],
      ["IMG-20260710-WA0135.jpg", "Catalogue"],
    ],
  },
  {
    kind: "checklist",
    title: "Onboarding checklist for the first product",
    subtitle: "A smooth vendor session starts with product and fulfilment information ready to enter.",
    checklist: [
      "Shop logo, shop name, contact, address, service areas, and export regions.",
      "Product path: unstitched plain, dyeing, tailoring, ready-to-wear, or made-to-order.",
      "Product media: clear images, optional video, and style-specific photos.",
      "Pricing: base price, sale price rules, service add-ons, and style extra costs.",
      "Inventory: fabric length, stock by size, or design availability.",
      "Shipping: weight, package dimensions, delivery type, courier, and tracking process.",
      "Order owner: who packs, dispatches, updates tracking, and marks delivery complete.",
    ],
    sources: [SOURCE_CHAT],
  },
];

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function readImage(fileName) {
  return fs.readFile(path.join(ROOT, fileName));
}

function imageSources(config) {
  const names = [];
  if (config.images) names.push(...config.images.map((item) => item[0]));
  if (config.phones) names.push(...config.phones.map((item) => item[0]));
  return names;
}

function setNotes(slide, config) {
  const names = imageSources(config);
  const lines = ["[Sources]"];
  if (names.length > 0) {
    lines.push(`User-provided Kapray screenshots: ${names.join(", ")}`);
  }
  const extra = config.sources || [];
  if (extra.length > 0) {
    lines.push(`User-provided context: ${extra.join(", ")}`);
  }
  if (names.length === 0 && extra.length === 0) {
    lines.push(`User-provided context: ${SOURCE_CHAT}`);
  }
  slide.speakerNotes.textFrame.setText(lines);
  slide.speakerNotes.setVisible(true);
}

function addShape(slide, position, fill = "none", line = { style: "solid", fill: "none", width: 0 }) {
  return slide.shapes.add({
    geometry: "rect",
    position,
    fill,
    line,
  });
}

function addText(slide, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: style.fontSize ?? 18,
    bold: style.bold ?? false,
    color: style.color ?? C.ink,
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "top",
    typeface: "Helvetica Neue",
    ...style.extra,
  };
  return shape;
}

function addHeader(slide, title, subtitle, index) {
  addText(slide, title, { left: 48, top: 36, width: 1100, height: 72 }, {
    fontSize: 38,
    bold: true,
    color: C.ink,
  });
  if (subtitle) {
    addText(slide, subtitle, { left: 49, top: 112, width: 900, height: 52 }, {
      fontSize: 20,
      color: C.muted,
    });
  }
  addShape(slide, { left: 48, top: 162, width: 1184, height: 1 }, C.rule, { style: "solid", fill: C.rule, width: 0 });
  addFooter(slide, index);
}

function addFooter(slide, index) {
  addText(slide, String(index).padStart(2, "0"), { left: 1185, top: 666, width: 48, height: 24 }, {
    fontSize: 12,
    color: C.muted,
    alignment: "right",
  });
}

async function addPhone(slide, fileName, label, frame, options = {}) {
  const bytes = await readImage(fileName);
  const backing = slide.shapes.add({
    geometry: "roundRect",
    position: frame,
    fill: options.fill ?? "#F8FAFC",
    line: { style: "solid", fill: C.rule, width: 1 },
    borderRadius: "rounded-xl",
  });
  backing.name = `Frame ${label}`;
  slide.images.add({
    blob: bytes,
    contentType: "image/jpeg",
    alt: label,
    fit: "contain",
    position: {
      left: frame.left + 6,
      top: frame.top + 6,
      width: frame.width - 12,
      height: frame.height - 12,
    },
    geometry: "rect",
  });
  addText(slide, label, { left: frame.left, top: frame.top + frame.height + 8, width: frame.width, height: 26 }, {
    fontSize: 16,
    color: C.ink,
    bold: true,
    alignment: "center",
  });
}

async function addPhoneRow(slide, phones, top = 170) {
  const width = 230;
  const height = 480;
  const gap = 28;
  const total = phones.length * width + (phones.length - 1) * gap;
  const left = (W - total) / 2;
  for (let i = 0; i < phones.length; i += 1) {
    await addPhone(slide, phones[i][0], phones[i][1], {
      left: left + i * (width + gap),
      top,
      width,
      height,
    });
  }
}

async function buildCover(presentation, config, index) {
  const slide = presentation.slides.add();
  slide.background.fill = C.canvas;
  addText(slide, config.eyebrow, { left: 48, top: 44, width: 380, height: 28 }, {
    fontSize: 16,
    bold: true,
    color: C.blue,
  });
  addText(slide, config.title, { left: 48, top: 178, width: 590, height: 178 }, {
    fontSize: 64,
    bold: true,
    color: C.ink,
  });
  addText(slide, config.subtitle, { left: 50, top: 390, width: 480, height: 92 }, {
    fontSize: 24,
    color: C.muted,
  });
  addShape(slide, { left: 48, top: 562, width: 420, height: 2 }, C.ink, { style: "solid", fill: C.ink, width: 0 });
  const frames = [
    { left: 710, top: 54, width: 205, height: 430 },
    { left: 936, top: 116, width: 205, height: 430 },
    { left: 808, top: 246, width: 205, height: 430 },
  ];
  for (let i = 0; i < config.images.length; i += 1) {
    await addPhone(slide, config.images[i][0], config.images[i][1], frames[i]);
  }
  addFooter(slide, index);
  setNotes(slide, config);
}

function buildProcess(presentation, config, index) {
  const slide = presentation.slides.add();
  slide.background.fill = C.canvas;
  addHeader(slide, config.title, config.subtitle, index);
  const top = 232;
  const left = 58;
  const gap = 18;
  const width = 222;
  for (let i = 0; i < config.steps.length; i += 1) {
    const [number, heading, detail] = config.steps[i];
    const x = left + i * (width + gap);
    if (i > 0) {
      addShape(slide, { left: x - gap + 4, top: top + 38, width: gap - 8, height: 2 }, C.rule, { style: "solid", fill: C.rule, width: 0 });
    }
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: x, top: top, width: 58, height: 58 },
      fill: i === 0 ? C.blue : C.faint,
      line: { style: "solid", fill: i === 0 ? C.blue : C.rule, width: 1 },
    });
    addText(slide, number, { left: x, top: top + 10, width: 58, height: 38 }, {
      fontSize: 24,
      bold: true,
      color: i === 0 ? "#FFFFFF" : C.ink,
      alignment: "center",
    });
    addText(slide, heading, { left: x, top: top + 92, width, height: 70 }, {
      fontSize: 24,
      bold: true,
      color: C.ink,
    });
    addText(slide, detail, { left: x, top: top + 170, width, height: 110 }, {
      fontSize: 18,
      color: C.muted,
    });
  }
  addShape(slide, { left: 58, top: 588, width: 1080, height: 1 }, C.rule, { style: "solid", fill: C.rule, width: 0 });
  addText(slide, "Use this loop during live onboarding: create one product, test the buyer view, then process a sample order.", {
    left: 60,
    top: 608,
    width: 1060,
    height: 46,
  }, { fontSize: 20, bold: true, color: C.ink });
  setNotes(slide, config);
}

async function buildFourPhones(presentation, config, index) {
  const slide = presentation.slides.add();
  slide.background.fill = C.canvas;
  addHeader(slide, config.title, config.subtitle, index);
  await addPhoneRow(slide, config.phones, 174);
  setNotes(slide, config);
}

async function buildLeftTextThreePhones(presentation, config, index) {
  const slide = presentation.slides.add();
  slide.background.fill = C.canvas;
  addHeader(slide, config.title, "", index);
  addText(slide, config.body, { left: 52, top: 180, width: 350, height: 150 }, {
    fontSize: 22,
    color: C.ink,
  });
  const calloutTop = 382;
  for (let i = 0; i < config.callouts.length; i += 1) {
    const y = calloutTop + i * 72;
    slide.shapes.add({
      geometry: "roundRect",
      position: { left: 54, top: y, width: 36, height: 36 },
      fill: C.blueLight,
      line: { style: "solid", fill: C.blueLight, width: 1 },
      borderRadius: "rounded-lg",
    });
    addText(slide, String(i + 1), { left: 54, top: y + 5, width: 36, height: 24 }, {
      fontSize: 18,
      bold: true,
      color: C.blue,
      alignment: "center",
    });
    addText(slide, config.callouts[i], { left: 108, top: y + 3, width: 270, height: 34 }, {
      fontSize: 20,
      bold: true,
      color: C.ink,
    });
  }
  const width = 226;
  const height = 470;
  const gap = 24;
  const left = 472;
  for (let i = 0; i < config.phones.length; i += 1) {
    await addPhone(slide, config.phones[i][0], config.phones[i][1], {
      left: left + i * (width + gap),
      top: 174,
      width,
      height,
    });
  }
  setNotes(slide, config);
}

function buildChecklist(presentation, config, index) {
  const slide = presentation.slides.add();
  slide.background.fill = C.canvas;
  addHeader(slide, config.title, config.subtitle, index);
  const left = 76;
  const top = 202;
  const colGap = 44;
  const colWidth = 525;
  for (let i = 0; i < config.checklist.length; i += 1) {
    const col = i < 4 ? 0 : 1;
    const row = col === 0 ? i : i - 4;
    const x = left + col * (colWidth + colGap);
    const y = top + row * 100;
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: x, top: y + 4, width: 30, height: 30 },
      fill: C.greenLight,
      line: { style: "solid", fill: "#A3D9B1", width: 1 },
    });
    addText(slide, String(i + 1), { left: x, top: y + 8, width: 30, height: 22 }, {
      fontSize: 16,
      bold: true,
      color: "#147A37",
      alignment: "center",
    });
    addText(slide, config.checklist[i], { left: x + 46, top: y, width: colWidth - 46, height: 68 }, {
      fontSize: 18,
      color: C.ink,
    });
  }
  addShape(slide, { left: 76, top: 626, width: 1080, height: 1 }, C.rule, { style: "solid", fill: C.rule, width: 0 });
  addText(slide, "Recommended live exercise: add one real product, preview it as a buyer, place a test order, and move it through delivery.", {
    left: 78,
    top: 642,
    width: 1040,
    height: 42,
  }, { fontSize: 18, bold: true, color: C.ink });
  setNotes(slide, config);
}

async function build() {
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });
  const sourceLines = [
    "Kapray Vendor Onboarding deck",
    "",
    "Source folder:",
    ROOT,
    "",
    "Section and sequencing source:",
    path.join(ROOT, SOURCE_CHAT),
    "",
    "Screenshots used:",
  ];

  for (let i = 0; i < slides.length; i += 1) {
    const config = slides[i];
    if (config.kind === "cover") await buildCover(presentation, config, i + 1);
    if (config.kind === "process") buildProcess(presentation, config, i + 1);
    if (config.kind === "fourPhones") await buildFourPhones(presentation, config, i + 1);
    if (config.kind === "leftTextThreePhones") await buildLeftTextThreePhones(presentation, config, i + 1);
    if (config.kind === "checklist") buildChecklist(presentation, config, i + 1);
    const names = imageSources(config);
    if (names.length > 0) {
      sourceLines.push(`Slide ${i + 1}: ${names.join(", ")}`);
    } else if (config.sources) {
      sourceLines.push(`Slide ${i + 1}: ${config.sources.join(", ")}`);
    }
  }

  await fs.writeFile(SOURCE_NOTES, `${sourceLines.join("\n")}\n`, "utf8");

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await writeBlob(path.join(PREVIEW_DIR, `${stem}.png`), png);
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(PREVIEW_DIR, `${stem}.layout.json`), await layout.text(), "utf8");
  }

  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await writeBlob(path.join(PREVIEW_DIR, "deck-montage.webp"), montage);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL_PPTX);
  console.log(FINAL_PPTX);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
