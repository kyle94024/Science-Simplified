// HSF (HS Foundation) ID to internal article ID mapping
// Used for redirecting external links like ?hsf-id=100941 to /articles/126
// These are articles from the HS Foundation research summaries feed

export const hsfIdToArticleId = {
  "100941": "126",  // Can Quitting Smoking Lower the Risk of Hidradenitis Suppurativa?
  "100757": "123",  // Semaglutide for diabetes, weight loss, and… Hidradenitis Suppurativa?
  "100746": "9",    // Links Between Plastics Use, Processed Food, Sweating, and HS
  "100730": "121",  // Hidradenitis Suppurativa and Maternal and Offspring Outcomes
  "100405": "119",  // Barriers to Accessing Care for HS
  "100406": "118",  // Genetic Variants Associated with Hidradenitis Suppurativa
  "100404": "117",  // Assessing the Impact of HS on Work Productivity
  "100400": "115",  // Average Time Patients Stay on Biologic Treatment
  "100360": "109",  // Adalimumab (Humira) in combination with surgery is safe and effective
  "100361": "108",  // A new treatment option for tunnels in HS
  "100317": "106",  // Factors that affect delayed HS diagnosis in children and teens
  "100285": "105",  // HS surgeries associated with high satisfaction, brief recovery
  "100286": "104",  // Negative Impacts of Hidradenitis Suppurativa in Pregnant Women
  "100337": "103",  // A Deep Look at the Bacteria Living in Patients with HS
  "100207": "102",  // Can Hidradenitis Suppurativa Affect Pregnancy?
  "100107": "101",  // How should Pregnant and Nursing Mothers manage Hidradenitis Suppurativa?
  "100106": "100",  // How clear is the link between Hidradenitis Suppurativa and IBD?
  "100162": "99",   // How are Emergency Departments treating pain in Hidradenitis Suppurativa?
  "100103": "98",   // Are people willing to use teledermatology for Hidradenitis Suppurativa?
  "100100": "97",   // Is COVID more risky for people treated for an immune disease?
  "100099": "96",   // What is the right dose of infliximab for Hidradenitis Suppurativa?
  "100164": "95",   // Anything new out there to help treat my HS?
  "100177": "94",   // A new way to measure the extent of patients' hidradenitis suppurativa
  "100095": "93",   // New drug shows promise for Hidradenitis Suppurativa treatment
  "100179": "92",   // A study into the risk of serious infections in people with HS
  "100173": "91",   // Pain perception and depression in patients with hidradenitis suppurativa
  "100178": "89",   // A review of use of the word 'flare' in hidradenitis suppurativa
  "100163": "90",   // Most Hidradenitis Suppurativa patients improve with infliximab
  "100176": "88",   // Inter-rater reliability and agreement hidradenitis suppurativa
  "100188": "87",   // Investigation of the skin microbiome
  "100186": "86",   // Association between HS and hospitalization for psychiatric disorders
  "100189": "85",   // Inter- and intrarater reliability of Hurley staging
  "100187": "84",   // Impact of HS on work loss, indirect costs and income
  "100172": "83",   // Pyrin mutations in complex hidradenitis suppurativa
  "100165": "82",   // What's the risk of lymphoma in people with HS?
  "100171": "81",   // Cost-savings in hidradenitis suppurativa
  "100191": "80",   // BAD guidelines for the management of HS (acne inversa) 2018
  "100166": "79",   // Does Hidradenitis Suppurativa cause skin cancer?
  "100190": "78",   // Patients with self-reported HS in a cohort of Danish blood donors
  "100192": "77",   // Illness perceptions and health outcomes in HS
  "100169": "76",   // Complement in hidradenitis suppurativa
  "100174": "75",   // Imbalanced Th17/Treg axis in hidradenitis suppurativa
  "100170": "74",   // Hidradenitis suppurativa treated with secukinumab
  "100183": "73",   // Population-based Clinical Practice Research Datalink study
  "100175": "72",   // Prevalence of hidradenitis suppurativa among patients with Down syndrome
  "100182": "71",   // Incidence of hidradenitis suppurativa among tobacco smokers
  "100184": "70",   // Towards global consensus on core outcomes for hidradenitis suppurativa
  "100185": "69",   // Interleukin-36 in hidradenitis suppurativa
  "100181": "68",   // A phenotype combining hidradenitis suppurativa with Dowling–Degos disease
  "100180": "67",   // Hidradenitis suppurativa and electrocardiographic changes
  "100194": "66",   // Keratinocytes and neutrophils are important sources of proinflammatory cytokines
  "100193": "65",   // Diagnostic delay in hidradenitis suppurativa is a global problem
  "100195": "64",   // The Hidradenitis Suppurativa Priority Setting Partnership
};

// Get article ID from HSF ID
export function getArticleIdFromHsfId(hsfId) {
  return hsfIdToArticleId[hsfId] || null;
}
