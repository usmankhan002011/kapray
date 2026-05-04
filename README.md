# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

---

npx expo run:android

---

& {
Set-Location "C:\DEV\kapray\kapray"

function Show-CustomTree {
param(
[string]$Path = ".",
      [string]$Prefix = "",
[int]$Level = 0,
      [int]$MaxDepth = 8,
[string[]]$Exclude = @(
"node_modules","android","ios",".git",".expo","build","web-build",
".yarn",".pnpm-store",".turbo","dist","coverage",".next",".output",".cache"
)
)

    $resolved = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path

    if ($Level -eq 0) {
      Write-Output (Split-Path -Leaf $resolved)
    }

    if ($Level -ge $MaxDepth) { return }

    $items = @(
      Get-ChildItem -LiteralPath $resolved -Force -ErrorAction SilentlyContinue |
        Where-Object { $Exclude -notcontains $_.Name } |
        Sort-Object @{ Expression = { $_.PSIsContainer }; Descending = $true },
                    @{ Expression = { $_.Name }; Ascending = $true }
    )

    for ($idx = 0; $idx -lt $items.Count; $idx++) {
      $item = $items[$idx]
      $isLast = ($idx -eq $items.Count - 1)

      $branch = if ($isLast) { "└── " } else { "├── " }
      Write-Output ("{0}{1}{2}" -f $Prefix, $branch, $item.Name)

      if ($item.PSIsContainer) {
        $nextPrefix = $Prefix + $(if ($isLast) { "    " } else { "│   " })
        Show-CustomTree -Path $item.FullName -Prefix $nextPrefix -Level ($Level + 1) -MaxDepth $MaxDepth -Exclude $Exclude
      }
    }

}

Show-CustomTree -Path "." -MaxDepth 8 | Tee-Object -FilePath ".\tree.txt"
}

> > }

kapray
├── .idea
│ ├── caches
│ │ └── deviceStreaming.xml
│ ├── kapray.iml
│ ├── misc.xml
│ ├── modules.xml
│ ├── vcs.xml
│ └── workspace.xml
├── .vscode
│ ├── .react
│ ├── extensions.json
│ └── settings.json
├── app
│ ├── (auth)
│ │ ├── buyer
│ │ │ ├── signin.tsx
│ │ │ └── signup.tsx
│ │ └── vendor
│ │ ├── signin.tsx
│ │ └── signup.tsx
│ ├── (buyer)
│ │ ├── dye_palette_modal.tsx
│ │ ├── review-vendor-modal.tsx
│ │ ├── view-product.tsx
│ │ └── view-profile.tsx
│ ├── (tabs)
│ │ ├── flow
│ │ │ ├── orders
│ │ │ │ ├── [id].tsx
│ │ │ │ ├── index.tsx
│ │ │ │ └── track.tsx
│ │ │ ├── purchase
│ │ │ │ ├── \_layout.tsx
│ │ │ │ ├── cart.tsx
│ │ │ │ ├── exact-measurements.tsx
│ │ │ │ ├── exact-measurements-export.ts
│ │ │ │ ├── exact-measurements-modal.tsx
│ │ │ │ ├── exact-measurements-sheet.tsx
│ │ │ │ ├── payment.tsx
│ │ │ │ ├── place-order.tsx
│ │ │ │ └── size.tsx
│ │ │ ├── \_layout.tsx
│ │ │ ├── confirmation.tsx
│ │ │ ├── results-filters.tsx
│ │ │ ├── vendor-search.tsx
│ │ │ └── view-product.tsx
│ │ ├── \_layout.tsx
│ │ ├── index.tsx
│ │ └── shops.tsx
│ ├── couriers
│ │ └── components
│ ├── orders
│ │ ├── [id].tsx
│ │ ├── index.tsx
│ │ └── track.tsx
│ ├── purchase
│ │ ├── \_layout.tsx
│ │ ├── cart.tsx
│ │ ├── payment.tsx
│ │ ├── place-order.tsx
│ │ └── size.tsx
│ ├── services
│ ├── tailors
│ │ └── components
│ │ ├── TailoringCheckoutBlock.tsx
│ │ └── TailoringOfferCard.tsx
│ ├── vendor
│ │ ├── profile
│ │ │ ├── (product-modals)
│ │ │ │ ├── dyeing
│ │ │ │ │ ├── dye_palette_modal.tsx
│ │ │ │ │ └── palette.ts
│ │ │ │ ├── more-description
│ │ │ │ │ ├── care.tsx
│ │ │ │ │ ├── disclaimer.tsx
│ │ │ │ │ ├── dupatta.tsx
│ │ │ │ │ ├── fabric-work.tsx
│ │ │ │ │ ├── hook.tsx
│ │ │ │ │ ├── index.tsx
│ │ │ │ │ ├── occasion.tsx
│ │ │ │ │ ├── replica.tsx
│ │ │ │ │ └── trouser.tsx
│ │ │ │ ├── \_layout.tsx
│ │ │ │ ├── color_modal.tsx
│ │ │ │ ├── dress-type_modal.tsx
│ │ │ │ ├── fabric_modal.tsx
│ │ │ │ ├── origin-city_modal.tsx
│ │ │ │ ├── wear-state_modal.tsx
│ │ │ │ ├── work_modal.tsx
│ │ │ │ ├── work-density_modal.tsx
│ │ │ │ └── work-subtypes_modal.tsx
│ │ │ ├── add-product
│ │ │ │ ├── \_layout.tsx
│ │ │ │ ├── index.tsx
│ │ │ │ ├── q02-category.tsx
│ │ │ │ ├── q03-made-on-order.tsx
│ │ │ │ ├── q04-inventory.tsx
│ │ │ │ ├── q05a-stitched-total-cost.tsx
│ │ │ │ ├── q05b-unstitched-cost-per-meter.tsx
│ │ │ │ ├── q05c-unstitched-fabric-length.tsx
│ │ │ │ ├── q06a-sizes.tsx
│ │ │ │ ├── q06b2-tailoring-styles.tsx
│ │ │ │ ├── q06b-services-costs.tsx
│ │ │ │ ├── q06c-shipping.tsx
│ │ │ │ ├── q09-images.tsx
│ │ │ │ ├── q10-videos.tsx
│ │ │ │ ├── q11-description.tsx
│ │ │ │ ├── q12-more-description.tsx
│ │ │ │ ├── review.tsx
│ │ │ │ └── submit.tsx
│ │ │ ├── view-product
│ │ │ │ └── index.tsx
│ │ │ ├── \_layout.tsx
│ │ │ ├── add-product_legacy.tsx
│ │ │ ├── edit-vendor.tsx
│ │ │ ├── index.tsx
│ │ │ ├── orders.tsx
│ │ │ ├── products.tsx
│ │ │ ├── reviews.tsx
│ │ │ ├── settings.tsx
│ │ │ ├── update-product.tsx
│ │ │ ├── view-product_legacy.tsx
│ │ │ ├── view-product_legacy_2.tsx
│ │ │ └── view-profile.tsx
│ │ ├── confirmation.tsx
│ │ ├── create-shop.tsx
│ │ └── index.tsx
│ ├── \_layout.tsx
│ ├── color.tsx
│ ├── fabric.tsx
│ ├── index.tsx
│ ├── modal.tsx
│ ├── origin-city.tsx
│ ├── price-band.tsx
│ ├── price-band_legacy.tsx
│ ├── results.tsx
│ ├── results-filters.tsx
│ ├── vendor-search.tsx
│ ├── wear-state.tsx
│ ├── wizard.tsx
│ ├── wizard_legacy.tsx
│ ├── work.tsx
│ └── work-density.tsx
├── assets
│ ├── dress-types-images
│ │ ├── BLOUSE.png
│ │ ├── DUPATTA.png
│ │ ├── FARCHI_LEHNGA.png
│ │ ├── GHARARA.png
│ │ ├── LEHNGA_SET.png
│ │ ├── MAXI_GOWN.png
│ │ ├── PESHWAS_FROCK.png
│ │ ├── SAREE.png
│ │ ├── SHARARA.png
│ │ └── SHIRT_AND_BOTTOM_SET.png
│ ├── fabric-types-images
│ │ ├── CHIFFON.jpg
│ │ ├── COTTON_SILK.jpg
│ │ ├── CREPE_CHIFFON.jpg
│ │ ├── GEORGETTE.jpg
│ │ ├── JAMAWAR.jpg
│ │ ├── KATAN_BROCADE.jpg
│ │ ├── KOREAN_SILK.jpg
│ │ ├── NET.jpg
│ │ ├── ORGANZA.jpg
│ │ ├── SATIN_SILK.jpg
│ │ ├── SILK.jpg
│ │ ├── SILK_CHIFFON.jpg
│ │ ├── SILK_VELVET.jpg
│ │ ├── TISSUE.jpg
│ │ ├── TISSUE_SILK.jpg
│ │ └── VELVET.jpg
│ ├── images
│ │ └── completeLogo.png
│ ├── origin-images
│ │ ├── Bahawalpur.jpg
│ │ ├── Faisalabad_labeled.jpg
│ │ ├── Hyderabad.jpg
│ │ ├── Karachi.jpg
│ │ ├── Lahore.jpg
│ │ ├── Multan.jpg
│ │ ├── Peshawar.jpg
│ │ └── Rawalpindi.jpg
│ ├── work-density-images
│ │ ├── extra-heavy.jpg
│ │ ├── heavy.jpg
│ │ ├── light.png
│ │ └── medium.jpg
│ ├── work-images
│ │ ├── designer.jpg
│ │ ├── gotta.jpg
│ │ ├── machine.jpg
│ │ ├── metallic.jpg
│ │ ├── mirror.jpg
│ │ ├── sequin.jpg
│ │ ├── stone.jpg
│ │ └── thread.jpg
│ ├── work-subtype-images
│ │ ├── designer
│ │ │ ├── 3d_floral_embroidery.jpg
│ │ │ ├── digital_print_embellishment.jpg
│ │ │ └── hand_printed_embroidery.jpg
│ │ ├── gotta
│ │ │ ├── gotta_patti.jpg
│ │ │ └── patch_applique.jpg
│ │ ├── machine
│ │ │ ├── computer_embroidery.jpg
│ │ │ ├── machine_embroidery.jpg
│ │ │ └── machine_embroidery_2.webp
│ │ ├── metallic
│ │ │ ├── dabka.png
│ │ │ ├── kora.png
│ │ │ ├── mukesh.jpg
│ │ │ ├── nakshi.jpg
│ │ │ ├── salma.png
│ │ │ ├── tilla.png
│ │ │ ├── zardozi.jpg
│ │ │ └── zari.png
│ │ ├── mirror
│ │ │ ├── kutch_mirror_work.jpg
│ │ │ └── mirror_work.jpg
│ │ ├── sequin
│ │ │ ├── sequins.jpg
│ │ │ └── sitara.jpg
│ │ ├── stone
│ │ │ ├── bead_work.jpg
│ │ │ ├── cut_dana.jpg
│ │ │ ├── pearl_work.jpg
│ │ │ ├── rhinestones.jpg
│ │ │ └── swarovski_crystal.jpg
│ │ └── thread
│ │ ├── chickenkari.png
│ │ ├── chikankari.jpg
│ │ ├── resham 2.jpg
│ │ ├── resham.jpg
│ │ ├── resham.png
│ │ └── sozni.jpg
│ ├── body measurement chart.jpg
│ └── filter funnel emoji.jpg
├── components
│ ├── auth
│ │ ├── authStyles.ts
│ │ ├── ForgotPasswordModal.tsx
│ │ └── index.ts
│ ├── product
│ │ ├── view-product
│ │ │ ├── TailoringStylePickerModal.tsx
│ │ │ ├── ViewProduct.media.tsx
│ │ │ ├── ViewProduct.screen.tsx
│ │ │ ├── ViewProduct.styles.ts
│ │ │ ├── ViewProduct.tailoring.helpers.ts
│ │ │ ├── ViewProduct.tailoring.selection.tsx
│ │ │ ├── ViewProduct.tailoring.tsx
│ │ │ └── ViewProductScreen_legacy
│ │ ├── addProductStyles.ts
│ │ ├── ProductDraftContext.tsx
│ │ └── useAutoFocus.ts
│ ├── ui
│ │ ├── collapsible.tsx
│ │ ├── icon-symbol.ios.tsx
│ │ ├── icon-symbol.tsx
│ │ ├── select-panel.tsx
│ │ └── StandardFilterDisplay.tsx
│ ├── vendor-reviews
│ │ ├── ReviewList.tsx
│ │ ├── ReviewSummaryCard.tsx
│ │ └── StarRating.tsx
│ ├── Wizard
│ │ ├── GradientInputCard.tsx
│ │ ├── VendorReviewSummary.tsx
│ │ ├── WizardScraffold.tsx
│ │ └── wizardTypes.ts
│ ├── AppStarter.tsx
│ ├── external-link.tsx
│ ├── haptic-tab.tsx
│ ├── hello-wave.tsx
│ ├── parallax-scroll-view.tsx
│ ├── themed-text.tsx
│ └── themed-view.tsx
├── constants
│ └── theme.ts
├── data
│ ├── kapray
│ │ ├── courierSlabs.ts
│ │ ├── exportRegions.ts
│ │ ├── pakistanCities.ts
│ │ ├── productTypes.ts
│ │ └── tailoringOptions.ts
│ ├── products.data.ts
│ └── workSubTypes.ts
├── hooks
│ ├── use-color-scheme.ts
│ ├── use-color-scheme.web.ts
│ └── use-theme-color.ts
├── scripts
│ └── reset-project.js
├── store
│ ├── buyerSlice.ts
│ ├── filtersSlice.ts
│ ├── hooks.ts
│ ├── index.ts
│ └── vendorSlice.ts
├── utils
│ ├── auth
│ │ ├── googleAuth.ts
│ │ └── logout.ts
│ ├── helpers
│ │ └── wizardHelpers.ts
│ ├── kapray
│ │ ├── delivery.ts
│ │ ├── pricing.ts
│ │ └── purchaseUi.ts
│ └── supabase
│ ├── client.ts
│ ├── consumer.ts
│ ├── dressType.ts
│ ├── dressType_legacy.ts
│ ├── fabricType.ts
│ ├── originCity.ts
│ ├── priceBand.ts
│ ├── product.ts
│ ├── supabase.ts
│ ├── supabaseSecrets.ts
│ ├── vendor.ts
│ ├── wearState.ts
│ ├── workDensity.ts
│ └── workType.ts
├── .easignore
├── .gitignore
├── app.json
├── eas.json
├── eslint.config.js
├── expo-env.d.ts
├── package.json
├── package-lock.json
├── README.md
├── tree.txt
├── tree-app.txt
└── tsconfig.json
PS C:\DEV\kapray\kapray>
as on 4May26

---

strategy
file lines < 200
no special button or placeholder for the button. make text as button where required e.g., select, all etc>
no placeholders. keeep the screen contents merged. no styling at this stage. keep styles minimum where required

---

Principle: Styles Standard

Use ViewProduct styles as the single source of truth.

Keep all existing style keys; change only visual values.

Follow the same color palette, radius, spacing, typography, borders, and opacity rules from the standard file.

Prefer:

bg #F8FAFC

cardBg #FFFFFF

border #E5E7EB

blue #2563EB

blueSoft #EEF4FF

text #0F172A

subText #475569

mutedText #64748B

Standard shape rules:

cards 18

buttons 12–14

pills 999

Standard type rules:

titles 18 / 700

section titles 15 / 700

labels 13 / 700

body/meta 13–14 / 500

Standard interaction rules:

soft blue buttons use border #D7E3FF

disabled opacity 0.6

pressed opacity 0.82

In one line:

Do not redesign per file; make every file visually conform to makeViewProductStyles while preserving its original style names and functional layout.

---

rule1:
a. write full file or block whichever is required.
b. only make the discussed and agreed upon changes.
c. dont remove anything else.
d. dont add anything else.
e. inform if any changes done other than the prediscussed and agreed upon changhes

---
