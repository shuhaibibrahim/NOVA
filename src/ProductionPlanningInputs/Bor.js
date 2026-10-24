import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref, set } from 'firebase/database';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { db } from '../firebase_config';

const MAX_DISPLAY_ROWS = 500;

function Bor() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [borData, setBorData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    setSelectedLink('production-planning-inputs/bor');
    setOpenedTab('productionPlanningInputs');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => onValue(ref(db, 'borData/'), (snapshot) => setBorData(snapshot.val())), []);

  const headers = borData?.headers || [];
  const rows = Object.keys(borData?.rows || {})
    .sort()
    .map((key) => borData.rows[key]);

  const uploadZip = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadError('');
    try {
      const zip = await JSZip.loadAsync(await selectedFile.arrayBuffer());
      const csvEntries = Object.values(zip.files).filter((entry) =>
        !entry.dir && /\.csv$/i.test(entry.name) && !entry.name.includes('__MACOSX')
      );
      if (!csvEntries.length) throw new Error('The zip file does not contain a .csv file.');
      if (csvEntries.length > 1) throw new Error('The zip file must contain only one .csv file.');

      const text = (await csvEntries[0].async('string')).replace(/^\uFEFF/, '');
      const workbook = XLSX.read(text, { type: 'string', raw: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
      if (matrix.length < 2) throw new Error('The CSV file has no data rows.');

      const columnCount = matrix[0].length;
      const uploadedHeaders = matrix[0].map((heading, index) => String(heading).trim() || `Column ${index + 1}`);
      const dataRows = matrix.slice(1).map((row) => Array.from({ length: columnCount }, (_, index) => String(row[index] ?? '')));

      if (!window.confirm(`Replace all existing BOR data with ${dataRows.length} row(s) from ${csvEntries[0].name}?`)) {
        return;
      }

      const rowData = {};
      dataRows.forEach((row, index) => {
        rowData[String(index).padStart(8, '0')] = row;
      });
      await set(ref(db, 'borData/'), {
        headers: uploadedHeaders,
        rows: rowData,
        fileName: selectedFile.name,
        uploadedAt: Date.now(),
      });
      setSelectedFile(null);
    } catch (error) {
      setUploadError(error.message || 'Unable to read or upload the zip file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full min-h-0 min-w-0 overflow-hidden bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">BOR</h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Upload Zip
              <input
                type="file"
                accept=".zip"
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
                  onClick={uploadZip}
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
          Upload a zip containing one CSV file. Uploading replaces all existing BOR data.
          {borData?.fileName && ` Current file: ${borData.fileName} (${rows.length} rows).`}
        </p>
        {uploadError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{uploadError}</p>}
        {rows.length > MAX_DISPLAY_ROWS && (
          <p className="text-sm text-gray-600">Showing the first {MAX_DISPLAY_ROWS} of {rows.length} rows.</p>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col border border-gray-200">
          <div role="region" aria-label="BOR data table" className="min-h-0 min-w-0 flex-1 overflow-auto">
            <table className="border-collapse text-sm" style={{ width: 'max-content', minWidth: '100%' }}>
              <thead className="sticky top-0 z-10 bg-gray-200 text-left text-xs font-semibold">
                <tr>
                  {headers.map((heading, index) => <th key={index} className="whitespace-nowrap p-3">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, MAX_DISPLAY_ROWS).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-gray-200">
                    {headers.map((_, index) => <td key={index} className="whitespace-nowrap p-3">{row[index] ?? ''}</td>)}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={Math.max(headers.length, 1)} className="p-4 text-center text-gray-500">No BOR data uploaded.</td>
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

export default Bor;
