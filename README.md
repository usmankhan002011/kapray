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
-------------------------------------------------------------------------------------------
npx expo run:android

-------------------------------------------------------------------------------------------
PS C:\DEV\kapray\kapray> function Show-CustomTree {
>>   param(
>>     [string]$Path = ".",
>>     [int]$Level = 0,
>>     [int]$MaxDepth = 99,
>>     [string[]]$Exclude = @(
>>       "node_modules","android","ios",".git",".expo","build","web-build",
>>       ".yarn",".pnpm-store",".turbo","dist","coverage",".next",".output",".cache"
>>     )
>>   )
>>
>>   $resolved = Resolve-Path -LiteralPath $Path -ErrorAction Stop
>>
>>   if ($Level -eq 0) {
>>     Write-Output (Split-Path -Leaf $resolved.Path)
>>   }
>>
>>   if ($Level -ge ($MaxDepth - 1)) { return }
>>
>>   $items = Get-ChildItem -LiteralPath $resolved.Path -Force -ErrorAction SilentlyContinue |
>>     Where-Object { $Exclude -notcontains $_.Name } |
>>     Sort-Object `
>>       @{ Expression = { $_.PSIsContainer }; Descending = $true }, `
>>       @{ Expression = { $_.Name }; Ascending = $true }
>>
>>   for ($idx = 0; $idx -lt $items.Count; $idx++) {
>>     $item = $items[$idx]
>>     $isLast = ($idx -eq $items.Count - 1)
>>
>>     $indent = ""
>>     if ($Level -ge 1) {
>>       for ($i = 0; $i -lt ($Level - 1); $i++) { $indent += "│   " }
>>       $indent += $(if ($isLast) { "└── " } else { "├── " })
>>     } else {
>>       $indent += $(if ($isLast) { "└── " } else { "├── " })
>>     }
>>
>>     Write-Output "$indent$($item.Name)"
>>
>>     if ($item.PSIsContainer) {
>>       Show-CustomTree `
>>         -Path $item.FullName `
>>         -Level ($Level + 1) `
>>         -MaxDepth $MaxDepth `
>>         -Exclude $Exclude
>>     }
>>   }
>> }
PS C:\DEV\kapray\kapray>
PS C:\DEV\kapray\kapray> Set-Location "C:\DEV\kapray\kapray"
PS C:\DEV\kapray\kapray> Show-CustomTree -MaxDepth 8 | Tee-Object -FilePath ".\tree.txt"
kapray
├── .idea
├── caches
│   └── deviceStreaming.xml
├── kapray.iml
├── misc.xml
├── modules.xml
├── vcs.xml
└── workspace.xml
├── .vscode
├── .react
├── extensions.json
└── settings.json
├── app
├── (tabs)
│   ├── _layout.tsx
│   ├── index.tsx
│   └── shops.tsx
├── vendor
│   ├── profile
│   │   ├── (product-modals)
│   │   │   ├── _layout.tsx
│   │   │   ├── color_modal.tsx
│   │   │   ├── dress-type_modal.tsx
│   │   │   ├── fabric_modal.tsx
│   │   │   ├── origin-city_modal.tsx
│   │   │   ├── wear-state_modal.tsx
│   │   │   ├── work_modal.tsx
│   │   │   └── work-density_modal.tsx
│   │   ├── _layout.tsx
│   │   ├── add-product.tsx
│   │   ├── index.tsx
│   │   ├── products.tsx
│   │   ├── settings.tsx
│   │   ├── update.tsx
│   │   ├── view-product.tsx
│   │   └── view-profile.tsx
│   ├── confirmation.tsx
│   ├── create-shop.tsx
│   └── index.tsx
├── _layout.tsx
├── color.tsx
├── fabric.tsx
├── index.tsx
├── modal.tsx
├── origin-city.tsx
├── price-band.tsx
├── wear-state.tsx
├── wizard.tsx
├── work.tsx
└── work-density.tsx
├── assets
├── fabric-types-images
│   ├── CHIFFON.jpg
│   ├── GEORGETTE.jpg
│   ├── JAMAWAR.jpg
│   ├── NET.jpg
│   ├── ORGANZA.jpg
│   ├── SILK.jpg
│   ├── TISSUE.jpg
│   └── VELVET.jpg
├── images
│   └── completeLogo.png
├── origin-images
│   ├── Bahawalpur.jpg
│   ├── Faisalabad_labeled.jpg
│   ├── Hyderabad.jpg
│   ├── Karachi.jpg
│   ├── Lahore.jpg
│   ├── Multan.jpg
│   ├── Peshawar.jpg
│   └── Rawalpindi.jpg
├── work-density-images
│   ├── extra-heavy.jpg
│   ├── heavy.jpg
│   ├── light.png
│   └── medium.jpg
├── work-images
│   ├── designer.jpg
│   ├── gotta.jpg
│   ├── machine.jpg
│   ├── mirror.jpg
│   ├── sequin.jpg
│   ├── stone.jpg
│   ├── thread.jpg
│   └── zardozi.jpg
└── sizes outline.jpg
├── components
├── product
│   └── ProductDraftContext.tsx
├── ui
│   ├── collapsible.tsx
│   ├── icon-symbol.ios.tsx
│   ├── icon-symbol.tsx
│   ├── select-panel.tsx
│   └── StandardFilterDisplay.tsx
├── external-link.tsx
├── haptic-tab.tsx
├── hello-wave.tsx
├── parallax-scroll-view.tsx
├── themed-text.tsx
└── themed-view.tsx
├── constants
└── theme.ts
├── data
└── products.data.ts
├── hooks
├── use-color-scheme.ts
├── use-color-scheme.web.ts
└── use-theme-color.ts
├── scripts
└── reset-project.js
├── store
├── filtersSlice.ts
├── hooks.ts
├── index.ts
└── vendorSlice.ts
├── utils
└── supabase
│   ├── client.ts
│   ├── consumer.ts
│   ├── dressType.ts
│   ├── fabricType.ts
│   ├── originCity.ts
│   ├── priceBand.ts
│   ├── product.ts
│   ├── supabaseSecrets.ts
│   ├── types.ts
│   ├── vendor.ts
│   ├── wearState.ts
│   ├── workDensity.ts
│   └── workType.ts
├── .gitignore
├── app.json
├── eslint.config.js
├── expo-env.d.ts
├── package.json
├── package-lock.json
├── README.md
├── tree.txt
└── tsconfig.json
PS C:\DEV\kapray\kapray>

as on 16feb26

-------------------------------------------------------------------------------------------------------------
strategy
file lines < 200
no special button or placeholder for the button. make text as button where required e.g., select, all etc>
no placeholders. keeep the screen contents merged. no styling at this stage. keep styles minimum where required