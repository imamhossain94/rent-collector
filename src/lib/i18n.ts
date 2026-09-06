import type { Lang } from "./constants";

/**
 * Tiny bilingual dictionary. Bangla is the default because that is what a
 * Bangladeshi bariwala reads; every screen can be flipped to English from the
 * top bar. Keys are grouped by screen for easy extension.
 */
const dict = {
  // brand / generic
  appName: { bn: "ভাড়া খাতা", en: "Bhara Khata" },
  appTagline: { bn: "বাড়িওয়ালার ডিজিটাল ভাড়া খাতা", en: "The landlord's digital rent ledger" },
  save: { bn: "সংরক্ষণ", en: "Save" },
  saveChanges: { bn: "পরিবর্তন সংরক্ষণ", en: "Save changes" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  delete: { bn: "মুছুন", en: "Delete" },
  edit: { bn: "সম্পাদনা", en: "Edit" },
  add: { bn: "যোগ করুন", en: "Add" },
  create: { bn: "তৈরি করুন", en: "Create" },
  update: { bn: "হালনাগাদ", en: "Update" },
  search: { bn: "খুঁজুন", en: "Search" },
  filter: { bn: "ফিল্টার", en: "Filter" },
  all: { bn: "সব", en: "All" },
  view: { bn: "দেখুন", en: "View" },
  viewAll: { bn: "সব দেখুন", en: "View all" },
  print: { bn: "প্রিন্ট", en: "Print" },
  back: { bn: "ফিরে যান", en: "Back" },
  actions: { bn: "কাজ", en: "Actions" },
  status: { bn: "অবস্থা", en: "Status" },
  total: { bn: "মোট", en: "Total" },
  month: { bn: "মাস", en: "Month" },
  date: { bn: "তারিখ", en: "Date" },
  amount: { bn: "টাকা", en: "Amount" },
  note: { bn: "মন্তব্য", en: "Note" },
  optional: { bn: "ঐচ্ছিক", en: "optional" },
  none: { bn: "নেই", en: "None" },
  noData: { bn: "কোনো তথ্য নেই", en: "Nothing here yet" },
  confirmDelete: { bn: "আপনি কি নিশ্চিত? এটি ফেরানো যাবে না।", en: "Are you sure? This cannot be undone." },
  required: { bn: "আবশ্যক", en: "required" },
  perMonth: { bn: "/ মাস", en: "/ month" },
  taka: { bn: "টাকা", en: "BDT" },

  // auth
  login: { bn: "লগইন", en: "Sign in" },
  logout: { bn: "লগআউট", en: "Sign out" },
  register: { bn: "নিবন্ধন", en: "Create account" },
  signInTitle: { bn: "আপনার খাতায় ঢুকুন", en: "Sign in to your khata" },
  signUpTitle: { bn: "বাড়িওয়ালা হিসেবে শুরু করুন", en: "Start as a house owner" },
  phone: { bn: "মোবাইল নম্বর", en: "Mobile number" },
  password: { bn: "পাসওয়ার্ড", en: "Password" },
  name: { bn: "নাম", en: "Name" },
  email: { bn: "ইমেইল", en: "Email" },
  noAccount: { bn: "অ্যাকাউন্ট নেই?", en: "No account yet?" },
  haveAccount: { bn: "অ্যাকাউন্ট আছে?", en: "Already have an account?" },

  // nav
  navOverview: { bn: "ড্যাশবোর্ড", en: "Overview" },
  navProperties: { bn: "সম্পত্তি", en: "Properties" },
  navTenants: { bn: "ভাড়াটিয়া", en: "Tenants" },
  navBills: { bn: "বিল", en: "Bills" },
  navPayments: { bn: "আদায়", en: "Collections" },
  navUtilities: { bn: "বিদ্যুৎ ও মিটার", en: "Electricity & meters" },
  navExpenses: { bn: "খরচ", en: "Expenses" },
  navReports: { bn: "রিপোর্ট", en: "Reports" },
  navSms: { bn: "এসএমএস", en: "SMS" },
  navSettings: { bn: "সেটিংস", en: "Settings" },
  navAdmin: { bn: "অ্যাডমিন", en: "Admin" },
  navUsers: { bn: "ব্যবহারকারী", en: "Users" },
  navAudit: { bn: "লগ", en: "Audit log" },
  groupManage: { bn: "পরিচালনা", en: "Manage" },
  groupMoney: { bn: "হিসাব", en: "Money" },
  groupMore: { bn: "আরও", en: "More" },

  // dashboard
  dashTitle: { bn: "মাসিক সারসংক্ষেপ", en: "Monthly overview" },
  dashSubtitle: {
    bn: "চলতি মাসের ভাড়া আদায়, বকেয়া ও খরচের হিসাব এক নজরে",
    en: "Rent collected, dues and expenses for the running month at a glance",
  },
  collected: { bn: "আদায় হয়েছে", en: "Collected" },
  due: { bn: "বকেয়া", en: "Outstanding" },
  billed: { bn: "বিল হয়েছে", en: "Billed" },
  expenses: { bn: "খরচ", en: "Expenses" },
  netIncome: { bn: "নীট আয়", en: "Net income" },
  occupancy: { bn: "ভাড়া হয়েছে", en: "Occupancy" },
  units: { bn: "ইউনিট", en: "Units" },
  tenants: { bn: "ভাড়াটিয়া", en: "Tenants" },
  collectionRate: { bn: "আদায়ের হার", en: "Collection rate" },
  quickActions: { bn: "দ্রুত কাজ", en: "Quick actions" },
  recentPayments: { bn: "সাম্প্রতিক আদায়", en: "Recent collections" },
  topDues: { bn: "সবচেয়ে বেশি বকেয়া", en: "Largest dues" },
  sixMonthTrend: { bn: "৬ মাসের আদায়", en: "6-month collection" },
  vacantUnits: { bn: "খালি ইউনিট", en: "Vacant units" },
  dueReminder: { bn: "তাগাদা দিন", en: "Send reminder" },

  // properties
  propTitle: { bn: "সম্পত্তি তালিকা", en: "Properties" },
  propSubtitle: {
    bn: "বাড়ি, দোকান, গ্যারেজ — যা কিছু ভাড়া দেন সব এখানে",
    en: "Houses, shops, garages — everything you rent out",
  },
  addProperty: { bn: "নতুন সম্পত্তি", en: "New property" },
  propertyName: { bn: "সম্পত্তির নাম", en: "Property name" },
  propertyType: { bn: "ধরন", en: "Type" },
  address: { bn: "ঠিকানা", en: "Address" },
  area: { bn: "এলাকা", en: "Area" },
  city: { bn: "শহর", en: "City" },
  district: { bn: "জেলা", en: "District" },
  division: { bn: "বিভাগ", en: "Division" },
  billingDefaults: { bn: "বিলের ডিফল্ট হিসাব", en: "Billing defaults" },
  electricityRate: { bn: "বিদ্যুৎ রেট (প্রতি ইউনিট)", en: "Electricity rate (per unit)" },
  gasCharge: { bn: "গ্যাস বিল", en: "Gas charge" },
  waterCharge: { bn: "পানির বিল", en: "Water charge" },
  serviceCharge: { bn: "সার্ভিস চার্জ", en: "Service charge" },
  dueDay: { bn: "প্রতি মাসের কত তারিখে ভাড়া দিতে হবে", en: "Rent due on day of month" },
  lateFee: { bn: "বিলম্ব ফি", en: "Late fee" },

  // units
  addUnit: { bn: "ইউনিট যোগ করুন", en: "Add unit" },
  unitName: { bn: "ইউনিট / ফ্ল্যাট নম্বর", en: "Unit / flat no." },
  floor: { bn: "তলা", en: "Floor" },
  rent: { bn: "ভাড়া", en: "Rent" },
  meterNo: { bn: "বিদ্যুৎ মিটার নম্বর", en: "Electric meter no." },
  sizeSqft: { bn: "আয়তন (বর্গফুট)", en: "Size (sqft)" },
  bedrooms: { bn: "বেডরুম", en: "Bedrooms" },
  bathrooms: { bn: "বাথরুম", en: "Bathrooms" },

  // tenants
  tenantTitle: { bn: "ভাড়াটিয়া", en: "Tenants" },
  tenantSubtitle: {
    bn: "প্রত্যেক ভাড়াটিয়ার তথ্য, চুক্তি, জামানত ও বকেয়ার হিসাব",
    en: "Every tenant's profile, agreement, deposit and outstanding balance",
  },
  addTenant: { bn: "নতুন ভাড়াটিয়া", en: "New tenant" },
  tenantName: { bn: "ভাড়াটিয়ার নাম", en: "Tenant name" },
  nid: { bn: "এনআইডি নম্বর", en: "NID number" },
  occupation: { bn: "পেশা", en: "Occupation" },
  familyMembers: { bn: "সদস্য সংখ্যা", en: "Family members" },
  permanentAddress: { bn: "স্থায়ী ঠিকানা", en: "Permanent address" },
  emergencyContact: { bn: "জরুরি যোগাযোগ", en: "Emergency contact" },
  moveIn: { bn: "ওঠার তারিখ", en: "Move-in date" },
  moveOut: { bn: "ছাড়ার তারিখ", en: "Move-out date" },
  agreement: { bn: "চুক্তির মেয়াদ", en: "Agreement period" },
  advance: { bn: "জামানত / অগ্রিম", en: "Security deposit" },
  openingDue: { bn: "পুরোনো বকেয়া", en: "Opening due" },
  ledger: { bn: "খতিয়ান", en: "Ledger" },
  unitAssign: { bn: "কোন ইউনিটে", en: "Assigned unit" },
  utilitySetup: { bn: "ইউটিলিটি হিসাব", en: "Utility setup" },
  electricityMode: { bn: "বিদ্যুৎ বিলের ধরন", en: "Electricity billing" },
  fixedElectricity: { bn: "নির্দিষ্ট বিদ্যুৎ বিল", en: "Fixed electricity" },
  otherCharge: { bn: "অন্যান্য চার্জ", en: "Other charge" },
  moveOutTenant: { bn: "ভাড়াটিয়া ছেড়ে দিয়েছেন", en: "Mark as moved out" },

  // bills
  billTitle: { bn: "মাসিক বিল", en: "Monthly bills" },
  billSubtitle: {
    bn: "এক ক্লিকে সব ভাড়াটিয়ার মাসিক বিল তৈরি করুন",
    en: "Generate the whole month's bills for every tenant in one click",
  },
  generateBills: { bn: "মাসিক বিল তৈরি করুন", en: "Generate monthly bills" },
  newBill: { bn: "একক বিল", en: "Single bill" },
  billNo: { bn: "বিল নম্বর", en: "Bill no." },
  billingMonth: { bn: "বিলের মাস", en: "Billing month" },
  issueDate: { bn: "ইস্যুর তারিখ", en: "Issue date" },
  dueDate: { bn: "শেষ তারিখ", en: "Due date" },
  previousDue: { bn: "পূর্বের বকেয়া", en: "Previous due" },
  discount: { bn: "ছাড়", en: "Discount" },
  grandTotal: { bn: "সর্বমোট", en: "Grand total" },
  paid: { bn: "পরিশোধিত", en: "Paid" },
  balance: { bn: "বাকি", en: "Balance" },
  billItems: { bn: "বিলের খাত", en: "Bill items" },
  collect: { bn: "টাকা নিন", en: "Collect" },
  moneyReceipt: { bn: "মানি রিসিট", en: "Money receipt" },
  inWords: { bn: "কথায়", en: "In words" },

  // payments
  payTitle: { bn: "আদায়ের তালিকা", en: "Collections" },
  paySubtitle: { bn: "কে কবে কত টাকা দিয়েছে তার পূর্ণ হিসাব", en: "Every taka received, with receipt" },
  receiptNo: { bn: "রসিদ নম্বর", en: "Receipt no." },
  method: { bn: "মাধ্যম", en: "Method" },
  txnRef: { bn: "ট্রানজেকশন আইডি", en: "Transaction ID" },
  collectPayment: { bn: "ভাড়া আদায় করুন", en: "Record a collection" },
  receivedFrom: { bn: "যার কাছ থেকে", en: "Received from" },
  receivedBy: { bn: "গ্রহণকারী", en: "Received by" },

  // meter
  meterTitle: { bn: "মিটার রিডিং", en: "Meter readings" },
  meterSubtitle: {
    bn: "সাব-মিটারের রিডিং লিখুন, বিদ্যুৎ বিল নিজে থেকে হিসাব হবে",
    en: "Enter sub-meter readings and the electricity bill computes itself",
  },
  previousReading: { bn: "আগের রিডিং", en: "Previous" },
  currentReading: { bn: "এখনকার রিডিং", en: "Current" },
  unitsUsed: { bn: "খরচ (ইউনিট)", en: "Units used" },
  rate: { bn: "রেট", en: "Rate" },
  saveReadings: { bn: "রিডিং সংরক্ষণ", en: "Save readings" },

  // expenses
  expenseTitle: { bn: "বাড়ির খরচ", en: "Property expenses" },
  expenseSubtitle: { bn: "মেরামত, বেতন, কর — সব খরচ লিখে রাখুন", en: "Repairs, salary, tax — keep every cost" },
  addExpense: { bn: "খরচ যোগ করুন", en: "Add expense" },
  category: { bn: "খাত", en: "Category" },
  vendor: { bn: "কার কাছে দেওয়া হলো", en: "Paid to" },

  // reports
  reportTitle: { bn: "রিপোর্ট", en: "Reports" },
  reportSubtitle: { bn: "মাসভিত্তিক আয়-ব্যয় ও বকেয়ার পূর্ণ চিত্র", en: "Month-by-month income, expense and dues" },
  incomeVsExpense: { bn: "আয় বনাম ব্যয়", en: "Income vs expense" },
  duesByTenant: { bn: "ভাড়াটিয়া ভিত্তিক বকেয়া", en: "Dues by tenant" },
  propertyPerformance: { bn: "সম্পত্তি ভিত্তিক হিসাব", en: "Per-property performance" },

  // sms
  smsTitle: { bn: "এসএমএস ও তাগাদা", en: "SMS & reminders" },
  smsSubtitle: {
    bn: "বকেয়া ভাড়াটিয়াদের এক ক্লিকে মনে করিয়ে দিন",
    en: "Remind every tenant with an outstanding balance in one click",
  },
  sendReminders: { bn: "সবাইকে তাগাদা পাঠান", en: "Remind all due tenants" },
  message: { bn: "বার্তা", en: "Message" },

  // settings
  settingsTitle: { bn: "সেটিংস", en: "Settings" },
  profile: { bn: "প্রোফাইল", en: "Profile" },
  businessName: { bn: "প্রতিষ্ঠানের নাম", en: "Business name" },
  changePassword: { bn: "পাসওয়ার্ড পরিবর্তন", en: "Change password" },
  currentPassword: { bn: "বর্তমান পাসওয়ার্ড", en: "Current password" },
  newPassword: { bn: "নতুন পাসওয়ার্ড", en: "New password" },
  language: { bn: "ভাষা", en: "Language" },
  dangerZone: { bn: "সতর্কতা", en: "Danger zone" },

  // admin
  adminTitle: { bn: "সুপার অ্যাডমিন", en: "Super admin" },
  adminSubtitle: { bn: "সব ব্যবহারকারী ও প্ল্যাটফর্মের হিসাব", en: "Every user and the whole platform" },
  totalOwners: { bn: "মোট বাড়িওয়ালা", en: "House owners" },
  totalProperties: { bn: "মোট সম্পত্তি", en: "Properties" },
  platformCollection: { bn: "প্ল্যাটফর্ম আদায়", en: "Platform collection" },
  suspend: { bn: "স্থগিত করুন", en: "Suspend" },
  activate: { bn: "সক্রিয় করুন", en: "Activate" },
  resetPassword: { bn: "পাসওয়ার্ড রিসেট", en: "Reset password" },
  loginAsOwner: { bn: "এই ব্যবহারকারী হিসেবে দেখুন", en: "View as user" },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Lang): string {
  const entry = dict[key];
  return (lang === "bn" ? entry.bn : entry.en) as string;
}

/** Bound translator: `const tr = translator(lang); tr("save")` */
export function translator(lang: Lang) {
  return (key: DictKey) => t(key, lang);
}

/** Pick from an inline pair without adding a dictionary key. */
export function pick(lang: Lang, bn: string, en: string): string {
  return lang === "bn" ? bn : en;
}
