import React, { useEffect, useMemo, useState } from 'react';
import { onValue, ref, update } from 'firebase/database';
import { db } from '../firebase_config';
import { VENDOR_STOCK_NODE, rmBalance, safeKey } from '../vendorStock';

const round = (value) => Math.round((Number(value) || 0) * 1000) / 1000;

// Raw material left with a vendor after a plan is received comes back here: RM stock goes up, Vendor Stock goes down.
function VendorReturnSheet() {
  const [records, setRecords] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [returnQty, setReturnQty] = useState({});
  const [vendorFilter, setVendorFilter] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => onValue(ref(db, `${VENDOR_STOCK_NODE}/`), (snapshot) => {
    setRecords(Object.entries(snapshot.val() || {}).map(([id, record]) => ({ ...record, id })));
  }), []);

  useEffect(() => onValue(ref(db, 'stockData/'), (snapshot) => {
    setStockData(Object.values(snapshot.val() || {}));
  }), []);

  const open = useMemo(() => records
    .filter((record) => record.kind === 'RM' && rmBalance(record) > 0 && (!vendorFilter || record.vendorName === vendorFilter))
    .sort((first, second) => String(first.vendorName).localeCompare(String(second.vendorName))), [records, vendorFilter]);
  const vendors = useMemo(() => [...new Set(records.filter((record) => record.kind === 'RM').map((record) => record.vendorName).filter(Boolean))].sort(), [records]);

  const returnMaterial = async (record) => {
    const balance = rmBalance(record);
    const qty = Number(returnQty[record.id] ?? balance);
    if (!(qty > 0) || qty > balance) {
      window.alert(`Enter a quantity between 0 and ${balance}.`);
      return;
    }
    const stock = stockData.find((entry) => String(entry.materialNumber) === String(record.materialNumber));
    if (!stock) {
      window.alert(`${record.materialNumber} is not available in the RM Store stock.`);
      return;
    }
    if (!window.confirm(`Return ${qty} ${record.unit || ''} of ${record.label} from ${record.vendorName} to the RM Store?`)) return;
    const inwardKey = safeKey(`${record.id}_return_${Date.now()}`);
    setBusyId(record.id);
    try {
      await update(ref(db), {
        [`materialInwardData/${inwardKey}`]: {
          id: inwardKey,
          materialNumber: record.materialNumber,
          materialDesc: stock.materialDesc || record.label,
          qty,
          unit: record.unit || stock.unit || '',
          inwardType: 'fromPlan',
          vendorName: record.vendorName,
          planCode: record.planCode || '',
        },
        [`stockData/${stock.id || record.materialNumber}/qty`]: round((Number(stock.qty) || 0) + qty),
        [`${VENDOR_STOCK_NODE}/${record.id}/returnedQty`]: round((Number(record.returnedQty) || 0) + qty),
      });
      setReturnQty((current) => ({ ...current, [record.id]: undefined }));
    } catch (error) {
      window.alert(`Unable to return the material: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3 rounded bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="mr-4 text-lg font-semibold">Material Inward — From Plan</h2>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Vendor
          <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} className="rounded border border-gray-300 p-2">
            <option value="">All vendors</option>
            {vendors.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
          </select>
        </label>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-200 text-left">
            {['Vendor', 'Plan', 'Material', 'Issued', 'Consumed', 'Returned', 'Balance with vendor', 'Return qty', ''].map((heading) => (
              <th key={heading} className="border border-gray-300 p-2">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {open.map((record) => (
            <tr key={record.id}>
              <td className="border border-gray-300 p-2">{record.vendorName}</td>
              <td className="border border-gray-300 p-2">{record.planCode} ({record.stageLabel})</td>
              <td className="border border-gray-300 p-2">{record.label} ({record.materialNumber})</td>
              <td className="border border-gray-300 p-2">{record.issuedQty} {record.unit}</td>
              <td className="border border-gray-300 p-2">{record.consumedQty || 0} {record.unit}</td>
              <td className="border border-gray-300 p-2">{record.returnedQty || 0} {record.unit}</td>
              <td className="border border-gray-300 p-2 font-semibold">{rmBalance(record)} {record.unit}</td>
              <td className="border border-gray-300 p-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={returnQty[record.id] ?? rmBalance(record)}
                  onChange={(event) => setReturnQty((current) => ({ ...current, [record.id]: event.target.value }))}
                  className="w-24 rounded border border-gray-300 p-1"
                />
              </td>
              <td className="border border-gray-300 p-2">
                <button
                  type="button"
                  disabled={busyId === record.id}
                  onClick={() => returnMaterial(record)}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  RETURN
                </button>
              </td>
            </tr>
          ))}
          {!open.length && <tr><td colSpan={9} className="p-4 text-center text-gray-500">No raw material is waiting to be returned by vendors.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default VendorReturnSheet;
