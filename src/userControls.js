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
      ['analysis/shortage-details/printed-shortage', 'Printed Shortage'],
      ['analysis/shortage-details/stitching-shortage', 'Stitching Shortage'],
      ['analysis/shortage-details/molding-shortage', 'Molding Shortage'],
      ['analysis/shortage-details/grinding-shortage', 'Grinding Shortage'],
      ['analysis/shortage-details/attaching-shortage', 'Attaching Shortage'],
    ],
  },
  {
    id: 'execution',
    label: 'Execution',
    children: [
      ['execution/clicker-plan', 'Clicker Plan'],
      ['execution/printing-plan', 'Printing Plan'],
      ['execution/stitching-plan', 'Stitching Plan'],
      ['execution/molding-plan', 'Molding Plan'],
      ['execution/grinding-plan', 'Grinding Plan'],
      ['execution/stuckon-plan', 'Stuckon Plan'],
      ['execution/packing-plan', 'Packing Plan'],
    ],
  },
  {
    id: 'productionPlanningInputs',
    label: 'Production Planning Inputs',
    children: [
      ['production-planning-inputs/requirement-entry', 'Requirement Entry'],
      ['production-planning-inputs/coois-data', 'Coois Data'],
            ['production-planning-inputs/bor', 'BOR'],
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
      ['mmdept/fiu-store', 'FIU Store'],
      ['mmdept/molding-receiving-store', 'Molding Store'],
      ['mmdept/grinding-store', 'Grinding Store'],
      ['mmdept/attaching-store', 'Attaching Store'],
      ['mmdept/packing-store', 'Packing Store'],
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
    children: [['history/article-entry', 'Article Entry History'], ['history/bom', 'BOM']],
  },
];

export const getControlLabels = () => CONTROL_TREE.flatMap(({ children }) => children);
export const controlKey = (id) => encodeURIComponent(id);
