import React, { useEffect, useMemo, useState } from 'react';
import { onValue, ref, update } from 'firebase/database';
import { auth, db } from '../firebase_config';
import { CONSUMPTION_NODE } from '../stockConsumption';
import { VENDOR_STOCK_NODE, normalizeSize, rmBalance, safeKey, vendorRecordId } from '../vendorStock';

const STOCK_CHILD_PREFIX = 'stock:';
const round = (value) => Math.round((Number(value) || 0) * 1000) / 1000;

// Issues the BOM materials of a vendor plan item: raw material leaves the RM store, components leave their
// component store, and both are held in the Vendor Stock until the plan is received.
function VendorMaterialIssue({
  item, stage, stageKey, stockStage, article, components, bomRecords, vendorRecords, sizeRowsForPlan, componentLabel, onClose,
}) {
  const [stockData, setStockData] = useState([]);
  const [inputs, setInputs] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => onValue(ref(db, 'stockData/'), (snapshot) => {
    setStockData(Object.values(snapshot.val() || {}));
  }), []);

  const anchorPlanId = item.plans[0]?.id;
  const planIds = item.plans.map((plan) => plan.id);
  const pairs = item.sizes.reduce((total, size) => total + (size.leftQty + size.rightQty) / 2, 0);

  const rows = useMemo(() => {
    const seen = new Set();
    const result = [];
    components.forEach((component) => {
      (component.childComponentIds || []).forEach((childId) => {
        if (!childId || String(childId).startsWith('__') || seen.has(childId)) return;
        if (String(childId).startsWith(STOCK_CHILD_PREFIX)) {
          const materialNumber = String(childId).slice(STOCK_CHILD_PREFIX.length);
          const stock = stockData.find((entry) => String(entry.materialNumber) === materialNumber);
          const qtyPerPair = Number(component.qtyPerCs) || 0;
          seen.add(childId);
          result.push({
            kind: 'RM',
            childId,
            component,
            materialNumber,
            label: stock?.materialDesc || materialNumber,
            unit: stock?.unit || component.unit || '',
            qtyPerPair,
            required: round(qtyPerPair * pairs),
            stock,
          });
          return;
        }
        const child = bomRecords.find((record) => record.id === childId);
        if (!child) return;
        seen.add(childId);
        result.push({
          kind: 'COMPONENT',
          childId,
          component,
          child,
          label: componentLabel(child),
        });
      });
    });
    return result;
  }, [components, bomRecords, stockData, pairs]);

  const recordFor = (row) => vendorRecords.find((record) => record.id === vendorRecordId(stageKey, anchorPlanId, row.childId));

  const baseRecord = (row) => ({
    id: vendorRecordId(stageKey, anchorPlanId, row.childId),
    kind: row.kind,
    stage: stageKey,
    stageLabel: stage.label,
    planNode: stage.planNode,
    planIds,
    planCode: item.plans[0]?.planCode || '',
    vendorName: item.vendorName,
    article: item.article,
    model: item.model,
    colour: item.colour,
    articleId: article?.id || '',
    parentComponent: componentLabel(row.component),
    childId: row.childId,
    label: row.label,
    issuedAt: Date.now(),
    issuedBy: auth.currentUser?.email || '',
  });

  const issueRaw = async (row) => {
    const qty = Number(inputs[row.childId] ?? row.required);
    if (!(qty > 0)) {
      window.alert('Enter the quantity to issue.');
      return;
    }
    if (!row.stock) {
      window.alert(`${row.label} is not available in the RM Store stock.`);
      return;
    }
    if ((Number(row.stock.qty) || 0) < qty) {
      window.alert(`Only ${row.stock.qty} ${row.unit} of ${row.label} is available in the RM Store.`);
      return;
    }
    if (!window.confirm(`Issue ${qty} ${row.unit} of ${row.label} to ${item.vendorName}?`)) return;
    const issueKey = safeKey(`${vendorRecordId(stageKey, anchorPlanId, row.childId)}_${Date.now()}`);
    const existing = recordFor(row);
    const updates = {
      [`materialIssueData/${issueKey}`]: {
        id: issueKey,
        materialNumber: row.materialNumber,
        materialDesc: row.stock.materialDesc || row.label,
        qty,
        unit: row.unit,
        issueType: 'vendorIssue',
        vendorName: item.vendorName,
        planCode: item.plans[0]?.planCode || '',
      },
      [`stockData/${row.stock.id || row.materialNumber}/qty`]: round((Number(row.stock.qty) || 0) - qty),
    };
    if (existing) {
      updates[`${VENDOR_STOCK_NODE}/${existing.id}/issuedQty`] = round((Number(existing.issuedQty) || 0) + qty);
    } else {
      updates[`${VENDOR_STOCK_NODE}/${baseRecord(row).id}`] = {
        ...baseRecord(row),
        materialNumber: row.materialNumber,
        unit: row.unit,
        qtyPerPair: row.qtyPerPair,
        requiredQty: row.required,
        issuedQty: qty,
        consumedQty: 0,
        returnedQty: 0,
      };
    }
    await save(updates);
  };

  const issueComponent = async (row) => {
    if (!window.confirm(`Issue ${row.label} to ${item.vendorName}?`)) return;
    const record = baseRecord(row);
    const issuedSizes = {};
    item.sizes.forEach((size) => {
      issuedSizes[normalizeSize(size.size) || '-'] = { leftQty: size.leftQty, rightQty: size.rightQty };
    });
    const updates = {
      [`${VENDOR_STOCK_NODE}/${record.id}`]: {
        ...record,
        childFn: String(row.child.functionName || row.child.process || '').trim().toUpperCase(),
        issuedSizes,
        consumedSizes: null,
      },
    };
    // Stock stages already booked this stock when the plan was created; the others reduce it now.
    if (!stockStage && article) {
      item.sizes.forEach((size) => {
        size.plans.forEach((plan) => {
          const planRow = sizeRowsForPlan(plan).find((entry) => String(entry.size).trim() === String(size.size).trim());
          if (!planRow) return;
          updates[`${CONSUMPTION_NODE}/${safeKey(`${plan.id}_${row.childId}_${normalizeSize(size.size)}`)}`] = {
            planId: plan.id,
            fn: String(row.child.functionName || row.child.process || '').trim().toUpperCase(),
            articleId: article.id,
            componentId: row.childId,
            size: normalizeSize(size.size),
            leftQty: planRow.leftQty,
            rightQty: planRow.rightQty,
            vendorIssue: record.id,
          };
        });
      });
    }
    await save(updates);
  };

  const save = async (updates) => {
    setBusy(true);
    try {
      await update(ref(db), updates);
    } catch (error) {
      window.alert(`Unable to issue the material: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-full w-full max-w-4xl space-y-4 overflow-auto rounded bg-white p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold">{stage.label} Material Issue — {item.vendorName}</h2>
          <p className="text-sm text-gray-600">
            {item.plans[0]?.planCode} · {item.model} · {item.article} · {item.colour} · {Math.round(pairs * 100) / 100} PR
          </p>
        </div>
        {!rows.length && <p className="rounded border border-gray-200 p-4 text-center text-gray-500">No child materials are defined in the BOM for the selected components.</p>}
        {rows.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                {['Component', 'Material', 'Type', 'Required', 'In stock', 'Issue qty', 'Issued', ''].map((heading) => (
                  <th key={heading} className="border border-gray-300 p-2">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const record = recordFor(row);
                const issued = row.kind === 'RM' ? Number(record?.issuedQty) || 0 : 0;
                return (
                  <tr key={row.childId}>
                    <td className="border border-gray-300 p-2">{componentLabel(row.component)}</td>
                    <td className="border border-gray-300 p-2">{row.label}</td>
                    <td className="border border-gray-300 p-2">{row.kind === 'RM' ? 'Raw material' : 'Component'}</td>
                    <td className="border border-gray-300 p-2">{row.kind === 'RM' ? `${row.required} ${row.unit}` : `${pairs} PR`}</td>
                    <td className="border border-gray-300 p-2">{row.kind === 'RM' ? `${row.stock?.qty ?? 0} ${row.unit}` : '—'}</td>
                    <td className="border border-gray-300 p-2">
                      {row.kind === 'RM' ? (
                        <input
                          type="number"
                          min="0"
                          step="any"
                          aria-label={`Issue quantity for ${row.label}`}
                          value={inputs[row.childId] ?? row.required}
                          onChange={(event) => setInputs((current) => ({ ...current, [row.childId]: event.target.value }))}
                          className="w-24 rounded border border-gray-300 p-1"
                        />
                      ) : 'Full plan quantity'}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {row.kind === 'RM' ? (record ? `${issued} ${row.unit} (balance ${rmBalance(record)})` : '—') : (record ? 'Issued' : '—')}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <button
                        type="button"
                        disabled={busy || (row.kind === 'COMPONENT' && Boolean(record))}
                        onClick={() => (row.kind === 'RM' ? issueRaw(row) : issueComponent(row))}
                        className="whitespace-nowrap rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ISSUE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2">Close</button>
        </div>
      </div>
    </div>
  );
}

export default VendorMaterialIssue;
