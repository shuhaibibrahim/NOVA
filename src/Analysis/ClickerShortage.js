import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref, update } from 'firebase/database';
import { db } from '../firebase_config';

function ClickerShortage({ isAdmin = false }) {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [shortageToUpdate, setShortageToUpdate] = useState(null);
  const [shortageReceivedQty, setShortageReceivedQty] = useState('');
  const [shortageReceivedDate, setShortageReceivedDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [receivedDateFilter, setReceivedDateFilter] = useState('');
  const [planCodeFilter, setPlanCodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    setSelectedLink('analysis/shortage-details/clicker-shortage');
    setOpenedTab('analysis');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => onValue(ref(db, 'clickerCompStoreReceipts/'), (snapshot) => {
    const data = snapshot.val() || {};
    setReceipts(Object.entries(data).map(([id, receipt]) => ({ ...receipt, id })));
  }), []);

  const shortages = useMemo(() => receipts.flatMap((receipt) => (
    (receipt.shortages || []).map((shortage, index) => ({
      id: `${receipt.id || receipt.submittedAt}-${shortage.componentId || index}-${index}`,
      receiptId: receipt.id,
      shortageIndex: index,
      receivedDate: receipt.receivedDate || '',
      article: receipt.article || '',
      model: receipt.model || '',
      colour: receipt.colour || '',
      priceCategory: receipt.priceCategory ? String(receipt.priceCategory).slice(0, 2) : '',
      planCode: receipt.planCode || '',
      functionName: shortage.functionName || '',
      componentDetails: shortage.componentDetails || '',
      size: shortage.size || '',
      side: shortage.side || '',
      quantity: Number(shortage.quantity) || 0,
      shortageReceivedQuantity: shortage.shortageReceivedQuantity == null
        ? null
        : Number(shortage.shortageReceivedQuantity) || 0,
      shortageReceivedDate: shortage.shortageReceivedDate || '',
      shortageStatus: shortage.shortageStatus || 'NOT RECEIVED',
      submittedAt: Number(receipt.submittedAt) || 0,
    }))
  )).sort((a, b) => b.submittedAt - a.submittedAt), [receipts]);

  const filteredShortages = shortages.filter((shortage) =>
    (!receivedDateFilter || shortage.receivedDate === receivedDateFilter) &&
    (!planCodeFilter || shortage.planCode === planCodeFilter) &&
    (!statusFilter || shortage.shortageStatus === statusFilter)
  );
  const visibleIds = filteredShortages.map((shortage) => shortage.id);
  const selectedVisible = selectedIds.filter((id) => visibleIds.includes(id));
  const allSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const toggleSelected = (id) => setSelectedIds((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAll = () => setSelectedIds(allSelected ? [] : visibleIds);

  const deleteSelected = async () => {
    if (!isAdmin || !selectedVisible.length) return;
    if (!window.confirm(`Delete ${selectedVisible.length} selected shortage row(s)? This cannot be undone.`)) return;
    const removeByReceipt = {};
    shortages.filter((shortage) => selectedVisible.includes(shortage.id)).forEach((shortage) => {
      removeByReceipt[shortage.receiptId] = [...(removeByReceipt[shortage.receiptId] || []), shortage.shortageIndex];
    });
    const updates = {};
    Object.entries(removeByReceipt).forEach(([receiptId, indexes]) => {
      const receipt = receipts.find((item) => item.id === receiptId);
      const remaining = (receipt?.shortages || []).filter((_, index) => !indexes.includes(index));
      updates[`clickerCompStoreReceipts/${receiptId}/shortages`] = remaining.length ? remaining : null;
    });
    setDeleting(true);
    try {
      await update(ref(db), updates);
      setSelectedIds([]);
    } catch (error) {
      window.alert(`Unable to delete shortage rows: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const shortageReceivingDate = (shortage) =>
    shortage.shortageStatus === 'NOT RECEIVED' || shortage.shortageReceivedQuantity === 0
      ? ''
      : shortage.shortageReceivedDate;
  const planCodes = [...new Set(shortages.map((shortage) => shortage.planCode).filter(Boolean))].sort();
  const shortageStatuses = [...new Set(shortages.map((shortage) => shortage.shortageStatus))].sort();

  const openShortageUpdate = (shortage) => {
    const today = new Date();
    setShortageToUpdate(shortage);
    setShortageReceivedQty(String(shortage.shortageReceivedQuantity ?? shortage.quantity));
    setShortageReceivedDate(shortage.shortageReceivedDate ||
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  };

  const saveShortageUpdate = async (event) => {
    event.preventDefault();
    const quantity = Number(shortageReceivedQty);
    if (!shortageToUpdate || !shortageReceivedDate || !Number.isInteger(quantity) ||
      quantity < 0 || quantity > shortageToUpdate.quantity) {
      window.alert('Enter a received quantity between zero and the shortage quantity, and select a date.');
      return;
    }
    const status = quantity === 0
      ? 'NOT RECEIVED'
      : quantity >= shortageToUpdate.quantity ? 'RECEIVED' : 'PARTIALLY RECEIVED';
    const shortagePath = `clickerCompStoreReceipts/${shortageToUpdate.receiptId}/shortages/${shortageToUpdate.shortageIndex}`;
    setSaving(true);
    try {
      await update(ref(db, shortagePath), {
        shortageReceivedQuantity: quantity,
        shortageReceivedDate: quantity === 0 ? null : shortageReceivedDate,
        shortageStatus: status,
      });
      setShortageToUpdate(null);
    } catch (error) {
      window.alert(`Unable to update shortage receipt: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyShortages = async () => {
    const headers = [
      'SL NO', 'RECEIVED DATE', 'PLAN CODE', 'MODEL', 'ARTICLE', 'COLOUR',
      'PRICE CATEGORY', 'FUNCTION', 'COMPONENT', 'SIZE', 'SIDE', 'SHORTAGE QTY',
    ];
    const rows = filteredShortages.map((shortage, index) => [
      index + 1, shortage.receivedDate, shortage.planCode, shortage.model,
      shortage.article, shortage.colour, shortage.priceCategory, shortage.functionName,
      shortage.componentDetails, shortage.size, shortage.side, shortage.quantity,
    ]);
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character]));
    const tableHtml = `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px"><thead><tr>${headers.map((header) => `<th style="background:#d2f1ef;border:1px solid #222;padding:7px;text-align:center">${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, rowIndex) => `<tr>${row.map((value) => `<td style="background:${rowIndex % 2 ? '#f3f4f6' : '#ffffff'};border:1px solid #222;padding:6px;text-align:center">${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const text = [headers, ...rows].map((row) => row.map((value) =>
      String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
    ).join('\t')).join('\n');
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([tableHtml], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const container = document.createElement('div');
        container.contentEditable = 'true';
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.innerHTML = tableHtml;
        document.body.appendChild(container);
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(container);
        selection.removeAllRanges();
        selection.addRange(range);
        const copied = document.execCommand('copy');
        selection.removeAllRanges();
        document.body.removeChild(container);
        if (!copied) throw new Error('Clipboard access is not available in this browser.');
      }
      setCopyMessage(`${filteredShortages.length} shortage rows copied.`);
    } catch (error) {
      setCopyMessage('');
      window.alert(`Unable to copy shortage details: ${error.message}`);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Clicker Shortage</h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              Received Date
              <input
                type="date"
                value={receivedDateFilter}
                onChange={(event) => setReceivedDateFilter(event.target.value)}
                className="rounded border border-gray-300 p-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Plan Code
              <select value={planCodeFilter} onChange={(event) => setPlanCodeFilter(event.target.value)} className="rounded border border-gray-300 p-2">
                <option value="">All</option>
                {planCodes.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded border border-gray-300 p-2">
                <option value="">All</option>
                {shortageStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={copyShortages}
              disabled={!filteredShortages.length}
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
          <table className="w-full min-w-[1200px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-200 text-left text-xs font-semibold">
              <tr>
                {isAdmin && (
                  <th className="border border-gray-300 p-3">
                    <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} />
                  </th>
                )}
                {['SL NO', 'RECEIVED DATE', 'PLAN CODE', 'MODEL', 'ARTICLE', 'COLOUR', 'PRICE CATEGORY', 'FUNCTION', 'COMPONENT', 'SIZE', 'SIDE', 'SHORTAGE QTY', 'SHORTAGE RECEIVED QTY', 'SHORTAGE RECEIVED DATE', 'SHORTAGE RECEIVING STATUS'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap border border-gray-300 p-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredShortages.map((shortage, index) => (
                <tr key={shortage.id} className="odd:bg-white even:bg-gray-50">
                  {isAdmin && (
                    <td className="border border-gray-300 p-3 text-center">
                      <input type="checkbox" aria-label="Select row" checked={selectedIds.includes(shortage.id)} onChange={() => toggleSelected(shortage.id)} />
                    </td>
                  )}
                  <td className="border border-gray-300 p-3">{index + 1}</td>
                  <td className="border border-gray-300 p-3">{shortage.receivedDate || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.planCode || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.model || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.article || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.colour || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.priceCategory || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.functionName || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.componentDetails || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.size || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.side || '-'}</td>
                  <td className="border border-gray-300 p-3">{shortage.quantity}</td>
                  <td className="border border-gray-300 p-3">{shortage.shortageReceivedQuantity ?? 0}</td>
                  <td className="border border-gray-300 p-3">{shortageReceivingDate(shortage) || '-'}</td>
                  <td className="border border-gray-300 p-3">
                    <div className="flex flex-col items-start gap-2">
                      <span className={`font-semibold ${
                        shortage.shortageStatus === 'RECEIVED'
                          ? 'text-green-700'
                          : shortage.shortageStatus === 'PARTIALLY RECEIVED'
                            ? 'text-yellow-700'
                            : 'text-gray-600'
                      }`}>
                        {shortage.shortageStatus || 'NOT RECEIVED'}
                        {shortageReceivingDate(shortage) ? ` — ${shortageReceivingDate(shortage)}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => openShortageUpdate(shortage)}
                        className="whitespace-nowrap rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        UPDATE RECEIVING
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredShortages.length && (
                <tr>
                  <td colSpan={isAdmin ? 16 : 15} className="border border-gray-300 p-6 text-center text-gray-500">
                    {shortages.length ? 'No shortage details match the selected filters.' : 'No Clicker shortage details were found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {shortageToUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <form onSubmit={saveShortageUpdate} className="w-full max-w-md space-y-4 rounded bg-white p-5 shadow-xl">
              <h2 className="text-lg font-semibold">Update Shortage Receiving</h2>
              <p className="text-sm text-gray-600">
                {shortageToUpdate.article} · {shortageToUpdate.componentDetails} · Size {shortageToUpdate.size} · {shortageToUpdate.side}
              </p>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Received Shortage Quantity (max {shortageToUpdate.quantity})
                <input
                  type="number"
                  min="0"
                  max={shortageToUpdate.quantity}
                  step="1"
                  required
                  value={shortageReceivedQty}
                  onChange={(event) => setShortageReceivedQty(event.target.value)}
                  className="rounded border border-gray-300 p-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Received Date
                <input
                  type="date"
                  required
                  value={shortageReceivedDate}
                  onChange={(event) => setShortageReceivedDate(event.target.value)}
                  className="rounded border border-gray-300 p-2"
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
                <button type="button" onClick={() => setShortageToUpdate(null)} className="rounded border border-gray-300 px-4 py-2">
                  CANCEL
                </button>
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

export default ClickerShortage;
