// Shortage, damage and repair lines recorded on a stage receipt. `receivedSizes` always holds the
// stock built up so far: good pieces plus recovered shortages and repairs; `goodSizes` is what was
// entered as good on the receiving form.
export const DEFECT_KINDS = {
  shortage: { field: 'shortages', label: 'Shortage', plural: 'Shortages', recoverable: true },
  damage: { field: 'damages', label: 'Damage', plural: 'Damages', recoverable: false },
  repair: { field: 'repairs', label: 'Repair', plural: 'Repairs', recoverable: true },
};

export const STAGE_RECEIPT_NODES = {
  printing: { label: 'Printing', node: 'printingReceipts' },
  stitching: { label: 'Stitching', node: 'stitchingReceipts' },
  molding: { label: 'Molding', node: 'moldingReceipts' },
  grinding: { label: 'Grinding', node: 'grindingReceipts' },
  stuckon: { label: 'Stuckon', node: 'attachingReceipts' },
};

export const defectStatus = (line) => {
  const received = Number(line.receivedQuantity) || 0;
  if (received <= 0) return 'NOT RECEIVED';
  return received >= Number(line.quantity) ? 'RECEIVED' : 'PARTIALLY RECEIVED';
};

const sizeKey = (size) => String(size ?? '').trim().toUpperCase();

// Quantities by size and side that were recovered from shortage and repair lines.
const recoveredBySize = (receipt) => {
  const totals = new Map();
  ['shortages', 'repairs'].forEach((field) => {
    (receipt[field] || []).forEach((line) => {
      const received = Number(line.receivedQuantity) || 0;
      if (!received || !line.size) return;
      const key = sizeKey(line.size);
      const current = totals.get(key) || { size: line.size, leftQty: 0, rightQty: 0 };
      current[line.side === 'RIGHT' ? 'rightQty' : 'leftQty'] += received;
      totals.set(key, current);
    });
  });
  return totals;
};

export const goodSizesOf = (receipt) => receipt.goodSizes || receipt.receivedSizes || [];

// Good pieces plus whatever has come back from shortages and repairs.
export const effectiveReceivedSizes = (receipt) => {
  const totals = new Map();
  goodSizesOf(receipt).forEach((row) => {
    totals.set(sizeKey(row.size), {
      size: row.size,
      leftQty: Number(row.leftQty) || 0,
      rightQty: Number(row.rightQty) || 0,
    });
  });
  recoveredBySize(receipt).forEach((row, key) => {
    const current = totals.get(key) || { size: row.size, leftQty: 0, rightQty: 0 };
    current.leftQty += row.leftQty;
    current.rightQty += row.rightQty;
    totals.set(key, current);
  });
  return [...totals.values()].filter((row) => row.leftQty > 0 || row.rightQty > 0);
};

export const defectTotalsBySize = (receipt) => {
  const totals = new Map();
  Object.values(DEFECT_KINDS).forEach(({ field }) => {
    (receipt[field] || []).forEach((line) => {
      const key = `${sizeKey(line.size)}|${line.side === 'RIGHT' ? 'RIGHT' : 'LEFT'}`;
      totals.set(key, (totals.get(key) || 0) + (Number(line.quantity) || 0));
    });
  });
  return totals;
};
