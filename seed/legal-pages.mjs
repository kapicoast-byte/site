/**
 * Terms and Privacy, written to describe what this site actually does.
 *
 * Deliberately not boilerplate: the site stores nothing about visitors. The
 * cake form assembles a message in the browser and hands it to WhatsApp or the
 * mail app — it never posts to the server. The only cookie is the staff login.
 * Every claim below was checked against the code.
 *
 * These are a starting point, not legal advice. Have someone qualified review
 * them before relying on them, especially against India's DPDP Act 2023.
 */

export const LEGAL_PAGES = (cafe) => [
  {
    slug: "privacy",
    title: "Privacy Policy",
    intro:
      `How ${cafe.cafeName} handles information when you use this website.`,
    body: [
      { t: "p", c: "This website is run by " + cafe.cafeName + ", " + cafe.addressL1 + ", " + cafe.addressL2 + ", " + cafe.addressL3 + "." },

      { t: "h", c: "The short version" },
      { t: "p", c: "We do not collect, store or sell personal information through this website. There is no account to create, no newsletter to join, and no tracking or advertising code on any page." },

      { t: "h", c: "The cake order form" },
      { t: "p", c: "The cake page lets you choose a flavour, size and date and see an estimated price. Everything you type stays in your own browser. Nothing is sent anywhere while you fill it in, and we do not receive it." },
      { t: "p", c: "When you press “Send on WhatsApp” or “Email it”, your device opens WhatsApp or your mail app with the summary already written out. You choose whether to send it. If you do send it, we receive your message the same way we would receive any other message from you, and it is then covered by WhatsApp's or your email provider's own privacy policy rather than this one." },
      { t: "p", c: "If you would rather not use either, please call us instead." },

      { t: "h", c: "Cookies" },
      { t: "p", c: "This site sets one cookie, and only for staff. When someone from the cafe signs in to update the menu, a session cookie keeps them signed in for about eight hours. It contains no personal information beyond the staff login, and it is never set for ordinary visitors." },
      { t: "p", c: "We use no analytics, advertising or tracking cookies of any kind." },

      { t: "h", c: "Things loaded from other companies" },
      { t: "p", c: "Two parts of the site are provided by Google, and your browser contacts Google directly to load them:" },
      { t: "ul", c: [
        "The map on the Visit page is an embedded Google Map.",
        "The fonts used across the site are served by Google Fonts.",
      ]},
      { t: "p", c: "Google may record your IP address and set its own cookies when these load. We have no access to that information and no control over it. Google's practices are described in its own privacy policy." },

      { t: "h", c: "Server records" },
      { t: "p", c: "Like any website, ours runs on a hosting service that keeps short-term technical logs — the pages requested, the time, and the requesting IP address. These are used only to keep the site running and secure, and are not used to identify anyone or build a profile." },

      { t: "h", c: "Photographs" },
      { t: "p", c: "Photographs of the cafe and its food are uploaded by our staff. If you appear in a photograph on this site and would like it taken down, contact us and we will remove it." },

      { t: "h", c: "Children" },
      { t: "p", c: "This site is not directed at children and does not knowingly collect information from anyone." },

      { t: "h", c: "Your rights" },
      { t: "p", c: "Because the site holds no personal information about visitors, there is normally nothing for us to correct or delete. If you have sent us a message directly and would like it removed from our records, contact us and we will do so." },

      { t: "h", c: "Changes" },
      { t: "p", c: "If how the site works changes, this page will be updated. The date at the top shows when it last changed." },

      { t: "h", c: "Contact" },
      { t: "p", c: "Questions about this policy can go to " + cafe.phone + ", or in person at the counter." },
    ],
  },

  {
    slug: "terms",
    title: "Terms & Conditions",
    intro:
      `The terms you agree to when you use the ${cafe.cafeName} website.`,
    body: [
      { t: "p", c: "By using this website you accept the terms below. If you do not accept them, please do not use the site." },

      { t: "h", c: "About us" },
      { t: "p", c: cafe.cafeName + " is a cafe at " + cafe.addressL1 + ", " + cafe.addressL2 + ", " + cafe.addressL3 + ". You can reach us on " + cafe.phone + "." },

      { t: "h", c: "The menu and prices" },
      { t: "p", c: "We keep the menu on this site as accurate as we can, but dishes and prices can change, and items sell out. Prices shown are in Indian Rupees and include applicable taxes unless stated otherwise." },
      { t: "p", c: "Where the website and the printed menu at the counter disagree, the printed menu is the one that applies." },

      { t: "h", c: "Food, allergens and dietary needs" },
      { t: "p", c: "Descriptions on this site are a guide, not a full ingredient list. Our kitchen prepares many dishes side by side, so we cannot guarantee that any item is free from a particular allergen. If you have an allergy or an intolerance, please tell us at the counter before ordering and we will tell you honestly what we can and cannot do." },
      { t: "p", c: "Labels such as “Veg” describe the dish as prepared and are not a certification." },

      { t: "h", c: "Cake and event enquiries" },
      { t: "p", c: "The cake page produces an estimate and an enquiry, not a confirmed order. Sending it does not reserve anything." },
      { t: "ul", c: [
        "An order is only confirmed once we reply and agree the details with you.",
        "Please allow at least a day's notice; more for larger or decorated cakes.",
        "The final price may differ from the estimate once the design is agreed.",
        "No payment is taken through this website. Payment is made at the counter or by an agreed method when the order is confirmed.",
      ]},
      { t: "p", c: "If we cannot take an order — because of the date, the design or how busy we are — we will tell you as soon as we can." },

      { t: "h", c: "Cancellations" },
      { t: "p", c: "Tell us as early as you can if you need to cancel or change a confirmed cake order, so we can adjust before we start baking. Once a cake has been made to your design it cannot be resold, so late cancellations may still be charged." },

      { t: "h", c: "Using this website" },
      { t: "p", c: "Please use the site only for lawful purposes. Do not attempt to gain unauthorised access to any part of it, disrupt it, or copy it wholesale for commercial use." },

      { t: "h", c: "Our content" },
      { t: "p", c: "The text, photographs, logo and design on this site belong to " + cafe.cafeName + " unless credited otherwise. You are welcome to share links to the site. Please ask before reproducing our photographs or logo elsewhere." },

      { t: "h", c: "Links and embedded content" },
      { t: "p", c: "The site links to outside services, including Google Maps and WhatsApp. We do not control those services and are not responsible for their content or their terms." },

      { t: "h", c: "Availability" },
      { t: "p", c: "We provide this site as it is. We try to keep it accurate and available, but we do not promise it will be uninterrupted or error-free, and we are not liable for loss arising from its use to the extent the law allows." },

      { t: "h", c: "Governing law" },
      { t: "p", c: "These terms are governed by the laws of India, and the courts at Chennai, Tamil Nadu have jurisdiction over any dispute." },

      { t: "h", c: "Changes" },
      { t: "p", c: "We may update these terms. The date at the top of this page shows when they last changed." },
    ],
  },
];
