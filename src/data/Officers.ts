export type Officer = {
  role: string;
  name: string;
  description: string;
  responsibilities: string[];
};

export const officers: Officer[] = [
    {
    role: "President",
    name: "Khyle Reese R. Bernando",
    description:
      "Leads the class organization, oversees decisions, and represents the section in school matters.",
    responsibilities: [
      "Leads meetings",
      "Coordinates officers",
      "Represents class in school activities",
    ],
  },
  {
    role: "Vice President",
    name: "Mikhaila Hurleyanne E. Sorita",
    description:
      "Assists the president and takes charge when the president is unavailable.",
    responsibilities: ["Supports president", "Assists in coordination"],
  },
  {
    role: "Secretary",
    name: "Bea Agatha T. Espiritu",
    description:
      "Handles documentation, attendance records, and official class notes.",
    responsibilities: ["Records meetings", "Manages documents"],
  },
  {
    role: "Treasurer",
    name: "Elvin Yhiel D. Garfin",
    description:
      "Manages class funds, budgeting, and financial tracking.",
    responsibilities: ["Handles funds", "Tracks expenses"],
  },
  {
    role: "Auditor",
    name: "Rachel P. Parza",
    description:
      "Ensures all financial records are accurate and transparent.",
    responsibilities: ["Audits finances", "Validates records"],
  },
  {
    role: "P.I.O",
    name: "Nativity France S. Cedron",
    description:
      "Manages announcements and class communication.",
    responsibilities: ["Posts updates", "Handles communication"],
  },
  {
    role: "Business Managers",
    name: "Leo John S. Arganda & James Joseph T. Rovera",
    description:
      "Handles class projects, fundraising, and external coordination.",
    responsibilities: ["Manages projects", "Organizes fundraisers"],
  },
  {
    role: "Beadle",
    name: "Rejiro R. Reobaldez",
    description:
      "Maintains classroom order and assists teachers during class.",
    responsibilities: ["Assists teacher", "Maintains order"],
  },
  {
    role: "Co-beadle",
    name: "Arkin B. Canonizado",
    description:
      "Supports the beadle in maintaining classroom discipline.",
    responsibilities: ["Supports Beadle", "Helps classroom flow"],
  },
];