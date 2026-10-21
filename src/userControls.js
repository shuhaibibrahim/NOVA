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
      ['planning-desk/molding-plan', 'Molding Plan'],
      ['planning-desk/grinding-plan', 'Grinding Plan'],
      ['planning-desk/stuckon-plan', 'Stuckon Production Plan'],
      ['planning-desk/packing-plan', 'Packing Plan'],
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    children: [
      ['analysis/loop-stocks', 'Loop Stocks'],
      ['analysis/shortage-details/clicker-shortage', 'Clicker Shortage'],
    ],
  },
  {
    id: 'execution',
    label: 'Execution',
    children: [
      ['execution/clicker-plan', 'Clicker Plan'],
    ],
  },
  {
    id: 'productionPlanningInputs',
    label: 'Production Planning Inputs',
    children: [
      ['production-planning-inputs/requirement-entry', 'Requirement Entry'],
      ['production-planning-inputs/coois-data', 'Coois Data'],
    ],
  },
  {
    id: 'adminDesk',
    label: 'Admin Desk',
    children: [
      ['admin/data-entry', 'Article Entry'],
      ['admin/bom-entry', 'BOM Entry'],
      ['admin/packingcombination-entry', 'Packing Combination'],
      ['admin/vendor-details', 'Vendor Details'],
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
