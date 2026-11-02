// NLMTO keeps the original node so existing requirement rows stay in place.
export const REQUIREMENT_CATEGORIES = [
  { key: 'nlmto', label: 'NLMTO', dbPath: 'requirementsData/' },
  { key: 'case-mto', label: 'Case MTO', dbPath: 'requirementsData_caseMto/' },
  { key: 'pair-mto', label: 'Pair MTO', dbPath: 'requirementsData_pairMto/' },
  { key: 'dmart-orders', label: 'Dmart Orders', dbPath: 'requirementsData_dmartOrders/' },
  { key: 'export-order', label: 'Export Order', dbPath: 'requirementsData_exportOrder/' },
  { key: 'special-orders', label: 'Special Orders', dbPath: 'requirementsData_specialOrders/' },
];

export const requirementRoute = (category) => `production-planning-inputs/requirement-entry/${category.key}`;
