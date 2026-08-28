import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase_config';
import { onValue, push, ref, remove, set } from 'firebase/database';
import BulkExcelUploadComponent from '../BulkExcelUploadComponent';

const PACKING_FIELDS = [
  { key: 'gender', label: 'Gender', type: 'text', upper: true },
  { key: 'genderCode', label: 'Gender Code', type: 'text', upper: true },
  { key: 'sizeGrid', label: 'Size Grid', type: 'text', upper: true },
  { key: 'pairQty', label: 'Pair Qty', type: 'number', step: '1' },
  ...Array.from({ length: 23 }, (_, index) => ({
    key: `size${index + 1}`,
    label: `Size ${index + 1}`,
    type: 'number',
    step: '1',
  })),
];

const emptyPacking = () => Object.fromEntries(PACKING_FIELDS.map(({ key }) => [key, '']));

function normalizePacking(packing) {
  const normalized = { ...packing };

  PACKING_FIELDS.forEach(({ key, type, upper }) => {
    if (normalized[key] === undefined || normalized[key] === null) normalized[key] = '';
    if (upper && normalized[key] !== '') normalized[key] = String(normalized[key]).toUpperCase();
    if (type === 'number' && normalized[key] !== '') normalized[key] = Number(normalized[key]);
  });

  return normalized;
}

function withCompatibilityFields(packing) {
  const normalized = normalizePacking(packing);
  return {
    ...normalized,
    packingLabel: [normalized.gender, normalized.genderCode].filter(Boolean).join(' - '),
    packingComb: PACKING_FIELDS
      .filter(({ key }) => key.startsWith('size'))
      .map(({ key }) => normalized[key] || 0)
      .join(','),
  };
}

function PackingCombination() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [packingData, setPackingData] = useState([]);
  const [newPacking, setNewPacking] = useState(emptyPacking);
  const [editingId, setEditingId] = useState(null);
  const [editingPacking, setEditingPacking] = useState(emptyPacking);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSelectedLink('admin/packingcombination-entry');
    setOpenedTab('adminDesk');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => {
    const packingRef = ref(db, 'packingCombination/');
    return onValue(packingRef, (snapshot) => {
      const data = snapshot.val() || {};
      setPackingData(Object.entries(data).map(([id, packing]) => normalizePacking({ ...packing, id })));
    });
  }, []);

  const displayedPacking = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return packingData;

    return packingData.filter((packing) =>
      PACKING_FIELDS.some(({ key }) =>
        String(packing[key] ?? '').toLowerCase().includes(term)
      )
    );
  }, [packingData, search]);

  const updateField = (setter, current, field, value) => {
    setter({
      ...current,
      [field.key]: field.upper ? value.toUpperCase() : value,
    });
  };

  const renderFieldInput = (field, value, setter, current) => (
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

  const createPacking = async (event) => {
    event.preventDefault();
    if (!window.confirm('Please confirm entering the packing combination.')) return;

    const packingRef = push(ref(db, 'packingCombination/'));
    await set(packingRef, { ...withCompatibilityFields(newPacking), id: packingRef.key });
    setNewPacking(emptyPacking());
  };

  const importPacking = async (rows) => {
    await Promise.all(rows.map(async (row) => {
      const packingRef = push(ref(db, 'packingCombination/'));
      await set(packingRef, { ...withCompatibilityFields(row), id: packingRef.key });
    }));
  };

  const startEditing = (packing) => {
    setEditingId(packing.id);
    setEditingPacking(normalizePacking(packing));
  };

  const savePacking = async () => {
    await set(ref(db, `packingCombination/${editingId}`), {
      ...withCompatibilityFields(editingPacking),
      id: editingId,
    });
    setEditingId(null);
  };

  const deletePacking = async (packing) => {
    if (!window.confirm(`Please confirm deleting the packing combination for ${packing.gender || 'this record'}.`)) return;
    await remove(ref(db, `packingCombination/${packing.id}`));
  };

  const gridStyle = { gridTemplateColumns: `repeat(${PACKING_FIELDS.length + 2}, minmax(0, 1fr))` };

  return (
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex flex-col space-y-3 rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-lg">Packing Combination</div>
          <BulkExcelUploadComponent
            headings={PACKING_FIELDS.map(({ key }) => key)}
            dbPath="packingCombination/"
            templateName="Packing-combination-template"
            pushFunction={importPacking}
          />
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search packing combinations"
          className="w-full max-w-md rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="overflow-x-auto">
          <div style={{ minWidth: 3500 }}>
            <div className="grid gap-x-3 bg-gray-200 p-3 text-xs font-semibold" style={gridStyle}>
              <div>SI NO</div>
              {PACKING_FIELDS.map(({ key, label }) => <div key={key}>{label.toUpperCase()}</div>)}
              <div>ACTIONS</div>
            </div>

            <form className="grid gap-x-3 bg-blue-100 p-3" style={gridStyle} onSubmit={createPacking}>
              <div className="text-xs font-medium">NEW</div>
              {PACKING_FIELDS.map((field) => renderFieldInput(field, newPacking[field.key], setNewPacking, newPacking))}
              <button type="submit" className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800">
                Add
              </button>
            </form>

            {[...displayedPacking].reverse().map((packing, index) => (
              <div key={packing.id} className="grid gap-x-3 border-b border-gray-200 p-3 text-sm" style={gridStyle}>
                <div>{displayedPacking.length - index}</div>
                {editingId === packing.id
                  ? PACKING_FIELDS.map((field) => renderFieldInput(field, editingPacking[field.key], setEditingPacking, editingPacking))
                  : PACKING_FIELDS.map(({ key }) => <div key={key} className="break-words">{packing[key]}</div>)}
                <div className="flex gap-2">
                  {editingId === packing.id ? (
                    <>
                      <button type="button" onClick={savePacking} className="text-blue-600 hover:text-blue-900">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-800">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEditing(packing)} className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button type="button" onClick={() => deletePacking(packing)} className="text-red-600 hover:text-red-900">Delete</button>
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

export default PackingCombination;
