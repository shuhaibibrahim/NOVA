import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, push, ref, set } from 'firebase/database';
import { db } from '../firebase_config';
import { genderForMaterialNumber, normalizeMatchValue, requirementMatchesArticle } from '../requirementMatching';

const REQUIREMENT_COLUMNS = [
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
  const [plans, setPlans] = useState([]);
  const [planCode, setPlanCode] = useState('');
  const [planCodeMode, setPlanCodeMode] = useState('new');
  const [previousPlanCode, setPreviousPlanCode] = useState('');
  const [planningDate, setPlanningDate] = useState('');
  const [plannedQuantities, setPlannedQuantities] = useState({});
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

  const visibleRequirements = useMemo(
    () => requirements.filter((requirement) => requirementMatchesArticle(requirement, articles)),
    [requirements, articles]
  );

  const updatePlannedQty = (requirementId, value) => {
    setPlannedQuantities((quantities) => ({ ...quantities, [requirementId]: value }));
  };

  const submitPlan = async () => {
    const selectedPlanCode = planCodeMode === 'existing' ? previousPlanCode : (nextPlanCode || planCode);
    const normalizedPlanCode = selectedPlanCode.trim().toUpperCase();
    const selectedRequirements = visibleRequirements
      .map((requirement) => ({
        requirement,
        plannedQty: Number(plannedQuantities[requirement.id] || 0),
      }))
      .filter(({ plannedQty }) => Number.isFinite(plannedQty) && plannedQty > 0);

    if (!normalizedPlanCode || !planningDate) {
      window.alert('Enter both Plan Code and Date of Planning.');
      return;
    }

    if (!selectedRequirements.length) {
      window.alert('Enter a quantity to be planned for at least one requirement.');
      return;
    }

    if (!window.confirm(`Submit ${selectedRequirements.length} Clicking Plan item(s)?`)) return;

    await Promise.all(selectedRequirements.map(({ requirement, plannedQty }) => {
      const planRef = push(ref(db, 'clickingPlans/'));
      return set(planRef, {
        ...requirement,
        model: modelForRequirement(requirement),
        gender: genderForRequirement(requirement),
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

      <div className="max-h-[55vh] min-w-0 overflow-auto border border-gray-200">
        <table className="min-w-[2050px] w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-200 text-xs font-semibold shadow-sm">
            <tr>
              <th className="p-3 text-left">SI NO</th>
              {REQUIREMENT_COLUMNS.map(([, label]) => <th key={label} className="p-3 text-left">{label.toUpperCase()}</th>)}
              <th className="p-3 text-left">QTY TO BE PLANNED</th>
            </tr>
          </thead>
          <tbody>
            {visibleRequirements.map((requirement, index) => (
              <tr key={requirement.id} className="border-b border-gray-200 align-top">
                <td className="p-3">{index + 1}</td>
                {REQUIREMENT_COLUMNS.map(([key]) => (
                  <td key={key} className="p-3 break-words">
                    {key === 'model'
                      ? modelForRequirement(requirement)
                      : key === 'gender'
                        ? genderForRequirement(requirement)
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
                    className="no-number-spinner w-full min-w-0 rounded border border-blue-200 p-1 focus:border-blue-500 focus:outline-none"
                  />
                </td>
              </tr>
            ))}
            {!visibleRequirements.length && (
              <tr>
                <td colSpan={15} className="p-4 text-center text-gray-500">No requirements have been entered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={submitPlan} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-800">
          Submit Plan
        </button>
      </div>
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
              {REQUIREMENT_COLUMNS.map(([, label]) => <th key={label} className="p-3 text-left">{label.toUpperCase()}</th>)}
              <th className="p-3 text-left">PLANNED QTY</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map((plan, index) => (
              <tr key={plan.id} className="border-b border-gray-200 align-top">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{plan.planCode}</td>
                <td className="p-3">{plan.planningDate}</td>
                {REQUIREMENT_COLUMNS.map(([key]) => (
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
