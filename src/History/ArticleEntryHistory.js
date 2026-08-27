import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref } from 'firebase/database';
import { db } from '../firebase_config';

const FIELD_LABELS = {
  allotmentDate: 'Allotment Date',
  article: 'Article',
  colour: 'Colour',
  brand: 'Brand',
  procurementType: 'Procurement Type',
  model: 'Model',
  gender: 'Gender',
  mrp: 'MRP',
  priceCategory: 'Price Category',
  m1Quantity: 'M1 Quantity',
  m2Quantity: 'M2 Quantity',
};

function formatTimestamp(timestamp) {
  if (!timestamp || typeof timestamp !== 'number') return 'Saving…';
  return new Date(timestamp).toLocaleString();
}

function ArticleEntryHistory() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSelectedLink('history/article-entry');
    setOpenedTab('history');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => {
    const historyRef = ref(db, 'articleHistory/');
    return onValue(historyRef, (snapshot) => {
      const data = snapshot.val() || {};
      setHistory(
        Object.entries(data)
          .map(([id, entry]) => ({ ...entry, id }))
          .sort((first, second) => (second.timestamp || 0) - (first.timestamp || 0))
      );
    });
  }, []);

  const displayedHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return history;

    return history.filter((entry) =>
      [entry.article, entry.lineItem, entry.editorEmail, entry.action, JSON.stringify(entry.changes)]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [history, search]);

  const renderChanges = (changes = {}) => {
    const entries = Object.entries(changes);
    if (entries.length === 0) return 'No field values changed';

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
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex flex-col space-y-3 rounded bg-white p-4">
        <div className="font-semibold text-lg">Article Entry History</div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search article history"
          className="w-full max-w-md rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_0.8fr_3fr] gap-3 bg-gray-200 p-3 text-xs font-semibold">
              <div>EDIT DATE & TIME</div>
              <div>EDITED BY</div>
              <div>LINE ITEM</div>
              <div>ARTICLE</div>
              <div>ACTION</div>
              <div>WHAT CHANGED</div>
            </div>

            {displayedHistory.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_0.8fr_3fr] gap-3 border-b border-gray-200 p-3 text-sm">
                <div>{formatTimestamp(entry.timestamp)}</div>
                <div>{entry.editorEmail || 'Unknown user'}</div>
                <div className="break-words">{entry.lineItem || entry.articleId || '—'}</div>
                <div className="break-words">{entry.article || '—'}</div>
                <div className="capitalize">{entry.action || 'edited'}</div>
                <div className="break-words">{renderChanges(entry.changes)}</div>
              </div>
            ))}

            {displayedHistory.length === 0 && (
              <div className="p-6 text-center text-gray-500">No Article Entry history yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleEntryHistory;
