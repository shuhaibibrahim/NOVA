import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onValue, push, ref, set } from 'firebase/database';
import { db } from '../firebase_config';

const REQUIREMENT_COLUMNS = [
  ['dateOfReq', 'Date of Req'],
  ['reqType', 'Req Type'],
  ['salesOrder', 'Sales Order'],
  ['lineItem', 'Line Item'],
  ['referenceNo', 'Reference No.'],
  ['materialNo', 'Material No.'],
  ['article', 'Article'],
  ['colour', 'Colour'],
  ['qty', 'Qty'],
  ['unit', 'Unit'],
  ['completionDate', 'Completion Date'],
];

function ClickingPlan() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [activeSheet, setActiveSheet] = useState('plan');
  const [requirements, setRequirements] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planCode, setPlanCode] = useState('');
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

  const updatePlannedQty = (requirementId, value) => {
    setPlannedQuantities((quantities) => ({ ...quantities, [requirementId]: value }));
  };

  const submitPlan = async () => {
    const normalizedPlanCode = planCode.trim().toUpperCase();
    const selectedRequirements = requirements
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
        id: planRef.key,
        requirementId: requirement.id,
        planCode: normalizedPlanCode,
        planningDate,
        plannedQty,
        submittedAt: Date.now(),
      });
    }));

    setPlanCode('');
    setPlanningDate('');
    setPlannedQuantities({});
    setActiveSheet('plan');
  };

  const renderRequirementsSheet = () => (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Plan Code
          <input
            value={planCode}
            onChange={(event) => setPlanCode(event.target.value.toUpperCase())}
            placeholder="Enter plan code"
            className="rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
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

      <div className="min-w-0 overflow-x-auto">
        <div className="min-w-[1800px]">
          <div className="sticky top-0 z-10 grid grid-cols-[repeat(13,minmax(0,1fr))] gap-x-3 bg-gray-200 p-3 text-xs font-semibold shadow-sm">
            <div>SI NO</div>
            {REQUIREMENT_COLUMNS.map(([, label]) => <div key={label}>{label.toUpperCase()}</div>)}
            <div>QTY TO BE PLANNED</div>
          </div>
          {requirements.map((requirement, index) => (
            <div key={requirement.id} className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-x-3 border-b border-gray-200 p-3 text-sm">
              <div>{index + 1}</div>
              {REQUIREMENT_COLUMNS.map(([key]) => <div key={key} className="break-words">{requirement[key] ?? ''}</div>)}
              <input
                type="number"
                min="0"
                step="1"
                value={plannedQuantities[requirement.id] || ''}
                onChange={(event) => updatePlannedQty(requirement.id, event.target.value)}
                className="min-w-0 rounded border border-blue-200 p-1 focus:border-blue-500 focus:outline-none"
              />
            </div>
          ))}
          {!requirements.length && <div className="p-4 text-center text-gray-500">No requirements have been entered yet.</div>}
        </div>
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

      <div className="min-w-0 overflow-x-auto">
        <div className="min-w-[2000px]">
          <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-x-3 bg-gray-200 p-3 text-xs font-semibold">
            <div>SI NO</div>
            <div>PLAN CODE</div>
            <div>DATE OF PLANNING</div>
            {REQUIREMENT_COLUMNS.map(([, label]) => <div key={label}>{label.toUpperCase()}</div>)}
            <div>PLANNED QTY</div>
          </div>
          {filteredPlans.map((plan, index) => (
            <div key={plan.id} className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-x-3 border-b border-gray-200 p-3 text-sm">
              <div>{index + 1}</div>
              <div>{plan.planCode}</div>
              <div>{plan.planningDate}</div>
              {REQUIREMENT_COLUMNS.map(([key]) => <div key={key} className="break-words">{plan[key] ?? ''}</div>)}
              <div>{plan.plannedQty}</div>
            </div>
          ))}
          {!filteredPlans.length && <div className="p-4 text-center text-gray-500">No submitted Clicking Plans match the filters.</div>}
        </div>
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
