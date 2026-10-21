import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { onValue, push, ref, update } from 'firebase/database';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { db } from '../firebase_config';

const FUNCTIONS = ['Knitting', 'Clicking', 'Printing', 'Stitching', 'Molding', 'Grinding', 'Stuckon', 'Packing'];
const isFunctionActive = (article, functionName) => (
  article.activeFunctions?.[functionName] ?? functionName !== 'Knitting'
);
const emptyComponentRow = () => ({ functionName: '', componentDetails: '', saving: false });

const bomIdsForArticle = (article) => String(article.bomIds || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const getExcelCellText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('').trim();
    if (value.text) return String(value.text).trim();
    if (value.result !== undefined) return String(value.result).trim();
  }
  return String(value).trim();
};

const componentRecordKey = (functionName, componentDetails) => (
  `${String(functionName || '').trim().toUpperCase()}::${String(componentDetails || '').trim().toLowerCase()}`
);

const getArticleSheetName = (article, usedNames) => {
  const sanitize = (value) => String(value || '')
    .replace(/[\\/?*[\]:]/g, '')
    .replace(/^'+|'+$/g, '')
    .trim();
  const articleColour = sanitize([article.article, article.colour || article.color].filter(Boolean).join('-')) || 'Article';
  const genderCode = sanitize(article.gender).slice(0, 2);
  const priceCategoryCode = sanitize(article.priceCategory).slice(0, 2);
  const itemCodes = [genderCode, priceCategoryCode].filter(Boolean).join('-');
  const suffix = `~${String(article.id).slice(-6)}`;
  const prefixLength = Math.max(1, 31 - suffix.length - itemCodes.length - (itemCodes ? 1 : 0));
  const itemPrefix = articleColour.slice(0, prefixLength);
  let name = [itemPrefix, itemCodes].filter(Boolean).join('-') + suffix;
  let duplicateIndex = 1;
  while (usedNames.has(name.toLowerCase())) {
    const duplicateSuffix = `~${String(article.id).slice(-4)}${duplicateIndex}`;
    const duplicatePrefixLength = Math.max(1, 31 - duplicateSuffix.length - itemCodes.length - (itemCodes ? 1 : 0));
    const duplicateItemPrefix = articleColour.slice(0, duplicatePrefixLength);
    name = [duplicateItemPrefix, itemCodes].filter(Boolean).join('-') + duplicateSuffix;
    duplicateIndex += 1;
  }
  usedNames.add(name.toLowerCase());
  return name;
};

function BomEntry() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const { articleId } = useParams();
  const [articles, setArticles] = useState([]);
  const [bomRecords, setBomRecords] = useState([]);
  const [showNotUpdated, setShowNotUpdated] = useState(false);
  const [componentRows, setComponentRows] = useState([emptyComponentRow()]);
  const [savingFunctionToggles, setSavingFunctionToggles] = useState({});
  const [openFunctionDropdown, setOpenFunctionDropdown] = useState(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importingWorkbook, setImportingWorkbook] = useState(false);
  const functionDropdownRef = useRef(null);
  const workbookFileInputRef = useRef(null);

  useEffect(() => {
    if (!openFunctionDropdown) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!functionDropdownRef.current?.contains(event.target)) {
        setOpenFunctionDropdown(null);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenFunctionDropdown(null);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openFunctionDropdown]);

  useEffect(() => {
    setSelectedLink('admin/bom-entry');
    setOpenedTab('adminDesk');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => onValue(ref(db, 'articleData/'), (snapshot) => {
    const data = snapshot.val() || {};
    setArticles(Object.entries(data).map(([id, article]) => ({ ...article, id })));
  }), []);

  useEffect(() => onValue(ref(db, 'bomData/'), (snapshot) => {
    const data = snapshot.val() || {};
    setBomRecords(Object.entries(data).map(([id, record]) => ({ ...record, id })));
  }), []);

  const selectedArticle = articles.find((article) => article.id === articleId);
  const articleBomRecords = useMemo(() => {
    if (!selectedArticle) return [];
    const linkedIds = new Set(bomIdsForArticle(selectedArticle));
    return bomRecords.filter((record) => linkedIds.has(record.id));
  }, [selectedArticle, bomRecords]);

  const rows = useMemo(() => {
    const usedSheetNames = new Set();
    return articles
      .map((article) => {
        const linkedIds = new Set(bomIdsForArticle(article));
        const articleRecords = bomRecords.filter((record) => linkedIds.has(record.id));
        const recordedFunctions = new Set(articleRecords
          .map((record) => String(record.functionName || record.process || '').trim().toUpperCase())
          .filter(Boolean));
        const activeFunctions = FUNCTIONS.filter((functionName) => isFunctionActive(article, functionName));
        const hasMissingActiveFunctions = activeFunctions.some(
          (functionName) => !recordedFunctions.has(functionName.toUpperCase())
        );
        const isUpdated = articleRecords.length > 0 && !hasMissingActiveFunctions;
        return {
          ...article,
          sheetName: getArticleSheetName(article, usedSheetNames),
          isUpdated,
          hasBomRecords: articleRecords.length > 0,
          hasMissingActiveFunctions,
        };
      })
      .sort((first, second) => String(first.article || '').localeCompare(String(second.article || '')));
  }, [articles, bomRecords]);

  const visibleRows = showNotUpdated ? rows.filter((article) => !article.isUpdated) : rows;
  const selectedRows = rows.filter((article) => selectedArticleIds.includes(article.id));
  const toggleSelectedArticle = (articleId) => {
    setSelectedArticleIds((current) => current.includes(articleId)
      ? current.filter((id) => id !== articleId)
      : [...current, articleId]);
  };

  const toggleVisibleArticles = () => {
    const visibleIds = visibleRows.map((article) => article.id);
    const allVisibleSelected = visibleIds.length > 0
      && visibleIds.every((id) => selectedArticleIds.includes(id));
    setSelectedArticleIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const downloadTemplate = async () => {
    if (!selectedRows.length) {
      window.alert('Select at least one line item before downloading the template.');
      return;
    }

    setDownloadingTemplate(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'NOVA';
      workbook.subject = 'BOM component entry template';
      selectedRows.forEach((article) => {
        const worksheet = workbook.addWorksheet(article.sheetName);
        worksheet.columns = [
          { header: 'Functions', key: 'functionName', width: 24 },
          { header: 'Components', key: 'componentDetails', width: 60 },
        ];
        const linkedIds = new Set(bomIdsForArticle(article));
        const existingComponents = bomRecords.filter((record) => linkedIds.has(record.id));
        existingComponents.forEach((record) => {
          const storedFunction = String(record.functionName || record.process || '').trim();
          const displayFunction = FUNCTIONS.find(
            (functionName) => functionName.toUpperCase() === storedFunction.toUpperCase()
          ) || storedFunction;
          worksheet.addRow([
            displayFunction,
            record.componentDetails || record.materialDesc || record.materialNumber || '',
          ]);
        });
        const lastTemplateRow = Math.max(201, existingComponents.length + 101);
        for (let rowNumber = 2; rowNumber <= lastTemplateRow; rowNumber += 1) {
          worksheet.getCell(rowNumber, 1).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`"${FUNCTIONS.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'Invalid function',
            error: 'Select a function from the dropdown list.',
          };
        }
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        worksheet.autoFilter = `A1:B${lastTemplateRow}`;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, 'BOM_Entry_Template.xlsx');
    } catch (error) {
      window.alert(`Unable to download the BOM template: ${error.message}`);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const importUpdatedWorkbook = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportingWorkbook(true);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const articlesBySheetName = new Map(rows.map((article) => [article.sheetName.toLowerCase(), article]));
      const updates = {};
      let importedRows = 0;

      workbook.eachSheet((worksheet) => {
        const article = articlesBySheetName.get(worksheet.name.toLowerCase());
        if (!article) {
          throw new Error(`The worksheet "${worksheet.name}" does not match a current article line item.`);
        }
        const functionHeader = String(worksheet.getCell(1, 1).value || '').trim().toLowerCase();
        const componentHeader = String(worksheet.getCell(1, 2).value || '').trim().toLowerCase();
        if (functionHeader !== 'functions' || componentHeader !== 'components') {
          throw new Error(`Worksheet "${worksheet.name}" must have "Functions" and "Components" as its first two headers.`);
        }

        const articleBomIds = bomIdsForArticle(article);
        const existingComponentKeys = new Set(bomRecords
          .filter((record) => articleBomIds.includes(record.id))
          .map((record) => componentRecordKey(
            record.functionName || record.process,
            record.componentDetails || record.materialDesc || record.materialNumber
          )));
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const functionValue = getExcelCellText(row.getCell(1).value);
          const componentValue = getExcelCellText(row.getCell(2).value);
          if (!functionValue && !componentValue) return;
          const matchedFunction = FUNCTIONS.find(
            (functionName) => functionName.toLowerCase() === functionValue.toLowerCase()
          );
          if (!matchedFunction || !componentValue) {
            throw new Error(`Worksheet "${worksheet.name}", row ${rowNumber}: choose a function and enter component details.`);
          }
          const componentKey = componentRecordKey(matchedFunction, componentValue);
          if (existingComponentKeys.has(componentKey)) return;
          existingComponentKeys.add(componentKey);

          const bomRef = push(ref(db, 'bomData/'));
          const record = {
            id: bomRef.key,
            articleId: article.id,
            functionName: matchedFunction.toUpperCase(),
            process: matchedFunction.toUpperCase(),
            componentDetails: componentValue,
          };
          updates[`bomData/${bomRef.key}`] = record;
          articleBomIds.push(bomRef.key);
          importedRows += 1;
        });

        updates[`articleData/${article.id}/bomIds`] = [...new Set(articleBomIds)].join(',');
      });

      if (!importedRows) {
        throw new Error('The workbook contains no new component rows to import. Existing saved rows were left unchanged.');
      }
      if (!window.confirm(`Save ${importedRows} component row(s) from ${workbook.worksheets.length} worksheet(s)?`)) return;
      await update(ref(db), updates);
      window.alert(`Imported ${importedRows} component row(s) successfully.`);
    } catch (error) {
      window.alert(`Unable to import the updated template: ${error.message}`);
    } finally {
      setImportingWorkbook(false);
    }
  };

  const toggleFunction = async (article, functionName, isActive) => {
    const toggleKey = `${article.id}:${functionName}`;
    setSavingFunctionToggles((current) => ({ ...current, [toggleKey]: true }));
    try {
      await update(ref(db, `articleData/${article.id}/activeFunctions`), {
        [functionName]: isActive,
      });
    } catch (error) {
      window.alert(`Unable to update ${functionName} status: ${error.message}`);
    } finally {
      setSavingFunctionToggles((current) => {
        const next = { ...current };
        delete next[toggleKey];
        return next;
      });
    }
  };

  const updateComponentRow = (index, field, value) => {
    setComponentRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
  };

  const saveComponentRow = async (index) => {
    if (!selectedArticle) return;
    const row = componentRows[index];
    if (!row.functionName || !row.componentDetails.trim()) {
      window.alert('Select a function and enter Component Details before saving.');
      return;
    }
    const bomRef = push(ref(db, 'bomData/'));
    const updatedBomIds = [...new Set([...bomIdsForArticle(selectedArticle), bomRef.key])];
    const record = {
      id: bomRef.key,
      articleId: selectedArticle.id,
      functionName: row.functionName,
      process: row.functionName,
      componentDetails: row.componentDetails.trim(),
    };

    updateComponentRow(index, 'saving', true);
    try {
      await update(ref(db), {
        [`bomData/${bomRef.key}`]: record,
        [`articleData/${selectedArticle.id}/bomIds`]: updatedBomIds.join(','),
      });
      setComponentRows((current) => current.map((currentRow, rowIndex) => (
        rowIndex === index ? emptyComponentRow() : currentRow
      )));
    } catch (error) {
      updateComponentRow(index, 'saving', false);
      window.alert(`Unable to save component details: ${error.message}`);
    }
  };

  if (articleId) {
    return (
      <div className="h-full overflow-auto bg-blue-50 px-3 pb-2 pt-4">
        <div className="space-y-4 rounded bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link to="/admin/bom-entry" className="text-sm text-blue-700 hover:underline">BACK TO BOM ENTRY</Link>
              <h1 className="mt-1 text-lg font-semibold">
                COMPONENTS — {selectedArticle
                  ? [selectedArticle.article, selectedArticle.colour, selectedArticle.model, selectedArticle.gender].filter(Boolean).join(' / ')
                  : 'ARTICLE NOT FOUND'}
              </h1>
            </div>
          </div>

          {selectedArticle && (
            <>
              <section className="space-y-4 rounded border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold">COMPONENT ENTRY</h2>
                  <button
                    type="button"
                    onClick={() => setComponentRows((current) => [...current, emptyComponentRow()])}
                    className="rounded border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    ADD NEW ROW
                  </button>
                </div>
                <div className="overflow-x-auto rounded border border-gray-300 bg-white">
                  <table className="w-full min-w-[700px] border-collapse text-sm">
                    <thead className="bg-gray-200 text-left text-xs font-semibold text-gray-700">
                      <tr>
                        <th className="border border-gray-300 p-3">FUNCTIONS</th>
                        <th className="border border-gray-300 p-3">COMPONENT DETAILS</th>
                        <th className="w-32 border border-gray-300 p-3 text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {componentRows.map((row, index) => (
                        <tr key={index} className="odd:bg-white even:bg-gray-50">
                          <td className="border border-gray-300 p-2">
                            <select
                              aria-label={`Function for component row ${index + 1}`}
                              value={row.functionName}
                              onChange={(event) => updateComponentRow(index, 'functionName', event.target.value)}
                              className="w-full rounded border border-gray-300 bg-white p-2 focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">Select function</option>
                              {FUNCTIONS.map((functionName) => (
                                <option key={functionName} value={functionName.toUpperCase()}>{functionName}</option>
                              ))}
                            </select>
                          </td>
                          <td className="border border-gray-300 p-2">
                            <input
                              type="text"
                              aria-label={`Component details for row ${index + 1}`}
                              placeholder="Enter component details"
                              value={row.componentDetails}
                              onChange={(event) => updateComponentRow(index, 'componentDetails', event.target.value)}
                              className="w-full rounded border border-gray-300 bg-white p-2 focus:border-blue-500 focus:outline-none"
                            />
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            <button
                              type="button"
                              onClick={() => saveComponentRow(index)}
                              disabled={row.saving}
                              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {row.saving ? 'SAVING...' : 'SAVE'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="font-semibold">COMPONENTS ({articleBomRecords.length})</h2>
                <div className="overflow-x-auto rounded border border-gray-300">
                  <table className="w-full min-w-[600px] border-collapse text-sm">
                    <thead className="bg-gray-200 text-left text-xs font-semibold text-gray-700">
                      <tr>
                        <th className="border border-gray-300 p-3">FUNCTIONS</th>
                        <th className="border border-gray-300 p-3">COMPONENT DETAILS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articleBomRecords.map((record) => (
                        <tr key={record.id} className="odd:bg-white even:bg-gray-50">
                          <td className="border border-gray-300 p-3 font-medium">{record.functionName || record.process || '-'}</td>
                          <td className="whitespace-pre-wrap border border-gray-300 p-3">
                            {record.componentDetails || record.materialDesc || record.materialNumber || '-'}
                          </td>
                        </tr>
                      ))}
                      {!articleBomRecords.length && (
                        <tr>
                          <td colSpan={2} className="border border-gray-300 p-4 text-center text-gray-500">
                            No components have been entered for this article.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex min-h-0 flex-1 flex-col space-y-4 rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">BOM ENTRY</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">{selectedRows.length} line item(s) selected</span>
            <button
              type="button"
              onClick={downloadTemplate}
              disabled={downloadingTemplate}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50"
            >
              {downloadingTemplate ? 'GENERATING TEMPLATE...' : 'DOWNLOAD TEMPLATE'}
            </button>
            <button
              type="button"
              onClick={() => workbookFileInputRef.current?.click()}
              disabled={importingWorkbook}
              className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-50"
            >
              {importingWorkbook ? 'IMPORTING...' : 'IMPORT UPDATED TEMPLATE'}
            </button>
            <input
              ref={workbookFileInputRef}
              type="file"
              accept=".xlsx"
              onChange={importUpdatedWorkbook}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => setShowNotUpdated((current) => !current)}
              aria-pressed={showNotUpdated}
              className={`rounded px-4 py-2 text-sm font-medium ${
                showNotUpdated ? 'bg-red-700 text-white' : 'border border-red-300 bg-red-50 text-red-800 hover:bg-red-100'
              }`}
            >
              {showNotUpdated ? 'SHOW ALL ARTICLES' : 'FILTER NOT UPDATED'}
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1150px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-200 text-left text-xs font-semibold">
              <tr>
                <th className="border border-gray-300 p-3 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all visible line items"
                    checked={visibleRows.length > 0 && visibleRows.every((article) => selectedArticleIds.includes(article.id))}
                    onChange={toggleVisibleArticles}
                  />
                </th>
                {['ARTICLE', 'COLOUR', 'MODEL', 'GENDER', 'PRICE CATEGORY', 'FUNCTIONS', 'BOM STATUS', 'BOM ENTRY'].map((heading) => (
                  <th key={heading} className="border border-gray-300 p-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((article) => (
                <tr
                  key={article.id}
                  className={!article.hasBomRecords
                    ? 'bg-red-100'
                    : article.hasMissingActiveFunctions ? 'bg-yellow-100' : 'bg-white'}
                >
                  <td className="border border-gray-300 p-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${article.article || 'article'} line item`}
                      checked={selectedArticleIds.includes(article.id)}
                      onChange={() => toggleSelectedArticle(article.id)}
                    />
                  </td>
                  <td className="border border-gray-300 p-3">{article.article || '-'}</td>
                  <td className="border border-gray-300 p-3">{article.colour || article.color || '-'}</td>
                  <td className="border border-gray-300 p-3">{article.model || '-'}</td>
                  <td className="border border-gray-300 p-3">{article.gender || '-'}</td>
                  <td className="border border-gray-300 p-3">{article.priceCategory || '-'}</td>
                  <td className="border border-gray-300 p-2">
                    <div
                      ref={openFunctionDropdown === article.id ? functionDropdownRef : null}
                      className="relative"
                    >
                      <button
                        type="button"
                        aria-expanded={openFunctionDropdown === article.id}
                        onClick={() => setOpenFunctionDropdown((current) => (
                          current === article.id ? null : article.id
                        ))}
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-center hover:bg-gray-50"
                      >
                        Functions ({FUNCTIONS.filter((functionName) => isFunctionActive(article, functionName)).length}/{FUNCTIONS.length})
                      </button>
                      {openFunctionDropdown === article.id && (
                        <div className="absolute left-0 z-20 mt-1 min-w-48 rounded border border-gray-300 bg-white p-2 shadow-lg">
                          {FUNCTIONS.map((functionName) => {
                            const toggleKey = `${article.id}:${functionName}`;
                            return (
                              <label key={functionName} className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-2 py-1.5 hover:bg-blue-50">
                                <input
                                  type="checkbox"
                                  checked={isFunctionActive(article, functionName)}
                                  disabled={Boolean(savingFunctionToggles[toggleKey])}
                                  onChange={(event) => toggleFunction(article, functionName, event.target.checked)}
                                />
                                {functionName}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="border border-gray-300 p-3 font-semibold">
                    {article.isUpdated ? 'UPDATED' : article.hasBomRecords ? 'PARTIALLY UPDATED' : 'NOT UPDATED'}
                  </td>
                  <td className="border border-gray-300 p-3">
                    <Link
                      to={`/admin/bom-entry/${article.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      OPEN BOM ENTRY
                    </Link>
                  </td>
                </tr>
              ))}
              {!visibleRows.length && (
                <tr>
                  <td colSpan={9} className="border border-gray-300 p-6 text-center text-gray-500">
                    {showNotUpdated ? 'All articles have updated BOM entries.' : 'No articles found in Article Entry.'}
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

export default BomEntry;
