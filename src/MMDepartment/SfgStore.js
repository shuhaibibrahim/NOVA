import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, ref, update } from 'firebase/database';
import { db } from '../firebase_config';
import { sizesForGender } from '../requirementMatching';
import { PLANNED_STORE_NODE } from '../plannedStore';
import { CONSUMPTION_NODE, stockAfterConsumption } from '../stockConsumption';

const sizeKey = (size) => {
  const normalized = String(size || '').trim();
  return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized;
};

const STORE_CONFIG = {
  'mmdept/clicker-comp-store': { fn: 'CLICKING', receiptNode: 'clickerCompStoreReceipts', overrideNode: 'clickerCompStoreOverrides' },
  'mmdept/printing-comp-store': { fn: 'PRINTING', receiptNode: 'printingReceipts', overrideNode: 'printingCompStoreOverrides' },
  'mmdept/fiu-store': { fn: 'STITCHING', altFns: ['FIU'], receiptNode: 'stitchingReceipts', overrideNode: 'fiuStoreOverrides' },
  'mmdept/molding-receiving-store': { fn: 'MOLDING', receiptNode: 'moldingReceipts', overrideNode: 'moldingStoreOverrides' },
  'mmdept/grinding-store': { fn: 'GRINDING', receiptNode: 'grindingReceipts', overrideNode: 'grindingStoreOverrides' },
  'mmdept/attaching-store': { fn: 'STUCKON', receiptNode: 'attachingReceipts', overrideNode: 'attachingStoreOverrides' },
  'mmdept/packing-store': { fn: 'PACKING', receiptNode: 'packingReceipts', overrideNode: 'packingStoreOverrides' },
};

const PLANNING_STORE_PREFIX = 'mmdept/planning-store/';

const storeConfigFor = (route) => {
  if (STORE_CONFIG[route]) return STORE_CONFIG[route];
  if (!route.startsWith(PLANNING_STORE_PREFIX)) return undefined;
  const actual = STORE_CONFIG[`mmdept/${route.slice(PLANNING_STORE_PREFIX.length)}`];
  return actual && { fn: actual.fn, altFns: actual.altFns, receiptNode: `${PLANNED_STORE_NODE}/${actual.fn}`, actualReceiptNode: actual.receiptNode, overrideNode: null, planned: true };
};

function SfgStore({ title, route, isAdmin = false }) {
  const config = storeConfigFor(route);
  const canEdit = isAdmin && !config?.planned;
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [articles, setArticles] = useState([]);
  const [bomRecords, setBomRecords] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [quantityOverrides, setQuantityOverrides] = useState({});
  const [consumptions, setConsumptions] = useState([]);
  const [plannedRecords, setPlannedRecords] = useState([]);
  const [actualReceipts, setActualReceipts] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const filterMenuRef = useRef(null);

  useEffect(() => {
    setSelectedLink(route);
    setOpenedTab('mmDept');
  }, [route, setSelectedLink, setOpenedTab]);

  useEffect(() => {
    if (!config) return undefined;
    return onValue(ref(db, 'articleData/'), (snapshot) => {
      const data = snapshot.val() || {};
      setArticles(Object.entries(data).map(([id, article]) => ({ ...article, id })));
    });
  }, [route]);

  useEffect(() => {
    if (!config) return undefined;
    return onValue(ref(db, 'bomData/'), (snapshot) => {
      const data = snapshot.val() || {};
      setBomRecords(Object.entries(data).map(([id, record]) => ({ ...record, id })));
    });
  }, [route]);

  useEffect(() => {
    if (!config) return undefined;
    return onValue(ref(db, `${config.receiptNode}/`), (snapshot) => {
      const data = snapshot.val() || {};
      setReceipts(Object.values(data));
    });
  }, [route]);

  useEffect(() => {
    if (!config) return undefined;
    return onValue(ref(db, `${CONSUMPTION_NODE}/`), (snapshot) => {
      setConsumptions(Object.values(snapshot.val() || {}));
    });
  }, [route]);

  useEffect(() => {
    if (!config?.planned) return undefined;
    return onValue(ref(db, `${config.actualReceiptNode}/`), (snapshot) => {
      setActualReceipts(Object.values(snapshot.val() || {}));
    });
  }, [route]);

  useEffect(() => {
    if (!config || config.planned) return undefined;
    return onValue(ref(db, `${PLANNED_STORE_NODE}/${config.fn}`), (snapshot) => {
      setPlannedRecords(Object.values(snapshot.val() || {}));
    });
  }, [route]);

  useEffect(() => {
    if (!config?.overrideNode) return undefined;
    return onValue(ref(db, `${config.overrideNode}/`), (snapshot) => {
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

  const buildQuantities = (records) => {
    const quantities = new Map();
    const bomByArticle = new Map();
    articles.forEach((article) => {
      const linkedIds = new Set(String(article.bomIds || '').split(',').map((id) => id.trim()).filter(Boolean));
      bomByArticle.set(article.id, bomRecords.filter((record) =>
        linkedIds.has(record.id) &&
        [config.fn, ...(config.altFns || [])].includes(String(record.functionName || record.process || '').trim().toUpperCase())
      ));
    });
    records.forEach((receipt) => {
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
  };

  const receivedQuantities = useMemo(() => buildQuantities(receipts), [articles, bomRecords, receipts]);
  const plannedQuantities = useMemo(
    () => buildQuantities(config?.planned ? receipts : plannedRecords),
    [articles, bomRecords, receipts, plannedRecords]
  );
  const actualQuantities = useMemo(
    () => buildQuantities(config?.planned ? actualReceipts : receipts),
    [articles, bomRecords, receipts, actualReceipts]
  );
  const consumedQuantities = useMemo(() => {
    const consumed = new Map();
    consumptions.forEach((item) => {
      const key = `${item.articleId}|${item.componentId}|${sizeKey(item.size)}`;
      const current = consumed.get(key) || { leftQty: 0, rightQty: 0 };
      current.leftQty += Number(item.leftQty) || 0;
      current.rightQty += Number(item.rightQty) || 0;
      consumed.set(key, current);
    });
    return consumed;
  }, [consumptions]);

  const saveComponentQuantity = async (articleId, componentId, size, side, value) => {
    if (!canEdit) return;
    const quantity = Number(value);
    if (!Number.isInteger(quantity)) {
      window.alert('Enter a whole-number component quantity.');
      return;
    }
    const path = `${config.overrideNode}/${articleId}/${componentId}/${sizeKey(size)}`;
    try {
      await update(ref(db, path), { [side]: quantity });
    } catch (error) {
      window.alert(`Unable to update component quantity: ${error.message}`);
    }
  };

  if (config) {
    const sizeRows = articles.flatMap((article) => {
      const genderSizes = sizesForGender(article.gender);
      const sizes = genderSizes.length ? genderSizes : ['-'];
      return sizes.map((size) => ({ article, size }));
    });
    const componentsByArticle = new Map(articles.map((article) => {
      const linkedIds = new Set(String(article.bomIds || '').split(',').map((id) => id.trim()).filter(Boolean));
      return [article.id, bomRecords.filter((record) =>
        linkedIds.has(record.id) &&
        [config.fn, ...(config.altFns || [])].includes(String(record.functionName || record.process || '').trim().toUpperCase())
      )];
    }));
    // One column pair per distinct component name; duplicate BOM rows share it.
    const nameOf = (component) => String(component.componentDetails || component.materialDesc || component.materialNumber || 'Component').trim();
    const groupKeyOf = (component) => nameOf(component).toLowerCase().replace(/\s+/g, ' ');
    const columnGroups = new Map();
    [...componentsByArticle.values()].flat().forEach((component) => {
      if (!columnGroups.has(groupKeyOf(component))) columnGroups.set(groupKeyOf(component), nameOf(component));
    });
    const componentColumns = [...columnGroups.entries()]
      .sort((first, second) => first[1].localeCompare(second[1]))
      .flatMap(([groupKey, name]) => ([
        { key: `component:${groupKey}:left`, label: `${name} LEFT QTY`, groupKey, side: 'leftQty' },
        { key: `component:${groupKey}:right`, label: `${name} RIGHT QTY`, groupKey, side: 'rightQty' },
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
      const valuesFor = (component) => {
        const quantities = receivedQuantities.get(`${article.id}|${component.id}|${sizeKey(size)}`) || { leftQty: 0, rightQty: 0 };
        const override = quantityOverrides?.[article.id]?.[component.id]?.[sizeKey(size)] || {};
        const plannedKey = `${article.id}|${component.id}|${sizeKey(size)}`;
        const used = consumedQuantities.get(plannedKey) || { leftQty: 0, rightQty: 0 };
        const planned = plannedQuantities.get(plannedKey) || { leftQty: 0, rightQty: 0 };
        // Actual stock is consumed first, then Planning stock; a shortfall makes Actual negative.
        const left = override.leftQty ?? quantities.leftQty;
        const right = override.rightQty ?? quantities.rightQty;
        if (config.planned) {
          // Planning sheet: `quantities` is the planned stock; the actual stock comes from the receipts.
          const actual = actualQuantities.get(plannedKey) || { leftQty: 0, rightQty: 0 };
          const side = (key, base) => stockAfterConsumption(base, actual[key], used[key]).planning;
          return { leftQty: side('leftQty', left), rightQty: side('rightQty', right) };
        }
        const side = (key, base) => stockAfterConsumption(planned[key], base, used[key]).actual;
        return { leftQty: side('leftQty', left), rightQty: side('rightQty', right) };
      };
      const duplicates = new Map();
      (componentsByArticle.get(article.id) || []).forEach((component) => {
        const groupKey = groupKeyOf(component);
        duplicates.set(groupKey, [...(duplicates.get(groupKey) || []), component]);
      });
      // Duplicate rows count once: use the first one that holds a quantity, else the first.
      duplicates.forEach((components, groupKey) => {
        const chosen = components.find((component) => {
          const values = valuesFor(component);
          return Number(values.leftQty) || Number(values.rightQty);
        }) || components[0];
        const values = valuesFor(chosen);
        row[`component:${groupKey}:left`] = values.leftQty;
        row[`component:${groupKey}:right`] = values.rightQty;
        row[`rep:${groupKey}`] = chosen.id;
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
                      {componentColumns.map(({ key, groupKey, side, label }) => (
                        <td
                          key={key}
                          className={`border border-gray-300 p-3 ${
                            Number(row[key]) > 0 ? 'bg-green-100' : Number(row[key]) < 0 ? 'bg-red-100' : ''
                          }`}
                        >
                          {canEdit && row[`rep:${groupKey}`] ? (
                            <input
                              key={`${key}-${row[key]}`}
                              type="number"
                              step="1"
                              aria-label={`${label} for ${row.article}, size ${row.size}`}
                              defaultValue={row[key] ?? 0}
                              onBlur={(event) => {
                                const value = event.target.value;
                                if (value !== '' && Number(value) !== Number(row[key])) {
                                  saveComponentQuantity(row.articleId, row[`rep:${groupKey}`], row.size, side, value);
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
