import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref } from 'firebase/database';
import { db } from '../firebase_config';

const FIELD_LABELS = {
  functionName: 'Function',
  componentDetails: 'Component',
  sapMaterialNo: 'SAP Material No',
  childMaterialSapNo: 'Child Material SAP No',
  childMaterial: 'Child Material',
  qtyPerCs: 'Qty/CS',
  unit: 'Unit',
  childComponentIds: 'Child Components',
};

const formatTimestamp = (timestamp) => (
  timestamp && typeof timestamp === 'number' ? new Date(timestamp).toLocaleString() : 'Saving…'
);

const historyGridStyle = { gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1.2fr 0.8fr 3fr' };

function BomHistory() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSelectedLink('history/bom');
    setOpenedTab('history');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => onValue(ref(db, 'bomHistory/'), (snapshot) => {
    setHistory(
      Object.entries(snapshot.val() || {})
        .map(([id, entry]) => ({ ...entry, id }))
        .sort((first, second) => (second.timestamp || 0) - (first.timestamp || 0))
    );
  }), []);

  const displayedHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return history;
    return history.filter((entry) =>
      [entry.article, entry.model, entry.functionName, entry.componentDetails, entry.editorEmail, entry.action, JSON.stringify(entry.changes)]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [history, search]);

  const renderChanges = (changes = {}) => {
    const entries = Object.entries(changes);
    if (!entries.length) return 'No field values changed';
    return (
      <ul className="space-y-1">
        {entries.map(([key, value]) => (
          <li key={key}>
            <span className="font-medium">{FIELD_LABELS[key] || key}:</span>{' '}
            <span className="text-red-700">{value.from || '—'}</span> →{' '}
            <span className="text-green-700">{value.to || '—'}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex min-h-0 flex-1 flex-col space-y-3 rounded bg-white p-4">
        <div className="font-semibold text-lg">BOM Entry History</div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search BOM history"
          className="w-full max-w-md rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[1200px]">
            <div className="sticky top-0 z-10 grid gap-3 bg-gray-200 p-3 text-xs font-semibold" style={historyGridStyle}>
              <div>EDIT DATE & TIME</div>
              <div>EDITED BY</div>
              <div>ARTICLE</div>
              <div>FUNCTION / COMPONENT</div>
              <div>ACTION</div>
              <div>WHAT CHANGED</div>
            </div>
            {displayedHistory.map((entry) => (
              <div key={entry.id} className="grid gap-3 border-b border-gray-200 p-3 text-sm" style={historyGridStyle}>
                <div>{formatTimestamp(entry.timestamp)}</div>
                <div>{entry.editorEmail || 'Unknown user'}</div>
                <div className="break-words">{[entry.model, entry.article].filter(Boolean).join(' / ') || '—'}</div>
                <div className="break-words">{[entry.functionName, entry.componentDetails].filter(Boolean).join(' — ') || '—'}</div>
                <div className="capitalize">{entry.action || 'edited'}</div>
                <div className="break-words">{renderChanges(entry.changes)}</div>
              </div>
            ))}
            {displayedHistory.length === 0 && (
              <div className="p-6 text-center text-gray-500">No BOM Entry history yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BomHistory;
