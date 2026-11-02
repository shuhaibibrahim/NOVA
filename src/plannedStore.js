import { get, push, ref } from 'firebase/database';
import { db } from './firebase_config';

export const PLANNED_STORE_NODE = 'plannedStoreStock';
const PLANNED_SHARE = 0.9;

export const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const plannedQuantity = (value) => Math.round((Number(value) || 0) * PLANNED_SHARE);

// Updates that remove the planned stock previously booked for these plans.
export async function clearPlannedStock(fn, planIds) {
  const ids = new Set(planIds);
  const snapshot = await get(ref(db, `${PLANNED_STORE_NODE}/${fn}`));
  const updates = {};
  Object.entries(snapshot.val() || {}).forEach(([key, record]) => {
    if (Object.values(record.planIds || {}).some((id) => ids.has(id))) {
      updates[`${PLANNED_STORE_NODE}/${fn}/${key}`] = null;
    }
  });
  return updates;
}

// Marks the plans as received and books 90% of each size quantity into the Planning Store.
export async function markReceivedUpdates({ fn, planNode, plans, details, sizes, buildComponentQuantities, date }) {
  const planIds = plans.map((plan) => plan.id);
  const updates = await clearPlannedStock(fn, planIds);
  const receivedSizes = sizes
    .map((row) => ({
      size: row.size,
      leftQty: plannedQuantity(row.leftQty),
      rightQty: plannedQuantity(row.rightQty),
    }))
    .filter((row) => row.leftQty > 0 || row.rightQty > 0);
  const record = { ...details, planIds, markedDate: date, receivedSizes, submittedAt: Date.now() };
  if (buildComponentQuantities) {
    record.componentQuantities = buildComponentQuantities(receivedSizes)
      .filter((row) => row.leftQty > 0 || row.rightQty > 0);
  }
  updates[`${PLANNED_STORE_NODE}/${fn}/${push(ref(db, `${PLANNED_STORE_NODE}/${fn}`)).key}`] = record;
  plans.forEach((plan) => {
    updates[`${planNode}/${plan.id}/receivedMarked`] = true;
    updates[`${planNode}/${plan.id}/receivedMarkedDate`] = date;
  });
  return updates;
}
