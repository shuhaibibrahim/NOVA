import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase_config';
import { onValue, push, ref, remove, set } from 'firebase/database';
import BulkExcelUploadComponent from '../BulkExcelUploadComponent';

const REQUIREMENT_FIELDS = [
  { key: 'dateOfReq', label: 'Date of Req', type: 'date' },
  { key: 'reqType', label: 'Req Type', type: 'text', upper: true },
  { key: 'salesOrder', label: 'Sales Order', type: 'text', upper: true },
  { key: 'lineItem', label: 'Line Item', type: 'text', upper: true },
  { key: 'referenceNo', label: 'Reference No.', type: 'text', upper: true },
  { key: 'materialNo', label: 'Material No.', type: 'text', upper: true },
  { key: 'article', label: 'Article', type: 'article' },
  { key: 'colour', label: 'Colour', type: 'colour' },
  { key: 'qty', label: 'Qty', type: 'number', step: '1' },
  { key: 'unit', label: 'Unit', type: 'text', upper: true },
  { key: 'completionDate', label: 'Completion Date', type: 'date' },
];

const emptyRequirement = () => Object.fromEntries(REQUIREMENT_FIELDS.map(({ key }) => [key, '']));

function normalizeRequirement(requirement) {
  const normalized = { ...requirement };

  REQUIREMENT_FIELDS.forEach(({ key, type, upper }) => {
    if (normalized[key] === undefined || normalized[key] === null) normalized[key] = '';
    if (upper && normalized[key] !== '') normalized[key] = String(normalized[key]).toUpperCase();
    if (type === 'number' && normalized[key] !== '') normalized[key] = Number(normalized[key]);
  });

  return normalized;
}

function RequirementEntry() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [requirements, setRequirements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [newRequirement, setNewRequirement] = useState(emptyRequirement);
  const [editingId, setEditingId] = useState(null);
  const [editingRequirement, setEditingRequirement] = useState(emptyRequirement);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSelectedLink('admin/requirement-entry');
    setOpenedTab('adminDesk');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => {
    const articleRef = ref(db, 'articleData/');
    return onValue(articleRef, (snapshot) => {
      const data = snapshot.val() || {};
      setArticles(Object.entries(data).map(([id, article]) => ({ ...article, id })));
    });
  }, []);

  useEffect(() => {
    const requirementRef = ref(db, 'requirementsData/');
    return onValue(requirementRef, (snapshot) => {
      const data = snapshot.val() || {};
      setRequirements(Object.entries(data).map(([id, requirement]) => normalizeRequirement({ ...requirement, id })));
    });
  }, []);

  const articleOptions = useMemo(
    () => [...new Set(articles.map((article) => article.article).filter(Boolean))].sort(),
    [articles]
  );

  const coloursForArticle = (articleName) =>
    [...new Set(
      articles
        .filter((article) => article.article === articleName)
        .map((article) => article.colour)
        .filter(Boolean)
    )].sort();

  const displayedRequirements = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requirements;

    return requirements.filter((requirement) =>
      REQUIREMENT_FIELDS.some(({ key }) =>
        String(requirement[key] ?? '').toLowerCase().includes(term)
      )
    );
  }, [requirements, search]);

  const updateField = (setter, current, field, value) => {
    const next = {
      ...current,
      [field.key]: field.upper ? value.toUpperCase() : value,
    };

    if (field.key === 'article') next.colour = '';
    setter(next);
  };

  const renderFieldInput = (field, value, setter, current) => {
    if (field.type === 'article') {
      return (
        <select
          key={field.key}
          required
          value={value}
          onChange={(event) => updateField(setter, current, field, event.target.value)}
          className="w-full min-w-0 rounded border border-blue-200 bg-white p-1 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">-- Select --</option>
          {articleOptions.map((article) => <option key={article} value={article}>{article}</option>)}
        </select>
      );
    }

    if (field.type === 'colour') {
      return (
        <select
          key={field.key}
          required
          disabled={!current.article}
          value={value}
          onChange={(event) => updateField(setter, current, field, event.target.value)}
          className="w-full min-w-0 rounded border border-blue-200 bg-white p-1 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
        >
          <option value="">-- Select --</option>
          {coloursForArticle(current.article).map((colour) => <option key={colour} value={colour}>{colour}</option>)}
        </select>
      );
    }

    return (
      <input
        key={field.key}
        required
        type={field.type}
        min={field.type === 'number' ? '0' : undefined}
        step={field.step}
        value={value}
        onChange={(event) => updateField(setter, current, field, event.target.value)}
        className="w-full min-w-0 rounded border border-blue-200 p-1 text-sm focus:border-blue-500 focus:outline-none"
      />
    );
  };

  const createRequirement = async (event) => {
    event.preventDefault();
    if (!window.confirm('Please confirm entering the requirement.')) return;

    const requirementRef = push(ref(db, 'requirementsData/'));
    const record = { ...normalizeRequirement(newRequirement), id: requirementRef.key };
    await Promise.all([
      set(requirementRef, record),
      set(ref(db, `requirementsHistoryData/${requirementRef.key}`), record),
    ]);
    setNewRequirement(emptyRequirement());
  };

  const importRequirements = async (rows) => {
    await Promise.all(rows.map(async (row) => {
      const requirementRef = push(ref(db, 'requirementsData/'));
      const record = { ...normalizeRequirement(row), id: requirementRef.key };
      await Promise.all([
        set(requirementRef, record),
        set(ref(db, `requirementsHistoryData/${requirementRef.key}`), record),
      ]);
    }));
  };

  const startEditing = (requirement) => {
    setEditingId(requirement.id);
    setEditingRequirement(normalizeRequirement(requirement));
  };

  const saveRequirement = async () => {
    const record = { ...normalizeRequirement(editingRequirement), id: editingId };
    await Promise.all([
      set(ref(db, `requirementsData/${editingId}`), record),
      set(ref(db, `requirementsHistoryData/${editingId}`), record),
    ]);
    setEditingId(null);
  };

  const deleteRequirement = async (requirement) => {
    if (!window.confirm(`Please confirm deleting requirement for ${requirement.article}.`)) return;
    await Promise.all([
      remove(ref(db, `requirementsData/${requirement.id}`)),
      remove(ref(db, `requirementsHistoryData/${requirement.id}`)),
    ]);
  };

  const gridStyle = { gridTemplateColumns: `repeat(${REQUIREMENT_FIELDS.length + 2}, minmax(0, 1fr))` };

  return (
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex flex-col space-y-3 rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-lg">Requirement Entry</div>
          <BulkExcelUploadComponent
            headings={REQUIREMENT_FIELDS.map(({ key }) => key)}
            dbPath="requirementsData/"
            templateName="Requirement-template"
            pushFunction={importRequirements}
          />
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search requirements"
          className="w-full max-w-md rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="overflow-x-auto">
          <div className="min-w-[1700px]">
            <div className="grid gap-x-3 bg-gray-200 p-3 text-xs font-semibold" style={gridStyle}>
              <div>SI NO</div>
              {REQUIREMENT_FIELDS.map(({ key, label }) => <div key={key}>{label.toUpperCase()}</div>)}
              <div>ACTIONS</div>
            </div>

            <form className="grid gap-x-3 bg-blue-100 p-3" style={gridStyle} onSubmit={createRequirement}>
              <div className="text-xs font-medium">NEW</div>
              {REQUIREMENT_FIELDS.map((field) => renderFieldInput(field, newRequirement[field.key], setNewRequirement, newRequirement))}
              <button type="submit" className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800">
                Add
              </button>
            </form>

            {[...displayedRequirements].reverse().map((requirement, index) => (
              <div key={requirement.id} className="grid gap-x-3 border-b border-gray-200 p-3 text-sm" style={gridStyle}>
                <div>{displayedRequirements.length - index}</div>
                {editingId === requirement.id
                  ? REQUIREMENT_FIELDS.map((field) => renderFieldInput(field, editingRequirement[field.key], setEditingRequirement, editingRequirement))
                  : REQUIREMENT_FIELDS.map(({ key }) => <div key={key} className="break-words">{requirement[key]}</div>)}
                <div className="flex gap-2">
                  {editingId === requirement.id ? (
                    <>
                      <button type="button" onClick={saveRequirement} className="text-blue-600 hover:text-blue-900">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-800">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEditing(requirement)} className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button type="button" onClick={() => deleteRequirement(requirement)} className="text-red-600 hover:text-red-900">Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequirementEntry;
