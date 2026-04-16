import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import type { ExactMeasurementSheetRow } from "./exact-measurements-sheet";

const GUIDE_MAX_HEIGHT = 520;
const PAGE_MARGIN = 12;
const TITLE_FONT_SIZE = 15;
const META_FONT_SIZE = 10;
const TABLE_FONT_SIZE = 10;
const FOOTER_FONT_SIZE = 9;
const BRAND_LOGO_MAX_HEIGHT = 74;

type ExportArgs = {
  title?: string;
  rows: ExactMeasurementSheetRow[];
  inferredSize?: string;
  unit?: string;
  fabricLengthM?: number;
  fabricCostPkr?: number;
  showGuideImage?: boolean;

  orderNo?: string;
  productName?: string;
  buyerName?: string;
  vendorName?: string;
  productCode?: string;
  productCategory?: string;
  note?: string;
};

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasPositive(n?: number) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

async function getLocalImageDataUri(
  moduleRef: any,
  mimeType: "image/jpeg" | "image/png",
) {
  const asset = Asset.fromModule(moduleRef);

  try {
    await asset.downloadAsync();

    const uri = asset.localUri || asset.uri;
    if (!uri) {
      return asset.uri || "";
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64) {
      return asset.uri || uri || "";
    }

    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    console.log("Image fallback used:", e);
    return asset.localUri || asset.uri || "";
  }
}

async function getLocalGuideImageDataUri() {
  return getLocalImageDataUri(
    require("../../../../assets/body measurement chart.jpg"),
    "image/jpeg",
  );
}

async function getLocalBrandLogoDataUri() {
  return getLocalImageDataUri(
    require("../../../../assets/images/completeLogo.png"),
    "image/png",
  );
}

function buildMetaRows(args: ExportArgs) {
  const rows: string[] = [];

  if (args.orderNo) {
    rows.push(
      `<div><span class="meta-label">Order:</span> <strong>${esc(args.orderNo)}</strong></div>`,
    );
  }

  if (args.buyerName) {
    rows.push(
      `<div><span class="meta-label">Buyer:</span> <strong>${esc(args.buyerName)}</strong></div>`,
    );
  }

  if (args.vendorName) {
    rows.push(
      `<div><span class="meta-label">Vendor:</span> <strong>${esc(args.vendorName)}</strong></div>`,
    );
  }

  if (args.productName) {
    rows.push(
      `<div><span class="meta-label">Product:</span> <strong>${esc(args.productName)}</strong></div>`,
    );
  }

  if (args.productCode) {
    rows.push(
      `<div><span class="meta-label">Product code:</span> <strong>${esc(args.productCode)}</strong></div>`,
    );
  }

  if (args.productCategory) {
    rows.push(
      `<div><span class="meta-label">Category:</span> <strong>${esc(args.productCategory)}</strong></div>`,
    );
  }

  if (args.inferredSize) {
    rows.push(
      `<div><span class="meta-label">Nearest size:</span> <strong>${esc(args.inferredSize)}</strong></div>`,
    );
  }

  if (args.unit) {
    rows.push(
      `<div><span class="meta-label">Unit:</span> <strong>${esc(args.unit)}</strong></div>`,
    );
  }

  if (hasPositive(args.fabricLengthM)) {
    rows.push(
      `<div><span class="meta-label">Fabric length:</span> <strong>${args.fabricLengthM} m</strong></div>`,
    );
  }

  if (hasPositive(args.fabricCostPkr)) {
    rows.push(
      `<div><span class="meta-label">Fabric cost:</span> <strong>PKR ${Math.round(
        args.fabricCostPkr,
      )}</strong></div>`,
    );
  }

  return rows.join("");
}

export async function buildExactMeasurementsHTML({
  title = "Exact Measurements",
  rows,
  inferredSize,
  unit,
  fabricLengthM,
  fabricCostPkr,
  showGuideImage = true,
  orderNo,
  productName,
  buyerName,
  vendorName,
  productCode,
  productCategory,
  note,
}: ExportArgs) {
  const sorted = [...rows].sort((a, b) => a.order - b.order);

  const chunked: ExactMeasurementSheetRow[][] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    chunked.push(sorted.slice(i, i + 2));
  }

  const tableRows = chunked.length
    ? chunked
        .map((pair) => {
          const first = pair[0];
          const second = pair[1];

          return `
            <tr>
              <td class="label">${esc(first?.label || "")}</td>
              <td class="value">${esc(first?.value || "")}</td>
              <td class="label">${esc(second?.label || "")}</td>
              <td class="value">${esc(second?.value || "")}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="4" class="empty">No dimensions available.</td></tr>`;

  const [guideImageSrc, brandLogoSrc] = await Promise.all([
    showGuideImage ? getLocalGuideImageDataUri() : null,
    getLocalBrandLogoDataUri(),
  ]);

  const metaHtml = buildMetaRows({
    title,
    rows,
    inferredSize,
    unit,
    fabricLengthM,
    fabricCostPkr,
    showGuideImage,
    orderNo,
    productName,
    buyerName,
    vendorName,
    productCode,
    productCategory,
    note,
  });

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @page {
          size: A4;
          margin: ${PAGE_MARGIN}px;
        }

        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #FFFFFF;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #0F172A;
        }

        .sheet {
          width: 100%;
          margin: 0;
          padding: 0;
        }

        .brand-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border: 1px solid #F6D28B;
          border-radius: 10px;
          background: #FFF7E8;
          margin-bottom: 8px;
          page-break-inside: avoid;
        }

        .brand-logo {
          display: block;
          width: 74px;
          max-height: ${BRAND_LOGO_MAX_HEIGHT}px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .brand-copy {
          min-width: 0;
        }

        .brand-name {
          font-size: 16px;
          font-weight: 800;
          line-height: 1.15;
          color: #0F172A;
          margin: 0 0 2px 0;
        }

        .brand-subtitle {
          font-size: 11px;
          font-weight: 600;
          line-height: 1.25;
          color: #475569;
          margin: 0;
        }

        .title {
          font-size: ${TITLE_FONT_SIZE}px;
          font-weight: 700;
          margin: 0 0 6px 0;
          line-height: 1.2;
        }

        .meta-card {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 3px 8px;
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 8px;
          padding: 6px 8px;
          margin-bottom: 6px;
          font-size: ${META_FONT_SIZE}px;
          line-height: 1.28;
          page-break-inside: avoid;
        }

        .meta-card > div {
          min-width: 0;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        .meta-label {
          color: #475569;
        }

        .guide-wrap {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 6px;
          margin-bottom: 6px;
          page-break-inside: avoid;
        }

        .guide {
          width: 100%;
          max-height: ${GUIDE_MAX_HEIGHT}px;
          object-fit: contain;
          display: block;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          page-break-inside: auto;
        }

        th, td {
          border: 1px solid #E5E7EB;
          padding: 4px 5px;
          vertical-align: top;
        }

        th {
          background: #F8FAFC;
          text-align: left;
          font-size: ${TABLE_FONT_SIZE}px;
          font-weight: 700;
          line-height: 1.15;
        }

        td {
          font-size: ${TABLE_FONT_SIZE}px;
          line-height: 1.22;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .label {
          width: 30%;
          color: #475569;
          font-weight: 600;
        }

        .value {
          width: 20%;
          color: #0F172A;
          font-weight: 700;
        }

        .empty {
          text-align: center;
          color: #64748B;
          font-weight: 500;
        }

        .footer-note {
          margin-top: 6px;
          padding: 6px 8px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: #F8FAFC;
          font-size: ${TABLE_FONT_SIZE}px;
          line-height: 1.28;
          color: #475569;
          page-break-inside: avoid;
        }

        .footer-mini {
          margin-top: 4px;
          font-size: ${FOOTER_FONT_SIZE}px;
          color: #64748B;
          text-align: right;
        }
      </style>
    </head>

    <body>
      <div class="sheet">
        ${
          brandLogoSrc
            ? `
            <div class="brand-card">
              <img class="brand-logo" src="${brandLogoSrc}" />
              <div class="brand-copy">
                <div class="brand-name">Kapray Bridal & Fashion</div>
                <div class="brand-subtitle">Exact Measurement Sheet</div>
              </div>
            </div>
          `
            : ""
        }

        <div class="title">${esc(title)}</div>

        ${metaHtml ? `<div class="meta-card">${metaHtml}</div>` : ""}

        ${
          guideImageSrc
            ? `
            <div class="guide-wrap">
              <img class="guide" src="${guideImageSrc}" />
            </div>
          `
            : ""
        }

        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Value</th>
              <th>Dimension</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        ${
          note
            ? `<div class="footer-note"><strong>Note:</strong> ${esc(note)}</div>`
            : ""
        }

        <div class="footer-mini">Kapray • Exact Measurements</div>
      </div>
    </body>
  </html>
  `;
}

export async function printExactMeasurements(args: ExportArgs) {
  const html = await buildExactMeasurementsHTML(args);
  await Print.printAsync({ html });
}

export async function shareExactMeasurements(args: ExportArgs) {
  const html = await buildExactMeasurementsHTML(args);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  if (Platform.OS === "android" || Platform.OS === "ios") {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share Exact Measurements",
      UTI: "com.adobe.pdf",
    });
  }
}
