import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { onValue, push, ref, update } from 'firebase/database';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { db } from '../firebase_config';
import { bomChanges, writeBomHistory } from '../bomHistory';

const FUNCTIONS = ['Knitting', 'Clicking', 'Printing', 'Stitching', 'Molding', 'Grinding', 'Stuckon', 'Packing'];
const NO_CHILD_MATERIAL = '__no_child_material__';
const STOCK_LIST_SHEET = 'Stock Materials';
const NO_CHILD_MATERIAL_LABEL = 'No Child Material';
const isFunctionActive = (article, functionName) => (
  article.activeFunctions?.[functionName] ?? functionName !== 'Knitting'
);
const emptyComponentRow = () => ({
  recordId: null,
  functionName: '',
  sapMaterialNo: '',
  componentDetails: '',
  childComponentIds: [],
  childMaterialSapNo: '',
  childMaterial: '',
  qtyPerCs: '',
  unit: '',
  saving: false,
});

const componentDetailsForRecord = (record) => (
  String(record.componentDetails || record.materialDesc || record.materialNumber || '').trim()
);

const STOCK_CHILD_PREFIX = 'stock:';

const childComponentNames = (childIds, records, stockOptions = []) => childIds
  .map((childId) => {
    if (childId === NO_CHILD_MATERIAL) return NO_CHILD_MATERIAL_LABEL;
    if (String(childId).startsWith(STOCK_CHILD_PREFIX)) {
      return stockOptions.find((item) => item.childId === childId)?.description
        || String(childId).slice(STOCK_CHILD_PREFIX.length);
    }
    return componentDetailsForRecord(records.find((record) => record.id === childId) || {});
  })
  .filter(Boolean);

// The Child Material dropdown is the source of truth; mirror its choice into the text fields.
const childMaterialFields = (ids, records, stockOptions, current) => {
  const selected = [...new Set(ids || [])];
  if (!selected.length) return { childMaterial: current.childMaterial, childMaterialSapNo: current.childMaterialSapNo };
  const stockMatches = selected.filter((id) => String(id).startsWith(STOCK_CHILD_PREFIX))
    .map((id) => stockOptions.find((item) => item.childId === id)).filter(Boolean);
  return {
    childMaterial: childComponentNames(selected, records, stockOptions).join(', '),
    childMaterialSapNo: stockMatches.length === 1 ? stockMatches[0].materialNumber : (current.childMaterialSapNo || ''),
  };
};

// One option per distinct component name; an already-selected duplicate stays as the representative.
const uniqueByDetails = (records, selectedIds = []) => {
  const byName = new Map();
  records.forEach((record) => {
    const key = componentDetailsForRecord(record).trim().toLowerCase();
    if (!key) return;
    const kept = byName.get(key);
    if (!kept || (!selectedIds.includes(kept.id) && selectedIds.includes(record.id))) byName.set(key, record);
  });
  return [...byName.values()];
};

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

const componentRecordKey = (functionName, componentDetails, childSapNo = '', childMaterial = '') => (
  [functionName, componentDetails, childSapNo, childMaterial]
    .map((part) => String(part || '').trim().toLowerCase()).join('::')
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
  const [stockData, setStockData] = useState([]);
  const [showNotUpdated, setShowNotUpdated] = useState(false);
  const [componentRows, setComponentRows] = useState([emptyComponentRow()]);
  const [editingComponentId, setEditingComponentId] = useState(null);
  const [componentEditDraft, setComponentEditDraft] = useState(null);
  const [savingComponentEdit, setSavingComponentEdit] = useState(false);
  const [editChildDropdownOpen, setEditChildDropdownOpen] = useState(false);
  const [editChildDropdownPosition, setEditChildDropdownPosition] = useState(null);
  const [editChildFilter, setEditChildFilter] = useState('');
  const [openChildDropdown, setOpenChildDropdown] = useState(null);
  const [childDropdownPosition, setChildDropdownPosition] = useState(null);
  const [savingFunctionToggles, setSavingFunctionToggles] = useState({});
  const [openFunctionDropdown, setOpenFunctionDropdown] = useState(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [selectedComponentIds, setSelectedComponentIds] = useState([]);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importingWorkbook, setImportingWorkbook] = useState(false);
  const functionDropdownRef = useRef(null);
  const childDropdownRef = useRef(null);
  const editChildDropdownRef = useRef(null);
  const workbookFileInputRef = useRef(null);

  useEffect(() => {
    if (openChildDropdown === null) return undefined;
    const closeOnOutsideClick = (event) => {
      if (
        !childDropdownRef.current?.contains(event.target) &&
        !event.target.closest('[data-child-trigger]')
      ) {
        setOpenChildDropdown(null);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenChildDropdown(null);
    };
    const closeOnScroll = (event) => {
      if (!childDropdownRef.current?.contains(event.target)) setOpenChildDropdown(null);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [openChildDropdown]);

  useEffect(() => {
    if (!editChildDropdownOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (
        !editChildDropdownRef.current?.contains(event.target) &&
        !event.target.closest('[data-edit-child-trigger]')
      ) {
        setEditChildDropdownOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setEditChildDropdownOpen(false);
    };
    const closeOnScroll = (event) => {
      if (!editChildDropdownRef.current?.contains(event.target)) setEditChildDropdownOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [editChildDropdownOpen]);

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

  useEffect(() => onValue(ref(db, 'stockData/'), (snapshot) => {
    setStockData(Object.values(snapshot.val() || {}));
  }), []);

  const stockMaterials = useMemo(() => {
    const seen = new Set();
    return stockData
      .map((item) => ({
        description: String(item.materialDesc || '').trim(),
        materialNumber: String(item.materialNumber || '').trim(),
        childId: `${STOCK_CHILD_PREFIX}${String(item.materialNumber || item.materialDesc || '').trim()}`,
      }))
      .filter((item) => item.description && !seen.has(item.description.toLowerCase()) && seen.add(item.description.toLowerCase()))
      .sort((first, second) => first.description.localeCompare(second.description));
  }, [stockData]);

  const stockMaterialFor = (description) => stockMaterials.find(
    (item) => item.description.toLowerCase() === String(description || '').trim().toLowerCase()
  );

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
      .sort((first, second) => ['model', 'article', 'colour', 'priceCategory'].reduce(
        (result, key) => result || String(first[key] ?? '').localeCompare(String(second[key] ?? ''), undefined, { numeric: true, sensitivity: 'base' }),
        0
      ));
  }, [articles, bomRecords]);

  const filterValueOf = (article, key) => {
    if (key === 'ARTICLE') return article.article;
    if (key === 'COLOUR') return article.colour || article.color;
    if (key === 'MODEL') return article.model;
    if (key === 'GENDER') return article.gender;
    if (key === 'PRICE CATEGORY') return article.priceCategory;
    return article.isUpdated ? 'UPDATED' : article.hasBomRecords ? 'PARTIALLY UPDATED' : 'NOT UPDATED';
  };
  const visibleRows = (showNotUpdated ? rows.filter((article) => !article.isUpdated) : rows)
    .filter((article) => Object.entries(columnFilters).every(([key, value]) => (
      !value || String(filterValueOf(article, key) ?? '').toLowerCase().includes(value.trim().toLowerCase())
    )));
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
      const listMaterials = [{ description: NO_CHILD_MATERIAL_LABEL, materialNumber: '' }, ...stockMaterials];
      const stockListCount = listMaterials.length;
      {
        const listSheet = workbook.addWorksheet(STOCK_LIST_SHEET);
        listSheet.columns = [
          { header: 'Material Description', key: 'description', width: 60 },
          { header: 'Material No.', key: 'materialNumber', width: 24 },
        ];
        listMaterials.forEach((item) => listSheet.addRow([item.description, item.materialNumber]));
      }
      selectedRows.forEach((article) => {
        const worksheet = workbook.addWorksheet(article.sheetName);
        worksheet.columns = [
          { header: 'Functions', key: 'functionName', width: 24 },
          { header: 'SAP Material No', key: 'sapMaterialNo', width: 22 },
          { header: 'Components', key: 'componentDetails', width: 60 },
          { header: 'Child Material SAP No', key: 'childMaterialSapNo', width: 24 },
          { header: 'Child Material', key: 'childMaterial', width: 40 },
          { header: 'Qty/PR', key: 'qtyPerCs', width: 12 },
          { header: 'Unit', key: 'unit', width: 12 },
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
            record.sapMaterialNo || '',
            record.componentDetails || record.materialDesc || record.materialNumber || '',
            record.childMaterialSapNo || '',
            record.childMaterial || '',
            record.qtyPerCs ?? '',
            record.unit || '',
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
          if (stockListCount) {
            worksheet.getCell(rowNumber, 5).dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: [`'${STOCK_LIST_SHEET}'!$A$2:$A$${stockListCount + 1}`],
              showErrorMessage: false,
            };
          }
        }
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        worksheet.autoFilter = `A1:G${lastTemplateRow}`;
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
      const importLog = [];
      const newRecordIds = new Set();
      let importedRows = 0;

      workbook.eachSheet((worksheet) => {
        if (worksheet.name === STOCK_LIST_SHEET) return;
        const article = articlesBySheetName.get(worksheet.name.toLowerCase());
        if (!article) {
          throw new Error(`The worksheet "${worksheet.name}" does not match a current article line item.`);
        }
        const headerColumns = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headerColumns[getExcelCellText(cell.value).toLowerCase()] = colNumber;
        });
        const columnFor = (name) => headerColumns[name];
        if (!columnFor('functions') || !columnFor('components')) {
          throw new Error(`Worksheet "${worksheet.name}" must have "Functions" and "Components" headers.`);
        }
        const cellText = (row, name) => (columnFor(name) ? getExcelCellText(row.getCell(columnFor(name)).value) : '');

        const articleBomIds = bomIdsForArticle(article);
        const existingByKey = new Map(bomRecords
          .filter((record) => articleBomIds.includes(record.id))
          .map((record) => [componentRecordKey(
            record.functionName || record.process,
            record.componentDetails || record.materialDesc || record.materialNumber,
            record.childMaterialSapNo,
            record.childMaterial
          ), record]));
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const functionValue = cellText(row, 'functions');
          const componentValue = cellText(row, 'components');
          if (!functionValue && !componentValue) return;
          const matchedFunction = FUNCTIONS.find(
            (functionName) => functionName.toLowerCase() === functionValue.toLowerCase()
          );
          if (!matchedFunction || !componentValue) {
            throw new Error(`Worksheet "${worksheet.name}", row ${rowNumber}: choose a function and enter component details.`);
          }
          const details = {
            sapMaterialNo: cellText(row, 'sap material no'),
            childMaterialSapNo: cellText(row, 'child material sap no'),
            childMaterial: cellText(row, 'child material'),
            qtyPerCs: (cellText(row, 'qty/pr') || cellText(row, 'qty/cs')),
            unit: cellText(row, 'unit'),
          };
          if (details.childMaterial.toLowerCase() === NO_CHILD_MATERIAL_LABEL.toLowerCase()) {
            details.childComponentIds = [NO_CHILD_MATERIAL];
          }
          const componentKey = componentRecordKey(matchedFunction, componentValue, details.childMaterialSapNo, details.childMaterial);
          let existingRecord = existingByKey.get(componentKey);
          if (!existingRecord) {
            // A saved component with no child material yet can take the first child row.
            const blankKey = componentRecordKey(matchedFunction, componentValue);
            const blankRecord = existingByKey.get(blankKey);
            if (blankRecord && !newRecordIds.has(blankRecord.id)) {
              existingByKey.delete(blankKey);
              existingByKey.set(componentKey, blankRecord);
              existingRecord = blankRecord;
            }
          }
          if (existingRecord && newRecordIds.has(existingRecord.id)) {
            Object.assign(updates[`bomData/${existingRecord.id}`], details);
            return;
          }
          if (existingRecord) {
            const changed = Object.keys(details).filter((field) => (
              String(existingRecord[field] ?? '') !== details[field]
            ));
            if (changed.length) {
              importLog.push({
                article,
                record: existingRecord,
                action: 'edited (import)',
                changes: bomChanges(existingRecord, { ...existingRecord, ...details }),
              });
              changed.forEach((field) => {
                updates[`bomData/${existingRecord.id}/${field}`] = details[field];
              });
              importedRows += 1;
            }
            return;
          }

          const bomRef = push(ref(db, 'bomData/'));
          const record = {
            id: bomRef.key,
            articleId: article.id,
            functionName: matchedFunction.toUpperCase(),
            process: matchedFunction.toUpperCase(),
            componentDetails: componentValue,
            ...details,
          };
          existingByKey.set(componentKey, record);
          updates[`bomData/${bomRef.key}`] = record;
          newRecordIds.add(bomRef.key);
          importLog.push({ article, record, action: 'created (import)', changes: bomChanges({}, record) });
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
      await Promise.all(importLog.map((entry) => writeBomHistory(entry)));
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
    const selectedChildIds = [...new Set(row.childComponentIds || [])].filter((childId) => childId !== row.recordId);
    const realChildIds = selectedChildIds.filter((childId) => childId !== NO_CHILD_MATERIAL);
    // Several children become separate line items sharing function, SAP material no. and component details.
    const childGroups = realChildIds.length > 1 ? realChildIds.map((childId) => [childId]) : [selectedChildIds];
    const baseRecord = {
      articleId: selectedArticle.id,
      functionName: row.functionName,
      process: row.functionName,
      componentDetails: row.componentDetails.trim(),
      sapMaterialNo: String(row.sapMaterialNo || '').trim(),
      qtyPerCs: String(row.qtyPerCs ?? '').trim(),
      unit: String(row.unit || '').trim(),
    };
    const newKeys = [];
    const records = childGroups.map((childIds, groupIndex) => {
      const recordId = groupIndex === 0 && row.recordId
        ? row.recordId
        : push(ref(db, 'bomData/')).key;
      if (!row.recordId || groupIndex > 0) newKeys.push(recordId);
      const record = { ...baseRecord, id: recordId, childComponentIds: childIds.filter((childId) => childId !== recordId) };
      Object.assign(record, childMaterialFields(record.childComponentIds, articleBomRecords, stockMaterials, {
        childMaterial: String(row.childMaterial || '').trim(),
        childMaterialSapNo: String(row.childMaterialSapNo || '').trim(),
      }));
      return record;
    });

    updateComponentRow(index, 'saving', true);
    try {
      const updates = {};
      records.forEach((record) => { updates[`bomData/${record.id}`] = record; });
      if (newKeys.length) {
        const updatedBomIds = [...new Set([...bomIdsForArticle(selectedArticle), ...newKeys])];
        updates[`articleData/${selectedArticle.id}/bomIds`] = updatedBomIds.join(',');
      }
      await update(ref(db), updates);
      for (const record of records) {
        const previousRecord = bomRecords.find((item) => item.id === record.id);
        const changes = bomChanges(previousRecord, record);
        if (!previousRecord || Object.keys(changes).length) {
          await writeBomHistory({ article: selectedArticle, record, action: previousRecord ? 'edited' : 'created', changes: previousRecord ? changes : bomChanges({}, record) });
        }
      }
      setComponentRows((current) => current.map((currentRow, rowIndex) => (
        rowIndex === index ? emptyComponentRow() : currentRow
      )));
    } catch (error) {
      updateComponentRow(index, 'saving', false);
      window.alert(`Unable to save component details: ${error.message}`);
    }
  };

  const editComponent = (record) => {
    setEditingComponentId(record.id);
    setEditChildDropdownOpen(false);
    setEditChildFilter('');
    setComponentEditDraft({
      functionName: String(record.functionName || record.process || '').toUpperCase(),
      componentDetails: componentDetailsForRecord(record),
      sapMaterialNo: record.sapMaterialNo || '',
      childMaterialSapNo: record.childMaterialSapNo || '',
      childMaterial: record.childMaterial || '',
      qtyPerCs: record.qtyPerCs ?? '',
      unit: record.unit || '',
      childComponentIds: record.childComponentIds || [],
    });
  };

  const deleteComponent = async (record) => {
    if (!window.confirm(`Delete component "${componentDetailsForRecord(record)}"? This cannot be undone.`)) return;
    try {
      const article = articles.find((item) => item.id === record.articleId) || selectedArticle;
      const updates = { [`bomData/${record.id}`]: null };
      if (article) {
        updates[`articleData/${article.id}/bomIds`] = bomIdsForArticle(article)
          .filter((id) => id !== record.id).join(',');
      }
      bomRecords.forEach((item) => {
        if ((item.childComponentIds || []).includes(record.id)) {
          updates[`bomData/${item.id}/childComponentIds`] = item.childComponentIds.filter((id) => id !== record.id);
        }
      });
      await update(ref(db), updates);
      await writeBomHistory({ article, record, action: 'deleted', changes: bomChanges(record, {}) });
    } catch (error) {
      window.alert(`Unable to delete component: ${error.message}`);
    }
  };

  const deleteSelectedComponents = async () => {
    const records = articleBomRecords.filter((record) => selectedComponentIds.includes(record.id));
    if (!records.length) return;
    if (!window.confirm(`Delete ${records.length} selected component(s)? This cannot be undone.`)) return;
    try {
      const removedIds = new Set(records.map((record) => record.id));
      const updates = {};
      records.forEach((record) => { updates[`bomData/${record.id}`] = null; });
      if (selectedArticle) {
        updates[`articleData/${selectedArticle.id}/bomIds`] = bomIdsForArticle(selectedArticle)
          .filter((id) => !removedIds.has(id)).join(',');
      }
      bomRecords.forEach((item) => {
        if (removedIds.has(item.id)) return;
        const children = item.childComponentIds || [];
        if (children.some((id) => removedIds.has(id))) {
          updates[`bomData/${item.id}/childComponentIds`] = children.filter((id) => !removedIds.has(id));
        }
      });
      await update(ref(db), updates);
      for (const record of records) {
        await writeBomHistory({ article: selectedArticle, record, action: 'deleted', changes: bomChanges(record, {}) });
      }
      setSelectedComponentIds([]);
    } catch (error) {
      window.alert(`Unable to delete the selected components: ${error.message}`);
    }
  };

  const saveComponentEdit = async (recordId) => {
    if (!componentEditDraft?.functionName || !componentEditDraft.componentDetails.trim()) {
      window.alert('Select a function and enter Component Details before saving.');
      return;
    }
    setSavingComponentEdit(true);
    try {
      const selectedChildIds = [...new Set(componentEditDraft.childComponentIds)].filter((childId) => childId !== recordId);
      const realChildIds = selectedChildIds.filter((childId) => childId !== NO_CHILD_MATERIAL);
      // The first child stays on this line item; each extra child becomes its own line item.
      const childGroups = realChildIds.length > 1 ? realChildIds.map((childId) => [childId]) : [selectedChildIds];
      const editedRecord = {
        functionName: componentEditDraft.functionName,
        process: componentEditDraft.functionName,
        componentDetails: componentEditDraft.componentDetails.trim(),
        sapMaterialNo: String(componentEditDraft.sapMaterialNo || '').trim(),
        qtyPerCs: String(componentEditDraft.qtyPerCs ?? '').trim(),
        unit: String(componentEditDraft.unit || '').trim(),
        childComponentIds: childGroups[0],
      };
      Object.assign(editedRecord, childMaterialFields(editedRecord.childComponentIds, articleBomRecords, stockMaterials, {
        childMaterial: String(componentEditDraft.childMaterial || '').trim(),
        childMaterialSapNo: String(componentEditDraft.childMaterialSapNo || '').trim(),
      }));
      const previousRecord = bomRecords.find((item) => item.id === recordId) || {};
      const updates = { [`bomData/${recordId}`]: { ...previousRecord, ...editedRecord, id: recordId } };
      const extraRecords = childGroups.slice(1).map((childIds) => {
        const key = push(ref(db, 'bomData/')).key;
        const record = {
          ...previousRecord,
          ...editedRecord,
          id: key,
          childComponentIds: childIds,
        };
        Object.assign(record, childMaterialFields(childIds, articleBomRecords, stockMaterials, { childMaterial: '', childMaterialSapNo: '' }));
        updates[`bomData/${key}`] = record;
        return record;
      });
      if (extraRecords.length) {
        const article = articles.find((item) => item.id === previousRecord.articleId) || selectedArticle;
        updates[`articleData/${article.id}/bomIds`] = [...new Set([
          ...bomIdsForArticle(article),
          ...extraRecords.map((record) => record.id),
        ])].join(',');
      }
      await update(ref(db), updates);
      for (const record of extraRecords) {
        await writeBomHistory({
          article: articles.find((item) => item.id === previousRecord.articleId) || selectedArticle,
          record,
          action: 'created',
          changes: bomChanges({}, record),
        });
      }
      const changes = bomChanges(previousRecord, editedRecord);
      if (Object.keys(changes).length) {
        await writeBomHistory({
          article: articles.find((item) => item.id === previousRecord.articleId) || selectedArticle,
          record: { ...previousRecord, ...editedRecord, id: recordId },
          action: 'edited',
          changes,
        });
      }
      setEditingComponentId(null);
      setComponentEditDraft(null);
      setEditChildDropdownOpen(false);
    } catch (error) {
      window.alert(`Unable to update component details: ${error.message}`);
    } finally {
      setSavingComponentEdit(false);
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
                  <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead className="bg-gray-200 text-left text-xs font-semibold text-gray-700">
                      <tr>
                        <th className="border border-gray-300 p-3">FUNCTIONS</th>
                        <th className="border border-gray-300 p-3">SAP MATERIAL NO</th>
                        <th className="border border-gray-300 p-3">COMPONENT DETAILS</th>
                        <th className="border border-gray-300 p-3">CHILD MATERIAL</th>
                        <th className="border border-gray-300 p-3">CHILD MATERIAL SAP NO</th>
                        <th className="border border-gray-300 p-3">QTY/PR</th>
                        <th className="border border-gray-300 p-3">UNIT</th>
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
                              aria-label={`SAP material no for row ${index + 1}`}
                              value={row.sapMaterialNo}
                              onChange={(event) => updateComponentRow(index, 'sapMaterialNo', event.target.value)}
                              className="w-full rounded border border-gray-300 bg-white p-2 focus:border-blue-500 focus:outline-none"
                            />
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
                          {[['childMaterial', 'Child material'], ['childMaterialSapNo', 'Child material SAP no'], ['qtyPerCs', 'Qty per CS'], ['unit', 'Unit']].map(([field, label]) => (
                            field === 'childMaterial' ? (
                              <React.Fragment key={field}>
                          <td className="border border-gray-300 p-2">
                            {(() => {
                              const currentDetails = row.componentDetails.trim().toLowerCase();
                              const childOptions = uniqueByDetails(articleBomRecords.filter((record) => (
                                record.id !== row.recordId &&
                                (row.recordId || componentDetailsForRecord(record).toLowerCase() !== currentDetails)
                              )), row.childComponentIds || []);
                              const selectedNames = childComponentNames(
                                (row.childComponentIds || []).filter((id) => id !== NO_CHILD_MATERIAL),
                                childOptions,
                                stockMaterials
                              );
                              if ((row.childComponentIds || []).includes(NO_CHILD_MATERIAL)) {
                                selectedNames.unshift(NO_CHILD_MATERIAL_LABEL);
                              }
                              return (
                                <div className="relative">
                                  <button
                                    type="button"
                                    data-child-trigger
                                    aria-label={`Select child components for row ${index + 1}`}
                                    aria-expanded={openChildDropdown === index}
                                    onClick={(event) => {
                                      if (openChildDropdown === index) {
                                        setOpenChildDropdown(null);
                                        return;
                                      }
                                      const rect = event.currentTarget.getBoundingClientRect();
                                      const width = Math.min(360, window.innerWidth - 24);
                                      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
                                      const below = window.innerHeight - rect.bottom - 12;
                                      const above = rect.top - 12;
                                      const maxHeight = Math.min(224, Math.max(below, above));
                                      setChildDropdownPosition({
                                        left,
                                        top: below >= 160 || below >= above
                                          ? rect.bottom + 4
                                          : Math.max(12, rect.top - maxHeight - 4),
                                        width,
                                        maxHeight,
                                      });
                                      setOpenChildDropdown(index);
                                    }}
                                    className="w-full rounded border border-gray-300 bg-white p-2 text-left"
                                  >
                                    {selectedNames.length ? selectedNames.join(', ') : (row.childMaterial || 'Select child material')}
                                  </button>
                                  {openChildDropdown === index && childDropdownPosition && createPortal(
                                    <div
                                      ref={childDropdownRef}
                                      style={{
                                        position: 'fixed',
                                        left: childDropdownPosition.left,
                                        top: childDropdownPosition.top,
                                        width: childDropdownPosition.width,
                                        maxHeight: childDropdownPosition.maxHeight,
                                      }}
                                      className="z-[1000] overflow-auto rounded border border-gray-300 bg-white p-2 text-sm shadow-xl"
                                    >
                                      <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-2 py-1.5 hover:bg-blue-50">
                                        <input
                                          type="checkbox"
                                          checked={(row.childComponentIds || []).includes(NO_CHILD_MATERIAL)}
                                          onChange={() => updateComponentRow(
                                            index,
                                            'childComponentIds',
                                            (row.childComponentIds || []).includes(NO_CHILD_MATERIAL)
                                              ? []
                                              : [NO_CHILD_MATERIAL]
                                          )}
                                        />
                                        {NO_CHILD_MATERIAL_LABEL}
                                      </label>
                                      {childOptions.map((record) => (
                                        <label key={record.id} className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-2 py-1.5 hover:bg-blue-50">
                                          <input
                                            type="checkbox"
                                            checked={(row.childComponentIds || []).includes(record.id)}
                                            onChange={() => updateComponentRow(
                                              index,
                                              'childComponentIds',
                                              (row.childComponentIds || []).includes(record.id)
                                                ? row.childComponentIds.filter((id) => id !== record.id)
                                                : [...(row.childComponentIds || []).filter((id) => id !== NO_CHILD_MATERIAL), record.id]
                                            )}
                                          />
                                          {componentDetailsForRecord(record)}
                                        </label>
                                      ))}
                                      {childOptions.length === 0 && stockMaterials.length === 0 && (
                                        <p className="px-2 py-2 text-gray-500">No other component details are available.</p>
                                      )}
                                      {stockMaterials.length > 0 && (
                                        <p className="mt-1 border-t border-gray-200 px-2 pt-2 text-xs font-semibold text-gray-500">STOCK MATERIALS</p>
                                      )}
                                      {stockMaterials.map((item) => (
                                        <label key={item.childId} className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-2 py-1.5 hover:bg-blue-50">
                                          <input
                                            type="checkbox"
                                            checked={(row.childComponentIds || []).includes(item.childId)}
                                            onChange={() => updateComponentRow(
                                              index,
                                              'childComponentIds',
                                              (row.childComponentIds || []).includes(item.childId)
                                                ? row.childComponentIds.filter((id) => id !== item.childId)
                                                : [...(row.childComponentIds || []).filter((id) => id !== NO_CHILD_MATERIAL), item.childId]
                                            )}
                                          />
                                          {item.description}
                                        </label>
                                      ))}
                                    </div>,
                                    document.body
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                              </React.Fragment>
                            ) : (
                            <td key={field} className="border border-gray-300 p-2">
                              <input
                                type={field === 'qtyPerCs' ? 'number' : 'text'}
                                min={field === 'qtyPerCs' ? '0' : undefined}
                                step={field === 'qtyPerCs' ? 'any' : undefined}
                                aria-label={`${label} for row ${index + 1}`}
                                list={field === 'childMaterial' ? 'stock-material-options' : undefined}
                                value={row[field]}
                                onChange={(event) => {
                                  updateComponentRow(index, field, event.target.value);
                                  const match = field === 'childMaterial' ? stockMaterialFor(event.target.value) : null;
                                  if (match && !row.childMaterialSapNo) {
                                    updateComponentRow(index, 'childMaterialSapNo', match.materialNumber);
                                  }
                                }}
                                className="w-full rounded border border-gray-300 bg-white p-2 focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            )
                          ))}
                          <td className="border border-gray-300 p-2 text-center">
                            <button
                              type="button"
                              onClick={() => saveComponentRow(index)}
                              disabled={row.saving}
                              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {row.saving ? 'SAVING...' : row.recordId ? 'UPDATE' : 'SAVE'}
                            </button>
                            {row.recordId && (
                              <button
                                type="button"
                                onClick={() => setComponentRows((current) => {
                                  const remaining = current.filter((currentRow) => currentRow !== row);
                                  return remaining.length ? remaining : [emptyComponentRow()];
                                })}
                                disabled={row.saving}
                                className="ml-2 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                              >
                                CANCEL
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">COMPONENTS ({articleBomRecords.length})</h2>
                  <button
                    type="button"
                    onClick={deleteSelectedComponents}
                    disabled={!selectedComponentIds.length || editingComponentId !== null}
                    className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    DELETE SELECTED ({selectedComponentIds.filter((id) => articleBomRecords.some((record) => record.id === id)).length})
                  </button>
                </div>
                <div className="overflow-x-auto rounded border border-gray-300">
                  <table className="w-full min-w-[800px] border-collapse text-sm">
                    <thead className="bg-gray-200 text-left text-xs font-semibold text-gray-700">
                      <tr>
                        <th className="border border-gray-300 p-3 text-center">
                          <input
                            type="checkbox"
                            aria-label="Select all components"
                            checked={articleBomRecords.length > 0 && articleBomRecords.every((record) => selectedComponentIds.includes(record.id))}
                            onChange={(event) => setSelectedComponentIds(event.target.checked ? articleBomRecords.map((record) => record.id) : [])}
                          />
                        </th>
                        <th className="border border-gray-300 p-3">FUNCTIONS</th>
                        <th className="border border-gray-300 p-3">SAP MATERIAL NO</th>
                        <th className="border border-gray-300 p-3">COMPONENT DETAILS</th>
                        <th className="border border-gray-300 p-3">CHILD MATERIAL</th>
                        <th className="border border-gray-300 p-3">CHILD MATERIAL SAP NO</th>
                        <th className="border border-gray-300 p-3">QTY/PR</th>
                        <th className="border border-gray-300 p-3">UNIT</th>
                        <th className="w-28 border border-gray-300 p-3 text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articleBomRecords.map((record) => {
                      const isEditing = editingComponentId === record.id;
                      return (
                        <tr key={record.id} className="odd:bg-white even:bg-gray-50">
                          <td className="border border-gray-300 p-2 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Select ${componentDetailsForRecord(record)}`}
                              checked={selectedComponentIds.includes(record.id)}
                              onChange={() => setSelectedComponentIds((current) => (current.includes(record.id)
                                ? current.filter((id) => id !== record.id)
                                : [...current, record.id]))}
                            />
                          </td>
                          <td className="border border-gray-300 p-2">
                            {isEditing ? (
                              <select
                                aria-label={`Edit function for ${componentDetailsForRecord(record)}`}
                                value={componentEditDraft.functionName}
                                onChange={(event) => setComponentEditDraft((draft) => ({
                                  ...draft,
                                  functionName: event.target.value,
                                }))}
                                className="w-full rounded border border-gray-300 bg-white p-2"
                              >
                                {FUNCTIONS.map((functionName) => (
                                  <option key={functionName} value={functionName.toUpperCase()}>{functionName}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="p-1 font-medium">{record.functionName || record.process || '-'}</span>
                            )}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {isEditing ? (
                              <input
                                type="text"
                                aria-label={`Edit SAP material no for ${componentDetailsForRecord(record)}`}
                                value={componentEditDraft.sapMaterialNo}
                                onChange={(event) => setComponentEditDraft((draft) => ({
                                  ...draft,
                                  sapMaterialNo: event.target.value,
                                }))}
                                className="w-full rounded border border-gray-300 p-2"
                              />
                            ) : (
                              <span className="p-1">{record.sapMaterialNo || '-'}</span>
                            )}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {isEditing ? (
                              <input
                                type="text"
                                aria-label={`Edit component details for ${componentDetailsForRecord(record)}`}
                                value={componentEditDraft.componentDetails}
                                onChange={(event) => setComponentEditDraft((draft) => ({
                                  ...draft,
                                  componentDetails: event.target.value,
                                }))}
                                className="w-full rounded border border-gray-300 p-2"
                              />
                            ) : (
                              <span className="whitespace-pre-wrap p-1">{componentDetailsForRecord(record) || '-'}</span>
                            )}
                          </td>
                          {['childMaterial', 'childMaterialSapNo', 'qtyPerCs', 'unit'].map((field) => (
                          field === 'childMaterial' ? (
                            <React.Fragment key={field}>
                          <td className="border border-gray-300 p-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  data-edit-child-trigger
                                  aria-label={`Select child components for ${componentDetailsForRecord(record)}`}
                                  aria-expanded={editChildDropdownOpen}
                                  onClick={(event) => {
                                    if (editChildDropdownOpen) {
                                      setEditChildDropdownOpen(false);
                                      return;
                                    }
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    const width = Math.min(360, window.innerWidth - 24);
                                    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
                                    const below = window.innerHeight - rect.bottom - 12;
                                    const above = rect.top - 12;
                                    const maxHeight = Math.min(280, Math.max(below, above));
                                    setEditChildDropdownPosition({
                                      left,
                                      top: below >= 180 || below >= above
                                        ? rect.bottom + 4
                                        : Math.max(12, rect.top - maxHeight - 4),
                                      width,
                                      maxHeight,
                                    });
                                    setEditChildFilter('');
                                    setEditChildDropdownOpen(true);
                                  }}
                                  className="w-full rounded border border-gray-300 bg-white p-2 text-left"
                                >
                                    {childComponentNames(componentEditDraft.childComponentIds, articleBomRecords, stockMaterials)
                                    .join(', ') || componentEditDraft.childMaterial || 'Select child material'}
                                </button>
                                {editChildDropdownOpen && editChildDropdownPosition && createPortal(
                                  <div
                                    ref={editChildDropdownRef}
                                    style={{
                                      position: 'fixed',
                                      left: editChildDropdownPosition.left,
                                      top: editChildDropdownPosition.top,
                                      width: editChildDropdownPosition.width,
                                      maxHeight: editChildDropdownPosition.maxHeight,
                                    }}
                                    className="z-[1000] flex flex-col overflow-hidden rounded border border-gray-300 bg-white p-2 text-sm shadow-xl"
                                  >
                                    <input
                                      type="text"
                                      aria-label="Filter child components"
                                      placeholder="Type to filter components"
                                      value={editChildFilter}
                                      onChange={(event) => setEditChildFilter(event.target.value)}
                                      className="mb-2 w-full rounded border border-gray-300 p-2"
                                    />
                                    <div className="min-h-0 overflow-auto">
                                      <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-2 py-1.5 hover:bg-blue-50">
                                        <input
                                          type="checkbox"
                                          checked={componentEditDraft.childComponentIds.includes(NO_CHILD_MATERIAL)}
                                          onChange={() => setComponentEditDraft((draft) => ({
                                            ...draft,
                                            childComponentIds: draft.childComponentIds.includes(NO_CHILD_MATERIAL)
                                              ? []
                                              : [NO_CHILD_MATERIAL],
                                          }))}
                                        />
                                        {NO_CHILD_MATERIAL_LABEL}
                                      </label>
                                      {uniqueByDetails(articleBomRecords, componentEditDraft.childComponentIds)
                                        .filter((child) => child.id !== record.id)
                                        .filter((child) => componentDetailsForRecord(child)
                                          .toLowerCase().includes(editChildFilter.trim().toLowerCase()))
                                        .map((child) => (
                                          <label
                                            key={child.id}
                                            className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-2 py-1.5 hover:bg-blue-50"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={componentEditDraft.childComponentIds.includes(child.id)}
                                              onChange={() => setComponentEditDraft((draft) => ({
                                                ...draft,
                                                childComponentIds: draft.childComponentIds.includes(child.id)
                                                  ? draft.childComponentIds.filter((id) => id !== child.id)
                                                  : [...draft.childComponentIds.filter((id) => id !== NO_CHILD_MATERIAL), child.id],
                                              }))}
                                            />
                                            {componentDetailsForRecord(child)}
                                          </label>
                                        ))}
                                      {stockMaterials
                                        .filter((item) => item.description.toLowerCase().includes(editChildFilter.trim().toLowerCase()))
                                        .map((item) => (
                                          <label
                                            key={item.childId}
                                            className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-2 py-1.5 hover:bg-blue-50"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={componentEditDraft.childComponentIds.includes(item.childId)}
                                              onChange={() => setComponentEditDraft((draft) => ({
                                                ...draft,
                                                childComponentIds: draft.childComponentIds.includes(item.childId)
                                                  ? draft.childComponentIds.filter((id) => id !== item.childId)
                                                  : [...draft.childComponentIds.filter((id) => id !== NO_CHILD_MATERIAL), item.childId],
                                              }))}
                                            />
                                            {item.description}
                                          </label>
                                        ))}
                                      {!articleBomRecords.some((child) => (
                                        child.id !== record.id &&
                                        componentDetailsForRecord(child).toLowerCase()
                                          .includes(editChildFilter.trim().toLowerCase())
                                      )) && (
                                        <p className="px-2 py-2 text-gray-500">No matching components.</p>
                                      )}
                                    </div>
                                  </div>,
                                  document.body
                                )}
                              </>
                            ) : (
                              <span className="whitespace-pre-wrap p-1">
                                {childComponentNames(record.childComponentIds || [], articleBomRecords, stockMaterials).join(', ') || record.childMaterial || '-'}
                              </span>
                            )}
                          </td>
                            </React.Fragment>
                          ) : (
                            <td key={field} className="border border-gray-300 p-2">
                              {isEditing ? (
                                <input
                                  type={field === 'qtyPerCs' ? 'number' : 'text'}
                                  min={field === 'qtyPerCs' ? '0' : undefined}
                                  step={field === 'qtyPerCs' ? 'any' : undefined}
                                  aria-label={`Edit ${field} for ${componentDetailsForRecord(record)}`}
                                  list={field === 'childMaterial' ? 'stock-material-options' : undefined}
                                  value={componentEditDraft[field]}
                                  onChange={(event) => {
                                    const match = field === 'childMaterial' ? stockMaterialFor(event.target.value) : null;
                                    setComponentEditDraft((draft) => ({
                                      ...draft,
                                      [field]: event.target.value,
                                      ...(match && !draft.childMaterialSapNo ? { childMaterialSapNo: match.materialNumber } : {}),
                                    }));
                                  }}
                                  className="w-full rounded border border-gray-300 p-2"
                                />
                              ) : (
                                <span className="p-1">{record[field] || '-'}</span>
                              )}
                            </td>
                          )
                          ))}
                          <td className="border border-gray-300 p-2 text-center">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveComponentEdit(record.id)}
                                  disabled={savingComponentEdit}
                                  className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {savingComponentEdit ? 'SAVING...' : 'UPDATE'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingComponentId(null);
                                    setComponentEditDraft(null);
                                    setEditChildDropdownOpen(false);
                                  }}
                                  disabled={savingComponentEdit}
                                  className="ml-2 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  CANCEL
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => editComponent(record)}
                                disabled={editingComponentId !== null}
                                className="rounded border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                              >
                                EDIT
                              </button>
                            )}
                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => deleteComponent(record)}
                                disabled={editingComponentId !== null}
                                className="ml-2 rounded border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                DELETE
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                      })}
                      {!articleBomRecords.length && (
                        <tr>
                          <td colSpan={9} className="border border-gray-300 p-4 text-center text-gray-500">
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
      <datalist id="stock-material-options">
        {stockMaterials.map((item) => (
          <option key={item.description} value={item.description} />
        ))}
      </datalist>
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
                  <th key={heading} className="border border-gray-300 p-3 align-top">
                    <div>{heading}</div>
                    {!['FUNCTIONS', 'BOM ENTRY'].includes(heading) && (
                      <input
                        value={columnFilters[heading] || ''}
                        onChange={(event) => setColumnFilters((current) => ({ ...current, [heading]: event.target.value }))}
                        placeholder="Filter"
                        aria-label={`Filter by ${heading}`}
                        className="mt-1 w-full min-w-20 rounded border border-gray-300 bg-white p-1 text-xs font-normal"
                      />
                    )}
                  </th>
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
