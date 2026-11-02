import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref, set } from 'firebase/database';
import { db } from '../firebase_config';
import { normalizeMatchValue, sizesForGender } from '../requirementMatching';

// Each stage is stocked by what was received into it, less what was received into the next stage.
const STAGES = [
  { label: 'CLICKING', node: 'clickerCompStoreReceipts' },
  { label: 'PRINTING', node: 'printingReceipts' },
  { label: 'STITCHING', node: 'stitchingReceipts' },
  { label: 'MOLDING', node: 'moldingReceipts' },
  { label: 'GRINDING', node: 'grindingReceipts' },
  { label: 'ATTACHING', node: 'attachingReceipts' },
  { label: 'PAIR STOCK', node: 'packingReceipts' },
];

const sizeKey = (size) => {
  const normalized = String(size || '').trim();
  return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized;
};
const text = (value) => String(value ?? '').trim();
const adjustmentKey = (articleId, size, side, stageIndex) => (
  `${articleId}_${text(size)}_${side}_${stageIndex}`.replace(/[.#$[\]/]/g, '-')
);
const isPuCork = (model) => normalizeMatchValue(model).includes('PU CORK');
const compare = (first, second) => text(first).localeCompare(text(second), undefined, { numeric: true });

function LoopStock({ isAdmin }) {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [articles, setArticles] = useState([]);
  const [adjustments, setAdjustments] = useState({});
  const [receiptsByStage, setReceiptsByStage] = useState({});
  const [hideEmpty, setHideEmpty] = useState(false);

  useEffect(() => {
    setSelectedLink('analysis/loop-stocks');
    setOpenedTab('analysis');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => onValue(ref(db, 'loopStockAdjustments/'), (snapshot) => {
    setAdjustments(snapshot.val() || {});
  }), []);

  useEffect(() => onValue(ref(db, 'articleData/'), (snapshot) => {
    setArticles(Object.entries(snapshot.val() || {}).map(([id, article]) => ({ ...article, id })));
  }), []);

  useEffect(() => {
    const unsubscribers = STAGES.map(({ node }) => onValue(ref(db, `${node}/`), (snapshot) => {
      setReceiptsByStage((current) => ({ ...current, [node]: Object.values(snapshot.val() || {}) }));
    }));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const rows = useMemo(() => {
    const receivedByStage = STAGES.map(({ node }) => {
      const totals = new Map();
      (receiptsByStage[node] || []).forEach((receipt) => {
        (receipt.receivedSizes || []).forEach((row) => {
          ['leftQty', 'rightQty'].forEach((field) => {
            const key = `${receipt.articleId}|${sizeKey(row.size)}|${field}`;
            totals.set(key, (totals.get(key) || 0) + (Number(row[field]) || 0));
          });
        });
      });
      return totals;
    });

    return [...articles]
      .sort((first, second) => (
        Number(isPuCork(second.model)) - Number(isPuCork(first.model))
        || compare(first.model, second.model)
        || compare(first.article, second.article)
        || compare(first.colour ?? first.color, second.colour ?? second.color)
        || compare(first.priceCategory, second.priceCategory)
      ))
      .flatMap((article) => sizesForGender(article.gender).flatMap((size) => (
        [['L', 'leftQty'], ['R', 'rightQty']].map(([sideLabel, field]) => {
          const key = `${article.id}|${sizeKey(size)}|${field}`;
          const received = receivedByStage.map((totals) => totals.get(key) || 0);
          return {
            key,
            model: article.model,
            article: article.article,
            colour: article.colour ?? article.color,
            priceCategory: article.priceCategory,
            size: `${size}${sideLabel}`,
            cellKeys: received.map((_, index) => adjustmentKey(article.id, size, sideLabel, index)),
            baseStock: received.map((quantity, index) => quantity - (received[index + 1] || 0)),
          };
        })
      )));
  }, [articles, receiptsByStage]);

  const adjustedRows = useMemo(() => rows.map((row) => ({
    ...row,
    stock: row.baseStock.map((quantity, index) => quantity + (Number(adjustments[row.cellKeys[index]]) || 0)),
  })), [rows, adjustments]);

  const saveStock = async (row, index, value) => {
    const text = String(value).trim();
    const current = row.stock[index];
    if (text === '' || Number(text) === current || Number.isNaN(Number(text))) return;
    const delta = Number(text) - row.baseStock[index];
    await set(ref(db, `loopStockAdjustments/${row.cellKeys[index]}`), delta === 0 ? null : delta);
  };

  const visibleRows = hideEmpty ? adjustedRows.filter((row) => row.stock.some((quantity) => quantity !== 0)) : adjustedRows;

  return (
    <div className="flex h-full min-h-0 flex-col bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex min-h-0 flex-1 flex-col rounded bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Loop Stocks</h1>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hideEmpty} onChange={(event) => setHideEmpty(event.target.checked)} />
            Hide rows with no stock
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-auto border border-gray-400">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-200">
              <tr>
                {['MODEL', 'ARTICLE NO.', 'COLOUR', 'PRICE CATEGORY', 'SIZE', ...STAGES.map((stage) => stage.label)].map((heading) => (
                  <th key={heading} className="border border-gray-400 px-3 py-2 text-center">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.key} className="hover:bg-blue-50">
                  <td className="border border-gray-300 px-3 py-1 text-center">{row.model || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1 text-center">{row.article || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1 text-center">{row.colour || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1 text-center">{row.priceCategory || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1 text-center font-medium">{row.size}</td>
                  {row.stock.map((quantity, index) => (
                    <td
                      key={STAGES[index].label}
                      className={`border border-gray-300 px-3 py-1 text-center ${quantity < 0 ? 'text-red-600' : ''}`}
                    >
                      {isAdmin ? (
                        <input
                          key={`${row.key}-${quantity}`}
                          type="number"
                          defaultValue={quantity}
                          onBlur={(event) => saveStock(row, index, event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && event.target.blur()}
                          className="no-number-spinner w-16 rounded border border-blue-200 p-0.5 text-center"
                        />
                      ) : quantity}
                    </td>
                  ))}
                </tr>
              ))}
              {!visibleRows.length && (
                <tr>
                  <td colSpan={5 + STAGES.length} className="p-6 text-center text-gray-500">
                    No loop stock to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LoopStock;
