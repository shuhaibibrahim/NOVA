import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, push, ref, remove, set } from 'firebase/database';
import * as XLSX from 'xlsx';
import { db } from '../firebase_config';

const COOIS_COLUMNS = [
  { key: 'order', heading: 'Order' },
  { key: 'material', heading: 'Material' },
  { key: 'materialDescription', heading: 'Material description' },
  { key: 'orderQuantity', heading: 'Order quantity (GMEIN)' },
  { key: 'confirmedYieldQuantity', heading: 'Confirmed Yield Quantity (GMEIN)' },
  { key: 'deliveredQuantity', heading: 'Delivered quantity (GMEIN)' },
  { key: 'unitOfMeasure', heading: 'Unit of measure (=GMEIN)' },
  { key: 'createdOn', heading: 'Created On' },
  { key: 'batch', heading: 'Batch' },
  { key: 'systemStatus', heading: 'System Status' },
  { key: 'releaseDateActual', heading: 'Release date (actual)' },
  { key: 'plant', heading: 'Plant' },
  { key: 'salesOrder', heading: 'Sales Order' },
  { key: 'salesOrderItem', heading: 'Sales Order Item' },
];

function CooisData() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [cooisRows, setCooisRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    setSelectedLink('production-planning-inputs/coois-data');
    setOpenedTab('productionPlanningInputs');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => onValue(ref(db, 'cooisData/'), (snapshot) => {
    const data = snapshot.val() || {};
    setCooisRows(Object.entries(data).map(([id, row]) => ({ ...row, id })));
  }), []);

  const allRowsSelected = cooisRows.length > 0 &&
    cooisRows.every((row) => selectedIds.includes(row.id));

  const toggleAllRows = () => {
    setSelectedIds(allRowsSelected ? [] : cooisRows.map((row) => row.id));
  };

  const toggleRow = (id) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };

  const deleteSelectedRows = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected COOIS row(s)? This cannot be undone.`)) return;

    try {
      await Promise.all(selectedIds.map((id) => remove(ref(db, `cooisData/${id}`))));
      setSelectedIds([]);
    } catch (error) {
      window.alert(`Unable to delete the selected COOIS rows: ${error.message}`);
    }
  };

  const uploadExcel = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadError('');
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('The workbook does not contain a worksheet.');

      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
      const headings = (matrix[0] || []).map((heading) => String(heading).trim());
      const missingHeadings = COOIS_COLUMNS
        .map(({ heading }) => heading)
        .filter((heading) => !headings.includes(heading));
      if (missingHeadings.length) {
        throw new Error(`The Excel file is missing required column(s): ${missingHeadings.join(', ')}`);
      }

      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
        .map((row) => Object.fromEntries(COOIS_COLUMNS.map(({ key, heading }) => [key, row[heading] ?? ''])))
        .filter((row) => COOIS_COLUMNS.some(({ key }) => String(row[key]).trim() !== ''));
      if (!rows.length) throw new Error('The worksheet has no COOIS data rows to upload.');

      if (!window.confirm(`Replace all existing COOIS data with ${rows.length} row(s) from this file?`)) {
        setIsUploading(false);
        return;
      }

      const replacementData = {};
      rows.forEach((row) => {
        const rowRef = push(ref(db, 'cooisData/'));
        replacementData[rowRef.key] = { ...row, id: rowRef.key };
      });
      await set(ref(db, 'cooisData/'), replacementData);
      setSelectedIds([]);
      setSelectedFile(null);
    } catch (error) {
      setUploadError(error.message || 'Unable to read or upload the Excel file.');
    } finally {
      setIsUploading(false);
    }
  };

  const displayedRows = useMemo(
    () => [...cooisRows].sort((first, second) => String(first.order || '').localeCompare(String(second.order || ''))),
    [cooisRows]
  );

  return (
    <div className="h-full min-h-0 min-w-0 overflow-hidden bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Coois Data</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={deleteSelectedRows}
              disabled={!selectedIds.length}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete Selected{selectedIds.length ? ` (${selectedIds.length})` : ''}
            </button>
            <label className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setUploadError('');
                  event.target.value = '';
                }}
              />
            </label>
            {selectedFile && (
              <>
                <span className="max-w-48 truncate text-sm text-gray-600">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={uploadExcel}
                  disabled={isUploading}
                  className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading…' : 'Replace Data'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Uploading a workbook replaces all saved COOIS rows. Required columns are validated before the data is changed.
        </p>
        {uploadError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{uploadError}</p>}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col border border-gray-200">
          <div
            role="region"
            aria-label="COOIS data table"
            className="min-h-0 min-w-0 flex-1"
            style={{ overflowX: 'auto', overflowY: 'auto' }}
          >
          <table className="border-collapse text-sm" style={{ width: 'max-content', minWidth: '100%' }}>
            <thead className="sticky top-0 z-10 bg-gray-200 text-left text-xs font-semibold">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    aria-label="Select all COOIS rows"
                    checked={allRowsSelected}
                    onChange={toggleAllRows}
                  />
                </th>
                {COOIS_COLUMNS.map(({ key, heading }) => <th key={key} className="whitespace-nowrap p-3">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row) => (
                <tr key={row.id} className="border-t border-gray-200">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      aria-label={`Select COOIS order ${row.order || ''}`}
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  {COOIS_COLUMNS.map(({ key }) => <td key={key} className="whitespace-nowrap p-3">{row[key] ?? ''}</td>)}
                </tr>
              ))}
              {!displayedRows.length && (
                <tr>
                  <td colSpan={COOIS_COLUMNS.length + 1} className="p-4 text-center text-gray-500">
                    No COOIS data uploaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CooisData;
