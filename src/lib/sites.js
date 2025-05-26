export const sites = {
    NF: {
      name: "NF Simplified",
      shortName: "NF",
      fullName: "Neurofibromatosis Simplified",
      disease: "Neurofibromatosis",
      apiUrl: process.env.NEXT_PUBLIC_NF_API_URL,
      logoPath: "/sites/NF/logo.svg",
      featureX: false,
      theme: {
        primary: "#4cb19f",
        primaryDark: "#3e5154",
        lightGrey: "#f5f5f5",
        text: "#0b1618",
        background: "#f8fdff"
      },
      homeHeroPath: "home-hero-illustration.webp",
      navBrandPath: "navbrand.png",

    },
    EB: {
      name: "EB Simplified",
      shortName: "EB",
      fullName: "Epidermolysis Bullosa Simplified",
      disease: "Epidermolysis Bullosa",
      apiUrl: process.env.NEXT_PUBLIC_EB_API_URL,
      logoPath: "/sites/EB/logo.svg",
      featureX: false,
      theme: {
        primary: "#b14ca4",
        primaryDark: "#3e4354",
        lightGrey: "#f5f5f5",
        text: "#0b1618",
        background: "#fff8fe"
      },
      homeHeroPath: "home-hero-illustration.png",
      navBrandPath: "sseblogo.jpg",
    },
    // …add more here…
  };
  