import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref, update } from 'firebase/database';
import { db } from '../firebase_config';
import { sizesForGender } from '../requirementMatching';

const sizeKey = (size) => {
  const normalized = String(size || '').trim();
  return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized;
};

function SfgStore({ title, route, isAdmin = false }) {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [articles, setArticles] = useState([]);
  const [bomRecords, setBomRecords] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [quantityOverrides, setQuantityOverrides] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({});
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const filterMenuRef = useRef(null);

  useEffect(() => {
    setSelectedLink(route);
    setOpenedTab('mmDept');
  }, [route, setSelectedLink, setOpenedTab]);

  useEffect(() => {
    if (route !== 'mmdept/clicker-comp-store') return undefined;
    return onValue(ref(db, 'articleData/'), (snapshot) => {
      const data = snapshot.val() || {};
      setArticles(Object.entries(data).map(([id, article]) => ({ ...article, id })));
    });
  }, [route]);

  useEffect(() => {
    if (route !== 'mmdept/clicker-comp-store') return undefined;
    return onValue(ref(db, 'bomData/'), (snapshot) => {
      const data = snapshot.val() || {};
      setBomRecords(Object.entries(data).map(([id, record]) => ({ ...record, id })));
    });
  }, [route]);

  useEffect(() => {
    if (route !== 'mmdept/clicker-comp-store') return undefined;
    return onValue(ref(db, 'clickerCompStoreReceipts/'), (snapshot) => {
      const data = snapshot.val() || {};
      setReceipts(Object.values(data));
    });
  }, [route]);

  useEffect(() => {
    if (route !== 'mmdept/clicker-comp-store') return undefined;
    return onValue(ref(db, 'clickerCompStoreOverrides/'), (snapshot) => {
      setQuantityOverrides(snapshot.val() || {});
    });
  }, [route]);

  useEffect(() => {
    if (!openFilterKey) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!filterMenuRef.current?.contains(event.target) && !event.target.closest('[data-filter-header]')) {
        setOpenFilterKey(null);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenFilterKey(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openFilterKey]);

  const receivedQuantities = useMemo(() => {
    const quantities = new Map();
    const bomByArticle = new Map();
    articles.forEach((article) => {
      const linkedIds = new Set(String(article.bomIds || '').split(',').map((id) => id.trim()).filter(Boolean));
      bomByArticle.set(article.id, bomRecords.filter((record) =>
        linkedIds.has(record.id) &&
        String(record.functionName || record.process || '').trim().toUpperCase() === 'CLICKING'
      ));
    });
    receipts.forEach((receipt) => {
      const components = bomByArticle.get(receipt.articleId) || [];
      if (Array.isArray(receipt.componentQuantities)) {
        receipt.componentQuantities.forEach((row) => {
          const key = `${receipt.articleId}|${row.componentId}|${sizeKey(row.size)}`;
          const current = quantities.get(key) || { leftQty: 0, rightQty: 0 };
          current.leftQty += Number(row.leftQty) || 0;
          current.rightQty += Number(row.rightQty) || 0;
          quantities.set(key, current);
        });
        return;
      }
      (receipt.receivedSizes || []).forEach((row) => {
        components.forEach((component) => {
          const key = `${receipt.articleId}|${component.id}|${sizeKey(row.size)}`;
          const current = quantities.get(key) || { leftQty: 0, rightQty: 0 };
          current.leftQty += Number(row.leftQty) || 0;
          current.rightQty += Number(row.rightQty) || 0;
          quantities.set(key, current);
        });
      });
    });
    return quantities;
  }, [articles, bomRecords, receipts]);

  const saveComponentQuantity = async (articleId, componentId, size, side, value) => {
    if (!isAdmin) return;
    const quantity = Number(value);
    if (!Number.isInteger(quantity)) {
      window.alert('Enter a whole-number component quantity.');
      return;
    }
    const path = `clickerCompStoreOverrides/${articleId}/${componentId}/${sizeKey(size)}`;
    try {
      await update(ref(db, path), { [side]: quantity });
    } catch (error) {
      window.alert(`Unable to update component quantity: ${error.message}`);
    }
  };

  if (route === 'mmdept/clicker-comp-store') {
    const sizeRows = articles.flatMap((article) => {
      const genderSizes = sizesForGender(article.gender);
      const sizes = genderSizes.length ? genderSizes : ['-'];
      return sizes.map((size) => ({ article, size }));
    });
    const componentsByArticle = new Map(articles.map((article) => {
      const linkedIds = new Set(String(article.bomIds || '').split(',').map((id) => id.trim()).filter(Boolean));
      return [article.id, bomRecords.filter((record) =>
        linkedIds.has(record.id) &&
        String(record.functionName || record.process || '').trim().toUpperCase() === 'CLICKING'
      )];
    }));
    const componentColumns = [...new Map([...componentsByArticle.values()]
      .flat()
      .map((component) => [component.id, component])).values()]
      .sort((first, second) => String(first.componentDetails || '').localeCompare(String(second.componentDetails || '')))
      .flatMap((component) => ([
        { key: `component:${component.id}:left`, label: `${component.componentDetails || component.materialDesc || component.materialNumber || 'Component'} LEFT QTY`, componentId: component.id, side: 'leftQty' },
        { key: `component:${component.id}:right`, label: `${component.componentDetails || component.materialDesc || component.materialNumber || 'Component'} RIGHT QTY`, componentId: component.id, side: 'rightQty' },
      ]));
    const tableRows = sizeRows.map(({ article, size }, index) => {
      const row = {
        articleId: article.id,
        serialNumber: index + 1,
        model: article.model || '-',
        article: article.article || '-',
        gender: article.gender || '-',
        colour: article.colour || article.color || '-',
        priceCategory: article.priceCategory ? String(article.priceCategory).slice(0, 2) : '-',
        size,
      };
      componentColumns.forEach(({ key }) => {
        row[key] = 0;
      });
      (componentsByArticle.get(article.id) || []).forEach((component) => {
        const quantities = receivedQuantities.get(`${article.id}|${component.id}|${sizeKey(size)}`) || { leftQty: 0, rightQty: 0 };
        const override = quantityOverrides?.[article.id]?.[component.id]?.[sizeKey(size)] || {};
        row[`component:${component.id}:left`] = override.leftQty ?? quantities.leftQty;
        row[`component:${component.id}:right`] = override.rightQty ?? quantities.rightQty;
      });
      return row;
    });
    const columns = [
      { key: 'serialNumber', label: 'SL NO' },
      { key: 'model', label: 'MODEL' },
      { key: 'article', label: 'ARTICLE' },
      { key: 'gender', label: 'GENDER' },
      { key: 'colour', label: 'COLOUR' },
      { key: 'priceCategory', label: 'PRICE CATEGORY' },
      { key: 'size', label: 'SIZE' },
      ...componentColumns,
    ];
    const filteredRows = tableRows.filter((row) => columns.every(({ key }) => (
      !selectedFilters[key] || selectedFilters[key].includes(String(row[key] ?? 0))
    )));
    const totals = filteredRows.reduce((sum, row) => {
      componentColumns.forEach(({ key }) => {
        sum[key] = (sum[key] || 0) + (Number(row[key]) || 0);
      });
      return sum;
    }, {});

    const toggleFilterValue = (key, value) => {
      const options = [...new Set(tableRows.map((row) => String(row[key] ?? 0)))];
      setSelectedFilters((current) => {
        const selected = current[key] ? [...current[key]] : options;
        const next = selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value];
        return { ...current, [key]: next.length === options.length ? undefined : next };
      });
    };

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-blue-50 px-3 pb-2 pt-4">
        <div className="flex min-h-0 flex-1 flex-col gap-4 rounded bg-white p-4">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-gray-200 text-left text-xs font-semibold">
                <tr>
                  {columns.map(({ key, label }) => {
                    const options = [...new Set(tableRows.map((row) => String(row[key])))];
                    const selected = selectedFilters[key];
                    const allSelected = !selected || selected.length === options.length;
                    const heading = key.startsWith('component:')
                      ? `${label} (SUM: ${totals[key] || 0})`
                      : label;
                    return (
                      <th
                        key={key}
                        onClick={() => setOpenFilterKey((current) => current === key ? null : key)}
                        data-filter-header
                        aria-haspopup="true"
                        aria-expanded={openFilterKey === key}
                        className="relative cursor-pointer whitespace-nowrap border border-gray-300 p-2"
                      >
                        <div className="flex items-center gap-1">
                          <span>{heading}</span>
                          {!allSelected && <span className="text-blue-700" aria-label="Filter active">●</span>}
                        </div>
                        {openFilterKey === key && (
                            <div
                              ref={filterMenuRef}
                              onClick={(event) => event.stopPropagation()}
                              className="absolute left-0 top-full z-30 mt-1 max-h-64 min-w-40 overflow-auto rounded border border-gray-300 bg-white p-2 text-left text-xs font-normal shadow-lg"
                            >
                              <button
                                type="button"
                                onClick={() => setOpenFilterKey(null)}
                                className="mb-1 w-full border-b border-gray-200 pb-2 text-right font-semibold text-blue-700"
                              >
                                Done
                              </button>
                              <label className="flex cursor-pointer items-center gap-2 border-b border-gray-200 pb-1">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  onChange={() => setSelectedFilters((current) => ({
                                    ...current,
                                    [key]: allSelected ? [] : undefined,
                                  }))}
                                />
                                Select all
                              </label>
                              {options.map((value) => (
                                <label key={value} className="flex cursor-pointer items-center gap-2 py-1">
                                  <input
                                    type="checkbox"
                                    checked={!selected || selected.includes(value)}
                                    onChange={() => toggleFilterValue(key, value)}
                                  />
                                  <span>{value}</span>
                                </label>
                              ))}
                            </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                    <tr key={`${row.serialNumber}-${row.article}-${row.size}`} className="odd:bg-white even:bg-gray-50">
                      <td className="border border-gray-300 p-3">{row.serialNumber}</td>
                      <td className="border border-gray-300 p-3">{row.model}</td>
                      <td className="border border-gray-300 p-3">{row.article}</td>
                      <td className="border border-gray-300 p-3">{row.gender}</td>
                      <td className="border border-gray-300 p-3">{row.colour}</td>
                      <td className="border border-gray-300 p-3">{row.priceCategory}</td>
                      <td className="border border-gray-300 p-3">{row.size}</td>
                      {componentColumns.map(({ key, componentId, side, label }) => (
                        <td
                          key={key}
                          className={`border border-gray-300 p-3 ${
                            Number(row[key]) > 0 ? 'bg-green-100' : Number(row[key]) < 0 ? 'bg-red-100' : ''
                          }`}
                        >
                          {isAdmin ? (
                            <input
                              key={`${key}-${row[key]}`}
                              type="number"
                              step="1"
                              aria-label={`${label} for ${row.article}, size ${row.size}`}
                              defaultValue={row[key] ?? 0}
                              onBlur={(event) => {
                                const value = event.target.value;
                                if (value !== '' && Number(value) !== Number(row[key])) {
                                  saveComponentQuantity(row.articleId, componentId, row.size, side, value);
                                }
                              }}
                              className="w-24 bg-transparent text-center outline-none"
                            />
                          ) : row[key] || 0}
                        </td>
                      ))}
                    </tr>
                ))}
                {!filteredRows.length && (
                  <tr>
                    <td colSpan={columns.length} className="border border-gray-300 p-6 text-center text-gray-500">
                      {tableRows.length ? 'No rows match the selected filters.' : 'No Article Entry line items were found.'}
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

  return (
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="rounded bg-white p-4">
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
    </div>
  );
}

export default SfgStore;
