// Material handed to a vendor for a plan. It leaves the RM / component store and sits in the Vendor Stock
// until the plan is received (consumed) or, for raw material, returned through Material Inward > From Plan.
export const VENDOR_STOCK_NODE = 'vendorStock';

export const safeKey = (value) => String(value ?? '').replace(/[.#$[\]/]/g, '_');

export const normalizeSize = (size) => {
  const normalized = String(size || '').trim();
  return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized;
};

const round = (value) => Math.round((Number(value) || 0) * 1000) / 1000;

export const vendorRecordId = (stageKey, anchorPlanId, childId) => safeKey(`${stageKey}_${anchorPlanId}_${childId}`);

export const rmBalance = (record) => round(
  (Number(record.issuedQty) || 0) - (Number(record.consumedQty) || 0) - (Number(record.returnedQty) || 0)
);

export const componentBalances = (record) => Object.entries(record.issuedSizes || {}).map(([size, issued]) => {
  const consumed = record.consumedSizes?.[size] || {};
  return {
    size,
    issuedLeft: Number(issued.leftQty) || 0,
    issuedRight: Number(issued.rightQty) || 0,
    leftQty: (Number(issued.leftQty) || 0) - (Number(consumed.leftQty) || 0),
    rightQty: (Number(issued.rightQty) || 0) - (Number(consumed.rightQty) || 0),
  };
});

// Writes the consumption caused by receiving a plan item; recomputed from scratch, so re-saving a receipt is safe.
export const vendorConsumptionUpdates = (records, planIds, receivedSizes) => {
  const updates = {};
  const ids = new Set(planIds);
  const received = new Map();
  (receivedSizes || []).forEach((row) => {
    const key = normalizeSize(row.size);
    const current = received.get(key) || { leftQty: 0, rightQty: 0 };
    current.leftQty += Number(row.leftQty) || 0;
    current.rightQty += Number(row.rightQty) || 0;
    received.set(key, current);
  });
  const pairs = [...received.values()].reduce((total, row) => total + (row.leftQty + row.rightQty) / 2, 0);
  records
    .filter((record) => (record.planIds || []).some((id) => ids.has(id)))
    .forEach((record) => {
      if (record.kind === 'RM') {
        const open = (Number(record.issuedQty) || 0) - (Number(record.returnedQty) || 0);
        updates[`${VENDOR_STOCK_NODE}/${record.id}/consumedQty`] = round(Math.max(0, Math.min(open, (Number(record.qtyPerPair) || 0) * pairs)));
        return;
      }
      const consumed = {};
      Object.entries(record.issuedSizes || {}).forEach(([size, issued]) => {
        const got = received.get(size) || { leftQty: 0, rightQty: 0 };
        consumed[size] = {
          leftQty: Math.min(Number(issued.leftQty) || 0, got.leftQty),
          rightQty: Math.min(Number(issued.rightQty) || 0, got.rightQty),
        };
      });
      updates[`${VENDOR_STOCK_NODE}/${record.id}/consumedSizes`] = consumed;
    });
  return updates;
};
