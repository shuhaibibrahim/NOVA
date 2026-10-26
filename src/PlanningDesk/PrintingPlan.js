import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { createPortal } from 'react-dom';
import { onValue, push, ref, set, update } from 'firebase/database';
import { auth, db } from '../firebase_config';
import { genderForMaterialNumber, normalizeMatchValue, sizeForRequirement, sizesForGender } from '../requirementMatching';

const receiptSizeKey = (size) => {
  const normalized = String(size || '').trim();
  return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized;
};

const REQUIREMENT_COLUMNS = [
  ['sourcePlanCode', 'Clicker Plan Code'],
  ['sourcePlanDate', 'Clicker Plan Date'],
  ['model', 'Model'],
  ['article', 'Article'],
  ['gender', 'Gender'],
  ['colour', 'Colour'],
  ['size', 'Size'],
  ['leftQty', 'Left'],
  ['rightQty', 'Right'],
  ['caseQty', 'Case Qty'],
  ['category', 'Category'],
];

const normalizeCode = (value) => String(value || '').trim().toUpperCase();
const PLAN_DELETE_EMAIL = 'ajimsha.albac@walkaroo.co.in';

const incrementPlanCode = (value) => {
  const match = String(value || '').match(/^(.*?)(\d+)$/);
  if (!match) return '';
  return `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, '0')}`;
};

const formatPlanDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || '';
};

const numericQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : 0;
};

const displayQuantity = (value) => {
  const quantity = numericQuantity(value);
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const normalizedPackingKey = (key) => normalizeMatchValue(key).replace(/[^A-Z0-9]/g, '');

const packingFieldValue = (packing, field) => {
  const matchingKey = Object.keys(packing || {}).find(
    (key) => normalizedPackingKey(key) === normalizedPackingKey(field)
  );
  return matchingKey ? packing[matchingKey] : '';
};

const sizesInPackingGrid = (sizeGrid) => {
  const match = String(sizeGrid || '').match(/^\s*(\d{1,2})\s*[xX]\s*(\d{1,2})/);
  if (!match) return [];

  const firstSize = Number(match[1]);
  const lastSize = Number(match[2]);
  if (!Number.isInteger(firstSize) || !Number.isInteger(lastSize) || lastSize < firstSize) return [];
  return Array.from({ length: lastSize - firstSize + 1 }, (_, index) =>
    String(firstSize + index).padStart(2, '0')
  );
};

const packingQuantityForSize = (packing, sizeIndex) => {
  const matchingKey = Object.keys(packing || {}).find(
    (key) => normalizedPackingKey(key) === `SIZE${sizeIndex}`
  );
  const legacyQuantities = Array.isArray(packing?.packingComb)
    ? packing.packingComb
    : String(packing?.packingComb || '').split(',');
  const rawQuantity = matchingKey ? packing[matchingKey] : legacyQuantities[sizeIndex - 1];
  const quantity = Number(rawQuantity ?? 0);
  return Number.isFinite(quantity) ? quantity : 0;
};

const PLAN_STAGES = {
  printing: { label: 'Printing', fn: 'PRINTING', route: 'printing-plan', planNode: 'printingPlans', receiptNode: 'printingReceipts' },
  stitching: { label: 'Stitching', fn: 'STITCHING', route: 'stitching-plan', planNode: 'stitchingPlans', receiptNode: 'stitchingReceipts' },
  molding: { label: 'Molding', fn: 'MOLDING', route: 'molding-plan', planNode: 'moldingPlans', receiptNode: 'moldingReceipts' },
  grinding: { label: 'Grinding', fn: 'GRINDING', route: 'grinding-plan', planNode: 'grindingPlans', receiptNode: 'grindingReceipts' },
  stuckon: { label: 'Stuckon', fn: 'STUCKON', route: 'stuckon-plan', planNode: 'stuckonPlans', receiptNode: 'attachingReceipts' },
  packing: { label: 'Packing', fn: 'PACKING', route: 'packing-plan', planNode: 'packingPlans', receiptNode: 'packingReceipts' },
};

// Functions whose receipts supply the requirements of each stage; a BOM component's children decide which are used.
const UPSTREAM_FUNCTIONS = {
  stitching: ['CLICKING', 'PRINTING'],
  molding: ['PRINTING'],
  grinding: ['MOLDING'],
  stuckon: ['CLICKING', 'PRINTING', 'STITCHING', 'MOLDING', 'GRINDING'],
  packing: ['CLICKING', 'PRINTING', 'STITCHING', 'MOLDING', 'GRINDING', 'STUCKON'],
};

function PrintingPlan({ viewOnly = false, stage: stageKey = 'printing' }) {
  const stage = PLAN_STAGES[stageKey] || PLAN_STAGES.printing;
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [activeSheet, setActiveSheet] = useState('plan');
  const [clickingPlans, setClickingPlans] = useState([]);
  const [upstream, setUpstream] = useState({});
  const [packingCombinations, setPackingCombinations] = useState([]);
  const [articles, setArticles] = useState([]);
  const [bomRecords, setBomRecords] = useState([]);
  const [printingPlans, setPrintingPlans] = useState([]);
  const [isDeleteUser, setIsDeleteUser] = useState(false);
  const canDeletePlans = !viewOnly && isDeleteUser;
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [planCode, setPlanCode] = useState('');
  const [planCodeMode, setPlanCodeMode] = useState('new');
  const [previousPlanCode, setPreviousPlanCode] = useState('');
  const [planningDate, setPlanningDate] = useState('');
  const [planCodeFilter, setPlanCodeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [requirementFilters, setRequirementFilters] = useState({});
  const [allocationsByPlan, setAllocationsByPlan] = useState({});
  const [componentDropdown, setComponentDropdown] = useState(null);
  const componentDropdownRef = useRef(null);
  const [cart, setCart] = useState([]);
  const [showCartReview, setShowCartReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printingReceipts, setPrintingReceipts] = useState([]);
  const [receivingItem, setReceivingItem] = useState(null);
  const [receivedDate, setReceivedDate] = useState('');
  const [receivedSizeRows, setReceivedSizeRows] = useState([]);
  const [savingReceipt, setSavingReceipt] = useState(false);

  useEffect(() => {
    setSelectedLink(`${viewOnly ? 'execution' : 'planning-desk'}/${stage.route}`);
    setOpenedTab(viewOnly ? 'execution' : 'planningDesk');
  }, [setSelectedLink, setOpenedTab, viewOnly, stage.route]);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setIsDeleteUser(user?.email?.toLowerCase() === PLAN_DELETE_EMAIL);
  }), []);

  useEffect(() => onValue(ref(db, 'clickingPlans/'), (snapshot) => {
    const data = snapshot.val() || {};
    setClickingPlans(Object.entries(data).map(([id, plan]) => ({ ...plan, id })));
  }), []);

  useEffect(() => {
    const functions = UPSTREAM_FUNCTIONS[stageKey];
    if (!functions) return undefined;
    const patch = (fn, values) => setUpstream((current) => ({ ...current, [fn]: { ...current[fn], ...values } }));
    const unsubscribers = functions.flatMap((fn) => {
      if (fn === 'CLICKING') {
        return [onValue(ref(db, 'clickerCompStoreReceipts/'), (snapshot) => {
          patch(fn, { receipts: Object.values(snapshot.val() || {}) });
        })];
      }
      const config = Object.values(PLAN_STAGES).find((item) => item.fn === fn);
      return [
        onValue(ref(db, `${config.planNode}/`), (snapshot) => {
          patch(fn, { plans: Object.entries(snapshot.val() || {}).map(([id, plan]) => ({ ...plan, id })) });
        }),
        onValue(ref(db, `${config.receiptNode}/`), (snapshot) => {
          patch(fn, { receipts: Object.values(snapshot.val() || {}) });
        }),
      ];
    });
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [stageKey]);

  useEffect(() => onValue(ref(db, 'packingCombination/'), (snapshot) => {
    const data = snapshot.val() || {};
    setPackingCombinations(Object.values(data));
  }), []);

  useEffect(() => onValue(ref(db, `${stage.receiptNode}/`), (snapshot) => {
    setPrintingReceipts(Object.entries(snapshot.val() || {}).map(([id, receipt]) => ({ ...receipt, id })));
  }), [stage.receiptNode]);

  useEffect(() => onValue(ref(db, `${stage.planNode}/`), (snapshot) => {
    const data = snapshot.val() || {};
    setPrintingPlans(Object.entries(data).map(([id, plan]) => ({ ...plan, id })));
  }), [stage.planNode]);

  useEffect(() => onValue(ref(db, 'vendorDetails/'), (snapshot) => {
    const data = snapshot.val() || {};
    setVendors(Object.entries(data).map(([id, vendor]) => ({ ...vendor, id })));
  }), []);

  useEffect(() => onValue(ref(db, 'articleData/'), (snapshot) => {
    const data = snapshot.val() || {};
    setArticles(Object.entries(data).map(([id, article]) => ({ ...article, id })));
  }), []);

  useEffect(() => onValue(ref(db, 'bomData/'), (snapshot) => {
    const data = snapshot.val() || {};
    setBomRecords(Object.entries(data).map(([id, record]) => ({ ...record, id })));
  }), []);

  useEffect(() => {
    if (!componentDropdown) return undefined;
    const closeOnOutsideClick = (event) => {
      if (
        !componentDropdownRef.current?.contains(event.target) &&
        !event.target.closest('[data-printing-component-trigger]')
      ) setComponentDropdown(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setComponentDropdown(null);
    };
    const closeOnScroll = (event) => {
      if (!componentDropdownRef.current?.contains(event.target)) setComponentDropdown(null);
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
  }, [componentDropdown]);

  const printingVendors = useMemo(
    () => vendors.filter((vendor) => normalizeMatchValue(vendor.area).includes('PRINT')),
    [vendors]
  );

  const sizeRowsForPlan = (plan) => {
    const sizeGrid = plan.size || sizeForRequirement(plan);
    const planGender = plan.gender || genderForMaterialNumber(plan.materialNo);
    const packing = packingCombinations.find((combination) =>
      normalizeMatchValue(packingFieldValue(combination, 'gender')) === normalizeMatchValue(planGender) &&
      normalizeMatchValue(packingFieldValue(combination, 'sizeGrid')).replace(/\s+/g, '') ===
        normalizeMatchValue(sizeGrid).replace(/\s+/g, '')
    );
    const gridSizes = packing && !plan.isLoosePlan ? sizesInPackingGrid(sizeGrid) : [];
    if (!gridSizes.length) {
      return [{
        size: sizeGrid,
        leftQty: numericQuantity(plan.leftQty ?? plan.plannedQty),
        rightQty: numericQuantity(plan.rightQty ?? plan.plannedQty),
      }];
    }

    const caseQty = numericQuantity(plan.caseQty ?? plan.plannedQty);
    return gridSizes.map((size) => {
      const quantity = packingQuantityForSize(packing, Number(size)) * caseQty;
      return { size, leftQty: quantity, rightQty: quantity };
    });
  };

  const pairMtoCaseQty = (plan, sizeRows) => {
    const category = String(plan.priceCategory || '').trim().slice(0, 2);
    const article = articles.find((item) => (
      normalizeMatchValue(item.article) === normalizeMatchValue(plan.article) &&
      normalizeMatchValue(item.gender) === normalizeMatchValue(plan.gender || genderForMaterialNumber(plan.materialNo)) &&
      normalizeMatchValue(item.model) === normalizeMatchValue(plan.model) &&
      normalizeMatchValue(String(item.priceCategory || '').trim().slice(0, 2)) === normalizeMatchValue(category)
    ));
    const pairMtoPrQty = Number(article?.pairMtoPrQty);
    if (!Number.isFinite(pairMtoPrQty) || pairMtoPrQty <= 0) {
      return numericQuantity(plan.caseQty ?? plan.plannedQty);
    }
    const totalPieces = sizeRows.reduce((total, row) => total + row.leftQty + row.rightQty, 0);
    return totalPieces / 2 / pairMtoPrQty;
  };

  const printingComponentsForPlan = (plan) => {
    const article = articles.find((item) => (
      (plan.articleDataId && item.id === plan.articleDataId) ||
      (
        normalizeMatchValue(item.article) === normalizeMatchValue(plan.article) &&
        normalizeMatchValue(item.colour ?? item.color) === normalizeMatchValue(plan.colour ?? plan.color) &&
        normalizeMatchValue(item.gender) === normalizeMatchValue(plan.gender || genderForMaterialNumber(plan.materialNo)) &&
        (!plan.priceCategory || normalizeMatchValue(item.priceCategory) === normalizeMatchValue(plan.priceCategory))
      )
    ));
    const linkedBomIds = String(article?.bomIds || '').split(',').map((id) => id.trim()).filter(Boolean);
    return bomRecords.filter((record) => (
      linkedBomIds.includes(record.id) &&
      normalizeMatchValue(record.functionName || record.process) === stage.fn
    ));
  };

  const componentLabel = (record) => String(
    record.componentDetails || record.materialDesc || record.materialNumber || ''
  ).trim();

  const allocationsForPlan = (plan) => allocationsByPlan[plan.id]?.length
    ? allocationsByPlan[plan.id]
    : [{ id: `${plan.id}-allocation-1`, plannedQty: '', vendorName: '', componentIds: [] }];

  const scaledSizeQty = (sizeQuantity, plan, quantity) => {
    const base = sourceQuantity(plan);
    return base > 0 ? Math.round((numericQuantity(sizeQuantity) * numericQuantity(quantity)) / base) : 0;
  };

  const plannedForComponent = (plan, componentId, includeCart = true) => {
    const saved = printingPlans
      .filter((item) => item.sourceClickingPlanId === plan.id && (item.printingComponentIds || []).includes(componentId))
      .reduce((total, item) => total + numericQuantity(item.plannedQty), 0);
    const carted = includeCart
      ? cart
        .filter((item) => item.source.id === plan.id && item.componentIds.includes(componentId))
        .reduce((total, item) => total + item.plannedQty, 0)
      : 0;
    return saved + carted;
  };

  const remainingForComponent = (plan, componentId, includeCart = true) => (
    Math.max(0, sourceQuantity(plan) - plannedForComponent(plan, componentId, includeCart))
  );

  const availableQtyForPlan = (plan, includeCart = true) => {
    const components = printingComponentsForPlan(plan);
    if (!components.length) {
      const carted = includeCart
        ? cart.filter((item) => item.source.id === plan.id).reduce((total, item) => total + item.plannedQty, 0)
        : 0;
      return Math.max(0, (availableByClickingPlan.get(plan.id) || 0) - carted);
    }
    return Math.max(...components.map((component) => remainingForComponent(plan, component.id, includeCart)));
  };

  const limitForAllocation = (plan, allocation) => (allocation.componentIds.length
    ? Math.min(...allocation.componentIds.map((id) => remainingForComponent(plan, id)))
    : availableQtyForPlan(plan));

  const effectiveAllocationQty = (plan, allocation) => {
    if (allocation.plannedQty !== '') return allocation.plannedQty;
    return String(limitForAllocation(plan, allocation));
  };

  const updateAllocationsForItem = (plans, allocationIndex, field, value) => {
    setAllocationsByPlan((current) => ({
      ...current,
      ...plans.reduce((next, plan) => {
        const allocations = current[plan.id]?.length ? current[plan.id] : [{
          id: `${plan.id}-allocation-1`,
          plannedQty: '',
          vendorName: '',
          componentIds: [],
        }];
        next[plan.id] = allocations.map((allocation, index) => (
          index === allocationIndex ? { ...allocation, [field]: value } : allocation
        ));
        return next;
      }, {}),
    }));
  };

  const addAllocation = (plans) => {
    setAllocationsByPlan((current) => {
      return plans.reduce((next, plan) => {
        const existing = current[plan.id]?.length ? current[plan.id] : [{
          id: `${plan.id}-allocation-1`,
          plannedQty: '',
          vendorName: '',
          componentIds: [],
        }];
        next[plan.id] = [...existing, {
          id: `${plan.id}-allocation-${Date.now()}-${existing.length}`,
          plannedQty: '',
          vendorName: existing[existing.length - 1]?.vendorName || '',
          componentIds: existing[existing.length - 1]?.componentIds || [],
        }];
        return next;
      }, { ...current });
    });
  };

  const removeAllocation = (plans, allocationIndex) => {
    setAllocationsByPlan((current) => {
      return plans.reduce((next, plan) => {
        const allocations = current[plan.id] || [];
        next[plan.id] = allocations.filter((_, index) => index !== allocationIndex);
        return next;
      }, { ...current });
    });
  };

  const sourceQuantity = (plan) => (plan.isLoosePlan
    ? Math.max(numericQuantity(plan.leftQty), numericQuantity(plan.rightQty))
    : numericQuantity(plan.plannedQty ?? plan.caseQty ?? plan.qty));

  const sourcePlans = useMemo(() => {
    if (stageKey === 'printing') return clickingPlans;
    const upstreamFunctions = UPSTREAM_FUNCTIONS[stageKey];
    if (!upstreamFunctions) return [];

    // Each component's children come from earlier functions. Only the pieces received for every
    // child can be used, so the quantity per size and side is the smallest received quantity
    // across the children; any shortage stays short.
    const childRecords = (component) => (component.childComponentIds || [])
      .map((id) => bomRecords.find((record) => record.id === id))
      .filter(Boolean);
    const functionOf = (record) => normalizeMatchValue(record.functionName || record.process);
    const received = new Map();
    const addReceived = (articleId, childId, size, row) => {
      const key = `${articleId}|${childId}|${receiptSizeKey(size)}`;
      const current = received.get(key) || { leftQty: 0, rightQty: 0 };
      current.leftQty += Number(row.leftQty) || 0;
      current.rightQty += Number(row.rightQty) || 0;
      received.set(key, current);
    };

    upstreamFunctions.forEach((fn) => {
      const { plans = [], receipts = [] } = upstream[fn] || {};
      if (fn === 'CLICKING') {
        receipts.forEach((receipt) => {
          if (Array.isArray(receipt.componentQuantities)) {
            receipt.componentQuantities.forEach((row) => addReceived(receipt.articleId, row.componentId, row.size, row));
            return;
          }
          const article = articles.find((item) => item.id === receipt.articleId);
          const linkedIds = String(article?.bomIds || '').split(',').map((id) => id.trim()).filter(Boolean);
          bomRecords
            .filter((record) => linkedIds.includes(record.id) && functionOf(record) === 'CLICKING')
            .forEach((record) => (receipt.receivedSizes || []).forEach((row) => addReceived(receipt.articleId, record.id, row.size, row)));
        });
        return;
      }
      const componentsByPlan = new Map(plans.map((plan) => [plan.id, plan.printingComponentIds || []]));
      receipts.forEach((receipt) => {
        const componentIds = new Set((receipt.planIds || []).flatMap((id) => componentsByPlan.get(id) || []));
        componentIds.forEach((componentId) => (receipt.receivedSizes || []).forEach((row) => addReceived(receipt.articleId, componentId, row.size, row)));
      });
    });

    return articles.flatMap((article) => {
      const linkedIds = String(article.bomIds || '').split(',').map((id) => id.trim()).filter(Boolean);
      const childIds = [...new Set(bomRecords
        .filter((record) => linkedIds.includes(record.id) && functionOf(record) === stage.fn)
        .flatMap(childRecords)
        .filter((child) => upstreamFunctions.includes(functionOf(child)))
        .map((child) => child.id))];
      if (!childIds.length) return [];
      const sizes = new Map();
      received.forEach((_, key) => {
        const [articleId, childId, size] = key.split('|');
        if (articleId === article.id && childIds.includes(childId)) sizes.set(size, true);
      });
      return [...sizes.keys()].flatMap((size) => {
        const rows = childIds.map((childId) => received.get(`${article.id}|${childId}|${size}`) || { leftQty: 0, rightQty: 0 });
        const leftQty = Math.min(...rows.map((row) => row.leftQty));
        const rightQty = Math.min(...rows.map((row) => row.rightQty));
        if (leftQty <= 0 && rightQty <= 0) return [];
        const displaySize = sizesForGender(article.gender).find((item) => receiptSizeKey(item) === size) || size;
        return [{
          id: `${stageKey}:${article.id}:${size}`,
          articleDataId: article.id,
          planCode: 'RECEIVED',
          model: article.model,
          article: article.article,
          gender: article.gender,
          colour: article.colour ?? article.color,
          priceCategory: article.priceCategory,
          size: displaySize,
          isLoosePlan: true,
          leftQty,
          rightQty,
          plannedQty: Math.max(leftQty, rightQty),
          submittedAt: 0,
        }];
      });
    });
  }, [stageKey, stage.fn, clickingPlans, upstream, articles, bomRecords]);

  const availableByClickingPlan = useMemo(() => {
    const allocated = new Map();
    printingPlans.forEach((plan) => {
      const sourceId = plan.sourceClickingPlanId;
      if (!sourceId) return;
      allocated.set(sourceId, (allocated.get(sourceId) || 0) + numericQuantity(plan.plannedQty));
    });
    return new Map(sourcePlans.map((plan) => [
      plan.id,
      Math.max(0, sourceQuantity(plan) - (allocated.get(plan.id) || 0)),
    ]));
  }, [sourcePlans, printingPlans]);

  const existingPlanCodes = useMemo(() => [...new Set(
    printingPlans.map((plan) => String(plan.planCode || '').trim()).filter(Boolean)
  )].sort((first, second) => {
    const firstTime = Math.max(...printingPlans.filter((plan) => plan.planCode === first).map((plan) => plan.submittedAt || 0));
    const secondTime = Math.max(...printingPlans.filter((plan) => plan.planCode === second).map((plan) => plan.submittedAt || 0));
    return secondTime - firstTime;
  }), [printingPlans]);
  const nextPlanCode = incrementPlanCode(existingPlanCodes[0]);
  const selectedPlanCode = planCodeMode === 'existing' ? previousPlanCode : (nextPlanCode || planCode);

  const requirementRows = useMemo(() => {
    return [...sourcePlans]
      .filter((plan) => availableQtyForPlan(plan) > 0)
      .filter((plan) => REQUIREMENT_COLUMNS.every(([key]) => {
        const filter = String(requirementFilters[key] || '').trim().toLowerCase();
        if (!filter) return true;
        const value = key === 'sourcePlanCode'
          ? plan.planCode
          : key === 'sourcePlanDate'
            ? plan.planningDate
          : key === 'gender'
            ? plan.gender || genderForMaterialNumber(plan.materialNo)
            : key === 'size'
              ? plan.size || sizeForRequirement(plan)
              : key === 'leftQty'
                ? plan.leftQty ?? plan.plannedQty
                : key === 'rightQty'
                  ? plan.rightQty ?? plan.plannedQty
                  : key === 'caseQty'
                    ? plan.caseQty ?? plan.plannedQty
                    : key === 'category'
                      ? plan.priceCategory
                      : plan[key];
        return String(value ?? '').toLowerCase().includes(filter);
      }))
      .sort((first, second) => (second.submittedAt || 0) - (first.submittedAt || 0));
  }, [sourcePlans, availableByClickingPlan, requirementFilters, cart, printingPlans, articles, bomRecords]);

  const requirementGroups = useMemo(() => {
    const groups = new Map();
    requirementRows.forEach((plan) => {
      const code = String(plan.planCode || '').trim() || 'NO PLAN CODE';
      const date = String(plan.planningDate || '');
      const key = `${date}|${code}`;
      if (!groups.has(key)) groups.set(key, { key, code, date, plans: [] });
      groups.get(key).plans.push(plan);
    });
    return [...groups.values()].map((group) => {
      const itemsByKey = new Map();
      group.plans.forEach((plan) => {
        const itemKey = [
          plan.model,
          plan.article,
          plan.gender || genderForMaterialNumber(plan.materialNo),
          plan.colour || plan.color,
          plan.priceCategory,
        ].map((value) => normalizeMatchValue(value)).join('|');
        if (!itemsByKey.has(itemKey)) {
          itemsByKey.set(itemKey, { key: itemKey, plans: [] });
        }
        itemsByKey.get(itemKey).plans.push(plan);
      });
      const items = [...itemsByKey.values()].map((item) => ({
        ...item,
        plans: item.plans.sort((first, second) =>
          String(first.size || sizeForRequirement(first)).localeCompare(
            String(second.size || sizeForRequirement(second)),
            undefined,
            { numeric: true }
          )
        ),
      }));
      return { ...group, items };
    });
  }, [requirementRows]);

  const planGroups = useMemo(() => {
    const groups = new Map();
    printingPlans
      .filter((plan) =>
        (!planCodeFilter || String(plan.planCode || '').toLowerCase().includes(planCodeFilter.toLowerCase())) &&
        (!dateFilter || plan.planningDate === dateFilter)
      )
      .sort((first, second) => (second.submittedAt || 0) - (first.submittedAt || 0))
      .forEach((plan) => {
        const key = `${plan.planCode || ''}|${plan.planningDate || ''}`;
        if (!groups.has(key)) {
          groups.set(key, { key, planCode: plan.planCode || '', planningDate: plan.planningDate || '', plans: [] });
        }
        groups.get(key).plans.push(plan);
      });
    return [...groups.values()].map((group) => {
      const itemsByKey = new Map();
      group.plans.forEach((plan) => {
        const itemKey = [
          plan.vendorName,
          plan.model,
          plan.article,
          plan.gender || genderForMaterialNumber(plan.materialNo),
          plan.colour || plan.color,
          plan.priceCategory,
          plan.remarks,
          plan.lotNumber,
        ].map((value) => normalizeMatchValue(value)).join('|');
        if (!itemsByKey.has(itemKey)) {
          itemsByKey.set(itemKey, {
            key: itemKey,
            plans: [],
            vendorName: plan.vendorName || '',
            model: plan.model || '',
            article: plan.article || '',
            gender: plan.gender || genderForMaterialNumber(plan.materialNo),
            colour: plan.colour || plan.color || '',
            category: plan.priceCategory || '',
            remarks: plan.remarks || '',
            printingComponentIds: plan.printingComponentIds || [],
            lotNumber: plan.lotNumber || '',
            caseQty: 0,
            sizes: new Map(),
          });
        }
        const item = itemsByKey.get(itemKey);
        item.plans.push(plan);
        const planSizeRows = sizeRowsForPlan(plan);
        item.caseQty += pairMtoCaseQty(plan, planSizeRows);
        planSizeRows.forEach((sizeRow) => {
          const sizeName = String(sizeRow.size || '').trim();
          if (!item.sizes.has(sizeName)) {
            item.sizes.set(sizeName, {
              size: sizeName,
              leftQty: 0,
              rightQty: 0,
              plans: [],
            });
          }
          const size = item.sizes.get(sizeName);
          size.leftQty += sizeRow.leftQty;
          size.rightQty += sizeRow.rightQty;
          size.plans.push(plan);
        });
      });

      const items = [...itemsByKey.values()].map((item) => ({
        ...item,
        sizes: [...item.sizes.values()].sort((first, second) =>
          String(first.size).localeCompare(String(second.size), undefined, { numeric: true })
        ),
      }));
      const countedSources = new Set();
      const totals = { puCorkPairs: 0, puCorkCases: 0, sdPairs: 0, sdCases: 0 };
      group.plans.forEach((plan) => {
        const sourceKey = [
          plan.sourceClickingPlanId || plan.sourcePlanCode || plan.id,
          plan.model,
          plan.article,
          plan.gender || genderForMaterialNumber(plan.materialNo),
          plan.colour || plan.color,
          plan.priceCategory,
          plan.size,
        ].map((value) => normalizeMatchValue(value)).join('|');
        if (countedSources.has(sourceKey)) return;
        countedSources.add(sourceKey);
        const rows = sizeRowsForPlan(plan);
        const pairs = rows.reduce((sum, row) => sum + (row.leftQty + row.rightQty) / 2, 0);
        const cases = pairMtoCaseQty(plan, rows);
        if (normalizeMatchValue(plan.model).includes('PU CORK')) {
          totals.puCorkPairs += pairs;
          totals.puCorkCases += cases;
        } else {
          totals.sdPairs += pairs;
          totals.sdCases += cases;
        }
      });
      return { ...group, items, totals };
    });
  }, [printingPlans, planCodeFilter, dateFilter, packingCombinations, articles]);

  const updatePlanField = async (plans, field, value) => {
    const updates = {};
    plans.forEach((plan) => {
      updates[`${stage.planNode}/${plan.id}/${field}`] = value;
    });
    try {
      await update(ref(db), updates);
    } catch (error) {
      window.alert(`Unable to update ${field}: ${error.message}`);
    }
  };

  const updateSavedPlanComponents = async (plan, componentId) => {
    const currentIds = Array.isArray(plan.printingComponentIds) ? plan.printingComponentIds : [];
    const nextIds = currentIds.includes(componentId)
      ? currentIds.filter((id) => id !== componentId)
      : [...currentIds, componentId];
    const names = printingComponentsForPlan(plan)
      .filter((component) => nextIds.includes(component.id))
      .map(componentLabel);
    try {
      await update(ref(db, `${stage.planNode}/${plan.id}`), {
        printingComponentIds: nextIds,
        remarks: names.join(', '),
      });
    } catch (error) {
      window.alert(`Unable to update Printing components: ${error.message}`);
    }
  };

  const addGroupToPlan = (group) => {
    const itemsToAdd = [];
    for (const source of group.plans) {
      const allocations = allocationsForPlan(source)
        .map((allocation) => ({
          ...allocation,
          touched: allocation.plannedQty !== '' || Boolean(allocation.vendorName) || allocation.componentIds.length > 0,
          plannedQty: effectiveAllocationQty(source, allocation),
        }))
        .filter((allocation) => allocation.touched);
      const submittedAllocations = allocations.filter((allocation) => allocation.plannedQty !== '');
      if (!submittedAllocations.length) continue;
      for (const allocation of submittedAllocations) {
        const quantity = Number(allocation.plannedQty);
        if (!Number.isInteger(quantity) || quantity < 0) {
          window.alert(`Enter a non-negative whole-number quantity for ${source.article || 'each selected item'}.`);
          return;
        }
      }
      const componentTotals = new Map();
      submittedAllocations.forEach((allocation) => {
        allocation.componentIds.forEach((id) => {
          componentTotals.set(id, (componentTotals.get(id) || 0) + Number(allocation.plannedQty));
        });
      });
      for (const [componentId, total] of componentTotals) {
        const remaining = remainingForComponent(source, componentId);
        if (total > remaining) {
          const component = printingComponentsForPlan(source).find((item) => item.id === componentId);
          window.alert(`The quantity for ${component ? componentLabel(component) : 'a component'} of ${source.article || 'a selected item'} (${total}) cannot exceed its available balance (${remaining}).`);
          return;
        }
      }
      for (const allocation of submittedAllocations) {
        const quantity = Number(allocation.plannedQty);
        if (quantity === 0) continue;
        if (!allocation.vendorName) {
          window.alert(`Select a Printing vendor for ${source.article || 'each planned item'}.`);
          return;
        }
        if (!allocation.componentIds.length) {
          window.alert(`Select at least one Printing component for ${source.article || 'each planned item'}.`);
          return;
        }
        itemsToAdd.push({
          source,
          allocationId: allocation.id,
          plannedQty: quantity,
          vendorName: allocation.vendorName,
          componentIds: allocation.componentIds,
        });
      }
    }
    if (!itemsToAdd.length) {
      window.alert('Enter a quantity greater than zero for at least one item in this Clicker Plan.');
      return;
    }
    const groupIds = new Set(group.plans.map((plan) => plan.id));
    setCart((current) => [...current, ...itemsToAdd]);
    setAllocationsByPlan((current) => {
      const next = { ...current };
      groupIds.forEach((id) => { delete next[id]; });
      return next;
    });
  };

  const submitPlan = async () => {
    const code = normalizeCode(selectedPlanCode);
    if (!code || !planningDate) {
      window.alert('Enter both Plan Code and Date of Planning.');
      return;
    }
    if (!cart.length) {
      window.alert('Add at least one Clicker Plan item before submitting.');
      return;
    }
    if (printingPlans.some((plan) =>
      plan.planningDate === planningDate && normalizeCode(plan.planCode) !== code
    )) {
      window.alert('A different Printing Plan code already exists for this planning date.');
      return;
    }
    const overplannedSource = cart.find(({ source, componentIds }) => componentIds.some((componentId) => {
      const carted = cart
        .filter((item) => item.source.id === source.id && item.componentIds.includes(componentId))
        .reduce((total, item) => total + item.plannedQty, 0);
      return carted > remainingForComponent(source, componentId, false);
    }));
    if (overplannedSource) {
      const source = overplannedSource.source;
      window.alert(`The available quantity for ${source?.article || 'a selected item'} changed. Update its quantity before submitting.`);
      return;
    }
    if (!window.confirm(`Submit ${cart.length} Printing Plan item(s) under ${code}?`)) return;

    setSaving(true);
    try {
      await Promise.all(cart.map(({ source, plannedQty, vendorName, componentIds }) => {
        const planRef = push(ref(db, `${stage.planNode}/`));
        const sourceQty = sourceQuantity(source);
        const quantityRatio = sourceQty > 0 ? plannedQty / sourceQty : 0;
        const selectedComponents = printingComponentsForPlan(source)
          .filter((component) => componentIds.includes(component.id));
        return set(planRef, {
          ...source,
          id: planRef.key,
          sourceClickingPlanId: source.id,
          sourcePlanCode: source.planCode || '',
          planCode: code,
          planningDate,
          plannedQty,
          caseQty: plannedQty,
          leftQty: Math.round(numericQuantity(source.leftQty ?? source.plannedQty) * quantityRatio),
          rightQty: Math.round(numericQuantity(source.rightQty ?? source.plannedQty) * quantityRatio),
          vendorName,
          printingComponentIds: componentIds,
          remarks: selectedComponents.map(componentLabel).join(', '),
          submittedAt: Date.now(),
          receiptId: null,
          receivedDate: null,
          receivingStatus: null,
          receiptIds: null,
        });
      }));
      setCart([]);
      setAllocationsByPlan({});
      setPlanCode('');
      setPreviousPlanCode('');
      setPlanningDate('');
      setShowCartReview(false);
      setActiveSheet('plan');
    } catch (error) {
      window.alert(`Unable to submit the Printing Plan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePlanSelection = (planId) => {
    setSelectedPlanIds((selected) => selected.includes(planId)
      ? selected.filter((id) => id !== planId)
      : [...selected, planId]);
  };

  const togglePlanGroupSelection = (group) => {
    const planIds = group.plans.map((plan) => plan.id);
    const allSelected = planIds.length > 0 && planIds.every((id) => selectedPlanIds.includes(id));
    setSelectedPlanIds((selected) => allSelected
      ? selected.filter((id) => !planIds.includes(id))
      : [...new Set([...selected, ...planIds])]);
  };

  const deleteSelectedPlans = async () => {
    if (!canDeletePlans || !selectedPlanIds.length) return;
    if (!window.confirm(`Delete ${selectedPlanIds.length} selected Printing Plan item(s)? This cannot be undone.`)) return;
    const updates = {};
    selectedPlanIds.forEach((id) => {
      updates[`${stage.planNode}/${id}`] = null;
    });
    try {
      await update(ref(db), updates);
      setSelectedPlanIds([]);
    } catch (error) {
      window.alert(`Unable to delete the selected Printing Plans: ${error.message}`);
    }
  };

  const copyPlanTable = async (table) => {
    if (!table) return;
    const clone = table.cloneNode(true);
    const sourceNodes = [table, ...table.querySelectorAll('*')];
    const cloneNodes = [clone, ...clone.querySelectorAll('*')];
    const styleProps = [
      'background-color', 'color', 'font-weight', 'font-size', 'font-family', 'text-align', 'vertical-align',
      'padding', 'border-top', 'border-right', 'border-bottom', 'border-left', 'white-space',
    ];
    sourceNodes.forEach((node, index) => {
      const computed = window.getComputedStyle(node);
      cloneNodes[index].setAttribute(
        'style',
        styleProps.map((prop) => `${prop}:${computed.getPropertyValue(prop)}`).join(';')
      );
    });
    clone.setAttribute('style', `${clone.getAttribute('style')};border-collapse:collapse`);
    const hadSelectColumn = Boolean(table.querySelector('thead input[type="checkbox"]'));
    sourceNodes.forEach((node, index) => {
      const target = cloneNodes[index];
      if (!['SELECT', 'BUTTON', 'INPUT'].includes(node.tagName)) return;
      if (node.type === 'checkbox') {
        target.closest('td, th')?.remove();
        return;
      }
      let value = '';
      if (node.tagName === 'SELECT') value = node.value ? node.options[node.selectedIndex]?.text || '' : '';
      else if (node.tagName === 'BUTTON') value = node.textContent.trim().toLowerCase().startsWith('select ') ? '' : node.textContent.trim();
      else value = node.value || '';
      target.replaceWith(document.createTextNode(value.toUpperCase()));
    });
    const titleCell = clone.querySelector('thead tr th');
    if (titleCell) {
      titleCell.textContent = `ELS CALICUT - ${stage.label.toUpperCase()} PLAN`;
      titleCell.setAttribute('colspan', '13');
      titleCell.setAttribute('bgcolor', '#0f766e');
      titleCell.setAttribute('align', 'center');
      titleCell.setAttribute(
        'style',
        'background-color:#0f766e;color:#ffffff;font-weight:bold;font-size:16px;text-align:center;padding:6px;border:1px solid #9ca3af'
      );
    }
    cloneNodes.forEach((node) => {
      if (!['TD', 'TH'].includes(node.tagName) || node === titleCell) return;
      const match = /background-color:\s*(rgba?\([^)]*\))/.exec(node.getAttribute('style') || '');
      if (match && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(match[1])) node.setAttribute('bgcolor', match[1]);
    });
    if (hadSelectColumn) {
      const summaryCell = clone.querySelectorAll('thead tr')[1]?.querySelector('td');
      summaryCell?.setAttribute('colspan', '4');
    }
    const html = clone.outerHTML;
    const text = [...clone.querySelectorAll('tr')]
      .map((row) => [...row.children].map((cell) => cell.textContent.trim()).join('\t'))
      .join('\n');
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })]);
      } else {
        const container = document.createElement('div');
        container.contentEditable = 'true';
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.innerHTML = html;
        document.body.appendChild(container);
        const range = document.createRange();
        range.selectNodeContents(container);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        const copied = document.execCommand('copy');
        selection.removeAllRanges();
        document.body.removeChild(container);
        if (!copied) throw new Error('Copy command was rejected.');
      }
      window.alert('Printing Plan copied with formatting.');
    } catch (error) {
      window.alert(`Unable to copy the Printing Plan: ${error.message}`);
    }
  };

  const articleForPrintingItem = (item) => articles.find((article) =>
    item.plans.some((plan) => plan.articleDataId && article.id === plan.articleDataId) ||
    (
      normalizeMatchValue(article.article) === normalizeMatchValue(item.article) &&
      normalizeMatchValue(article.colour ?? article.color) === normalizeMatchValue(item.colour) &&
      normalizeMatchValue(article.gender) === normalizeMatchValue(item.gender) &&
      normalizeMatchValue(article.priceCategory).slice(0, 2) === normalizeMatchValue(item.category).slice(0, 2)
    )
  );

  const receiptForItem = (item) => {
    const ids = new Set(item.plans.map((plan) => plan.receiptId).filter(Boolean));
    return printingReceipts.find((receipt) => ids.has(receipt.id));
  };

  const openReceiving = (item) => {
    const receipt = receiptForItem(item);
    const received = new Map((receipt?.receivedSizes || []).map((row) => [receiptSizeKey(row.size), row]));
    setReceivingItem(item);
    setReceivedDate(receipt?.receivedDate || new Date().toISOString().slice(0, 10));
    setReceivedSizeRows(item.sizes.map((size) => ({
      size: size.size,
      plannedLeft: size.leftQty,
      plannedRight: size.rightQty,
      leftQty: String(received.get(receiptSizeKey(size.size))?.leftQty ?? 0),
      rightQty: String(received.get(receiptSizeKey(size.size))?.rightQty ?? 0),
    })));
  };

  const submitReceiving = async (event) => {
    event.preventDefault();
    if (!receivingItem || !receivedDate) {
      window.alert('Enter the received date before submitting.');
      return;
    }
    const rows = receivedSizeRows.map((row) => ({
      size: row.size,
      leftQty: Number(row.leftQty || 0),
      rightQty: Number(row.rightQty || 0),
    }));
    const invalid = receivedSizeRows.some((row, index) => (
      !Number.isInteger(rows[index].leftQty) || rows[index].leftQty < 0 || rows[index].leftQty > row.plannedLeft ||
      !Number.isInteger(rows[index].rightQty) || rows[index].rightQty < 0 || rows[index].rightQty > row.plannedRight
    ));
    if (invalid) {
      window.alert('Enter whole numbers for Left and Right, not more than the planned quantity.');
      return;
    }
    const article = articleForPrintingItem(receivingItem);
    if (!article) {
      window.alert('Could not match this plan item to an Article Entry line item.');
      return;
    }

    const existing = receiptForItem(receivingItem);
    const receiptId = existing?.id || push(ref(db, `${stage.receiptNode}/`)).key;
    const updates = {
      [`${stage.receiptNode}/${receiptId}`]: {
        id: receiptId,
        articleId: article.id,
        article: receivingItem.article,
        model: receivingItem.model,
        gender: receivingItem.gender,
        colour: receivingItem.colour,
        priceCategory: receivingItem.category,
        planCode: receivingItem.plans[0]?.planCode || '',
        planIds: receivingItem.plans.map((plan) => plan.id),
        receivedDate,
        receivedSizes: rows.filter((row) => row.leftQty > 0 || row.rightQty > 0),
        submittedAt: Date.now(),
      },
    };
    receivingItem.plans.forEach((plan) => {
      updates[`${stage.planNode}/${plan.id}/receiptId`] = receiptId;
      updates[`${stage.planNode}/${plan.id}/receivedDate`] = receivedDate;
    });

    setSavingReceipt(true);
    try {
      await update(ref(db), updates);
      setReceivingItem(null);
    } catch (error) {
      window.alert(`Unable to save the receiving status: ${error.message}`);
    } finally {
      setSavingReceipt(false);
    }
  };

  const renderReceivingForm = () => {
    if (!receivingItem) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <form onSubmit={submitReceiving} className="max-h-full w-full max-w-2xl space-y-4 overflow-auto rounded bg-white p-5 shadow-xl">
          <div>
            <h2 className="text-lg font-semibold">{stage.label} Receiving</h2>
            <p className="text-sm text-gray-600">
              {receivingItem.plans[0]?.planCode} · {receivingItem.model} · {receivingItem.article} · {receivingItem.colour} · {receivingItem.category}
            </p>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Received Date
            <input type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} className="w-48 rounded border border-gray-300 p-2" />
          </label>
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-200">
              <tr>
                {['SIZE', 'PLANNED LEFT', 'PLANNED RIGHT', 'RECEIVED LEFT', 'RECEIVED RIGHT'].map((heading) => (
                  <th key={heading} className="border border-gray-400 p-2 text-center">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receivedSizeRows.map((row, index) => (
                <tr key={`${row.size}-${index}`} className="text-center">
                  <td className="border border-gray-300 p-2">{row.size}</td>
                  <td className="border border-gray-300 p-2">{displayQuantity(row.plannedLeft)}</td>
                  <td className="border border-gray-300 p-2">{displayQuantity(row.plannedRight)}</td>
                  {['leftQty', 'rightQty'].map((field) => (
                    <td key={field} className="border border-gray-300 p-1">
                      <input
                        type="number"
                        min="0"
                        aria-label={`${field === 'leftQty' ? 'Received left' : 'Received right'} for size ${row.size}`}
                        value={row[field]}
                        onChange={(event) => setReceivedSizeRows((current) => current.map((item, itemIndex) => (
                          itemIndex === index ? { ...item, [field]: event.target.value } : item
                        )))}
                        className="w-24 rounded border border-gray-300 p-1 text-center"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReceivingItem(null)} className="rounded border border-gray-300 px-4 py-2">Cancel</button>
            <button type="submit" disabled={savingReceipt} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {savingReceipt ? 'Saving...' : 'Save Receiving'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderPlanSheet = () => (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Filter by Plan Code
          <input value={planCodeFilter} onChange={(event) => setPlanCodeFilter(event.target.value)} placeholder="Plan code" className="rounded border border-gray-300 p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Filter by Date
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded border border-gray-300 p-2" />
        </label>
      </div>
      {canDeletePlans && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-gray-600">{selectedPlanIds.length} plan item(s) selected</span>
          <button
            type="button"
            onClick={deleteSelectedPlans}
            disabled={!selectedPlanIds.length}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete Selected
          </button>
        </div>
      )}
      <div className="max-h-[65vh] space-y-5 overflow-auto">
        {planGroups.map((group) => (
          <div key={group.key} data-plan-group className="overflow-auto border border-gray-400">
            <div className="flex justify-end border-b border-gray-300 bg-gray-50 p-1">
              <button
                type="button"
                onClick={(event) => copyPlanTable(event.currentTarget.closest('[data-plan-group]').querySelector('table'))}
                className="rounded border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                Copy
              </button>
            </div>
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr>
                  <th colSpan={(canDeletePlans ? 14 : 13) + (viewOnly ? 1 : 0)} className="border border-gray-400 bg-teal-700 p-2 text-center text-base font-bold text-white">VEEKESY ELASTOMERS - CALICUT - {stage.label.toUpperCase()} PLAN</th>
                </tr>
                <tr className="bg-teal-200 text-center text-xs font-bold">
                  <td colSpan={canDeletePlans ? 4 : 3} className="border border-gray-400 p-2">PLAN DATE: {formatPlanDate(group.planningDate)}</td>
                  <td colSpan={2} className="border border-gray-400 p-2">{group.planCode.toUpperCase()}</td>
                  <td colSpan={3} className="border border-gray-400 p-2">PU CORK: {displayQuantity(group.totals.puCorkPairs)} PR, {displayQuantity(group.totals.puCorkCases)} CS</td>
                  <td colSpan={2} className="border border-gray-400 p-2">SD: {displayQuantity(group.totals.sdPairs)} PR, {displayQuantity(group.totals.sdCases)} CS</td>
                  <td colSpan={3 + (viewOnly ? 1 : 0)} className="border border-gray-400 p-2">TOTAL: {displayQuantity(group.totals.puCorkPairs + group.totals.sdPairs)} PR, {displayQuantity(group.totals.puCorkCases + group.totals.sdCases)} CS</td>
                </tr>
                <tr className="bg-teal-100 text-center text-xs font-bold">
                  {canDeletePlans && (
                    <th className="border border-gray-400 p-2">
                      <label className="flex items-center justify-center gap-1">
                        <input
                          type="checkbox"
                          aria-label={`Select full Printing Plan ${group.planCode}`}
                          checked={group.plans.length > 0 && group.plans.every((plan) => selectedPlanIds.includes(plan.id))}
                          onChange={() => togglePlanGroupSelection(group)}
                        />
                        <span>SELECT PLAN</span>
                      </label>
                    </th>
                  )}
                  {['SL NO', 'VENDOR', 'MODEL', 'ARTICLE', 'GENDER', 'COLOUR', 'SIZE', 'LEFT', 'RIGHT', 'CASE', 'CATEGORY', 'REMARKS', 'LOT NUMBER', ...(viewOnly ? ['RECEIVING'] : [])].map((heading) => (
                    <th key={heading} className="whitespace-nowrap border border-gray-400 p-2">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.items.map((item, itemIndex) => {
                  const itemSizes = item.sizes.length
                    ? item.sizes
                    : [{ size: '', leftQty: 0, rightQty: 0, caseQty: item.caseQty, plans: item.plans }];
                  const itemSpan = itemSizes.length;
                  return itemSizes.map((size, sizeIndex) => (
                    <tr key={`${item.key}-${size.size}-${sizeIndex}`} className="text-center">
                      {canDeletePlans && (
                        <td className="border border-gray-400 p-2">
                          <div className="flex flex-col gap-1">
                            {size.plans.map((plan) => (
                              <input
                                key={plan.id}
                                type="checkbox"
                                aria-label={`Select Printing Plan ${plan.planCode || ''}, ${plan.article || ''}, size ${plan.size || ''}`}
                                checked={selectedPlanIds.includes(plan.id)}
                                onChange={() => togglePlanSelection(plan.id)}
                              />
                            ))}
                          </div>
                        </td>
                      )}
                      {sizeIndex === 0 && (
                        <>
                          <td rowSpan={itemSpan} className="border border-gray-400 p-2 align-middle">{itemIndex + 1}</td>
                          <td rowSpan={itemSpan} className="border border-gray-400 p-2 align-middle">
                            <select
                              aria-label={`Printing vendor for ${item.article || 'plan item'}`}
                              value={item.vendorName}
                              onChange={(event) => updatePlanField(item.plans, 'vendorName', event.target.value)}
                              className="max-w-36 rounded border border-gray-300 p-1"
                            >
                              <option value="">Select vendor</option>
                              {printingVendors.map((vendor) => <option key={vendor.id} value={vendor.vendorName}>{vendor.vendorName}</option>)}
                            </select>
                          </td>
                          {[item.model, item.article, item.gender, item.colour].map((value, index) => (
                            <td key={index} rowSpan={itemSpan} className="border border-gray-400 p-2 align-middle">{String(value ?? '').toUpperCase()}</td>
                          ))}
                        </>
                      )}
                      <td className="border border-gray-400 p-2">{String(size.size || '').toUpperCase()}</td>
                      <td className="border border-gray-400 p-2">{displayQuantity(size.leftQty)}</td>
                      <td className="border border-gray-400 p-2">{displayQuantity(size.rightQty)}</td>
                      {sizeIndex === 0 && (
                        <>
                          <td rowSpan={itemSpan} className="border border-gray-400 p-2 align-middle">{displayQuantity(item.caseQty)}</td>
                          <td rowSpan={itemSpan} className="border border-gray-400 p-2 align-middle">{String(item.category).toUpperCase()}</td>
                          <td rowSpan={itemSpan} className="border border-gray-400 p-2 align-middle">
                            <button
                              type="button"
                              data-printing-component-trigger
                              aria-label={`Select Printing components for ${item.article || 'plan item'}`}
                              aria-expanded={componentDropdown?.key === `saved-${group.key}-${item.key}`}
                              onClick={(event) => {
                                const key = `saved-${group.key}-${item.key}`;
                                if (componentDropdown?.key === key) {
                                  setComponentDropdown(null);
                                  return;
                                }
                                const rect = event.currentTarget.getBoundingClientRect();
                                const width = Math.min(360, window.innerWidth - 24);
                                const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
                                const below = window.innerHeight - rect.bottom - 12;
                                const above = rect.top - 12;
                                const maxHeight = Math.min(240, Math.max(below, above));
                                setComponentDropdown({
                                  key,
                                  left,
                                  top: below >= 160 || below >= above
                                    ? rect.bottom + 4
                                    : Math.max(12, rect.top - maxHeight - 4),
                                  width,
                                  maxHeight,
                                });
                              }}
                              className="w-40 rounded border border-gray-300 bg-white p-2 text-left"
                            >
                              {printingComponentsForPlan(item.plans[0])
                                .filter((component) => (item.printingComponentIds || []).includes(component.id))
                                .map(componentLabel)
                                .join(', ') || item.remarks || 'Select components'}
                            </button>
                            <div className="mt-1 text-xs font-semibold">
                              {[...new Set(item.plans.map((plan) => plan.sourcePlanCode || plan.sourceClickingPlanCode).filter(Boolean))].join(', ')}
                            </div>
                            {componentDropdown?.key === `saved-${group.key}-${item.key}` && createPortal(
                              <div
                                ref={componentDropdownRef}
                                style={{
                                  position: 'fixed',
                                  left: componentDropdown.left,
                                  top: componentDropdown.top,
                                  width: componentDropdown.width,
                                  maxHeight: componentDropdown.maxHeight,
                                }}
                                className="z-[1000] overflow-auto rounded border border-gray-300 bg-white p-2 text-left text-sm shadow-xl"
                              >
                                {printingComponentsForPlan(item.plans[0]).length ? printingComponentsForPlan(item.plans[0]).map((component) => (
                                  <label key={component.id} className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-blue-50">
                                    <input
                                      type="checkbox"
                                      checked={(item.printingComponentIds || []).includes(component.id)}
                                      onChange={() => item.plans.forEach((plan) => updateSavedPlanComponents(plan, component.id))}
                                    />
                                    {componentLabel(component)}
                                  </label>
                                )) : <p className="px-2 py-2 text-gray-500">No Printing components are linked to this article.</p>}
                              </div>,
                              document.body
                            )}
                          </td>
                          <td rowSpan={itemSpan} className="border border-gray-400 p-2 align-middle">
                            <input
                              type="text"
                              aria-label={`Lot number for ${item.article || 'plan item'}`}
                              defaultValue={item.lotNumber}
                              onBlur={(event) => updatePlanField(item.plans, 'lotNumber', event.target.value)}
                              className="w-32 rounded border border-gray-300 p-1 text-center"
                            />
                          </td>
                          {viewOnly && (
                            <td rowSpan={itemSpan} className="border border-gray-400 p-2 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => openReceiving(item)}
                                className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                              >
                                {receiptForItem(item) ? 'Edit Receive' : 'Receive'}
                              </button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        ))}
        {!planGroups.length && <div className="border border-gray-200 p-4 text-center text-gray-500">No Printing Plans match the filters.</div>}
      </div>
    </>
  );

  const renderRequirementsSheet = () => (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Plan Code Option
          <select value={planCodeMode} onChange={(event) => setPlanCodeMode(event.target.value)} className="rounded border border-gray-300 p-2">
            <option value="new">Create New Plan</option>
            <option value="existing" disabled={!existingPlanCodes.length}>Add to Previous Plan</option>
          </select>
        </label>
        {planCodeMode === 'existing' ? (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Select Previous Plan Code
            <select value={previousPlanCode} onChange={(event) => setPreviousPlanCode(event.target.value)} className="rounded border border-gray-300 p-2">
              <option value="">Select plan code</option>
              {existingPlanCodes.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Plan Code
            <input value={nextPlanCode || planCode} onChange={(event) => setPlanCode(event.target.value.toUpperCase())} readOnly={Boolean(nextPlanCode)} placeholder="Enter initial plan code" className="rounded border border-gray-300 p-2 read-only:bg-gray-100" />
            {nextPlanCode && <span className="text-xs font-normal text-gray-500">Generated from the latest Printing Plan code.</span>}
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Date of Planning
          <input type="date" value={planningDate} onChange={(event) => setPlanningDate(event.target.value)} className="rounded border border-gray-300 p-2" />
        </label>
      </div>

      {showCartReview ? (
        <div className="space-y-4 rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Review Printing Plan ({cart.length} items)</h2>
            <button type="button" onClick={() => setShowCartReview(false)} className="text-blue-600 hover:underline">Back to Requirements</button>
          </div>
          <div className="max-h-[55vh] overflow-auto border border-gray-200">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="sticky top-0 bg-gray-200 text-left text-xs font-semibold">
                <tr>{['Clicker Plan Code', 'Model', 'Article', 'Colour', 'Size', 'Vendor', 'Printing Components', 'Available Qty', 'Printing Qty', 'Action'].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {cart.map(({ source, plannedQty, vendorName, componentIds, allocationId }) => (
                  <tr key={allocationId} className="border-b">
                    <td className="p-3">{source.planCode}</td>
                    <td className="p-3">{source.model}</td>
                    <td className="p-3">{source.article}</td>
                    <td className="p-3">{source.colour || source.color}</td>
                    <td className="p-3">{source.size || sizeForRequirement(source)}</td>
                    <td className="p-3">{vendorName}</td>
                    <td className="p-3">
                      {printingComponentsForPlan(source)
                        .filter((component) => componentIds.includes(component.id))
                        .map(componentLabel)
                        .join(', ')}
                    </td>
                    <td className="p-3">{availableQtyForPlan(source, false)}</td>
                    <td className="p-3">{plannedQty}</td>
                    <td className="p-3"><button type="button" onClick={() => setCart((current) => current.filter((item) => item.allocationId !== allocationId))} className="text-red-600 hover:underline">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={submitPlan} disabled={saving} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">{saving ? 'Submitting...' : 'Submit Plan'}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold">Items in plan: {cart.length}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCartReview(true)} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-800">Review Plan ({cart.length})</button>
            </div>
          </div>
          <div className="max-h-[60vh] space-y-5 overflow-auto">
            {requirementGroups.map((group) => (
              <div key={group.key} className="overflow-auto rounded border border-gray-300">
                <table className="w-full min-w-[2400px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 text-xs font-semibold shadow-sm">
                    <tr>
                      <th
                      colSpan={REQUIREMENT_COLUMNS.length + 8}
                        className="border border-gray-300 bg-teal-200 p-3 text-center font-bold"
                      >
                        <div className="grid grid-cols-3 items-center gap-2">
                          <span className="text-left">PLAN DATE: {formatPlanDate(group.date)}</span>
                          <span>{group.code.toUpperCase()}</span>
                          <span className="text-right">
                            TOTAL: {group.plans.reduce((total, plan) => total + numericQuantity(plan.plannedQty ?? plan.caseQty ?? plan.qty), 0)}
                          </span>
                        </div>
                      </th>
                    </tr>
                    <tr className="bg-gray-100 text-center">
                      <th className="p-3 text-left">SI NO</th>
                      {REQUIREMENT_COLUMNS.map(([key, label]) => (
                        <th key={key} className="p-3 align-top">
                          <div>{label.toUpperCase()}</div>
                          <input
                            value={requirementFilters[key] || ''}
                            onChange={(event) => setRequirementFilters((current) => ({ ...current, [key]: event.target.value }))}
                            placeholder="Filter"
                            aria-label={`Filter by ${label}`}
                            className="mt-1 w-full min-w-20 rounded border border-gray-300 bg-white p-1 text-xs font-normal"
                          />
                        </th>
                      ))}
                      <th className="p-3">VENDOR</th>
                      <th className="p-3">REMARKS / COMPONENTS</th>
                      <th className="p-3" colSpan={2}>AVAILABLE</th>
                      <th className="p-3" colSpan={2}>QTY TO BE PLANNED</th>
                      <th className="p-3">SPLIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, itemIndex) => {
                      const splitCount = Math.max(...item.plans.map((plan) => allocationsForPlan(plan).length));
                      const planSizeRows = item.plans.map(sizeRowsForPlan);
                      const itemSizeRowCount = planSizeRows.reduce((total, sizeRows) => total + sizeRows.length, 0);
                      const itemRowSpan = itemSizeRowCount * splitCount;
                      const totalCaseQuantity = item.plans.reduce(
                        (total, plan, index) => total + pairMtoCaseQty(plan, planSizeRows[index]),
                        0
                      );
                      return Array.from({ length: splitCount }, (_, splitIndex) => item.plans.flatMap((plan, planIndex) => {
                        const allocation = allocationsForPlan(plan)[splitIndex];
                        if (!allocation) return null;
                        const availableIncludingCart = availableQtyForPlan(plan);
                        const allocationLimit = limitForAllocation(plan, allocation);
                        const printingComponents = printingComponentsForPlan(plan);
                        const dropdownKey = `${group.key}-${item.key}-split-${splitIndex}`;
                        const chosenComponents = printingComponents
                          .filter((component) => allocation.componentIds.includes(component.id))
                          .map(componentLabel);
                        const sizeRows = planSizeRows[planIndex];
                        return sizeRows.map((sizeRow, sizeIndex) => {
                          const isFirstItemRow = splitIndex === 0 && planIndex === 0 && sizeIndex === 0;
                          const isFirstPlanRowInSplit = planIndex === 0 && sizeIndex === 0;
                          const sourceFields = {
                            sourcePlanCode: plan.planCode || '',
                            sourcePlanDate: formatPlanDate(plan.planningDate),
                            model: plan.model || '',
                            article: plan.article || '',
                            gender: plan.gender || genderForMaterialNumber(plan.materialNo),
                            colour: plan.colour || plan.color || '',
                            size: sizeRow.size,
                            leftQty: displayQuantity(sizeRow.leftQty),
                            rightQty: displayQuantity(sizeRow.rightQty),
                            category: plan.priceCategory || '',
                          };
                          return (
                          <tr key={`${plan.id}-${allocation.id}-${sizeIndex}`} className="border-b border-gray-200 text-center align-middle">
                            {isFirstItemRow && (
                              <>
                                <td rowSpan={itemRowSpan} className="border border-gray-300 p-3">{itemIndex + 1}</td>
                                {['sourcePlanCode', 'sourcePlanDate', 'model', 'article', 'gender', 'colour'].map((key) => (
                                  <td key={key} rowSpan={itemRowSpan} className="break-words border border-gray-300 p-3">{sourceFields[key]}</td>
                                ))}
                              </>
                            )}
                            <td className="border border-gray-300 p-3">{sourceFields.size}</td>
                            <td className="border border-gray-300 p-3">{sourceFields.leftQty}</td>
                            <td className="border border-gray-300 p-3">{sourceFields.rightQty}</td>
                            {isFirstItemRow && (
                              <>
                                <td rowSpan={itemRowSpan} className="border border-gray-300 p-3">{displayQuantity(totalCaseQuantity)}</td>
                                <td rowSpan={itemRowSpan} className="border border-gray-300 p-3">{sourceFields.category}</td>
                              </>
                            )}
                            {isFirstPlanRowInSplit && (
                              <>
                                <td rowSpan={itemSizeRowCount} className="min-w-40 border border-gray-300 p-2">
                                  <select
                                    aria-label={`Printing vendor for ${plan.article || 'plan item'} split ${splitIndex + 1}`}
                                    value={allocation.vendorName}
                                    onChange={(event) => updateAllocationsForItem(item.plans, splitIndex, 'vendorName', event.target.value)}
                                    className="w-full min-w-36 rounded border border-gray-300 bg-white p-2"
                                  >
                                    <option value="">Select vendor</option>
                                    {printingVendors.map((vendor) => (
                                      <option key={vendor.id} value={vendor.vendorName}>{vendor.vendorName}</option>
                                    ))}
                                  </select>
                                </td>
                                <td rowSpan={itemSizeRowCount} className="min-w-56 border border-gray-300 p-2">
                                  <button
                                    type="button"
                                    data-printing-component-trigger
                                    aria-label={`Select Printing components for ${plan.article || 'plan item'} split ${splitIndex + 1}`}
                                    aria-expanded={componentDropdown?.key === dropdownKey}
                                    onClick={(event) => {
                                      if (componentDropdown?.key === dropdownKey) {
                                        setComponentDropdown(null);
                                        return;
                                      }
                                      const rect = event.currentTarget.getBoundingClientRect();
                                      const width = Math.min(360, window.innerWidth - 24);
                                      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
                                      const below = window.innerHeight - rect.bottom - 12;
                                      const above = rect.top - 12;
                                      const maxHeight = Math.min(240, Math.max(below, above));
                                      setComponentDropdown({
                                        key: dropdownKey,
                                        left,
                                        top: below >= 160 || below >= above ? rect.bottom + 4 : Math.max(12, rect.top - maxHeight - 4),
                                        width,
                                        maxHeight,
                                      });
                                    }}
                                    className="w-full rounded border border-gray-300 bg-white p-2 text-left"
                                  >
                                    {chosenComponents.length ? chosenComponents.join(', ') : 'Select components'}
                                  </button>
                                  {componentDropdown?.key === dropdownKey && createPortal(
                                    <div
                                      ref={componentDropdownRef}
                                      style={{
                                        position: 'fixed',
                                        left: componentDropdown.left,
                                        top: componentDropdown.top,
                                        width: componentDropdown.width,
                                        maxHeight: componentDropdown.maxHeight,
                                      }}
                                      className="z-[1000] overflow-auto rounded border border-gray-300 bg-white p-2 text-left text-sm shadow-xl"
                                    >
                                      {printingComponents.length ? printingComponents.map((component) => (
                                        <label key={component.id} className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-blue-50">
                                          <input
                                            type="checkbox"
                                            checked={allocation.componentIds.includes(component.id)}
                                            onChange={() => updateAllocationsForItem(
                                              item.plans,
                                              splitIndex,
                                              'componentIds',
                                              allocation.componentIds.includes(component.id)
                                                ? allocation.componentIds.filter((id) => id !== component.id)
                                                : [...allocation.componentIds, component.id]
                                            )}
                                          />
                                          {componentLabel(component)}
                                        </label>
                                      )) : <p className="px-2 py-2 text-gray-500">No Printing components are linked to this article.</p>}
                                    </div>,
                                    document.body
                                  )}
                                </td>
                              </>
                            )}
                            {['leftQty', 'rightQty'].map((sideKey) => (
                              <td key={`available-${sideKey}`} className="border border-gray-300 p-3">
                                {displayQuantity(scaledSizeQty(sizeRow[sideKey], plan, availableIncludingCart))}
                              </td>
                            ))}
                            {['leftQty', 'rightQty'].map((sideKey) => {
                              const planned = effectiveAllocationQty(plan, allocation);
                              return (
                                <td key={`planned-${sideKey}`} className="min-w-24 border border-gray-300 p-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={planned === '' ? '' : scaledSizeQty(sizeRow[sideKey], plan, planned)}
                                    disabled={!(sizeRow[sideKey] > 0)}
                                    onChange={(event) => {
                                      const typed = event.target.value;
                                      const nextQty = typed === ''
                                        ? ''
                                        : String(Math.min(
                                          allocationLimit,
                                          Math.round((Number(typed) * sourceQuantity(plan)) / sizeRow[sideKey])
                                        ));
                                      setAllocationsByPlan((current) => ({
                                        ...current,
                                        [plan.id]: allocationsForPlan(plan).map((currentAllocation, index) => (
                                          index === splitIndex
                                            ? { ...currentAllocation, plannedQty: nextQty }
                                            : currentAllocation
                                        )),
                                      }));
                                    }}
                                    className="w-full min-w-20 rounded border border-blue-200 p-1"
                                  />
                                </td>
                              );
                            })}
                            {isFirstPlanRowInSplit && (
                              <td rowSpan={itemSizeRowCount} className="min-w-32 border border-gray-300 p-2">
                                <button
                                  type="button"
                                  onClick={() => addAllocation(item.plans)}
                                  className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  Add Split
                                </button>
                                {splitCount > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeAllocation(item.plans, splitIndex)}
                                    className="ml-1 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                          );
                        });
                      })).flat();
                    })}
                    <tr>
                      <td colSpan={REQUIREMENT_COLUMNS.length + 8} className="border border-gray-300 p-3 text-right">
                        <button
                          type="button"
                          onClick={() => addGroupToPlan(group)}
                          className="whitespace-nowrap rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
                        >
                          Add to Plan
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
            {!requirementGroups.length && (
              <div className="rounded border border-gray-200 p-4 text-center text-gray-500">
                No unallocated Clicker Plan items are available.
              </div>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="h-full min-w-0 overflow-auto bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex min-w-0 flex-col gap-4 rounded bg-white p-4">
        <h1 className="text-lg font-semibold">{stage.label} Plan</h1>
        <div className={`flex border-b border-gray-200 ${viewOnly ? 'hidden' : ''}`}>
          {['plan', 'requirements'].map((sheet) => (
            <button
              key={sheet}
              type="button"
              onClick={() => setActiveSheet(sheet)}
              className={`px-4 py-2 text-sm font-semibold ${activeSheet === sheet ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600'}`}
            >
              {sheet.toUpperCase()}
            </button>
          ))}
        </div>
        {viewOnly || activeSheet === 'plan' ? renderPlanSheet() : renderRequirementsSheet()}
        {viewOnly && renderReceivingForm()}
      </div>
    </div>
  );
}

export default PrintingPlan;
