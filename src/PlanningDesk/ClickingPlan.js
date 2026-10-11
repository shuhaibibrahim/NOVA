import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, push, ref, set } from 'firebase/database';
import { db } from '../firebase_config';
import { genderForMaterialNumber, normalizeMatchValue, requirementMatchesArticle, sizeForRequirement } from '../requirementMatching';

const REQUIREMENT_COLUMNS = [
  ['model', 'Model'],
  ['dateOfReq', 'Date of Req'],
  ['reqType', 'Req Type'],
  ['salesOrder', 'Sales Order'],
  ['lineItem', 'Line Item'],
  ['referenceNo', 'Reference No.'],
  ['gender', 'Gender'],
  ['article', 'Article'],
  ['colour', 'Colour'],
  ['size', 'Size'],
  ['qty', 'Qty'],
  ['unit', 'Unit'],
];

const PLAN_COLUMNS = [
  ['model', 'Model'],
  ['dateOfReq', 'Date of Req'],
  ['reqType', 'Req Type'],
  ['salesOrder', 'Sales Order'],
  ['lineItem', 'Line Item'],
  ['referenceNo', 'Reference No.'],
  ['materialNo', 'Material No.'],
  ['gender', 'Gender'],
  ['article', 'Article'],
  ['colour', 'Colour'],
  ['qty', 'Qty'],
  ['unit', 'Unit'],
  ['completionDate', 'Completion Date'],
];

const incrementPlanCode = (planCode) => {
  const match = String(planCode || '').match(/^(.*?)(\d+)$/);
  if (!match) return '';

  const nextNumber = String(Number(match[2]) + 1).padStart(match[2].length, '0');
  return `${match[1]}${nextNumber}`;
};

function ClickingPlan() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [activeSheet, setActiveSheet] = useState('plan');
  const [requirements, setRequirements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [packingCombinations, setPackingCombinations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planCode, setPlanCode] = useState('');
  const [planCodeMode, setPlanCodeMode] = useState('new');
  const [previousPlanCode, setPreviousPlanCode] = useState('');
  const [planningDate, setPlanningDate] = useState('');
  const [plannedQuantities, setPlannedQuantities] = useState({});
  const [requirementFilters, setRequirementFilters] = useState({});
  const [cart, setCart] = useState([]);
  const [showCartReview, setShowCartReview] = useState(false);
  const [planCodeFilter, setPlanCodeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    setSelectedLink('planning-desk/clicking-plan');
    setOpenedTab('planningDesk');
  }, [setSelectedLink, setOpenedTab]);

  useEffect(() => {
    const requirementsRef = ref(db, 'requirementsData/');
    return onValue(requirementsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setRequirements(Object.entries(data).map(([id, requirement]) => ({ ...requirement, id })));
    });
  }, []);

  useEffect(() => {
    const articlesRef = ref(db, 'articleData/');
    return onValue(articlesRef, (snapshot) => {
      const data = snapshot.val() || {};
      setArticles(Object.entries(data).map(([id, article]) => ({ ...article, id })));
    });
  }, []);

  useEffect(() => {
    const packingRef = ref(db, 'packingCombination/');
    return onValue(packingRef, (snapshot) => {
      const data = snapshot.val() || {};
      setPackingCombinations(Object.values(data));
    });
  }, []);

  useEffect(() => {
    const plansRef = ref(db, 'clickingPlans/');
    return onValue(plansRef, (snapshot) => {
      const data = snapshot.val() || {};
      setPlans(Object.entries(data).map(([id, plan]) => ({ ...plan, id })));
    });
  }, []);

  const filteredPlans = useMemo(() => {
    const code = planCodeFilter.trim().toLowerCase();

    return plans
      .filter((plan) =>
        (!code || String(plan.planCode || '').toLowerCase().includes(code)) &&
        (!dateFilter || plan.planningDate === dateFilter)
      )
      .sort((first, second) => {
        const firstTime = first.submittedAt || 0;
        const secondTime = second.submittedAt || 0;
        return secondTime - firstTime;
      });
  }, [plans, planCodeFilter, dateFilter]);

  const existingPlanCodes = useMemo(() => {
    const latestByCode = new Map();
    plans.forEach((plan) => {
      if (!plan.planCode) return;
      const existing = latestByCode.get(plan.planCode);
      if (!existing || (plan.submittedAt || 0) > (existing.submittedAt || 0)) {
        latestByCode.set(plan.planCode, plan);
      }
    });

    return [...latestByCode.entries()]
      .sort(([, first], [, second]) => (second.submittedAt || 0) - (first.submittedAt || 0))
      .map(([code]) => code);
  }, [plans]);

  const nextPlanCode = incrementPlanCode(existingPlanCodes[0]);

  const modelForRequirement = (requirement) => {
    const articleName = normalizeMatchValue(requirement.article);
    const colourName = normalizeMatchValue(requirement.colour ?? requirement.color);
    const genderName = normalizeMatchValue(genderForRequirement(requirement));

    const matchingArticle = articles.find((article) =>
      normalizeMatchValue(article.article) === articleName &&
      normalizeMatchValue(article.colour ?? article.color) === colourName &&
      normalizeMatchValue(article.gender) === genderName
    );

    return matchingArticle?.model || '';
  };

  const genderForRequirement = (requirement) => {
    return genderForMaterialNumber(requirement.materialNo);
  };

  const cartTotals = useMemo(() => cart.reduce((totals, { requirement, plannedQty }) => {
    const model = normalizeMatchValue(modelForRequirement(requirement));
    if (model !== 'SINGLE DENSITY' && model !== 'PU CORK') return totals;

    const sizeGrid = normalizeMatchValue(sizeForRequirement(requirement));
    const packing = packingCombinations.find(
      (combination) => normalizeMatchValue(combination.sizeGrid) === sizeGrid
    );
    const pairQty = Number(packing?.pairQty || 0);
    const pairTotal = pairQty * plannedQty;
    const isSingleDensity = model === 'SINGLE DENSITY';

    if (isSingleDensity) {
      totals.singleDensityPairs += pairTotal;
      totals.singleDensityCases += plannedQty;
    } else {
      totals.puCorkPairs += pairTotal;
      totals.puCorkCases += plannedQty;
    }

    return totals;
  }, {
    singleDensityPairs: 0,
    singleDensityCases: 0,
    puCorkPairs: 0,
    puCorkCases: 0,
  }), [cart, packingCombinations, articles]);

  const visibleRequirements = useMemo(
    () => requirements.filter((requirement) =>
      requirementMatchesArticle(requirement, articles) &&
      REQUIREMENT_COLUMNS.every(([key]) => {
        const filter = String(requirementFilters[key] || '').trim().toLowerCase();
        if (!filter) return true;

        const value = key === 'model'
          ? modelForRequirement(requirement)
          : key === 'gender'
            ? genderForRequirement(requirement)
            : key === 'size'
              ? sizeForRequirement(requirement)
              : requirement[key];

        return String(value ?? '').toLowerCase().includes(filter);
      })
    ),
    [requirements, articles, requirementFilters]
  );

  const updatePlannedQty = (requirementId, value) => {
    setPlannedQuantities((quantities) => ({ ...quantities, [requirementId]: value }));
  };

  const addToCart = (requirement) => {
    const plannedQty = Number(plannedQuantities[requirement.id] || 0);
    const requiredQty = Number(requirement.qty || 0);
    if (!Number.isFinite(plannedQty) || plannedQty <= 0) {
      window.alert('Enter a quantity greater than zero before adding this item to the cart.');
      return;
    }
    if (plannedQty > requiredQty) {
      window.alert(`Planned quantity cannot exceed the requirement quantity (${requiredQty}).`);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.requirement.id === requirement.id);
      if (existing) {
        return current.map((item) => item.requirement.id === requirement.id ? { ...item, plannedQty } : item);
      }
      return [...current, { requirement, plannedQty }];
    });
  };

  const reviewPlan = () => {
    const selectedPlanCode = planCodeMode === 'existing' ? previousPlanCode : (nextPlanCode || planCode);
    const normalizedPlanCode = selectedPlanCode.trim().toUpperCase();

    if (!normalizedPlanCode || !planningDate) {
      window.alert('Enter both Plan Code and Date of Planning.');
      return;
    }

    if (!cart.length) {
      window.alert('Add at least one valid requirement to the cart before reviewing.');
      return;
    }

    setShowCartReview(true);
  };

  const submitPlan = async () => {
    const selectedPlanCode = planCodeMode === 'existing' ? previousPlanCode : (nextPlanCode || planCode);
    const normalizedPlanCode = selectedPlanCode.trim().toUpperCase();
    if (!cart.length) return;

    if (!window.confirm(`Submit ${cart.length} Clicking Plan item(s) under ${normalizedPlanCode}?`)) return;

    await Promise.all(cart.map(({ requirement, plannedQty }) => {
      const planRef = push(ref(db, 'clickingPlans/'));
      return set(planRef, {
        ...requirement,
        model: modelForRequirement(requirement),
        gender: genderForRequirement(requirement),
        size: sizeForRequirement(requirement),
        id: planRef.key,
        requirementId: requirement.id,
        planCode: normalizedPlanCode,
        planningDate,
        plannedQty,
        submittedAt: Date.now(),
      });
    }));

    setPlanCode('');
    setPreviousPlanCode('');
    setPlanningDate('');
    setPlannedQuantities({});
    setCart([]);
    setShowCartReview(false);
    setActiveSheet('plan');
  };

  const renderRequirementsSheet = () => (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Plan Code Option
          <select
            value={planCodeMode}
            onChange={(event) => setPlanCodeMode(event.target.value)}
            className="rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="new">Create New Plan</option>
            <option value="existing" disabled={existingPlanCodes.length === 0}>Add to Previous Plan</option>
          </select>
        </label>
        {planCodeMode === 'existing' ? (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Select Previous Plan Code
            <select
              value={previousPlanCode}
              onChange={(event) => setPreviousPlanCode(event.target.value)}
              required
              className="rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select plan code</option>
              {existingPlanCodes.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Plan Code
            <input
              value={nextPlanCode || planCode}
              onChange={(event) => setPlanCode(event.target.value.toUpperCase())}
              placeholder="Enter initial plan code"
              readOnly={Boolean(nextPlanCode)}
              required
              className={`rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none ${nextPlanCode ? 'bg-gray-100' : ''}`}
            />
            {nextPlanCode && <span className="text-xs font-normal text-gray-500">Generated from the latest plan code.</span>}
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Date of Planning
          <input
            type="date"
            value={planningDate}
            onChange={(event) => setPlanningDate(event.target.value)}
            className="rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      {!showCartReview ? (
      <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
            <span className="font-semibold">
              Single Density: {cartTotals.singleDensityPairs} Pairs, {cartTotals.singleDensityCases} Cs
            </span>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
            <span className="font-semibold">
              Pu Cork: {cartTotals.puCorkPairs} Pairs, {cartTotals.puCorkCases} Cs
            </span>
          </div>
        </div>
        <button type="button" onClick={reviewPlan} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-800">
          Review Cart ({cart.length})
        </button>
      </div>
      <div className="max-h-[55vh] min-w-0 overflow-auto border border-gray-200">
        <table className="min-w-[2050px] w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-200 text-xs font-semibold shadow-sm">
            <tr>
              <th className="p-3 text-left">SI NO</th>
              {REQUIREMENT_COLUMNS.map(([key, label]) => (
                <th key={label} className="p-3 text-left align-top">
                  <div>{label.toUpperCase()}</div>
                  <input
                    type="text"
                    value={requirementFilters[key] || ''}
                    onChange={(event) => setRequirementFilters((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))}
                    placeholder="Filter"
                    aria-label={`Filter requirements by ${label}`}
                    className="mt-1 w-full min-w-20 rounded border border-gray-300 bg-white p-1 text-xs font-normal focus:border-blue-500 focus:outline-none"
                  />
                </th>
              ))}
              <th className="p-3 text-left">QTY TO BE PLANNED</th>
              <th className="p-3 text-left">CART</th>
            </tr>
          </thead>
          <tbody>
            {visibleRequirements.map((requirement, index) => (
              (() => {
                const exceedsRequirement = Number(plannedQuantities[requirement.id] || 0) > Number(requirement.qty || 0);
                return (
              <tr key={requirement.id} className="border-b border-gray-200 align-top">
                <td className="p-3">{index + 1}</td>
                {REQUIREMENT_COLUMNS.map(([key]) => (
                  <td key={key} className="p-3 break-words">
                    {key === 'model'
                      ? modelForRequirement(requirement)
                      : key === 'gender'
                        ? genderForRequirement(requirement)
                        : key === 'size'
                          ? sizeForRequirement(requirement)
                        : requirement[key] ?? ''}
                  </td>
                ))}
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={plannedQuantities[requirement.id] || ''}
                    onChange={(event) => updatePlannedQty(requirement.id, event.target.value)}
                    className={`no-number-spinner w-full min-w-0 rounded border p-1 focus:outline-none ${exceedsRequirement ? 'border-red-600 focus:border-red-600' : 'border-blue-200 focus:border-blue-500'}`}
                  />
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => addToCart(requirement)}
                    disabled={Number(plannedQuantities[requirement.id] || 0) > Number(requirement.qty || 0)}
                    className="whitespace-nowrap rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cart.some((item) => item.requirement.id === requirement.id) ? 'Update Cart' : 'Add to Cart'}
                  </button>
                </td>
              </tr>
                );
              })()
            ))}
            {!visibleRequirements.length && (
              <tr>
                <td colSpan={REQUIREMENT_COLUMNS.length + 3} className="p-4 text-center text-gray-500">No requirements have been entered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      ) : (
        <div className="space-y-4 rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Review Cart ({cart.length} items)</h2>
            <button type="button" onClick={() => setShowCartReview(false)} className="text-blue-600 hover:underline">Back to Requirements</button>
          </div>
          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <div className="font-semibold">Single Density</div>
                <div className="mt-2 text-sm">'U' Pairs: {cartTotals.singleDensityPairs}</div>
                <div className="text-sm">'V' CS: {cartTotals.singleDensityCases}</div>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <div className="font-semibold">Pu Cork</div>
                <div className="mt-2 text-sm">'X' Pairs: {cartTotals.puCorkPairs}</div>
                <div className="text-sm">'Y' CS: {cartTotals.puCorkCases}</div>
              </div>
            </div>
            <div className="max-h-[55vh] min-w-0 overflow-auto border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-200 text-left text-xs font-semibold">
                  <tr>
                    <th className="p-3">Article</th>
                    <th className="p-3">Colour</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Requirement Qty</th>
                    <th className="p-3">Planned Qty</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(({ requirement, plannedQty }) => (
                    <tr key={requirement.id} className="border-b">
                      <td className="p-3">{requirement.article}</td>
                      <td className="p-3">{requirement.colour}</td>
                      <td className="p-3">{sizeForRequirement(requirement)}</td>
                      <td className="p-3">{requirement.qty}</td>
                      <td className="p-3">{plannedQty}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => setCart((current) => current.filter((item) => item.requirement.id !== requirement.id))} className="text-red-600 hover:underline">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={submitPlan} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-800">
              Submit Plan
            </button>
          </div>
        </div>
      )}

    </>
  );

  const renderPlanSheet = () => (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Filter by Plan Code
          <input
            value={planCodeFilter}
            onChange={(event) => setPlanCodeFilter(event.target.value)}
            placeholder="Plan code"
            className="rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Filter by Date
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="max-h-[55vh] min-w-0 overflow-auto border border-gray-200">
        <table className="min-w-[2100px] w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-200 text-xs font-semibold shadow-sm">
            <tr>
              <th className="p-3 text-left">SI NO</th>
              <th className="p-3 text-left">PLAN CODE</th>
              <th className="p-3 text-left">DATE OF PLANNING</th>
              {PLAN_COLUMNS.map(([, label]) => <th key={label} className="p-3 text-left">{label.toUpperCase()}</th>)}
              <th className="p-3 text-left">PLANNED QTY</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map((plan, index) => (
              <tr key={plan.id} className="border-b border-gray-200 align-top">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{plan.planCode}</td>
                <td className="p-3">{plan.planningDate}</td>
                {PLAN_COLUMNS.map(([key]) => (
                  <td key={key} className="p-3 break-words">
                    {key === 'gender' ? plan.gender || genderForRequirement(plan) : plan[key] ?? ''}
                  </td>
                ))}
                <td className="p-3">{plan.plannedQty}</td>
              </tr>
            ))}
            {!filteredPlans.length && (
              <tr>
                <td colSpan={17} className="p-4 text-center text-gray-500">No submitted Clicking Plans match the filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className="h-full min-w-0 overflow-auto bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex min-w-0 flex-col gap-4 rounded bg-white p-4">
        <h1 className="text-lg font-semibold">Clicking Plan</h1>

        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveSheet('plan')}
            className={"px-4 py-2 text-sm font-semibold " + (activeSheet === 'plan' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600')}
          >
            PLAN
          </button>
          <button
            type="button"
            onClick={() => setActiveSheet('requirements')}
            className={"px-4 py-2 text-sm font-semibold " + (activeSheet === 'requirements' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600')}
          >
            REQUIREMENTS
          </button>
        </div>

        {activeSheet === 'plan' ? renderPlanSheet() : renderRequirementsSheet()}
      </div>
    </div>
  );
}

export default ClickingPlan;
