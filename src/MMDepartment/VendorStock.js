import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref } from 'firebase/database';
import { db } from '../firebase_config';
import { VENDOR_STOCK_NODE, componentBalances, rmBalance } from '../vendorStock';

function VendorStock() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [records, setRecords] = useState([]);
  const [vendorFilter, setVendorFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [showCleared, setShowCleared] = useState(false);

  useEffect(() => {
    setSelectedLink('mmdept/vendor-stock');
    setOpenedTab('mmDept');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => onValue(ref(db, `${VENDOR_STOCK_NODE}/`), (snapshot) => {
    setRecords(Object.entries(snapshot.val() || {}).map(([id, record]) => ({ ...record, id })));
  }), []);

  const vendors = useMemo(() => [...new Set(records.map((record) => record.vendorName).filter(Boolean))].sort(), [records]);

  const rows = useMemo(() => records
    .filter((record) => (!vendorFilter || record.vendorName === vendorFilter)
      && (!planFilter || String(record.planCode || '').toLowerCase().includes(planFilter.toLowerCase())))
    .flatMap((record) => {
      const common = {
        key: record.id,
        vendor: record.vendorName,
        plan: `${record.planCode || ''} (${record.stageLabel || ''})`,
        article: [record.model, record.article, record.colour].filter(Boolean).join(' / '),
        parent: record.parentComponent,
        material: record.label,
        issuedAt: record.issuedAt,
      };
      if (record.kind === 'RM') {
        return [{
          ...common,
          type: 'Raw material',
          size: '',
          issued: `${record.issuedQty || 0} ${record.unit || ''}`,
          consumed: `${record.consumedQty || 0} ${record.unit || ''}`,
          returned: `${record.returnedQty || 0} ${record.unit || ''}`,
          balance: `${rmBalance(record)} ${record.unit || ''}`,
          open: rmBalance(record) > 0,
        }];
      }
      return componentBalances(record).map((entry) => ({
        ...common,
        key: `${record.id}-${entry.size}`,
        type: 'Component',
        size: entry.size,
        issued: `L ${entry.issuedLeft} / R ${entry.issuedRight}`,
        consumed: `L ${entry.issuedLeft - entry.leftQty} / R ${entry.issuedRight - entry.rightQty}`,
        returned: '—',
        balance: `L ${entry.leftQty} / R ${entry.rightQty}`,
        open: entry.leftQty > 0 || entry.rightQty > 0,
      }));
    })
    .filter((row) => showCleared || row.open)
    .sort((first, second) => String(first.vendor).localeCompare(String(second.vendor)) || (second.issuedAt || 0) - (first.issuedAt || 0)),
  [records, vendorFilter, planFilter, showCleared]);

  return (
    <div className="h-full space-y-3 bg-blue-50 px-3 py-4">
      <div className="flex flex-wrap items-end gap-3 rounded bg-white p-3">
        <h1 className="mr-4 text-lg font-semibold">Vendor Stock</h1>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Vendor
          <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} className="rounded border border-gray-300 p-2">
            <option value="">All vendors</option>
            {vendors.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Plan code
          <input value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="rounded border border-gray-300 p-2" />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={showCleared} onChange={(event) => setShowCleared(event.target.checked)} />
          Show cleared lines
        </label>
      </div>
      <div className="max-h-[75vh] overflow-auto rounded bg-white p-3">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 bg-gray-200 text-left">
              {['Vendor', 'Plan', 'Article', 'Component', 'Material / Child', 'Type', 'Size', 'Issued', 'Consumed', 'Returned', 'Balance'].map((heading) => (
                <th key={heading} className="border border-gray-300 p-2">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                {[row.vendor, row.plan, row.article, row.parent, row.material, row.type, row.size, row.issued, row.consumed, row.returned, row.balance].map((value, index) => (
                  <td key={index} className={`border border-gray-300 p-2 ${index === 10 ? 'font-semibold' : ''}`}>{String(value ?? '')}</td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={11} className="p-4 text-center text-gray-500">No material is held by vendors.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VendorStock;
