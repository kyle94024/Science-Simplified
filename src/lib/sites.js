export const sites = {
    NF: {
      name: "NF Simplified",
      shortName: "NF",
      fullName: "Neurofibromatosis Simplified",
      disease: "Neurofibromatosis",
      apiUrl: process.env.NEXT_PUBLIC_NF_API_URL,
      logoPath: "/sites/NF/logo.svg",
      featureX: false,
      theme: { // Theme
        primary: "#4cb19f",
        primaryDark: "#3e5154",
        lightGrey: "#f5f5f5",
        text: "#0b1618",
        background: "#f8fdff",
        contactUsColor: "#4cb19f", //contactUsColor
        authorTextColor: "#4cb19f", //authorTextColor
        footerBGColor: "#e6f8f4", //footerBGColor
      },
      // Images (Home)
      homeBG: "NF_homeBG.webp", //home/homeBG
      homeExploreAllBG: "NF_ExploreAllBG.webp", //home/homeExploreAllBG
      // Images (General)
      logoWithText: "NF_logoWithText.png", //logoWithText
      articleThumbnailPlaceholder: "NF_articleThumbnailPlaceholder.webp", //articleThumbnailPlaceholder
      contactUsBGLeft: "NF_contactUsBGLeft.webp", //contactUsBGLeft
      contactUsBGRight: "NF_contactUsBGRight.webp", //contactUsBGRight
      loginBGTop: "NF_loginBGTop.webp", //loginBGTop
      loginBGBottom: "EB_loginBGBottom.webp", //loginBGTop
      //Text
      text_homeTitleDescription: "Collection of simplified NF articles certified by experts. Powered by Innovation.",
      text_exploreAllTitle: "We give knowledge to NF patients, families, and caregivers",
      text_exploreAllDescription: "Collection of simplified NF articles certified by experts. Powered by REiNS.",
      text_footerDescription: "Provide accessible, up-to-date, and comprehensive information about Neurofibromatosis to patients, families, and caregivers. We aim to empower those affected by NF with the knowledge and resources they need to navigate their journey.",
      // About
      about_teamMember1Image: "kyle.png",
      about_teamMember1Name: "Kyle Wan",
      about_teamMember1Title: "Founder & Lead",
      about_teamMember1Bio:  "Committed to building a user-friendly platform to help researchers share clear, accurate summaries with the NF community.",
      about_teamMember2Image: "vanessa.png",
      about_teamMember2Name: "Vanessa Merker, Ph.D.",
      about_teamMember2Title: "Faculty Advisor",
      about_teamMember2Bio: "Assistant Professor of Neurology at Harvard Medical School. Specializes in patient-centered research and improving care in Neurofibromatosis and related conditions.",
      about_teamMember3Image: "roxana.png",
      about_teamMember3Name: "Roxana Daneshjou, MD Ph.D.",
      about_teamMember3Title: "Faculty Advisor",
      about_teamMember3Bio: "Assistant Professor of Biomedical Data Science, Stanford University. Specializes in building Fair and trustworthy AI for healthcare.",
    },
    EB: {
      name: "EB Simplified",
      shortName: "EB",
      fullName: "Epidermolysis Bullosa Simplified",
      disease: "Epidermolysis Bullosa",
      apiUrl: process.env.NEXT_PUBLIC_EB_API_URL,
      logoPath: "/sites/EB/logo.svg",
      featureX: false,
      theme: { // Theme
        primary: "#ed1e87",
        primaryDark: "#871750",
        lightGrey: "#f5f5f5",
        text: "#484753",
        background: "#ffffff",
        contactUsColor: "#e89ec3", //contactUsColor
        authorTextColor: "#4c85b1", //authorTextColor
        footerBGColor: "#f2e6f8", //footerBGColor
      },
      // Images (Home)
      homeBG: "EB_croppedbanner.png", //home/homeBG
      homeExploreAllBG: "EB_ExploreAllBG.png", //home/homeExploreAllBG
      // Images (General)
      logoWithText: "EB_logoWithText.png", //logoWithText
      articleThumbnailPlaceholder: "EB_articleThumbnailPlaceholder.jpg", //articleThumbnailPlaceholder
      contactUsBGLeft: "EB_contactUsBGLeft.png", //contactUsBGLeft
      contactUsBGRight: "EB_contactUsBGRight.png", //contactUsBGRight
      loginBGTop: "EB_loginBGTop.webp", //loginBGTop
      loginBGBottom: "EB_loginBGBottom.webp", //loginBGTop

      //Text
      text_homeTitleDescription: "Collection of simplified EB articles certified by experts. Powered by Innovation.",
      text_exploreAllTitle: "We give knowledge to EB patients, families, and caregivers",
      text_exploreAllDescription: "Collection of simplified EB articles certified by experts.",
      text_footerDescription: "Provide accessible, up-to-date, and comprehensive information about Epidermolysis Bullosa to patients, families, and caregivers. We aim to empower those affected by EB with the knowledge and resources they need to navigate their journey.",

      // About
      about_teamMember1Image: "kyle.png",
      about_teamMember1Name: "Kyle Wan",
      about_teamMember1Title: "Founder & Lead",
      about_teamMember1Bio:  "Committed to building a user-friendly platform to help researchers share clear, accurate summaries with the NF community.",
      
      about_teamMember2Image: "kimiya.png",
      about_teamMember2Name: "Kimiya Aframian",
      about_teamMember2Title: "Medical Outreach Lead",
      about_teamMember2Bio: "Placeholder Bio",
      
      about_teamMember3Image: "jeantang.webp",
      about_teamMember3Name: "Jean Tang, MD Ph.D.",
      about_teamMember3Title: "Faculty Advisor",
      about_teamMember3Bio: "Professor of Dermatology at Stanford University. Specializes in patient-centered research and clinical therapeutic development in Epidermolysis Bullosa and other monogenic disorders.",
    },

  };
  