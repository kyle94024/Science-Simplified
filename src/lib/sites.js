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
      homeBG: "home-hero-illustration.webp", //home/homeBG
      homeExploreAllBG: "home-cta-1-bg.webp", //home/homeExploreAllBG
      logoWithText: "navbrand.png", //logoWithText
      articleThumbnailPlaceholder: "article-thumbnail-placeholder.webp", //articleThumbnailPlaceholder
      contactUsBGLeft: "subscription-banner-bg-left.webp", //contactUsBGLeft
      contactUsBGRight: "subscription-banner-bg-right.webp", //contactUsBGRight
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
        primary: "#ed1e87",
        primaryDark: "#871750",
        lightGrey: "#f5f5f5",
        text: "#484753",
        background: "#ffffff"
      },
      homeBG: "EB_homeBG.png", //home/homeBG
      homeExploreAllBG: "EB_ExploreAllBG.png", //home/homeExploreAllBG
      logoWithText: "EB_logoWithText.png", //logoWithText
      articleThumbnailPlaceholder: "EB_articleThumbnailPlaceholder.jpg", //articleThumbnailPlaceholder
      contactUsBGLeft: "EB_contactUsBGLeft.png", //contactUsBGLeft
      contactUsBGRight: "EB_contactUsBGRight.png", //contactUsBGRight
    },
    // …add more here…
  };
  