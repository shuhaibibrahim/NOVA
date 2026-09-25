export const CONTROL_TREE = [
  {
    id: 'spare',
    label: 'Spare Management',
    children: [
      ['spareview', 'Spare View'],
      ['sparehistory', 'Spare History'],
      ['sparein', 'Spare In'],
      ['spareout', 'Spare Out'],
    ],
  },
  {
    id: 'planningDesk',
    label: 'Planning Desk',
    children: [
      ['planning-desk/knitting-plan', 'Knitting Plan'],
      ['planning-desk/clicking-plan', 'Clicking Plan'],
      ['planning-desk/printing-plan', 'Printing Plan'],
      ['planning-desk/stitching-plan', 'Stitching Plan'],
      ['planning-desk/stuckon-plan', 'Stuckon Production Plan'],
    ],
  },
  {
    id: 'adminDesk',
    label: 'Admin Desk',
    children: [
      ['admin/data-entry', 'Article Entry'],
      ['admin/bom-data-entry', 'BOM Entry'],
      ['admin/requirement-entry', 'Requirement Entry'],
      ['admin/packingcombination-entry', 'Packing Combination'],
    ],
  },
  {
    id: 'mmDept',
    label: 'MM Department',
    children: [
      ['mmdept/stock-entry', 'Stock Entry'],
      ['mmdept/material-outward', 'Material Outward'],
      ['mmdept/material-inward', 'Material Inward'],
      ['mmdept/clicker-comp-store', 'Clicker Comp Store'],
      ['mmdept/printing-comp-store', 'Printing Comp Store'],
      ['mmdept/molding-receiving-store', 'Molding Receiving Store'],
    ],
  },
  {
    id: 'qcDepartment',
    label: 'QC Department',
    children: [['qc-department/fiu-qc', 'FIU QC']],
  },
  {
    id: 'history',
    label: 'History',
    children: [['history/article-entry', 'Article Entry History']],
  },
];

export const getControlLabels = () => CONTROL_TREE.flatMap(({ children }) => children);
export const controlKey = (id) => encodeURIComponent(id);
