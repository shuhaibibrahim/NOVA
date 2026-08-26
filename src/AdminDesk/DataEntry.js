import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase_config';
import { onValue, push, ref, remove, set } from 'firebase/database';
import BulkExcelUploadComponent from '../BulkExcelUploadComponent';

const ARTICLE_FIELDS = [
  { key: 'article', label: 'Article', type: 'text', upper: true },
  { key: 'colour', label: 'Colour', type: 'text', upper: true },
  { key: 'brand', label: 'Brand', type: 'text', upper: true },
  { key: 'procurementType', label: 'Procurement Type', type: 'text', upper: true },
  { key: 'model', label: 'Model', type: 'text', upper: true },
  { key: 'gender', label: 'Gender', type: 'text', upper: true },
  { key: 'mrp', label: 'MRP', type: 'number', step: 'any' },
  { key: 'priceCategory', label: 'Price Category', type: 'text', upper: true },
  { key: 'm1Quantity', label: 'M1 Quantity', type: 'number', step: '1' },
  { key: 'm2Quantity', label: 'M2 Quantity', type: 'number', step: '1' },
];

const emptyArticle = () => Object.fromEntries(ARTICLE_FIELDS.map(({ key }) => [key, '']));

function normalizeArticle(article) {
  const normalized = { ...article };

  ARTICLE_FIELDS.forEach(({ key, upper, type }) => {
    if (normalized[key] === undefined || normalized[key] === null) normalized[key] = '';
    if (upper && normalized[key] !== '') normalized[key] = String(normalized[key]).toUpperCase();
    if (type === 'number' && normalized[key] !== '') normalized[key] = Number(normalized[key]);
  });

  return normalized;
}

function ArticleEntry() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [articleData, setArticleData] = useState([]);
  const [newArticle, setNewArticle] = useState(emptyArticle);
  const [editingId, setEditingId] = useState(null);
  const [editingArticle, setEditingArticle] = useState(emptyArticle);
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState(emptyArticle);

  useEffect(() => {
    setSelectedLink('admin/data-entry');
    setOpenedTab('adminDesk');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => {
    const articleRef = ref(db, 'articleData/');
    return onValue(articleRef, (snapshot) => {
      const data = snapshot.val() || {};
      setArticleData(Object.entries(data).map(([id, item]) => normalizeArticle({ ...item, id })));
    });
  }, []);

  const displayedArticles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return articleData.filter((article) => {
      const matchesSearch = !term || ARTICLE_FIELDS.some(({ key }) =>
        String(article[key] ?? '').toLowerCase().includes(term)
      );
      const matchesColumnFilters = ARTICLE_FIELDS.every(({ key }) =>
        !columnFilters[key] ||
        String(article[key] ?? '').toLowerCase().includes(columnFilters[key].toLowerCase())
      );

      return matchesSearch && matchesColumnFilters;
    });
  }, [articleData, search, columnFilters]);

  const updateField = (setter, current, field, value) => {
    setter({
      ...current,
      [field.key]: field.upper ? value.toUpperCase() : value,
    });
  };

  const createArticle = async (event) => {
    event.preventDefault();
    if (!window.confirm('Please confirm entering the article.')) return;

    const articleRef = push(ref(db, 'articleData/'));
    await set(articleRef, { ...normalizeArticle(newArticle), id: articleRef.key });
    setNewArticle(emptyArticle());
  };

  const importArticles = async (rows) => {
    await Promise.all(rows.map(async (row) => {
      const articleRef = push(ref(db, 'articleData/'));
      await set(articleRef, { ...normalizeArticle(row), id: articleRef.key });
    }));
  };

  const startEditing = (article) => {
    setEditingId(article.id);
    setEditingArticle(normalizeArticle(article));
  };

  const saveArticle = async () => {
    await set(ref(db, `articleData/${editingId}`), {
      ...normalizeArticle(editingArticle),
      id: editingId,
    });
    setEditingId(null);
  };

  const deleteArticle = async (article) => {
    if (!window.confirm(`Please confirm deleting ${article.article}.`)) return;
    await remove(ref(db, `articleData/${article.id}`));
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

  return (
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex flex-col space-y-3 rounded bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-lg">Article Entry</div>
          <BulkExcelUploadComponent
            headings={ARTICLE_FIELDS.map(({ key }) => key)}
            dbPath="articleData/"
            templateName="Article-template"
            pushFunction={importArticles}
          />
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search all article fields"
          className="w-full max-w-md rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="overflow-x-auto">
          <div className="min-w-[1500px]">
            <div className="grid grid-cols-12 gap-x-3 bg-gray-200 p-3 text-xs font-semibold">
              <div>SI NO</div>
              {ARTICLE_FIELDS.map((field) => (
                <label key={field.key} className="flex min-w-0 flex-col gap-1">
                  <span>{field.label.toUpperCase()}</span>
                  <input
                    type={field.type}
                    min={field.type === 'number' ? '0' : undefined}
                    step={field.step}
                    value={columnFilters[field.key]}
                    onChange={(event) => setColumnFilters({
                      ...columnFilters,
                      [field.key]: event.target.value,
                    })}
                    placeholder="Filter"
                    className="w-full rounded border border-gray-300 bg-white p-1 text-xs font-normal focus:border-blue-500 focus:outline-none"
                  />
                </label>
              ))}
              <div className="flex flex-col gap-1">
                <span>ACTIONS</span>
                <button
                  type="button"
                  onClick={() => setColumnFilters(emptyArticle())}
                  className="w-fit text-left text-xs font-normal text-blue-600 hover:text-blue-900"
                >
                  Clear filters
                </button>
              </div>
            </div>

            <form className="grid grid-cols-12 gap-x-3 bg-blue-100 p-3" onSubmit={createArticle}>
              <div className="text-xs font-medium">NEW</div>
              {ARTICLE_FIELDS.map((field) => renderFieldInput(field, newArticle[field.key], setNewArticle, newArticle))}
              <button type="submit" className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800">
                Add
              </button>
            </form>

            {[...displayedArticles].reverse().map((article, index) => (
              <div key={article.id} className="grid grid-cols-12 gap-x-3 border-b border-gray-200 p-3 text-sm">
                <div>{displayedArticles.length - index}</div>
                {editingId === article.id
                  ? ARTICLE_FIELDS.map((field) => renderFieldInput(field, editingArticle[field.key], setEditingArticle, editingArticle))
                  : ARTICLE_FIELDS.map(({ key }) => <div key={key} className="break-words">{article[key]}</div>)}
                <div className="flex gap-2">
                  {editingId === article.id ? (
                    <>
                      <button type="button" onClick={saveArticle} className="text-blue-600 hover:text-blue-900">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-800">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEditing(article)} className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button type="button" onClick={() => deleteArticle(article)} className="text-red-600 hover:text-red-900">Delete</button>
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

export default ArticleEntry;
