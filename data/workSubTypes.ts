export type WorkParentCode =
  | "metallic"
  | "thread"
  | "stone"
  | "sequin"
  | "gotta"
  | "mirror"
  | "machine"
  | "designer";

export type WorkSubTypeItem = {
  code: string;
  name: string;
  image: any;
};

export const WORK_SUB_TYPES: Record<WorkParentCode, WorkSubTypeItem[]> = {
  metallic: [
    {
      code: "zardozi",
      name: "Zardozi",
      image: require("@/assets/work-subtype-images/metallic/zardozi.jpg")
    },
    {
      code: "dabka",
      name: "Dabka",
      image: require("@/assets/work-subtype-images/metallic/dabka.png")
    },
    {
      code: "nakshi",
      name: "Nakshi",
      image: require("@/assets/work-subtype-images/metallic/nakshi.jpg")
    },
    {
      code: "kora",
      name: "Kora",
      image: require("@/assets/work-subtype-images/metallic/kora.png")
    },
    {
      code: "salma",
      name: "Salma",
      image: require("@/assets/work-subtype-images/metallic/salma.png")
    },
    {
      code: "tilla",
      name: "Tilla",
      image: require("@/assets/work-subtype-images/metallic/tilla.png")
    },
    {
      code: "zari",
      name: "Zari",
      image: require("@/assets/work-subtype-images/metallic/zari.png")
    },
    {
      code: "mukesh",
      name: "Mukesh",
      image: require("@/assets/work-subtype-images/metallic/mukesh.jpg")
    }
  ],

  thread: [
    {
      code: "resham",
      name: "Resham",
      image: require("@/assets/work-subtype-images/thread/resham.jpg")
    },
    {
      code: "sozni",
      name: "Sozni (Kashmiri)",
      image: require("@/assets/work-subtype-images/thread/sozni.jpg")
    },
    {
      code: "chikankari",
      name: "Chikankari",
      image: require("@/assets/work-subtype-images/thread/chikankari.jpg")
    }
  ],

  stone: [
    {
      code: "swarovski_crystal",
      name: "Swarovski Crystal",
      image: require("@/assets/work-subtype-images/stone/swarovski_crystal.jpg")
    },
    {
      code: "rhinestones",
      name: "Rhinestones",
      image: require("@/assets/work-subtype-images/stone/rhinestones.jpg")
    },
    {
      code: "pearl_work",
      name: "Pearl Work",
      image: require("@/assets/work-subtype-images/stone/pearl_work.jpg")
    },
    {
      code: "bead_work",
      name: "Bead Work",
      image: require("@/assets/work-subtype-images/stone/bead_work.jpg")
    },
    {
      code: "cut_dana",
      name: "Cut Dana",
      image: require("@/assets/work-subtype-images/stone/cut_dana.jpg")
    }
  ],

  sequin: [
    {
      code: "sequins",
      name: "Sequins",
      image: require("@/assets/work-subtype-images/sequin/sequins.jpg")
    },
    {
      code: "sitara",
      name: "Sitara",
      image: require("@/assets/work-subtype-images/sequin/sitara.jpg")
    }
  ],

  gotta: [
    {
      code: "gotta_patti",
      name: "Gotta Patti",
      image: require("@/assets/work-subtype-images/gotta/gotta_patti.jpg")
    },
    {
      code: "patch_applique",
      name: "Patch / Applique Work",
      image: require("@/assets/work-subtype-images/gotta/patch_applique.jpg")
    }
  ],

  mirror: [
    {
      code: "mirror_work",
      name: "Mirror Work",
      image: require("@/assets/work-subtype-images/mirror/mirror_work.jpg")
    },
    {
      code: "kutch_mirror_work",
      name: "Kutch Mirror Work",
      image: require("@/assets/work-subtype-images/mirror/kutch_mirror_work.jpg")
    }
  ],

  machine: [
    {
      code: "machine_embroidery",
      name: "Machine Embroidery",
      image: require("@/assets/work-subtype-images/machine/machine_embroidery.jpg")
    },
    {
      code: "computer_embroidery",
      name: "Computer Embroidery",
      image: require("@/assets/work-subtype-images/machine/computer_embroidery.jpg")
    }
  ],

  designer: [
    {
      code: "3d_floral_embroidery",
      name: "3D Floral Embroidery",
      image: require("@/assets/work-subtype-images/designer/3d_floral_embroidery.jpg")
    },
    {
      code: "digital_print_embellishment",
      name: "Digital Print Embellishment",
      image: require("@/assets/work-subtype-images/designer/digital_print_embellishment.jpg")
    },
    {
      code: "hand_printed_embroidery",
      name: "Hand Printed Embroidery",
      image: require("@/assets/work-subtype-images/designer/hand_printed_embroidery.jpg")
    }
  ]
};

export function isWorkParentCode(value: string): value is WorkParentCode {
  return value in WORK_SUB_TYPES;
}

export function getWorkSubTypes(parent: string): WorkSubTypeItem[] {
  if (!isWorkParentCode(parent)) return [];
  return WORK_SUB_TYPES[parent];
}

export function flattenWorkSubTypeNames(
  workSubTypeMap: Record<string, string[]> | undefined | null
): string[] {
  if (!workSubTypeMap || typeof workSubTypeMap !== "object") return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const parent of Object.keys(workSubTypeMap)) {
    const items = getWorkSubTypes(parent);
    const codes = Array.isArray(workSubTypeMap[parent]) ? workSubTypeMap[parent] : [];

    for (const code of codes) {
      const found = items.find((x) => x.code === code);
      const name = found?.name?.trim();
      if (!name) continue;
      if (seen.has(name)) continue;

      seen.add(name);
      out.push(name);
    }
  }

  return out;
}
