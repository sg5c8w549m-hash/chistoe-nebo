export const WASTE_TYPES = {
  maculature: {
    label: "Макулатура",
    units: ["kg", "ton"],
    subtypes: [
      "Картон",
      "Бумага A4",
      "Газеты",
      "Журналы",
      "Книги",
      "Смешанная",
    ],
  },

  plastic: {
    label: "Пластик",
    units: ["kg", "ton"],
    subtypes: [
      "PET (01) — бутылки",
      "HDPE / ПНД (02) — канистры, трубы",
      "PVC (03)",
      "LDPE / ПВД (04) — плёнка",
      "PP (05) — мешки, биг-беги",
      "PS (06)",
      "Другое",
    ],
  },

  metal: {
    label: "Металл",
    units: ["kg", "ton"],
    subtypes: ["Чёрный металл", "Цветной металл"],
  },

  glass: {
    label: "Стекло",
    units: ["kg", "ton"],
    subtypes: ["Тара", "Бой"],
  },

  other: {
    label: "Прочее",
    units: ["kg"],
    subtypes: [],
  },
};
