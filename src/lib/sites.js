export const sites = {
    NF: {
      name: "NF Simplified",
      shortName: "NF",
      pathName: "NF",
      fullName: "Neurofibromatosis Simplified",
      disease: "Neurofibromatosis",
      apiUrl: process.env.NEXT_PUBLIC_NF_API_URL,


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
      homeExploreAllBG: "NF_ExploreAllBGFull.jpg", //home/homeExploreAllBG
      // Images (General)
      logoWithText: "NF_logoWithText.png", //logoWithText
      articleThumbnailPlaceholder: "NF_articleThumbnailPlaceholder.webp", //articleThumbnailPlaceholder
      contactUsBGLeft: "NF_contactUsBGLeft.webp", //contactUsBGLeft
      contactUsBGRight: "NF_contactUsBGRight.webp", //contactUsBGRight
      loginBGTop: "NF_loginBGTop.webp", //loginBGTop
      loginBGBottom: "EB_loginBGBottom.webp", //loginBGTop
      //Text
      text_homeTitleDescription: "Collection of simplified NF articles certified by experts.",
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


      about_supporter1Logo: "nf-network.png",
      about_supporter1Name: "NF Network",
      about_supporter1Width: 500,
      about_supporter1Height: 100,
      about_supporter1Link: "https://nfnetwork.org",

      about_supporter2Logo: "reins.png",
      about_supporter2Name: "REiNS",
      about_supporter2Width: 200,
      about_supporter2Height: 100,
      about_supporter2Link: "https://ccrod.cancer.gov/confluence/plugins/servlet/mobile?contentId=141000895#content/view/141000895",
      about_supporter2Hidden: false,

      about_mission1: "NF Simplified is dedicated to making scientific research more accessible and understandable for individuals and families affected by NF1, NF2 and schwannomatosis.",
      about_mission2: "We believe everyone deserves access to clear, reliable information about the latest advances in NF research. By sharing simplified and accurate summaries of scientific findings, we aim to empower the NF community to make informed decisions, stay updated on medical progress, and feel connected to the breakthroughs shaping their care.",
      about_teamDescription: "We are a passionate, volunteer-led team of scientists, clinicians, developers, and advocates working together to bridge the gap between research and the Neurofibromatosis community.",
      about_contributorsDescription: "We're a growing network of scientists who volunteer to edit article summaries and share the amazing research being done in Neurofibromatosis and Schwannomatosis with the community.",
      about_getInvolvedDescription: "NF Simplified is 100% volunteer-led, and we're always looking for passionate people to join us! Whether you're into web development, research, database management, design, or community outreach—there's a place for you on our team.",
      about_supportersDescription: "We're proud to work alongside and be supported by organizations dedicated to the Neurofibromatosis community",

      about_our_mission: "our-mission.jpg",


    },
    EB: {
      name: "EB Simplified",
      shortName: "EB",
      pathName: "EB",
      fullName: "Epidermolysis Bullosa Simplified",
      disease: "Epidermolysis Bullosa",
      apiUrl: process.env.NEXT_PUBLIC_EB_API_URL,


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
      text_homeTitleDescription: "Collection of simplified EB articles certified by experts. ",
      text_exploreAllTitle: "We give knowledge to EB patients, families, and caregivers",
      text_exploreAllDescription: "Collection of simplified EB articles certified by experts.",
      text_footerDescription: "Provide accessible, up-to-date, and comprehensive information about Epidermolysis Bullosa to patients, families, and caregivers. We aim to empower those affected by EB with the knowledge and resources they need to navigate their journey.",

      // About
      about_teamMember1Image: "kyle.png",
      about_teamMember1Name: "Kyle Wan",
      about_teamMember1Title: "Founder & Lead",
      about_teamMember1Bio:  "Committed to building a user-friendly platform to help researchers share clear, accurate summaries with the EB community.",
      
      about_teamMember2Image: "kimiya.png",
      about_teamMember2Name: "Kimiya Aframian",
      about_teamMember2Title: "Medical Outreach Lead",
      about_teamMember2Bio: "Kimiya is a medical student at Stanford University highly interested in Dermatology and currently leads the BE rare dermatologic disease team. She was born and raised in Los Angeles and graduated from UCLA studying Psychobiology and Disability Studies. In her free time, Kimiya enjoys the outdoors, cooking, music, travel, and spending time with family and friends.",

      about_teamMember3Image: "jeantang.webp",
      about_teamMember3Name: "Jean Tang, MD Ph.D.",
      about_teamMember3Title: "Faculty Advisor",
      about_teamMember3Bio: "Professor of Dermatology at Stanford University. Specializes in patient-centered research and clinical therapeutic development in Epidermolysis Bullosa and other monogenic disorders.",

      about_supporter1Logo: "ebrp.png",
      about_supporter1Name: "EBRP",
      about_supporter1Width: 400,
      about_supporter1Height: 200,
      about_supporter1Link: "https://www.ebresearch.org/",

      about_supporter2Logo: "ebrp.png",
      about_supporter2Name: "REiNS",
      about_supporter2Width: 200,
      about_supporter2Height: 100,
      about_supporter2Link: "https://ccrod.cancer.gov/confluence/",
      about_supporter2Hidden: true,

      about_mission1: "EB Simplified is dedicated to making scientific research more accessible and understandable for individuals and families affected by EB.",
      about_mission2: "We believe everyone deserves access to clear, reliable information about the latest advances in EB research. By sharing simplified and accurate summaries of scientific findings, we aim to empower the EB community to make informed decisions, stay updated on medical progress, and feel connected to the breakthroughs shaping their care.",
      about_teamDescription: "We are a passionate, volunteer-led team of scientists, clinicians, developers, and advocates working together to bridge the gap between research and the EB community.",
      about_contributorsDescription: "We're a growing network of scientists who volunteer to edit article summaries and share the amazing research being done in Epidermolysis Bullosa with the community.",
      about_getInvolvedDescription: "EB Simplified is 100% volunteer-led, and we're always looking for passionate people to join us! Whether you're into web development, research, database management, design, or community outreach—there's a place for you on our team.",
      about_supportersDescription: "We're proud to work alongside and be supported by organizations dedicated to the Epidermolysis Bullosa community",

      about_our_mission: "our-mission.jpg",
      
    },
    CF: {
      name: "CF Simplified",
      shortName: "CF",
      pathName: "CF",
      fullName: "Cystic Fibrosis Simplified",
      disease: "Cystic Fibrosis",
      apiUrl: process.env.NEXT_PUBLIC_EB_API_URL,


      theme: { // Theme
        primary: "#94e0d4",
        primaryDark: "#448178",
        lightGrey: "#f5f5f5",
        text: "#1e2a3c",
        background: "#f5f7fA",
        contactUsColor: "#c6a5e3", //contactUsColor
        authorTextColor: "#4c85b1", //authorTextColor
        footerBGColor: "#f2e6f8", //footerBGColor
      },
      // Images (Home)
      homeBG: "CF_BG_home.jpg", //home/homeBG
      homeExploreAllBG: "CF_ExploreAllBG.jpg", //home/homeExploreAllBG
      // Images (General)
      logoWithText: "CF_text_with_logo.png", //logoWithText
      articleThumbnailPlaceholder: "CF_article_placeholder.jpg", //articleThumbnailPlaceholder
      contactUsBGLeft: "CF_contactUsBGLeft-Enhanced.jpg", //contactUsBGLeft # uses full width background
      contactUsBGRight: "CF_contactUsBGLeft-Enhanced.jpg", //contactUsBGRight # uses full width background

      
      loginBGTop: "CF_loginBGTop.webp", //loginBGTop
      loginBGBottom: "CF_loginBGBottom.webp", //loginBGTop

      //Text
      text_homeTitleDescription: "Collection of simplified CF articles certified by experts. ",
      text_exploreAllTitle: "Breathe Easier, Understand More",
      text_exploreAllDescription: "Collection of simplified CF articles certified by experts.",
      text_footerDescription: "Provide accessible, up-to-date, and comprehensive information about Cystic Fibrosis to patients, families, and caregivers. We aim to empower those affected by CF with the knowledge and resources they need to navigate their journey.",

      // About
      about_teamMember1Image: "kyle.png",
      about_teamMember1Name: "Kyle Wan",
      about_teamMember1Title: "Founder & Lead",
      about_teamMember1Bio:  "Committed to building a user-friendly platform to help researchers share clear, accurate summaries with the CF community.",
      
      about_teamMember2Image: "DanielFeldman.jpg",
      about_teamMember2Name: "Daniel Feldman",
      about_teamMember2Title: "Medical Outreach Lead",
      about_teamMember2Bio: "Daniel is a rising 3rd year medical student at West Virginia School of Osteopathic Medicine. His goal is to pursue a career in Pathology. In his down time, he enjoys walking, reading and playing basketball with friends. ",

      about_teamMember3Image: "expert-placeholder.png",
      about_teamMember3Name: "Faculty Advisor Name",
      about_teamMember3Title: "Faculty Advisor",
      about_teamMember3Bio: "Faculty Advisor Bio",

      about_supporter1Logo: "CFF.jpg",
      about_supporter1Name: "CFF",
      about_supporter1Width: 200,
      about_supporter1Height: 200,
      about_supporter1Link: "https://www.cff.org/",

      about_supporter2Logo: "CFF.jpg",
      about_supporter2Name: "CFF",
      about_supporter2Width: 200,
      about_supporter2Height: 100,
      about_supporter2Link: "https://ccrod.cancer.gov/confluence/",
      about_supporter2Hidden: true,

      about_mission1: "CF Simplified is dedicated to making scientific research more accessible and understandable for individuals and families affected by CF.",
      about_mission2: "We believe everyone deserves access to clear, reliable information about the latest advances in CF research. By sharing simplified and accurate summaries of scientific findings, we aim to empower the CF community to make informed decisions, stay updated on medical progress, and feel connected to the breakthroughs shaping their care.",
      about_teamDescription: "We are a passionate, volunteer-led team of scientists, clinicians, developers, and advocates working together to bridge the gap between research and the CF community.",
      about_contributorsDescription: "We're a growing network of scientists who volunteer to edit article summaries and share the amazing research being done in Cystic Fibrosis with the community.",
      about_getInvolvedDescription: "CF Simplified is 100% volunteer-led, and we're always looking for passionate people to join us! Whether you're into web development, research, database management, design, or community outreach—there's a place for you on our team.",
      about_supportersDescription: "We're proud to work alongside and be supported by organizations dedicated to the Cystic Fibrosis community",

      about_our_mission: "CF_our_mission.jpg",
      
    },
    Ashermans: {
      name: "Asherman's Simplified",
      shortName: "Asherman's",
      pathName: "Ashermans",
      fullName: "Asherman's Simplified",
      disease: "Asherman's Syndrome",
      apiUrl: process.env.NEXT_PUBLIC_EB_API_URL,


      theme: { // Theme
        primary: "#f7d297",
        primaryDark: "#448178",
        lightGrey: "#f5f5f5",
        text: "#1e2a3c",
        background: "#ffffff",
        contactUsColor: "#f0c441", //contactUsColor
        authorTextColor: "#4c85b1", //authorTextColor
        footerBGColor: "#fff091", //footerBGColor
      },
      // Images (Home)
      homeBG: "Ashermans_BG_home.jpg", //home/homeBG
      homeExploreAllBG: "Ashermans_ExploreAllBG.png", //home/homeExploreAllBG
      // Images (General)
      logoWithText: "TempAshermans_text_with_logo.png", //logoWithText
      articleThumbnailPlaceholder: "Ashermans_article_placeholder.jpg", //articleThumbnailPlaceholder
      contactUsBGLeft: "Ashermans_contactUsBG.png", //contactUsBGLeft # uses full width background
      contactUsBGRight: "Ashermans_contactUsBG.png", //contactUsBGRight # uses full width background

      
      loginBGTop: "Asherman's_loginBGTop.webp", //loginBGTop
      loginBGBottom: "Asherman's_loginBGBottom.webp", //loginBGTop

      //Text
      text_homeTitleDescription: "Collection of simplified Asherman's Syndrome articles certified by experts. ",
      text_exploreAllTitle: "We give knowledge to patients, families, and caregivers",
      text_exploreAllDescription: "Collection of simplified Asherman's Syndrome articles certified by experts.",
      text_footerDescription: "Provide accessible, up-to-date, and comprehensive information about Asherman's Syndrome to patients, families, and caregivers. We aim to empower those affected by Asherman's Syndrome with the knowledge and resources they need to navigate their journey.",

      // About
      about_teamMember1Image: "kyle.png",
      about_teamMember1Name: "Kyle Wan",
      about_teamMember1Title: "Founder & Lead",
      about_teamMember1Bio:  "Committed to building a user-friendly platform to help researchers share clear, accurate summaries with the Asherman's Syndrome community.",
      
      about_teamMember2Image: "Selina.jpg",
      about_teamMember2Name: "Selina Montoya",
      about_teamMember2Title: "Medical Outreach Lead",
      about_teamMember2Bio: "Selina is a third-year medical student at the University of New Mexico School of Medicine with a strong interest in women's health. She aspires to pursue a residency in either Obstetrics and Gynecology or Family Medicine, where she can provide comprehensive, compassionate care to women across all stages of life. In her free time, she enjoys watching movies and exploring the beautiful hiking trails around Albuquerque.",

      about_teamMember3Image: "expert-placeholder.png",
      about_teamMember3Name: "Keith Isaacson",
      about_teamMember3Title: "Faculty Advisor",
      about_teamMember3Bio: "Faculty Advisor Bio",

      about_supporter1Logo: "IAA.png",
      about_supporter1Name: "International Asherman's Association",
      about_supporter1Width: 400,
      about_supporter1Height: 200,
      about_supporter1Link: "https://ashermans-support.org/",

      about_supporter2Logo: "IAA.png",
      about_supporter2Name: "International Asherman's Association",
      about_supporter2Width: 200,
      about_supporter2Height: 100,
      about_supporter2Link: "https://www.internationalashermans.org/",
      about_supporter2Hidden: true,

      about_mission1: "Asherman's Simplified is dedicated to making scientific research more accessible and understandable for individuals and families affected by Asherman's Syndrome.",
      about_mission2: "We believe everyone deserves access to clear, reliable information about the latest advances in Asherman's Syndrome research. By sharing simplified and accurate summaries of scientific findings, we aim to empower the Asherman's Syndrome community to make informed decisions, stay updated on medical progress, and feel connected to the breakthroughs shaping their care.",
      about_teamDescription: "We are a passionate, volunteer-led team of scientists, clinicians, developers, and advocates working together to bridge the gap between research and the Asherman's Syndrome community.",
      about_contributorsDescription: "We're a growing network of scientists who volunteer to edit article summaries and share the amazing research being done in Asherman's Syndrome with the community.",
      about_getInvolvedDescription: "Asherman's Simplified is 100% volunteer-led, and we're always looking for passionate people to join us! Whether you're into web development, research, database management, design, or community outreach—there's a place for you on our team.",
      about_supportersDescription: "We're proud to work alongside and be supported by organizations dedicated to the Asherman's Syndrome community",

      about_our_mission: "our-mission.jpg",

    },
    Aicardi: {
      name: "Aicardi Simplified",
      shortName: "Aicardi",
      pathName: "Aicardi",
      fullName: "Aicardi Simplified",
      disease: "Aicardi Syndrome",
      apiUrl: process.env.NEXT_PUBLIC_EB_API_URL,


      theme: { // Theme
        primary: "#d49bf2",
        primaryDark: "#6d32a8",
        lightGrey: "#f5f5f5",
        text: "#3d2447",
        background: "#ffffff",
        contactUsColor: "#c6a5e3", //contactUsColor
        authorTextColor: "#6d32a8", //authorTextColor
        footerBGColor: "#b284e0", //footerBGColor
      },
      // Images (Home)
      homeBG: "Aicardi_homeBG.png", //home/homeBG
      homeExploreAllBG: "Aicardi_ExploreAllBG.png", //home/homeExploreAllBG
      // Images (General)
      logoWithText: "Aicardi_logo_w_text.png", //logoWithText
      articleThumbnailPlaceholder: "Aicardi_article_placeholder.jpg", //articleThumbnailPlaceholder
      contactUsBGLeft: "Aicardi_contactUsBGLeft-Enhanced.jpg", //contactUsBGLeft # uses full width background
      contactUsBGRight: "Aicardi_contactUsBGLeft-Enhanced.jpg", //contactUsBGRight # uses full width background

      
      loginBGTop: "Aicardi_loginBGTop.webp", //loginBGTop
      loginBGBottom: "Aicardi_loginBGBottom.webp", //loginBGTop

      //Text
      text_homeTitleDescription: "Collection of simplified Aicardi Syndrome articles certified by experts. ",
      text_exploreAllTitle: "We give knowledge to patients, families, and caregivers",
      text_exploreAllDescription: "Collection of simplified Aicardi Syndrome articles certified by experts.",
      text_footerDescription: "Provide accessible, up-to-date, and comprehensive information about Aicardi Syndrome to patients, families, and caregivers. We aim to empower those affected by Aicardi Syndrome with the knowledge and resources they need to navigate their journey.",

      // About
      about_teamMember1Image: "kyle.png",
      about_teamMember1Name: "Kyle Wan",
      about_teamMember1Title: "Founder & Lead",
      about_teamMember1Bio:  "Committed to building a user-friendly platform to help researchers share clear, accurate summaries with the Aicardi Syndrome community.",
      
      about_teamMember2Image: "expert-placeholder.png",
      about_teamMember2Name: "Samantha Bunner",
      about_teamMember2Title: "Medical Outreach Lead",
      about_teamMember2Bio: "Placeholder Bio",

      about_teamMember3Image: "expert-placeholder.png",
      about_teamMember3Name: "Faculty Advisor Name",
      about_teamMember3Title: "Faculty Advisor",
      about_teamMember3Bio: "Faculty Advisor Bio",

      about_supporter1Logo: "aicardifoundation.jpg",
      about_supporter1Name: "Aicardi Syndrome Foundation",
      about_supporter1Width: 300,
      about_supporter1Height: 300,
      about_supporter1Link: "https://aicardisyndromefoundation.org/",

      about_supporter2Logo: "aicardifoundation.jpg",
      about_supporter2Name: "Aicardi Syndrome Foundation",
      about_supporter2Width: 200,
      about_supporter2Height: 100,
      about_supporter2Link: "https://ccrod.cancer.gov/confluence/",
      about_supporter2Hidden: true,

      about_mission1: "Aicardi Simplified is dedicated to making scientific research more accessible and understandable for individuals and families affected by Aicardi Syndrome.",
      about_mission2: "We believe everyone deserves access to clear, reliable information about the latest advances in Aicardi Syndrome research. By sharing simplified and accurate summaries of scientific findings, we aim to empower the Aicardi Syndrome community to make informed decisions, stay updated on medical progress, and feel connected to the breakthroughs shaping their care.",
      about_teamDescription: "We are a passionate, volunteer-led team of scientists, clinicians, developers, and advocates working together to bridge the gap between research and the Aicardi Syndrome community.",
      about_contributorsDescription: "We're a growing network of scientists who volunteer to edit article summaries and share the amazing research being done in Aicardi Syndrome with the community.",
      about_getInvolvedDescription: "Aicardi Simplified is 100% volunteer-led, and we're always looking for passionate people to join us! Whether you're into web development, research, database management, design, or community outreach—there's a place for you on our team.",
      about_supportersDescription: "We're proud to work alongside and be supported by organizations dedicated to the Aicardi Syndrome community",

      about_our_mission: "our-mission.jpg",
      
    },

    RYR1: {
      name: "RYR1 Simplified",
      shortName: "RYR1",
      pathName: "RYR1",
      fullName: "RYR1 Simplified",
      disease: "RYR1-related diseases",
      apiUrl: process.env.NEXT_PUBLIC_EB_API_URL,


      theme: { // Theme
        primary: "#d49bf2",
        primaryDark: "#6d32a8",
        lightGrey: "#f5f5f5",
        text: "#3d2447",
        background: "#ffffff",
        contactUsColor: "#c6a5e3", //contactUsColor
        authorTextColor: "#6d32a8", //authorTextColor
        footerBGColor: "#b284e0", //footerBGColor
      },
      // Images (Home)
      homeBG: "Aicardi_BG_home.png", //home/homeBG
      homeExploreAllBG: "Aicardi_ExploreAllBG.png", //home/homeExploreAllBG
      // Images (General)
      logoWithText: "Aicardi_logo_w_text.png", //logoWithText
      articleThumbnailPlaceholder: "Aicardi_article_placeholder.jpg", //articleThumbnailPlaceholder
      contactUsBGLeft: "Aicardi_contactUsBGLeft-Enhanced.jpg", //contactUsBGLeft # uses full width background
      contactUsBGRight: "Aicardi_contactUsBGLeft-Enhanced.jpg", //contactUsBGRight # uses full width background

      
      loginBGTop: "Aicardi_loginBGTop.webp", //loginBGTop
      loginBGBottom: "Aicardi_loginBGBottom.webp", //loginBGTop

      //Text
      text_homeTitleDescription: "Collection of simplified RYR1-related disease articles certified by experts. ",
      text_exploreAllTitle: "We give knowledge to patients, families, and caregivers",
      text_exploreAllDescription: "Collection of simplified RYR1-related disease articles certified by experts.",
      text_footerDescription: "Provide accessible, up-to-date, and comprehensive information about RYR1-related diseases to patients, families, and caregivers. We aim to empower those affected by RYR1-related diseases with the knowledge and resources they need to navigate their journey.",

      // About
      about_teamMember1Image: "kyle.png",
      about_teamMember1Name: "Kyle Wan",
      about_teamMember1Title: "Founder & Lead",
      about_teamMember1Bio:  "Committed to building a user-friendly platform to help researchers share clear, accurate summaries with the Aicardi Syndrome community.",
      
      about_teamMember2Image: "expert-placeholder.png",
      about_teamMember2Name: "Shubhi Nanda",
      about_teamMember2Title: "Medical Outreach Lead",
      about_teamMember2Bio: "Placeholder Bio",

      about_teamMember3Image: "expert-placeholder.png",
      about_teamMember3Name: "Faculty Advisor Name",
      about_teamMember3Title: "Faculty Advisor",
      about_teamMember3Bio: "Faculty Advisor Bio",

      about_supporter1Logo: "aicardifoundation.jpg",
      about_supporter1Name: "Aicardi Syndrome Foundation",
      about_supporter1Width: 300,
      about_supporter1Height: 300,
      about_supporter1Link: "https://aicardisyndromefoundation.org/",

      about_supporter2Logo: "aicardifoundation.jpg",
      about_supporter2Name: "Aicardi Syndrome Foundation",
      about_supporter2Width: 200,
      about_supporter2Height: 100,
      about_supporter2Link: "https://ccrod.cancer.gov/confluence/",
      about_supporter2Hidden: true,

      about_mission1: "RYR1 Simplified is dedicated to making scientific research more accessible and understandable for individuals and families affected by RYR1-related diseases.",
      about_mission2: "We believe everyone deserves access to clear, reliable information about the latest advances in RYR1-related diseases research. By sharing simplified and accurate summaries of scientific findings, we aim to empower the RYR1-related diseases community to make informed decisions, stay updated on medical progress, and feel connected to the breakthroughs shaping their care.",
      about_teamDescription: "We are a passionate, volunteer-led team of scientists, clinicians, developers, and advocates working together to bridge the gap between research and the RYR1-related diseases community.",
      about_contributorsDescription: "We're a growing network of scientists who volunteer to edit article summaries and share the amazing research being done in RYR1-related diseases with the community.",
      about_getInvolvedDescription: "RYR1 Simplified is 100% volunteer-led, and we're always looking for passionate people to join us! Whether you're into web development, research, database management, design, or community outreach—there's a place for you on our team.",
      about_supportersDescription: "We're proud to work alongside and be supported by organizations dedicated to the RYR1-related diseases community",

      about_our_mission: "our-mission.jpg",
      
    },

    ALS: {
      name: "ALS Simplified",
      shortName: "ALS",
      pathName: "ALS",
      fullName: "ALS Simplified",
      disease: "ALS",
      apiUrl: process.env.NEXT_PUBLIC_EB_API_URL,


      theme: { // Theme
        primary: "#a0bcfa",
        primaryDark: "#2f99eb",
        lightGrey: "#f5f5f5",
        text: "#630f0f",
        background: "#ffffff",
        contactUsColor: "#c6a5e3", //contactUsColor
        authorTextColor: "#6d32a8", //authorTextColor
        footerBGColor: "#f5faff", //footerBGColor
      },
      // Images (Home)
      homeBG: "ALS_bluecornflower.png", //home/homeBG
      homeExploreAllBG: "ALS_ExploreAllBG.png", //home/homeExploreAllBG
      // Images (General)
      logoWithText: "ALS_logo_with_text.png", //logoWithText
      articleThumbnailPlaceholder: "ALS_article_placeholder.png", //articleThumbnailPlaceholder
      contactUsBGLeft: "ALS_ContactUsBG.png", //contactUsBGLeft # uses full width background
      contactUsBGRight: "ALS_ContactUsBG.png", //contactUsBGRight # uses full width background

      
      loginBGTop: "ALS_loginBGTop.webp", //loginBGTop
      loginBGBottom: "ALS_loginBGBottom.webp", //loginBGTop

      //Text
      text_homeTitleDescription: "Collection of simplified ALS articles certified by experts. ",
      text_exploreAllTitle: "We give knowledge to patients, families, and caregivers",
      text_exploreAllDescription: "Collection of simplified ALS articles certified by experts.",
      text_footerDescription: "Provide accessible, up-to-date, and comprehensive information about ALS to patients, families, and caregivers. We aim to empower those affected by ALS with the knowledge and resources they need to navigate their journey.",

      // About
      about_teamMember1Image: "kyle.png",
      about_teamMember1Name: "Kyle Wan",
      about_teamMember1Title: "Founder & Lead",
      about_teamMember1Bio:  "Committed to building a user-friendly platform to help researchers share clear, accurate summaries with the Aicardi Syndrome community.",
      
      about_teamMember2Image: "Ariba.png",
      about_teamMember2Name: "Ariba Fatima",
      about_teamMember2Title: "Medical Outreach Lead",
      about_teamMember2Bio: "Ariba is a striving researcher in interdisciplinary studies between neuroscience and art therapy. Currently, she is a professional idol under Ether Crush Entertainment and advocates on giving accessibility to neuroscience and mental health to a wide audience.",

      about_teamMember3Image: "expert-placeholder.png",
      about_teamMember3Name: "Anagha Doddamane",
      about_teamMember3Title: "Medical Outreach Lead",
      about_teamMember3Bio: "Placeholder Bio",

      about_supporter1Logo: "ALS_Association.png",
      about_supporter1Name: "ALS Association",
      about_supporter1Width: 300,
      about_supporter1Height: 200,
      about_supporter1Link: "https://www.alsa.org/",

      about_supporter2Logo: "ALS_Association.png",
      about_supporter2Name: "ALS Association",
      about_supporter2Width: 300,
      about_supporter2Height: 200,
      about_supporter2Link: "https://www.alsa.org/",
      about_supporter2Hidden: true,

      about_mission1: "ALS Simplified is dedicated to making scientific research more accessible and understandable for individuals and families affected by ALS.",
      about_mission2: "We believe everyone deserves access to clear, reliable information about the latest advances in ALS research. By sharing simplified and accurate summaries of scientific findings, we aim to empower the ALS community to make informed decisions, stay updated on medical progress, and feel connected to the breakthroughs shaping their care.",
      about_teamDescription: "We are a passionate, volunteer-led team of scientists, clinicians, developers, and advocates working together to bridge the gap between research and the ALS community.",
      about_contributorsDescription: "We're a growing network of scientists who volunteer to edit article summaries and share the amazing research being done in ALS with the community.",
      about_getInvolvedDescription: "ALS Simplified is 100% volunteer-led, and we're always looking for passionate people to join us! Whether you're into web development, research, database management, design, or community outreach—there's a place for you on our team.",
      about_supportersDescription: "We're proud to work alongside and be supported by organizations dedicated to the ALS community",

      about_our_mission: "our-mission.jpg",
      
    },

  };
  