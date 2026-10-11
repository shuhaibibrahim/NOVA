import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase_config';
import { onValue, push, ref, remove, set } from 'firebase/database';
import BulkExcelUploadComponent from '../BulkExcelUploadComponent';
import { genderForMaterialNumber, requirementMatchesArticle, requirementMismatchReason, sizeForRequirement } from '../requirementMatching';

const REQUIREMENT_FIELDS = [
  { key: 'dateOfReq', label: 'Date of Req', type: 'date' },
  { key: 'reqType', label: 'Req Type', type: 'text', upper: true },
  { key: 'salesOrder', label: 'Sales Order', type: 'text', upper: true },
  { key: 'lineItem', label: 'Line Item', type: 'text', upper: true },
  { key: 'referenceNo', label: 'Reference No.', type: 'text', upper: true },
  { key: 'materialNo', label: 'Material No.', type: 'text', upper: true },
  { key: 'article', label: 'Article', type: 'text', upper: true },
  { key: 'colour', label: 'Colour', type: 'text', upper: true },
  { key: 'qty', label: 'Qty', type: 'number', step: '1' },
  { key: 'unit', label: 'Unit', type: 'text', upper: true },
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
  const [newRequirement, setNewRequirement] = useState(emptyRequirement);
  const [editingId, setEditingId] = useState(null);
  const [editingRequirement, setEditingRequirement] = useState(emptyRequirement);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [articles, setArticles] = useState([]);
  const [packingCombinations, setPackingCombinations] = useState([]);
  const [showUnmatchedOnly, setShowUnmatchedOnly] = useState(false);

  useEffect(() => {
    setSelectedLink('admin/requirement-entry');
    setOpenedTab('adminDesk');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => {
    const requirementRef = ref(db, 'requirementsData/');
    return onValue(requirementRef, (snapshot) => {
      const data = snapshot.val() || {};
      setRequirements(Object.entries(data).map(([id, requirement]) => normalizeRequirement({ ...requirement, id })));
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, 'articleData/'), (snapshot) => {
      const data = snapshot.val() || {};
      setArticles(Object.values(data));
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, 'packingCombination/'), (snapshot) => {
      const data = snapshot.val() || {};
      setPackingCombinations(Object.values(data));
    });
  }, []);

  const isUnmatched = (requirement) => !requirementMatchesArticle(requirement, articles);
  const isSizeMissingFromPacking = (requirement) => {
    if (String(requirement.reqType ?? '').trim().toUpperCase() === 'PAIR MTO') return false;
    const size = sizeForRequirement(requirement).trim().toUpperCase();
    return !size || !packingCombinations.some(
      (packing) => String(packing.sizeGrid ?? '').trim().toUpperCase() === size
    );
  };

  const sizeMismatchReason = (requirement) => {
    const size = sizeForRequirement(requirement);
    return size
      ? `Size ${size} is not listed in any Packing Combination size grid.`
      : 'Size could not be extracted from the Material No.';
  };

  const displayedRequirements = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requirements.filter((requirement) =>
      (!term || REQUIREMENT_FIELDS.some(({ key }) =>
        String(requirement[key] ?? '').toLowerCase().includes(term)
      )) &&
      (!showUnmatchedOnly || isUnmatched(requirement) || isSizeMissingFromPacking(requirement))
    );
  }, [requirements, search, showUnmatchedOnly, articles, packingCombinations]);

  const unmatchedCount = requirements.filter(isUnmatched).length;

  const updateField = (setter, current, field, value) => {
    const next = {
      ...current,
      [field.key]: field.upper ? value.toUpperCase() : value,
    };

    setter(next);
  };

  const renderFieldInput = (field, value, setter, current) => {
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

  const renderSizeCell = (requirement) => (
    <div key="derived-size" className="break-words">
      {sizeForRequirement(requirement)}
    </div>
  );

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

  const toggleSelect = (id) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedRequirements.length && displayedRequirements.length > 0) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(displayedRequirements.map((requirement) => requirement.id));
  };

  const deleteSelectedRequirements = async () => {
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Please confirm deleting ${selectedIds.length} selected requirement(s).`)) return;

    await Promise.all(
      selectedIds.map(async (id) => {
        const requirement = requirements.find((item) => item.id === id);
        if (!requirement) return;

        await Promise.all([
          remove(ref(db, `requirementsData/${id}`)),
          remove(ref(db, `requirementsHistoryData/${id}`)),
        ]);
      })
    );

    setSelectedIds([]);
  };

  const gridStyle = { gridTemplateColumns: `repeat(${REQUIREMENT_FIELDS.length + 4}, minmax(0, 1fr))` };

  return (
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex flex-col space-y-3 rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-lg">Requirement Entry</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-red-700">Unmatched: {unmatchedCount}</span>
            <button
              type="button"
              onClick={() => setShowUnmatchedOnly((current) => !current)}
              className={`rounded border px-2 py-1 ${showUnmatchedOnly ? 'border-red-400 bg-red-100 text-red-800' : 'border-gray-300 bg-white text-gray-700'}`}
            >
              {showUnmatchedOnly ? 'Show All' : 'Show Highlighted'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={deleteSelectedRequirements}
              disabled={selectedIds.length === 0}
              className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete Selected
            </button>
            <BulkExcelUploadComponent
              headings={REQUIREMENT_FIELDS.map(({ key }) => key)}
              dbPath="requirementsData/"
              templateName="Requirement-template"
              pushFunction={importRequirements}
            />
          </div>
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
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={displayedRequirements.length > 0 && selectedIds.length === displayedRequirements.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all requirements"
                  className="h-4 w-4"
                />
              </div>
              <div>GENDER</div>
              {REQUIREMENT_FIELDS.map(({ key, label }) => (
                <React.Fragment key={key}>
                  {key === 'qty' && <div>SIZE</div>}
                  <div>{label.toUpperCase()}</div>
                </React.Fragment>
              ))}
              <div>ACTIONS</div>
            </div>

            <form className="grid gap-x-3 bg-blue-100 p-3" style={gridStyle} onSubmit={createRequirement}>
              <div className="flex items-center justify-center">
                <span className="text-xs font-medium">NEW</span>
              </div>
              <div className="break-words">{genderForMaterialNumber(newRequirement.materialNo)}</div>
              {REQUIREMENT_FIELDS.map((field) => (
                <React.Fragment key={field.key}>
                  {field.key === 'qty' && renderSizeCell(newRequirement)}
                  {renderFieldInput(field, newRequirement[field.key], setNewRequirement, newRequirement)}
                </React.Fragment>
              ))}
              <button type="submit" className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800">
                Add
              </button>
            </form>

            {[...displayedRequirements].reverse().map((requirement) => {
              const unmatched = isUnmatched(requirement);
              const sizeMissing = isSizeMissingFromPacking(requirement);
              const mismatchTitle = [
                unmatched ? requirementMismatchReason(requirement, articles) : '',
                sizeMissing ? sizeMismatchReason(requirement) : '',
              ].filter(Boolean).join(' ');

              return (
              <div
                key={requirement.id}
                title={mismatchTitle || undefined}
                aria-label={mismatchTitle ? `Requirement validation: ${mismatchTitle}` : undefined}
                className={`grid gap-x-3 border-b border-gray-200 p-3 text-sm ${unmatched ? 'cursor-help bg-red-100' : sizeMissing ? 'cursor-help bg-yellow-100' : ''}`}
                style={gridStyle}
              >
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(requirement.id)}
                    onChange={() => toggleSelect(requirement.id)}
                    aria-label={`Select requirement ${requirement.article || requirement.id}`}
                    className="h-4 w-4"
                  />
                </div>
                <div className="break-words">
                  {genderForMaterialNumber((editingId === requirement.id ? editingRequirement : requirement).materialNo)}
                </div>
                {editingId === requirement.id
                  ? REQUIREMENT_FIELDS.map((field) => (
                    <React.Fragment key={field.key}>
                      {field.key === 'qty' && renderSizeCell(editingRequirement)}
                      {renderFieldInput(field, editingRequirement[field.key], setEditingRequirement, editingRequirement)}
                    </React.Fragment>
                  ))
                  : REQUIREMENT_FIELDS.map(({ key }) => (
                    <React.Fragment key={key}>
                      {key === 'qty' && renderSizeCell(requirement)}
                      <div className="break-words">{requirement[key]}</div>
                    </React.Fragment>
                  ))}
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequirementEntry;
