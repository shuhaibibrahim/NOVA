import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref, update } from 'firebase/database';
import { db } from '../firebase_config';
import { DEFECT_KINDS, STAGE_RECEIPT_NODES, defectStatus, effectiveReceivedSizes } from '../stageDefects';

// Shortage, damage and repair sheets for the Printing, Stitching, Molding, Grinding and Stuckon stages.
function StageDefectDetails({ kind, stageKey, route, isAdmin = false }) {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const { field, label, recoverable } = DEFECT_KINDS[kind];
  const stage = STAGE_RECEIPT_NODES[stageKey];
  const [receipts, setReceipts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [lineToUpdate, setLineToUpdate] = useState(null);
  const [receivedQty, setReceivedQty] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [receivedDateFilter, setReceivedDateFilter] = useState('');
  const [planCodeFilter, setPlanCodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    setSelectedLink(route);
    setOpenedTab('analysis');
  }, [setSelectedLink, setOpenedTab, route]);

  useEffect(() => onValue(ref(db, `${stage.node}/`), (snapshot) => {
    setReceipts(Object.entries(snapshot.val() || {}).map(([id, receipt]) => ({ ...receipt, id })));
  }), [stage.node]);

  const lines = useMemo(() => receipts.flatMap((receipt) => (
    (receipt[field] || []).map((line, index) => ({
      id: `${receipt.id}-${index}`,
      receiptId: receipt.id,
      lineIndex: index,
      receivedDate: line.recordedDate || receipt.receivedDate || '',
      planCode: receipt.planCode || '',
      model: receipt.model || '',
      article: receipt.article || '',
      colour: receipt.colour || '',
      priceCategory: receipt.priceCategory || '',
      size: line.size || '',
      side: line.side || '',
      quantity: Number(line.quantity) || 0,
      receivedQuantity: Number(line.receivedQuantity) || 0,
      recoveredDate: line.receivedDate || '',
      status: recoverable ? defectStatus(line) : '',
    }))
  )).sort((a, b) => String(b.receivedDate).localeCompare(String(a.receivedDate))), [receipts, field, recoverable]);

  const filteredLines = lines.filter((line) => (
    (!receivedDateFilter || line.receivedDate === receivedDateFilter) &&
    (!planCodeFilter || line.planCode === planCodeFilter) &&
    (!statusFilter || line.status === statusFilter)
  ));
  const planCodes = [...new Set(lines.map((line) => line.planCode).filter(Boolean))].sort();
  const statuses = [...new Set(lines.map((line) => line.status).filter(Boolean))].sort();
  const visibleIds = filteredLines.map((line) => line.id);
  const selectedVisible = selectedIds.filter((id) => visibleIds.includes(id));
  const allSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const toggleSelected = (id) => setSelectedIds((current) => (
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  ));
  const toggleAll = () => setSelectedIds(allSelected ? [] : visibleIds);

  const receiptWith = (receipt, nextLines) => {
    const next = { ...receipt, [field]: nextLines };
    return { ...next, receivedSizes: effectiveReceivedSizes(next) };
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedVisible.length} selected ${label.toLowerCase()} row(s)? This cannot be undone.`)) return;
    setDeleting(true);
    const updates = {};
    const byReceipt = {};
    lines.filter((line) => selectedVisible.includes(line.id)).forEach((line) => {
      byReceipt[line.receiptId] = [...(byReceipt[line.receiptId] || []), line.lineIndex];
    });
    Object.entries(byReceipt).forEach(([receiptId, indexes]) => {
      const receipt = receipts.find((item) => item.id === receiptId);
      const remaining = (receipt?.[field] || []).filter((_, index) => !indexes.includes(index));
      updates[`${stage.node}/${receiptId}/${field}`] = remaining.length ? remaining : null;
      if (recoverable && receipt) {
        updates[`${stage.node}/${receiptId}/receivedSizes`] = receiptWith(receipt, remaining).receivedSizes;
      }
    });
    try {
      await update(ref(db), updates);
      setSelectedIds([]);
    } catch (error) {
      window.alert(`Unable to delete ${label.toLowerCase()} rows: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const openUpdate = (line) => {
    setLineToUpdate(line);
    setReceivedQty(String(line.receivedQuantity || line.quantity));
    setReceivedDate(line.recoveredDate || new Date().toISOString().slice(0, 10));
  };

  const saveUpdate = async (event) => {
    event.preventDefault();
    const quantity = Number(receivedQty);
    if (!lineToUpdate || !receivedDate || !Number.isInteger(quantity) || quantity < 0 || quantity > lineToUpdate.quantity) {
      window.alert(`Enter a received quantity between zero and the ${label.toLowerCase()} quantity, and select a date.`);
      return;
    }
    const receipt = receipts.find((item) => item.id === lineToUpdate.receiptId);
    if (!receipt) return;
    const nextLines = (receipt[field] || []).map((line, index) => (index === lineToUpdate.lineIndex
      ? {
        ...line,
        receivedQuantity: quantity,
        receivedDate: quantity === 0 ? null : receivedDate,
        status: defectStatus({ quantity: line.quantity, receivedQuantity: quantity }),
      }
      : line));
    setSaving(true);
    try {
      await update(ref(db), {
        [`${stage.node}/${receipt.id}/${field}`]: nextLines,
        [`${stage.node}/${receipt.id}/receivedSizes`]: receiptWith(receipt, nextLines).receivedSizes,
      });
      setLineToUpdate(null);
    } catch (error) {
      window.alert(`Unable to update ${label.toLowerCase()} receiving: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const headings = [
    'SL NO', 'DATE', 'PLAN CODE', 'MODEL', 'ARTICLE', 'COLOUR', 'PRICE CATEGORY', 'SIZE', 'SIDE', `${label.toUpperCase()} QTY`,
    ...(recoverable ? [`${label.toUpperCase()} RECEIVED QTY`, `${label.toUpperCase()} RECEIVED DATE`, 'RECEIVING STATUS'] : []),
  ];

  const copyLines = async () => {
    const text = [headings, ...filteredLines.map((line, index) => [
      index + 1, line.receivedDate, line.planCode, line.model, line.article, line.colour, line.priceCategory,
      line.size, line.side, line.quantity,
      ...(recoverable ? [line.receivedQuantity, line.recoveredDate, line.status] : []),
    ])].map((row) => row.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(`${filteredLines.length} rows copied.`);
    } catch (error) {
      window.alert(`Unable to copy details: ${error.message}`);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">{stage.label} {label}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              Date
              <input type="date" value={receivedDateFilter} onChange={(event) => setReceivedDateFilter(event.target.value)} className="rounded border border-gray-300 p-2" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Plan Code
              <select value={planCodeFilter} onChange={(event) => setPlanCodeFilter(event.target.value)} className="rounded border border-gray-300 p-2">
                <option value="">All</option>
                {planCodes.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
            {recoverable && (
              <label className="flex items-center gap-2 text-sm">
                Status
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded border border-gray-300 p-2">
                  <option value="">All</option>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={copyLines}
              disabled={!filteredLines.length}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              COPY
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={deleteSelected}
                disabled={!selectedVisible.length || deleting}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'DELETING...' : `DELETE SELECTED (${selectedVisible.length})`}
              </button>
            )}
            {copyMessage && <span role="status" className="text-sm text-green-700">{copyMessage}</span>}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-200 text-left text-xs font-semibold">
              <tr>
                {isAdmin && (
                  <th className="border border-gray-300 p-3">
                    <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} />
                  </th>
                )}
                {headings.map((heading) => (
                  <th key={heading} className="whitespace-nowrap border border-gray-300 p-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLines.map((line, index) => (
                <tr key={line.id} className="odd:bg-white even:bg-gray-50">
                  {isAdmin && (
                    <td className="border border-gray-300 p-3 text-center">
                      <input type="checkbox" aria-label="Select row" checked={selectedIds.includes(line.id)} onChange={() => toggleSelected(line.id)} />
                    </td>
                  )}
                  <td className="border border-gray-300 p-3">{index + 1}</td>
                  <td className="border border-gray-300 p-3">{line.receivedDate || '-'}</td>
                  <td className="border border-gray-300 p-3">{line.planCode || '-'}</td>
                  <td className="border border-gray-300 p-3">{line.model || '-'}</td>
                  <td className="border border-gray-300 p-3">{line.article || '-'}</td>
                  <td className="border border-gray-300 p-3">{line.colour || '-'}</td>
                  <td className="border border-gray-300 p-3">{line.priceCategory || '-'}</td>
                  <td className="border border-gray-300 p-3">{line.size || '-'}</td>
                  <td className="border border-gray-300 p-3">{line.side || '-'}</td>
                  <td className="border border-gray-300 p-3">{line.quantity}</td>
                  {recoverable && (
                    <>
                      <td className="border border-gray-300 p-3">{line.receivedQuantity}</td>
                      <td className="border border-gray-300 p-3">{line.receivedQuantity ? line.recoveredDate || '-' : '-'}</td>
                      <td className="border border-gray-300 p-3">
                        <div className="flex flex-col items-start gap-2">
                          <span className={`font-semibold ${
                            line.status === 'RECEIVED' ? 'text-green-700' : line.status === 'PARTIALLY RECEIVED' ? 'text-yellow-700' : 'text-gray-600'
                          }`}>
                            {line.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => openUpdate(line)}
                            className="whitespace-nowrap rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            UPDATE RECEIVING
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {!filteredLines.length && (
                <tr>
                  <td colSpan={headings.length + (isAdmin ? 1 : 0)} className="border border-gray-300 p-6 text-center text-gray-500">
                    {lines.length ? `No ${label.toLowerCase()} details match the selected filters.` : `No ${stage.label} ${label.toLowerCase()} details were found.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {lineToUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <form onSubmit={saveUpdate} className="w-full max-w-md space-y-4 rounded bg-white p-5 shadow-xl">
              <h2 className="text-lg font-semibold">Update {label} Receiving</h2>
              <p className="text-sm text-gray-600">
                {lineToUpdate.article} · Size {lineToUpdate.size} · {lineToUpdate.side}
              </p>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Received Quantity (max {lineToUpdate.quantity})
                <input type="number" min="0" max={lineToUpdate.quantity} step="1" required value={receivedQty} onChange={(event) => setReceivedQty(event.target.value)} className="rounded border border-gray-300 p-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Received Date
                <input type="date" required value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} className="rounded border border-gray-300 p-2" />
              </label>
              <p className="text-xs text-gray-500">The received quantity is added to the {stage.label} stock.</p>
              <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
                <button type="button" onClick={() => setLineToUpdate(null)} className="rounded border border-gray-300 px-4 py-2">CANCEL</button>
                <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'SAVING...' : 'SAVE'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default StageDefectDetails;
