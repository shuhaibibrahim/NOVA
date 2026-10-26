import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { auth, db } from '../firebase_config';
import { notify } from '../notifications';
import { genderForMaterialNumber, normalizeMatchValue, requirementMatchesArticle, sizeForRequirement as deriveSizeForRequirement, sizesForGender } from '../requirementMatching';

const PLAN_DELETE_EMAIL = 'ajimsha.albac@walkaroo.co.in';
const normalizeSizeKey = (value) => {
  const normalized = String(value || '').trim();
  return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized;
};
const normalizeNumericIdentifier = (value) => {
  const normalized = normalizeMatchValue(value);
  return /^\d+$/.test(normalized) ? normalized.replace(/^0+(?=\d)/, '') : normalized;
};

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
  ['qty', 'Order Qty'],
  ['csPlannedQty', 'CS PLANNED QTY'],
  ['balanceToPlan', 'BALANCE TO PLAN'],
  ['unit', 'Unit'],
];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const uppercasePlanText = (value) => String(value ?? '').toUpperCase();

const formatPlanDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || '';
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

const normalizedPackingKey = (key) => normalizeMatchValue(key).replace(/[^A-Z0-9]/g, '');

const packingQuantityForSize = (packing, sizeIndex) => {
  const matchingKey = Object.keys(packing || {}).find((key) =>
    normalizedPackingKey(key) === `SIZE${sizeIndex}`
  );
  const legacyQuantities = Array.isArray(packing?.packingComb)
    ? packing.packingComb
    : String(packing?.packingComb || '').split(',');
  const rawQuantity = matchingKey
    ? packing[matchingKey]
    : legacyQuantities[sizeIndex - 1];
  const quantity = Number(rawQuantity ?? 0);
  return Number.isFinite(quantity) ? quantity : 0;
};

const packingFieldValue = (packing, field) => {
  const matchingKey = Object.keys(packing || {}).find(
    (key) => normalizedPackingKey(key) === normalizedPackingKey(field)
  );
  return matchingKey ? packing[matchingKey] : '';
};

const packingMatchesPlan = (packing, plan) => {
  const planGender = plan.gender || genderForMaterialNumber(plan.materialNo);
  const packingGender = packingFieldValue(packing, 'gender');
  const packingSizeGrid = packingFieldValue(packing, 'sizeGrid');
  return normalizeMatchValue(packingGender) === normalizeMatchValue(planGender) &&
    normalizeMatchValue(packingSizeGrid).replace(/\s+/g, '') ===
      normalizeMatchValue(plan.size).replace(/\s+/g, '');
};

const incrementPlanCode = (planCode) => {
  const match = String(planCode || '').match(/^(.*?)(\d+)$/);
  if (!match) return '';

  const nextNumber = String(Number(match[2]) + 1).padStart(match[2].length, '0');
  return `${match[1]}${nextNumber}`;
};

function ClickingPlan({ viewOnly = false, isAdmin = false }) {
  const [setSelectedLink, setOpenedTab] = useOutletContext();
  const [activeSheet, setActiveSheet] = useState('plan');
  const [storedRequirements, setRequirements] = useState([]);
  const [borData, setBorData] = useState(null);
  const [cooisRows, setCooisRows] = useState([]);
  const [articles, setArticles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [packingCombinations, setPackingCombinations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [receiptRecords, setReceiptRecords] = useState([]);
  const [receiptRecordsLoaded, setReceiptRecordsLoaded] = useState(false);
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
  const [canDeletePlans, setCanDeletePlans] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [showOptionalRequirementColumns, setShowOptionalRequirementColumns] = useState(true);
  const [copyMessage, setCopyMessage] = useState('');
  const [showLoosePlanSheet, setShowLoosePlanSheet] = useState(false);
  const [looseModel, setLooseModel] = useState('');
  const [looseArticle, setLooseArticle] = useState('');
  const [looseColour, setLooseColour] = useState('');
  const [looseGender, setLooseGender] = useState('');
  const [selectedLooseComponents, setSelectedLooseComponents] = useState([]);
  const [looseFunctionDropdownOpen, setLooseFunctionDropdownOpen] = useState(false);
  const looseFunctionDropdownRef = useRef(null);
  const [looseSizeRows, setLooseSizeRows] = useState([]);
  const [bomRecords, setBomRecords] = useState([]);
  const [bomRecordsLoaded, setBomRecordsLoaded] = useState(false);
  const [receivingItem, setReceivingItem] = useState(null);
  const [receivedDate, setReceivedDate] = useState('');
  const [receivedSizeRows, setReceivedSizeRows] = useState([]);
  const [shortageRows, setShortageRows] = useState([]);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const canManagePlans = canDeletePlans && !viewOnly;

  useEffect(() => {
    setSelectedLink(viewOnly ? 'execution/clicker-plan' : 'planning-desk/clicking-plan');
    setOpenedTab(viewOnly ? 'execution' : 'planningDesk');
  }, [viewOnly, setSelectedLink, setOpenedTab]);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setCanDeletePlans(user?.email?.toLowerCase() === PLAN_DELETE_EMAIL);
  }), []);

  useEffect(() => {
    const requirementsRef = ref(db, 'requirementsData/');
    return onValue(requirementsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setRequirements(Object.entries(data).map(([id, requirement]) => ({ ...requirement, id })));
    });
  }, []);

  useEffect(() => onValue(ref(db, 'borData/'), (snapshot) => setBorData(snapshot.val())), []);

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

  useEffect(() => onValue(ref(db, 'clickerCompStoreReceipts/'), (snapshot) => {
    const data = snapshot.val() || {};
    setReceiptRecords(Object.entries(data).map(([id, receipt]) => ({ ...receipt, id })));
    setReceiptRecordsLoaded(true);
  }), []);

  useEffect(() => onValue(ref(db, 'cooisData/'), (snapshot) => {
    const data = snapshot.val() || {};
    setCooisRows(Object.values(data));
  }), []);

  useEffect(() => onValue(ref(db, 'vendorDetails/'), (snapshot) => {
    const data = snapshot.val() || {};
    setVendors(Object.entries(data).map(([id, vendor]) => ({ ...vendor, id })));
  }), []);

  useEffect(() => {
    return onValue(ref(db, 'bomData/'), (snapshot) => {
      const data = snapshot.val() || {};
      setBomRecords(Object.entries(data).map(([id, record]) => ({ ...record, id })));
      setBomRecordsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!looseFunctionDropdownOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!looseFunctionDropdownRef.current?.contains(event.target)) {
        setLooseFunctionDropdownOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setLooseFunctionDropdownOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [looseFunctionDropdownOpen]);

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

  const clickerVendors = useMemo(
    () => vendors.filter((vendor) => normalizeMatchValue(vendor.area).includes('CLICK')),
    [vendors]
  );
  const defaultClickerVendor = clickerVendors.find((vendor) => vendor.isDefault) ||
    (clickerVendors.length === 1 ? clickerVendors[0] : null);

  const packingForPlan = (plan) => packingCombinations.find((packing) => packingMatchesPlan(packing, plan));

  const formattedPlanGroups = useMemo(() => {
    const planGroups = new Map();

    filteredPlans.forEach((plan) => {
      const planKey = `${plan.planCode || ''}|${plan.planningDate || ''}`;
      if (!planGroups.has(planKey)) {
        planGroups.set(planKey, {
          key: planKey,
          planCode: plan.planCode || '',
          planningDate: plan.planningDate || '',
          items: new Map(),
        });
      }

      const planGroup = planGroups.get(planKey);
      const articleName = String(plan.article || '').trim();
      const colour = String(plan.colour ?? plan.color ?? '').trim();
      const gender = String(plan.gender || genderForMaterialNumber(plan.materialNo) || '').trim();
      const articleData = articles.find((article) =>
        normalizeMatchValue(article.article) === normalizeMatchValue(articleName) &&
        normalizeMatchValue(article.colour ?? article.color) === normalizeMatchValue(colour) &&
        normalizeMatchValue(article.gender) === normalizeMatchValue(gender) &&
        (!plan.priceCategory ||
          normalizeMatchValue(article.priceCategory) === normalizeMatchValue(plan.priceCategory))
      );
      const remarks = String(plan.remarks ?? plan.looseComponentType ?? '');
      const vendorName = String(plan.vendorName || defaultClickerVendor?.vendorName || '');
      const itemKey = [
        vendorName,
        normalizeMatchValue(plan.model || articleData?.model),
        normalizeMatchValue(articleName),
        normalizeMatchValue(gender),
        normalizeMatchValue(colour),
        String(plan.priceCategory || articleData?.priceCategory || '').slice(0, 2),
        normalizeMatchValue(remarks),
        normalizeMatchValue(plan.lotNumber),
      ].join('|');

      if (!planGroup.items.has(itemKey)) {
        const fullModel = plan.model || articleData?.model || '';
        const normalizedModel = normalizeMatchValue(fullModel);
        planGroup.items.set(itemKey, {
          key: itemKey,
          plans: [],
          vendorName,
          model: normalizedModel.includes('SINGLE DENSITY') ? 'SD' : fullModel,
          article: articleName,
          articleDataId: articleData?.id || plan.articleDataId || '',
          gender,
          colour,
          category: String(plan.priceCategory || articleData?.priceCategory || '').slice(0, 2),
          remarks,
          lotNumber: String(plan.lotNumber || ''),
          caseQty: 0,
          sizes: new Map(),
        });
      }

      const itemGroup = planGroup.items.get(itemKey);
      itemGroup.plans.push(plan);
      const size = String(plan.size || '').trim();
      const plannedQty = Number(plan.plannedQty) || 0;
      const loosePairMtoPrQty = Number(articleData?.pairMtoPrQty) || 0;
      const caseQty = plan.isLoosePlan
        ? loosePairMtoPrQty > 0
          ? ((Number(plan.leftQty) || 0) + (Number(plan.rightQty) || 0)) / (2 * loosePairMtoPrQty)
          : 0
        : Number(plan.caseQty ?? plannedQty) || 0;
      itemGroup.caseQty += caseQty;

      const packing = plan.isLoosePlan ? null : packingForPlan(plan);
      const gridSizes = packing ? sizesInPackingGrid(plan.size) : [];
      const planSizes = gridSizes.length ? gridSizes : [size];
      planSizes.forEach((planSize) => {
        if (!itemGroup.sizes.has(planSize)) {
          itemGroup.sizes.set(planSize, { size: planSize, leftQty: 0, rightQty: 0, caseQty: 0, plans: [] });
        }

        const sizeGroup = itemGroup.sizes.get(planSize);
        sizeGroup.plans.push(plan);
        if (plan.isLoosePlan) {
          sizeGroup.leftQty += Number(plan.leftQty) || 0;
          sizeGroup.rightQty += Number(plan.rightQty) || 0;
          return;
        }

        if (gridSizes.length) {
          const sizeIndex = Number(planSize);
          const quantityPerCase = packingQuantityForSize(packing, sizeIndex);
          sizeGroup.leftQty += quantityPerCase * caseQty;
          sizeGroup.rightQty += quantityPerCase * caseQty;
        } else {
          sizeGroup.leftQty += Number(plan.leftQty ?? plan.plannedQty) || 0;
          sizeGroup.rightQty += Number(plan.rightQty ?? plan.plannedQty) || 0;
        }
        sizeGroup.caseQty += caseQty;
      });
    });

    return [...planGroups.values()].map((planGroup) => {
      const items = [...planGroup.items.values()].map((item) => ({
        ...item,
        sizes: [...item.sizes.values()].sort((first, second) =>
          String(first.size).localeCompare(String(second.size), undefined, { numeric: true })
        ),
      }));
      const totals = items.reduce((summary, item) => {
        const isPuCork = normalizeMatchValue(item.model).includes('PU CORK');
        const modelTotals = isPuCork
          ? { pairs: 'puCorkPairs', cases: 'puCorkCases' }
          : { pairs: 'singleDensityPairs', cases: 'singleDensityCases' };
        item.sizes.forEach((size) => {
          summary[modelTotals.pairs] += (size.leftQty + size.rightQty) / 2;
        });
        summary[modelTotals.cases] += item.caseQty;
        return summary;
      }, { puCorkPairs: 0, puCorkCases: 0, singleDensityPairs: 0, singleDensityCases: 0 });
      return { ...planGroup, items, totals };
    });
  }, [filteredPlans, articles, vendors, packingCombinations]);

  const togglePlanSelection = (planId) => {
    setSelectedPlanIds((selected) => selected.includes(planId)
      ? selected.filter((id) => id !== planId)
      : [...selected, planId]);
  };

  const togglePlanGroupSelection = (planGroup) => {
    const planIds = [...new Set(planGroup.items.flatMap((item) => item.plans.map((plan) => plan.id)))];
    const allSelected = planIds.length > 0 && planIds.every((id) => selectedPlanIds.includes(id));
    setSelectedPlanIds((selected) => allSelected
      ? selected.filter((id) => !planIds.includes(id))
      : [...new Set([...selected, ...planIds])]);
  };

  const deleteSelectedPlans = async () => {
    if (!canManagePlans || !selectedPlanIds.length) return;

    if (!window.confirm(`Delete ${selectedPlanIds.length} selected Clicking Plan item(s)? This cannot be undone.`)) return;

    try {
      await Promise.all(selectedPlanIds.map((id) => remove(ref(db, `clickingPlans/${id}`))));
      setSelectedPlanIds([]);
    } catch (error) {
      window.alert(`Unable to delete the selected plans: ${error.message}`);
    }
  };

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
    if (requirement.isLoosePlan || requirement.isBor) return requirement.model || '';
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
    return requirement.isLoosePlan || requirement.isBor ? requirement.gender : genderForMaterialNumber(requirement.materialNo);
  };

  const sizeForRequirement = (requirement) => (
    requirement.size || deriveSizeForRequirement(requirement)
  );

  const looseModels = useMemo(
    () => [...new Set(articles.map((article) => String(article.model || '').trim()).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second)),
    [articles]
  );

  const looseArticles = useMemo(
    () => [...new Set(articles
      .filter((article) => normalizeMatchValue(article.model) === normalizeMatchValue(looseModel))
      .map((article) => String(article.article || '').trim())
      .filter(Boolean))]
      .sort((first, second) => first.localeCompare(second)),
    [articles, looseModel]
  );

  const looseGenders = useMemo(
    () => [...new Set(articles
      .filter((article) =>
        normalizeMatchValue(article.model) === normalizeMatchValue(looseModel) &&
        normalizeMatchValue(article.article) === normalizeMatchValue(looseArticle)
      )
      .map((article) => String(article.gender || '').trim())
      .filter(Boolean))]
      .sort((first, second) => first.localeCompare(second)),
    [articles, looseModel, looseArticle]
  );

  const looseColours = useMemo(
    () => [...new Set(articles
      .filter((article) =>
        normalizeMatchValue(article.model) === normalizeMatchValue(looseModel) &&
        normalizeMatchValue(article.article) === normalizeMatchValue(looseArticle) &&
        normalizeMatchValue(article.gender) === normalizeMatchValue(looseGender)
      )
      .map((article) => String(article.colour ?? article.color ?? '').trim())
      .filter(Boolean))]
      .sort((first, second) => first.localeCompare(second)),
    [articles, looseModel, looseArticle, looseGender]
  );

  const looseComponentOptions = useMemo(() => {
    const matchingArticleIds = new Set(articles
      .filter((article) =>
        normalizeMatchValue(article.model) === normalizeMatchValue(looseModel) &&
        normalizeMatchValue(article.article) === normalizeMatchValue(looseArticle) &&
        normalizeMatchValue(article.gender) === normalizeMatchValue(looseGender) &&
        normalizeMatchValue(article.colour ?? article.color) === normalizeMatchValue(looseColour)
      )
      .map((article) => article.id));
    const linkedBomIds = new Set(articles
      .filter((article) => matchingArticleIds.has(article.id))
      .flatMap((article) => String(article.bomIds || '').split(',').map((id) => id.trim()).filter(Boolean)));
    return bomRecords
      .filter((record) =>
        linkedBomIds.has(record.id) &&
        normalizeMatchValue(record.functionName || record.process) === 'CLICKING'
      )
      .map((record) => ({
        id: record.id,
        details: String(record.componentDetails || record.materialDesc || record.materialNumber || '').trim(),
      }))
      .filter((record) => record.details)
      .sort((first, second) => first.details.localeCompare(second.details));
  }, [articles, bomRecords, looseModel, looseArticle, looseGender, looseColour]);

  const updateLooseSizeRow = (index, field, value) => {
    setLooseSizeRows((rows) => rows.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
  };

  const addLoosePlanItems = () => {
    const componentType = looseComponentOptions
      .filter((component) => selectedLooseComponents.includes(component.id))
      .map((component) => component.details)
      .join(', ');
    const enteredRows = looseSizeRows.filter((row) => row.leftQty !== '' || row.rightQty !== '');

    if (!looseArticle || !looseColour || !looseGender || !componentType || !enteredRows.length) {
      window.alert('Select an article, colour, gender, and at least one Clicking BOM component, then enter at least one Left or Right quantity.');
      return;
    }

    if (enteredRows.some((row) => (
      [row.leftQty, row.rightQty].some((qty) =>
        qty !== '' && (!Number.isInteger(Number(qty)) || Number(qty) < 0)
      ) || (Number(row.leftQty || 0) + Number(row.rightQty || 0) <= 0)
    ))) {
      window.alert('Enter a positive whole-number quantity in Left or Right for each size.');
      return;
    }

    const matchingArticle = articles.find((article) =>
      normalizeMatchValue(article.model) === normalizeMatchValue(looseModel) &&
      normalizeMatchValue(article.article) === normalizeMatchValue(looseArticle) &&
      normalizeMatchValue(article.colour ?? article.color) === normalizeMatchValue(looseColour) &&
      normalizeMatchValue(article.gender) === normalizeMatchValue(looseGender)
    );

    const looseItems = enteredRows.map((row, index) => {
      const id = `loose-${Date.now()}-${index}`;
      const leftQty = Number(row.leftQty || 0);
      const rightQty = Number(row.rightQty || 0);
      const qty = leftQty + rightQty;
      const requirement = {
        id,
        isLoosePlan: true,
        model: matchingArticle?.model || '',
        gender: looseGender,
        article: looseArticle,
        colour: looseColour,
        gender: matchingArticle?.gender || looseGender,
        priceCategory: matchingArticle?.priceCategory || '',
        size: row.size.trim(),
        qty,
        leftQty,
        rightQty,
        unit: 'CS',
        looseComponentType: componentType,
        looseComponentIds: [...selectedLooseComponents],
      };
      return { requirement, plannedQty: qty };
    });

    setCart((current) => [
      ...current.filter((item) => !looseItems.some((looseItem) => looseItem.requirement.id === item.requirement.id)),
      ...looseItems,
    ]);
    setShowLoosePlanSheet(false);
    setLooseModel('');
    setLooseArticle('');
    setLooseColour('');
    setLooseGender('');
    setSelectedLooseComponents([]);
    setLooseFunctionDropdownOpen(false);
    setLooseSizeRows([]);
  };

  const borColumnIndexes = useMemo(() => {
    const headers = (borData?.headers || []).map((heading) => String(heading).toLowerCase().replace(/[^a-z0-9]/g, ''));
    const find = (candidates) => headers.findIndex((heading) => candidates.some((candidate) => heading.includes(candidate)));
    return {
      sku: find(['skucode', 'sku']),
      article: find(['article']),
      colour: find(['colour', 'color']),
      size: find(['size']),
      gender: find(['gender']),
      qty: find(['cumtog']),
    };
  }, [borData]);

  const borColumnError = useMemo(() => {
    if (!borData?.headers?.length) return '';
    const labels = { sku: 'SKU Code', article: 'Article', colour: 'Color', size: 'Size', gender: 'Gender', qty: 'Cum Tog' };
    const missing = Object.entries(borColumnIndexes).filter(([, index]) => index < 0).map(([key]) => labels[key]);
    return missing.length ? `BOR rows were not loaded. Missing BOR column(s): ${missing.join(', ')}.` : '';
  }, [borData, borColumnIndexes]);

  const requirements = useMemo(() => {
    if (!borData?.rows || Object.values(borColumnIndexes).some((index) => index < 0)) return storedRequirements;

    const dateOfReq = new Date(borData.uploadedAt || Date.now());
    const dateText = `${String(dateOfReq.getDate()).padStart(2, '0')}/${String(dateOfReq.getMonth() + 1).padStart(2, '0')}/${dateOfReq.getFullYear()}`;
    const borRowsByKey = new Map();
    Object.values(borData.rows).forEach((row) => {
      const skuCode = String(row[borColumnIndexes.sku] ?? '').trim();
      const article = String(row[borColumnIndexes.article] ?? '').trim();
      const qty = Number(String(row[borColumnIndexes.qty] ?? '').replace(/,/g, ''));
      if (!skuCode || !article || !Number.isFinite(qty) || qty <= 0) return;

      const matchingArticles = articles.filter((item) =>
        normalizeMatchValue(item.article) === normalizeMatchValue(article)
      );
      if (!matchingArticles.length) return;

      const colour = String(row[borColumnIndexes.colour] ?? '').trim();
      const gender = String(row[borColumnIndexes.gender] ?? '').trim();
      const size = String(row[borColumnIndexes.size] ?? '').trim();
      const articleData = matchingArticles.find((item) =>
        normalizeMatchValue(item.colour ?? item.color) === normalizeMatchValue(colour) &&
        normalizeMatchValue(item.gender) === normalizeMatchValue(gender)
      ) || matchingArticles[0];
      const id = `bor-${skuCode}`;
      const existing = borRowsByKey.get(id);
      if (existing) {
        existing.qty += qty;
        return;
      }
      borRowsByKey.set(id, {
        id,
        isBor: true,
        materialNo: skuCode.slice(0, -2),
        model: articleData.model || '',
        dateOfReq: dateText,
        reqType: 'BOR',
        salesOrder: '',
        lineItem: '',
        referenceNo: '',
        gender,
        article,
        colour,
        size,
        qty,
        unit: 'CS',
      });
    });
    return [...storedRequirements, ...borRowsByKey.values()];
  }, [storedRequirements, borData, borColumnIndexes, articles]);

  const borPlannedQtyForRequirement = (requirement) => (requirement.isBor || String(requirement.id).startsWith('bor-')
    ? plans.reduce((total, plan) => (
      (plan.requirementId === requirement.id || (plan.sourceRequirementIds || []).includes(requirement.id))
        ? total + (Number(plan.plannedQty) || 0)
        : total
    ), 0)
    : 0);

  const consumedQtyForRequirement = (requirement) => Math.max(
    Number(requirement.csPlannedQty) || 0,
    borPlannedQtyForRequirement(requirement)
  );

  const cooisPlannedQtyForRequirement = (requirement) => cooisRows.reduce((total, row) => {
    const matchesLineItem =
      normalizeMatchValue(row.material) === normalizeMatchValue(requirement.materialNo) &&
      normalizeNumericIdentifier(row.salesOrder) === normalizeNumericIdentifier(requirement.salesOrder) &&
      normalizeNumericIdentifier(row.salesOrderItem) === normalizeNumericIdentifier(requirement.lineItem);
    if (!matchesLineItem) return total;

    const status = normalizeMatchValue(row.systemStatus);
    const isClosed = status.includes('CLSD') || status.includes('TECO');
    if (requirement.isBor && isClosed) return total;
    const quantity = isClosed
      ? row.confirmedYieldQuantity
      : row.orderQuantity;
    const numericQuantity = Number(quantity);
    return total + (Number.isFinite(numericQuantity) ? numericQuantity : 0);
  }, 0);

  const cartPlannedQtyForRequirement = (requirement) => (
    cart.find((item) => item.requirement.id === requirement.id)?.plannedQty || 0
  );

  const balanceToPlanForRequirement = (requirement) => Math.max(
    0,
    (Number(requirement.qty) || 0) -
      consumedQtyForRequirement(requirement) -
      cartPlannedQtyForRequirement(requirement)
  );

  const liveAvailabilityForPlanItem = (planRequirement) => {
    const sourceIds = planRequirement.sourceRequirementIds || [planRequirement.id];
    const sourceRequirements = requirements.filter((requirement) => sourceIds.includes(requirement.id));
    if (!sourceRequirements.length) {
      return Math.max(0, (Number(planRequirement.qty) || 0) - consumedQtyForRequirement({
        ...planRequirement,
        csPlannedQty: cooisPlannedQtyForRequirement(planRequirement),
      }));
    }

    const orderQty = sourceRequirements.reduce((total, requirement) => total + (Number(requirement.qty) || 0), 0);
    const plannedQty = sourceRequirements.reduce((total, requirement) => (
      total + consumedQtyForRequirement({ ...requirement, csPlannedQty: cooisPlannedQtyForRequirement(requirement) })
    ), 0);
    const planOrderQty = planRequirement.isPairMtoSummary
      ? orderQty / Number(articles.find(
        (article) => normalizeMatchValue(article.article) === normalizeMatchValue(planRequirement.article)
      )?.pairMtoPrQty || 1)
      : orderQty;

    return Math.max(0, planOrderQty - plannedQty);
  };

  const requirementsForPlanning = useMemo(() => {
    const matchedRequirements = requirements
      .filter((requirement) => requirement.isBor || requirementMatchesArticle(requirement, articles))
      .map((requirement) => ({
        ...requirement,
        csPlannedQty: cooisPlannedQtyForRequirement(requirement),
      }));
    const pairMtoGroups = new Map();
    const planningRows = [];

    matchedRequirements.forEach((requirement) => {
      if (normalizeMatchValue(requirement.reqType) !== 'PAIR MTO') {
        planningRows.push(requirement);
        return;
      }

      const referenceNo = String(requirement.referenceNo || '').trim();
      const groupKey = referenceNo ? referenceNo.toUpperCase() : `missing-reference-${requirement.id}`;
      pairMtoGroups.set(groupKey, [...(pairMtoGroups.get(groupKey) || []), requirement]);
    });

    pairMtoGroups.forEach((group, groupKey) => {
      const firstRequirement = group[0];
      const articleName = normalizeMatchValue(firstRequirement.article);
      const matchingArticle = articles.find(
        (article) => normalizeMatchValue(article.article) === articleName
      );
      const pairMtoPrQty = Number(matchingArticle?.pairMtoPrQty);
      const totalQty = group.reduce((sum, requirement) => sum + (Number(requirement.qty) || 0), 0);
      const sizes = group.map((requirement) => deriveSizeForRequirement(requirement)).filter(Boolean);
      const groupMetadata = new Set(group.map((requirement) => [
        normalizeMatchValue(requirement.article),
        normalizeMatchValue(requirement.colour ?? requirement.color),
        normalizeMatchValue(genderForRequirement(requirement)),
        normalizeMatchValue(modelForRequirement(requirement)),
      ].join('|')));
      const hasConflictingMetadata = groupMetadata.size > 1;

      planningRows.push({
        ...firstRequirement,
        id: `pair-mto-${groupKey}`,
        sourceRequirementIds: group.map((requirement) => requirement.id),
        isPairMtoSummary: true,
        qty: Number.isFinite(pairMtoPrQty) && pairMtoPrQty > 0 ? totalQty / pairMtoPrQty : 0,
        csPlannedQty: group.reduce((sum, requirement) => sum + requirement.csPlannedQty, 0),
        size: sizes.join(', '),
        unit: 'CS',
        pairMtoPrQtyMissing: !Number.isFinite(pairMtoPrQty) || pairMtoPrQty <= 0,
        planningError: hasConflictingMetadata
          ? 'Rows with this Reference No. have conflicting article, colour, gender, or model values.'
          : !Number.isFinite(pairMtoPrQty) || pairMtoPrQty <= 0
            ? 'Pair MTO PR Qty is missing or invalid for this article.'
            : '',
      });
    });

    return planningRows
      .filter((requirement) => {
        const orderQty = Number(requirement.qty);
        return !(orderQty > 0 && consumedQtyForRequirement(requirement) >= orderQty);
      })
      .filter((requirement) =>
        [...REQUIREMENT_COLUMNS, ['materialNo', 'Material No.']].every(([key]) => {
        const filter = String(requirementFilters[key] || '').trim().toLowerCase();
        if (!filter) return true;

        const value = key === 'model'
          ? modelForRequirement(requirement)
          : key === 'gender'
            ? genderForRequirement(requirement)
            : key === 'size'
              ? sizeForRequirement(requirement)
              : key === 'balanceToPlan'
                ? balanceToPlanForRequirement(requirement)
              : requirement[key];

        return String(value ?? '').toLowerCase().includes(filter);
        })
      );
  }, [requirements, articles, requirementFilters, cooisRows, cart]);

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

  const updatePlannedQty = (requirementId, value) => {
    setPlannedQuantities((quantities) => ({ ...quantities, [requirementId]: value }));
  };

  const addToCart = (requirement) => {
    const plannedQty = Number(plannedQuantities[requirement.id] || 0);
    const requiredQty = Math.max(
      0,
      (Number(requirement.qty) || 0) - consumedQtyForRequirement(requirement)
    );
    if (!Number.isFinite(plannedQty) || plannedQty <= 0) {
      window.alert('Enter a quantity greater than zero before adding this item to the plan.');
      return;
    }
    if (plannedQty > requiredQty) {
      window.alert(`Planned quantity cannot exceed the balance to plan (${requiredQty}).`);
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

    const dateConflict = plans.some((plan) =>
      plan.planningDate === planningDate &&
      normalizeMatchValue(plan.planCode) !== normalizedPlanCode
    );
    if (dateConflict) {
      window.alert('A different plan code already exists for this planning date. Add to that existing plan or choose another date.');
      return;
    }

    if (!cart.length) {
      window.alert('Add at least one valid requirement to the plan before reviewing.');
      return;
    }

    const overplannedItem = cart.find(({ requirement, plannedQty }) =>
      plannedQty > liveAvailabilityForPlanItem(requirement)
    );
    if (overplannedItem) {
      window.alert(`The available balance for ${overplannedItem.requirement.article || 'a selected item'} has changed. Update its planned quantity before reviewing.`);
      return;
    }

    setShowCartReview(true);
  };

  const submitPlan = async () => {
    const selectedPlanCode = planCodeMode === 'existing' ? previousPlanCode : (nextPlanCode || planCode);
    const normalizedPlanCode = selectedPlanCode.trim().toUpperCase();
    if (!cart.length) return;

    const dateConflict = plans.some((plan) =>
      plan.planningDate === planningDate &&
      normalizeMatchValue(plan.planCode) !== normalizedPlanCode
    );
    if (dateConflict) {
      window.alert('A different plan code already exists for this planning date. Add to that existing plan or choose another date.');
      setShowCartReview(false);
      return;
    }

    const overplannedItem = cart.find(({ requirement, plannedQty }) =>
      plannedQty > liveAvailabilityForPlanItem(requirement)
    );
    if (overplannedItem) {
      window.alert(`The available balance for ${overplannedItem.requirement.article || 'a selected item'} has changed. Return to Requirements and update its planned quantity.`);
      setShowCartReview(false);
      return;
    }

    if (!window.confirm(`Submit ${cart.length} Clicking Plan item(s) under ${normalizedPlanCode}?`)) return;

    await Promise.all(cart.map(({ requirement, plannedQty }) => {
      const planRef = push(ref(db, 'clickingPlans/'));
      return set(planRef, {
        ...requirement,
        model: modelForRequirement(requirement),
        gender: requirement.isLoosePlan ? requirement.gender : genderForRequirement(requirement),
        size: sizeForRequirement(requirement),
        unit: normalizeMatchValue(requirement.unit) === 'PR' ? 'CS' : requirement.unit,
        id: planRef.key,
        requirementId: requirement.id,
        sourceRequirementIds: requirement.sourceRequirementIds || [requirement.id],
        planCode: normalizedPlanCode,
        planningDate,
        plannedQty,
        caseQty: requirement.isLoosePlan ? 0 : plannedQty,
        leftQty: requirement.isLoosePlan ? requirement.leftQty : plannedQty,
        rightQty: requirement.isLoosePlan ? requirement.rightQty : plannedQty,
        submittedAt: Date.now(),
      });
    }));

    const flagged = new Set();
    cart.forEach(({ requirement }) => {
      const article = articleForReceivingItem(requirement);
      const label = `${requirement.article || article?.article || 'Article'} ${requirement.colour || ''}`.trim();
      if (flagged.has(label)) return;
      flagged.add(label);
      const records = bomComponentsForArticle(article);
      if (!article || !records.length) {
        notify(`BOM missing: ${label} has no BOM entries linked. Complete the BOM Entry before it reaches the other functions.`, 'error');
        return;
      }
      const functionOf = (record) => String(record.functionName || record.process || '').trim().toUpperCase();
      const missing = ['STITCHING', 'MOLDING', 'GRINDING', 'STUCKON', 'PACKING']
        .filter((fn) => !records.some((record) => functionOf(record) === fn));
      if (missing.length) {
        notify(`BOM incomplete: ${label} has no BOM for ${missing.join(', ')}. Complete it before the pairs reach these functions.`, 'error');
      }
      const stitchingWithoutChild = records.filter((record) => functionOf(record) === 'STITCHING' &&
        !(record.childComponentIds || []).some((id) => ['CLICKING', 'PRINTING'].includes(functionOf(records.find((item) => item.id === id) || {}))));
      if (stitchingWithoutChild.length) {
        notify(`BOM incomplete: ${label} has Stitching components without Clicking or Printing child components.`, 'error');
      }
    });

    setPlanCode('');
    setPreviousPlanCode('');
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
      showLoosePlanSheet ? (
        <div className="space-y-5 rounded border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Loose Plan</h2>
              <p className="mt-1 text-sm text-gray-500">Add component quantities by article, colour, and size.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowLoosePlanSheet(false)}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Requirements
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Model
              <select
                value={looseModel}
                onChange={(event) => {
                  setLooseModel(event.target.value);
                  setLooseArticle('');
                  setLooseGender('');
                  setLooseColour('');
                  setSelectedLooseComponents([]);
                  setLooseSizeRows([]);
                }}
                className="rounded border border-gray-300 bg-white p-2.5 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select model</option>
                {looseModels.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Article
              <select
                value={looseArticle}
                onChange={(event) => {
                  setLooseArticle(event.target.value);
                  setLooseGender('');
                  setLooseColour('');
                  setSelectedLooseComponents([]);
                  setLooseSizeRows([]);
                }}
                disabled={!looseModel}
                className="rounded border border-gray-300 bg-white p-2.5 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select article</option>
                {looseArticles.map((article) => <option key={article} value={article}>{article}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Gender
              <select
                value={looseGender}
                onChange={(event) => {
                  const gender = event.target.value;
                  setLooseGender(gender);
                  setLooseColour('');
                  setSelectedLooseComponents([]);
                  setLooseSizeRows(sizesForGender(gender)
                    .map((size) => ({ size, leftQty: '', rightQty: '' })));
                }}
                disabled={!looseArticle}
                className="rounded border border-gray-300 bg-white p-2.5 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select gender</option>
                {looseGenders.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Colour
              <select
                value={looseColour}
                onChange={(event) => {
                  setLooseColour(event.target.value);
                  setSelectedLooseComponents([]);
                }}
                disabled={!looseGender}
                className="rounded border border-gray-300 bg-white p-2.5 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
              >
                <option value="">Select colour</option>
                {looseColours.map((colour) => <option key={colour} value={colour}>{colour}</option>)}
              </select>
            </label>
            <div ref={looseFunctionDropdownRef} className="relative flex flex-col gap-1 text-sm font-medium text-gray-700">
              <span>Components</span>
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={looseFunctionDropdownOpen}
                disabled={!looseModel || !looseArticle || !looseGender || !looseColour}
                onClick={() => setLooseFunctionDropdownOpen((open) => !open)}
                className="flex min-h-[42px] items-center justify-between rounded border border-gray-300 bg-white px-3 py-2.5 text-left font-normal focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
              >
                <span className="truncate">
                  {selectedLooseComponents.length
                    ? looseComponentOptions
                      .filter((component) => selectedLooseComponents.includes(component.id))
                      .map((component) => component.details)
                      .join(', ')
                    : looseModel && looseArticle && looseGender && looseColour ? 'Select Clicking components' : 'Select model, article, gender, and colour first'}
                </span>
                <span aria-hidden="true">▾</span>
              </button>
              {looseFunctionDropdownOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full min-w-56 overflow-auto rounded border border-gray-300 bg-white p-2 shadow-lg">
                  {!bomRecordsLoaded ? (
                    <p className="px-2 py-2 font-normal text-gray-500">Loading BOM components...</p>
                  ) : looseComponentOptions.length ? looseComponentOptions.map((component) => (
                    <label key={component.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-normal hover:bg-blue-50">
                      <input
                        type="checkbox"
                        checked={selectedLooseComponents.includes(component.id)}
                        onChange={() => setSelectedLooseComponents((current) => (
                          current.includes(component.id)
                            ? current.filter((selected) => selected !== component.id)
                            : [...current, component.id]
                        ))}
                      />
                      {component.details}
                    </label>
                  )) : (
                    <p className="px-2 py-2 font-normal text-gray-500">No Clicking components are linked to this article, colour, and gender.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded border border-gray-200">
            <div className="bg-gray-50 px-4 py-3">
              <h3 className="font-semibold text-gray-800">Size Quantities</h3>
              <p className="text-xs text-gray-500">Enter Left and Right quantities for the sizes shown.</p>
            </div>
            <div className="overflow-x-auto p-4">
              {looseSizeRows.length ? (
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-600">
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">Left</th>
                      <th className="px-3 py-2">Right</th>
                    </tr>
                  </thead>
                  <tbody>
                    {looseSizeRows.map((row, index) => (
                      <tr key={row.size} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-semibold text-gray-700">{row.size}</td>
                        {['leftQty', 'rightQty'].map((field) => (
                          <td key={field} className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={row[field]}
                              onChange={(event) => updateLooseSizeRow(index, field, event.target.value)}
                              aria-label={`${row.size} ${field === 'leftQty' ? 'Left' : 'Right'} quantity`}
                              className="w-full max-w-40 rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-4 text-center text-sm text-gray-500">Select a gender to display its sizes.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowLoosePlanSheet(false)}
              className="rounded border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addLoosePlanItems}
              className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
            >
              Add to Plan
            </button>
          </div>
        </div>
      ) : (
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
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reviewPlan} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-800">
            Review Plan ({cart.length})
          </button>
          <button
            type="button"
            onClick={() => setShowLoosePlanSheet(true)}
            className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Loose Plan
          </button>
          <button
            type="button"
            onClick={() => setShowOptionalRequirementColumns((visible) => !visible)}
            aria-pressed={showOptionalRequirementColumns}
            className="rounded border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
          >
            {showOptionalRequirementColumns ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {borColumnError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{borColumnError}</p>}
      <div className="max-h-[55vh] min-w-0 overflow-auto border border-gray-200">
        <table className="min-w-[2050px] w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-200 text-xs font-semibold shadow-sm">
            <tr>
              <th className="p-3 text-left">SI NO</th>
              {showOptionalRequirementColumns && (
                <th className="p-3 text-left align-top">
                  <div>MATERIAL NO.</div>
                  <input
                    type="text"
                    value={requirementFilters.materialNo || ''}
                    onChange={(event) => setRequirementFilters((current) => ({
                      ...current,
                      materialNo: event.target.value,
                    }))}
                    placeholder="Filter"
                    aria-label="Filter requirements by Material No."
                    className="mt-1 w-full min-w-20 rounded border border-gray-300 bg-white p-1 text-xs font-normal focus:border-blue-500 focus:outline-none"
                  />
                </th>
              )}
              {REQUIREMENT_COLUMNS.filter(([key]) =>
                showOptionalRequirementColumns || !['salesOrder', 'lineItem', 'referenceNo'].includes(key)
              ).map(([key, label]) => (
                <th key={label} className="p-3 text-left align-top">
                  <div>{label.toUpperCase()}</div>
                  {key !== 'balanceToPlan' && <input
                    type="text"
                    value={requirementFilters[key] || ''}
                    onChange={(event) => setRequirementFilters((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))}
                    placeholder="Filter"
                    aria-label={`Filter requirements by ${label}`}
                    className="mt-1 w-full min-w-20 rounded border border-gray-300 bg-white p-1 text-xs font-normal focus:border-blue-500 focus:outline-none"
                  />}
                </th>
              ))}
              <th className="p-3 text-left">QTY TO BE PLANNED</th>
              <th className="p-3 text-left">PLAN</th>
            </tr>
          </thead>
          <tbody>
            {requirementsForPlanning.map((requirement, index) => (
              (() => {
                const availableToPlan = Math.max(
                  0,
                  (Number(requirement.qty) || 0) - consumedQtyForRequirement(requirement)
                );
                const exceedsRequirement = Number(plannedQuantities[requirement.id] || 0) > availableToPlan;
                return (
              <tr key={requirement.id} className="border-b border-gray-200 align-top">
                <td className="p-3">{index + 1}</td>
                {showOptionalRequirementColumns && <td className="p-3 break-words">{requirement.materialNo ?? ''}</td>}
                {REQUIREMENT_COLUMNS.filter(([key]) =>
                  showOptionalRequirementColumns || !['salesOrder', 'lineItem', 'referenceNo'].includes(key)
                ).map(([key]) => (
                  <td key={key} className="p-3 break-words">
                    {key === 'model'
                      ? modelForRequirement(requirement)
                      : key === 'gender'
                        ? genderForRequirement(requirement)
                        : key === 'size'
                          ? sizeForRequirement(requirement)
                          : key === 'balanceToPlan'
                            ? balanceToPlanForRequirement(requirement)
                          : key === 'unit' && normalizeMatchValue(requirement[key]) === 'PR'
                            ? 'CS'
                        : requirement[key] ?? ''}
                  </td>
                ))}
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    max={availableToPlan}
                    step="1"
                    value={plannedQuantities[requirement.id] || ''}
                    onChange={(event) => updatePlannedQty(requirement.id, event.target.value)}
                    className={`no-number-spinner w-full min-w-0 rounded border p-1 focus:outline-none ${exceedsRequirement ? 'border-red-600 focus:border-red-600' : 'border-blue-200 focus:border-blue-500'}`}
                  />
                </td>
                <td className="p-3">
                  {requirement.planningError && (
                    <p className="mb-2 max-w-64 text-xs text-red-700">{requirement.planningError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => addToCart(requirement)}
                    disabled={Boolean(requirement.planningError) || Number(plannedQuantities[requirement.id] || 0) > Number(requirement.qty || 0)}
                    className="whitespace-nowrap rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cart.some((item) => item.requirement.id === requirement.id) ? 'Update Plan' : 'Add to Plan'}
                  </button>
                </td>
              </tr>
                );
              })()
            ))}
            {!requirementsForPlanning.length && (
              <tr>
                <td colSpan={
                  REQUIREMENT_COLUMNS.length + 3 +
                  (showOptionalRequirementColumns ? 1 : 0) -
                  (showOptionalRequirementColumns ? 0 : 3)
                } className="p-4 text-center text-gray-500">No requirements have been entered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )
      ) : (
        <div className="space-y-4 rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Review Plan ({cart.length} items)</h2>
            <button type="button" onClick={() => setShowCartReview(false)} className="text-blue-600 hover:underline">Back to Requirements</button>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold">
              <span>SINGLE DENSITY: {cartTotals.singleDensityPairs} PR, {cartTotals.singleDensityCases} CS</span>
              <span>PU CORK: {cartTotals.puCorkPairs} PR, {cartTotals.puCorkCases} CS</span>
            </div>
            <div className="max-h-[55vh] min-w-0 overflow-auto border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-200 text-left text-xs font-semibold">
                  <tr>
                    <th className="p-3">Article</th>
                    <th className="p-3">Colour</th>
                    <th className="p-3">Component Type</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Requirement Qty</th>
                    <th className="p-3">Left Qty</th>
                    <th className="p-3">Right Qty</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(({ requirement, plannedQty }) => (
                    <tr key={requirement.id} className="border-b">
                      <td className="p-3">{requirement.article}</td>
                      <td className="p-3">{requirement.colour}</td>
                      <td className="p-3">{requirement.looseComponentType || ''}</td>
                      <td className="p-3">{sizeForRequirement(requirement)}</td>
                      <td className="p-3">{requirement.qty}</td>
                      <td className="p-3">{requirement.isLoosePlan ? requirement.leftQty : plannedQty}</td>
                      <td className="p-3">{requirement.isLoosePlan ? requirement.rightQty : plannedQty}</td>
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

  const updatePlanItemField = async (item, field, value) => {
    try {
      await Promise.all(item.plans.map((plan) =>
        set(ref(db, `clickingPlans/${plan.id}/${field}`), value)
      ));
    } catch (error) {
      const fieldLabel = { vendorName: 'vendor', remarks: 'remarks', lotNumber: 'lot number' }[field] || field;
      window.alert(`Unable to update ${fieldLabel}: ${error.message}`);
    }
  };

  const articleForReceivingItem = (item) => articles.find((article) =>
    (item.articleDataId && article.id === item.articleDataId) ||
    (
      normalizeMatchValue(article.article) === normalizeMatchValue(item.article) &&
      normalizeMatchValue(article.colour ?? article.color) === normalizeMatchValue(item.colour) &&
      normalizeMatchValue(article.gender) === normalizeMatchValue(item.gender) &&
      normalizeMatchValue(article.priceCategory).slice(0, 2) === normalizeMatchValue(item.category)
    )
  );

  const bomComponentsForArticle = (article) => {
    const linkedBomIds = String(article?.bomIds || '').split(',').map((id) => id.trim()).filter(Boolean);
    return bomRecords.filter((record) => linkedBomIds.includes(record.id));
  };

  const openReceivingForm = (item) => {
    const today = new Date();
    const receiptIds = [...new Set(item.plans.flatMap((plan) =>
      String(plan.receiptIds || '').split(',').map((id) => id.trim()).filter(Boolean)
    ))];
    const existingReceipts = receiptRecords.filter((receipt) => receiptIds.includes(receipt.id));
    const priorQuantities = new Map();
    const priorShortages = new Map();
    existingReceipts.forEach((receipt) => {
      (receipt.receivedSizes || []).forEach((row) => {
        const key = normalizeSizeKey(row.size);
        const current = priorQuantities.get(key) || { leftQty: 0, rightQty: 0 };
        current.leftQty += Number(row.leftQty) || 0;
        current.rightQty += Number(row.rightQty) || 0;
        priorQuantities.set(key, current);
      });
      (receipt.shortages || []).forEach((shortage) => {
        const key = `${shortage.componentId}|${shortage.size}|${shortage.side}`;
        const current = priorShortages.get(key) || {
          componentId: shortage.componentId || '',
          size: shortage.size || '',
          side: shortage.side || '',
          qty: 0,
          shortageReceivedQuantity: Number(shortage.shortageReceivedQuantity) || 0,
          shortageReceivedDate: shortage.shortageReceivedDate || '',
          shortageStatus: shortage.shortageStatus || '',
        };
        current.qty += Number(shortage.quantity) || 0;
        current.shortageReceivedQuantity = Number(shortage.shortageReceivedQuantity) || current.shortageReceivedQuantity;
        current.shortageReceivedDate = shortage.shortageReceivedDate || current.shortageReceivedDate;
        current.shortageStatus = shortage.shortageStatus || current.shortageStatus;
        priorShortages.set(key, current);
      });
    });
    setReceivingItem(item);
    setReceivedDate(
      existingReceipts[existingReceipts.length - 1]?.receivedDate ||
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    );
    setReceivedSizeRows(item.sizes.map((size) => ({
      size: size.size,
      leftQty: String(priorQuantities.get(normalizeSizeKey(size.size))?.leftQty ?? size.leftQty ?? 0),
      rightQty: String(priorQuantities.get(normalizeSizeKey(size.size))?.rightQty ?? size.rightQty ?? 0),
    })));
    setShortageRows([...priorShortages.values()].map((row) => ({ ...row, qty: String(row.qty) })));
  };

  const updateReceivedSize = (index, field, value) => {
    setReceivedSizeRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
  };

  const submitReceivingStatus = async (event) => {
    event.preventDefault();
    if (!receiptRecordsLoaded) {
      window.alert('Receiving records are still loading. Please try again in a moment.');
      return;
    }
    if (!receivingItem || !receivedDate) {
      window.alert('Enter the received date before submitting.');
      return;
    }
    const receivedSizes = receivedSizeRows.map((row) => ({
      size: row.size,
      leftQty: Number(row.leftQty || 0),
      rightQty: Number(row.rightQty || 0),
    }));
    if (receivedSizes.some((row) =>
      !Number.isInteger(row.leftQty) || row.leftQty < 0 ||
      !Number.isInteger(row.rightQty) || row.rightQty < 0
    )) {
      window.alert('Enter non-negative whole numbers for received Left and Right quantities.');
      return;
    }
    const linkedReceiptIds = [...new Set(receivingItem.plans.flatMap((plan) =>
      String(plan.receiptIds || '').split(',').map((id) => id.trim()).filter(Boolean)
    ))];
    const existingReceipts = receiptRecords.filter((receipt) => linkedReceiptIds.includes(receipt.id));
    const existingQuantities = new Map();
    existingReceipts.forEach((receipt) => {
      (receipt.receivedSizes || []).forEach((row) => {
        const key = normalizeSizeKey(row.size);
        const current = existingQuantities.get(key) || { leftQty: 0, rightQty: 0 };
        current.leftQty += Number(row.leftQty) || 0;
        current.rightQty += Number(row.rightQty) || 0;
        existingQuantities.set(key, current);
      });
    });
    for (const row of receivedSizes) {
      const plannedSize = receivingItem.sizes.find((size) => String(size.size) === String(row.size));
      if (!plannedSize || row.leftQty > Number(plannedSize.leftQty || 0) ||
        row.rightQty > Number(plannedSize.rightQty || 0)) {
        window.alert(`Received quantities for size ${row.size} cannot exceed the plan quantities.`);
        return;
      }
      const previous = existingQuantities.get(normalizeSizeKey(row.size)) || { leftQty: 0, rightQty: 0 };
      const reductionBaseline = existingReceipts.length
        ? previous
        : { leftQty: Number(plannedSize.leftQty || 0), rightQty: Number(plannedSize.rightQty || 0) };
      if (!isAdmin && (
        row.leftQty < reductionBaseline.leftQty || row.rightQty < reductionBaseline.rightQty
      )) {
        window.alert('Only an admin user can reduce a previously received quantity.');
        return;
      }
    }
    if (!receivedSizes.some((row) => row.leftQty > 0 || row.rightQty > 0) && !existingReceipts.length) {
      window.alert('Enter at least one received Left or Right quantity.');
      return;
    }

    const article = articleForReceivingItem(receivingItem);
    if (!article) {
      window.alert('Could not match this plan item to an Article Entry line item.');
      return;
    }

    const availableComponents = bomComponentsForArticle(article);
    const enteredShortages = shortageRows.filter((row) =>
      row.componentId || row.size || row.side || row.qty !== ''
    );
    const shortages = [];
    for (const shortage of enteredShortages) {
      const component = availableComponents.find((record) => record.id === shortage.componentId);
      const quantity = Number(shortage.qty);
      if (!component || !shortage.size || !['LEFT', 'RIGHT'].includes(shortage.side) ||
        !Number.isInteger(quantity) || quantity <= 0) {
        window.alert('For each shortage row, select a BOM component, size, and side, then enter a positive whole-number quantity.');
        return;
      }
      if (shortages.some((row) =>
        row.componentId === component.id && row.size === shortage.size && row.side === shortage.side
      )) {
        window.alert('A component, size, and side combination can be listed only once in the shortage details.');
        return;
      }
      shortages.push({
        componentId: component.id,
        functionName: component.functionName || component.process || '',
        componentDetails: component.componentDetails || component.materialDesc || component.materialNumber || '',
        size: shortage.size,
        side: shortage.side,
        quantity,
        shortageReceivedQuantity: Number(shortage.shortageReceivedQuantity) || 0,
        shortageReceivedDate: shortage.shortageReceivedDate || '',
        shortageStatus: shortage.shortageStatus || '',
      });
    }

    const receiptId = existingReceipts[0]?.id || push(ref(db, 'clickerCompStoreReceipts/')).key;
    const reductionByStockKey = new Map();
    receivedSizes.forEach((row) => {
      const previous = existingQuantities.get(normalizeSizeKey(row.size)) || { leftQty: 0, rightQty: 0 };
      ['leftQty', 'rightQty'].forEach((field) => {
        const reduction = previous[field] - row[field];
        if (reduction > 0) {
          const key = `${article.id}|${normalizeSizeKey(row.size)}|${field}`;
          reductionByStockKey.set(key, (reductionByStockKey.get(key) || 0) + reduction);
        }
      });
    });
    if (reductionByStockKey.size) {
      const stockByKey = new Map();
      receiptRecords.forEach((receipt) => {
        (receipt.receivedSizes || []).forEach((row) => {
          ['leftQty', 'rightQty'].forEach((field) => {
            const key = `${receipt.articleId}|${normalizeSizeKey(row.size)}|${field}`;
            stockByKey.set(key, (stockByKey.get(key) || 0) + (Number(row[field]) || 0));
          });
        });
      });
      const insufficient = [...reductionByStockKey].some(([key, reduction]) =>
        (stockByKey.get(key) || 0) < reduction
      );
      if (insufficient && !window.confirm('Stock is not available for this reduction. Do you want to continue? Continuing will make the stock quantity negative.')) {
        return;
      }
    }
    const clickingComponents = bomComponentsForArticle(article).filter((component) =>
      normalizeMatchValue(component.functionName || component.process) === 'CLICKING'
    );
    const componentQuantities = receivedSizes.flatMap((row) => {
      const sizeEntry = receivingItem.sizes.find((size) =>
        normalizeSizeKey(size.size) === normalizeSizeKey(row.size)
      );
      const sizePlans = sizeEntry?.plans?.length ? sizeEntry.plans : receivingItem.plans;
      const componentIds = new Set();
      sizePlans.forEach((plan) => {
        if (!plan.isLoosePlan) {
          clickingComponents.forEach((component) => componentIds.add(component.id));
          return;
        }
        const selectedIds = Array.isArray(plan.looseComponentIds) ? plan.looseComponentIds : [];
        selectedIds.forEach((id) => componentIds.add(id));
        if (!selectedIds.length) {
          const selectedNames = String(plan.looseComponentType || plan.remarks || '')
            .split(',')
            .map((name) => normalizeMatchValue(name))
            .filter(Boolean);
          clickingComponents
            .filter((component) => selectedNames.includes(normalizeMatchValue(
              component.componentDetails || component.materialDesc || component.materialNumber
            )))
            .forEach((component) => componentIds.add(component.id));
        }
      });
      return [...componentIds].flatMap((componentId) => {
        if (!clickingComponents.some((component) => component.id === componentId)) return [];
        return [{
          componentId,
          size: row.size,
          leftQty: row.leftQty,
          rightQty: row.rightQty,
        }];
      });
    });
    const receipt = {
      id: receiptId,
      articleId: article.id,
      article: receivingItem.article,
      model: receivingItem.model,
      gender: receivingItem.gender,
      colour: receivingItem.colour,
      priceCategory: receivingItem.category,
      planCode: receivingItem.plans[0]?.planCode || '',
      planningDate: receivingItem.plans[0]?.planningDate || '',
      receivedDate,
      receivedSizes: receivedSizes.filter((row) => row.leftQty > 0 || row.rightQty > 0),
      componentQuantities: componentQuantities.filter((row) => row.leftQty > 0 || row.rightQty > 0),
      shortages,
      submittedAt: Date.now(),
    };
    const updates = { [`clickerCompStoreReceipts/${receiptId}`]: receipt };
    existingReceipts.slice(1).forEach((oldReceipt) => {
      updates[`clickerCompStoreReceipts/${oldReceipt.id}`] = null;
    });
    const hasReceivedQuantity = receipt.receivedSizes.length > 0;
    const uniquePlans = [...new Map(receivingItem.plans.map((plan) => [plan.id, plan])).values()];
    uniquePlans.forEach((plan) => {
      updates[`clickingPlans/${plan.id}/receivingStatus`] = hasReceivedQuantity ? 'RECEIVED' : 'NOT RECEIVED';
      updates[`clickingPlans/${plan.id}/receivedDate`] = receivedDate;
      updates[`clickingPlans/${plan.id}/receiptIds`] = receiptId;
    });

    setSavingReceipt(true);
    try {
      await update(ref(db), updates);
      setReceivingItem(null);
      setReceivedDate('');
      setReceivedSizeRows([]);
      setShortageRows([]);
    } catch (error) {
      window.alert(`Unable to save the receiving status: ${error.message}`);
    } finally {
      setSavingReceipt(false);
    }
  };

  const renderReceivingForm = () => {
    if (!receivingItem) return null;
    const article = articleForReceivingItem(receivingItem);
    const components = bomComponentsForArticle(article);
    const receiptIds = [...new Set(receivingItem.plans.flatMap((plan) =>
      String(plan.receiptIds || '').split(',').map((id) => id.trim()).filter(Boolean)
    ))];
    const existingReceipts = receiptRecords.filter((receipt) => receiptIds.includes(receipt.id));
    const existingQuantities = new Map();
    existingReceipts.forEach((receipt) => {
      (receipt.receivedSizes || []).forEach((row) => {
        const key = normalizeSizeKey(row.size);
        const current = existingQuantities.get(key) || { leftQty: 0, rightQty: 0 };
        current.leftQty += Number(row.leftQty) || 0;
        current.rightQty += Number(row.rightQty) || 0;
        existingQuantities.set(key, current);
      });
    });
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <form onSubmit={submitReceivingStatus} className="max-h-full w-full max-w-4xl space-y-4 overflow-auto rounded bg-white p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">UPDATE RECEIVING STATUS — {receivingItem.article}</h2>
            <button type="button" onClick={() => setReceivingItem(null)} className="text-gray-600 hover:text-gray-900">CLOSE</button>
          </div>
          <label className="flex max-w-xs flex-col gap-1 text-sm font-medium">
            Received Date
            <input
              type="date"
              required
              value={receivedDate}
              onChange={(event) => setReceivedDate(event.target.value)}
              className="rounded border border-gray-300 p-2"
            />
          </label>
          <section className="space-y-2">
            <h3 className="font-semibold">Received Quantities by Size</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    {['SIZE', 'RECEIVED LEFT QTY', 'RECEIVED RIGHT QTY'].map((heading) => (
                      <th key={heading} className="border border-gray-300 p-2">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receivedSizeRows.map((row, index) => (
                    <tr key={row.size}>
                      <td className="border border-gray-300 p-2">{row.size}</td>
                      {['leftQty', 'rightQty'].map((field) => (
                        <td key={field} className="border border-gray-300 p-2">
                          <input
                            type="number"
                            min={isAdmin
                              ? 0
                              : existingReceipts.length
                                ? existingQuantities.get(normalizeSizeKey(row.size))?.[field] ?? 0
                                : receivingItem.sizes.find((size) => String(size.size) === String(row.size))?.[field] ?? 0}
                            max={receivingItem.sizes.find((size) => String(size.size) === String(row.size))?.[field] ?? 0}
                            step="1"
                            value={row[field]}
                            onChange={(event) => updateReceivedSize(index, field, event.target.value)}
                            aria-label={`Received ${field === 'leftQty' ? 'left' : 'right'} quantity for size ${row.size}`}
                            className="w-full rounded border border-gray-300 p-2"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Shortage Details by BOM Component (Optional)</h3>
              <button
                type="button"
                onClick={() => setShortageRows((current) => [...current, { componentId: '', size: '', side: '', qty: '' }])}
                className="rounded border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
              >
                ADD SHORTAGE
              </button>
            </div>
            {!components.length && <p className="text-sm text-gray-500">No BOM components are linked to this article.</p>}
            {shortageRows.map((row, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1.5fr)_7rem_7rem_10rem_auto]">
                <select
                  value={row.componentId}
                  onChange={(event) => setShortageRows((current) => current.map((item, rowIndex) => (
                    rowIndex === index ? { ...item, componentId: event.target.value } : item
                  )))}
                  className="rounded border border-gray-300 p-2"
                >
                  <option value="">Select BOM component</option>
                  {components.map((component) => (
                    <option key={component.id} value={component.id}>
                      {[component.functionName || component.process, component.componentDetails || component.materialDesc || component.materialNumber].filter(Boolean).join(' — ')}
                    </option>
                  ))}
                </select>
                <select
                  value={row.size}
                  onChange={(event) => setShortageRows((current) => current.map((item, rowIndex) => (
                    rowIndex === index ? { ...item, size: event.target.value } : item
                  )))}
                  aria-label={`Shortage size for component ${index + 1}`}
                  className="rounded border border-gray-300 p-2"
                >
                  <option value="">Size</option>
                  {receivingItem.sizes.map(({ size }) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <select
                  value={row.side}
                  onChange={(event) => setShortageRows((current) => current.map((item, rowIndex) => (
                    rowIndex === index ? { ...item, side: event.target.value } : item
                  )))}
                  aria-label={`Shortage side for component ${index + 1}`}
                  className="rounded border border-gray-300 p-2"
                >
                  <option value="">Side</option>
                  <option value="LEFT">Left</option>
                  <option value="RIGHT">Right</option>
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={row.qty}
                  onChange={(event) => setShortageRows((current) => current.map((item, rowIndex) => (
                    rowIndex === index ? { ...item, qty: event.target.value } : item
                  )))}
                  placeholder="Shortage Qty"
                  aria-label={`Shortage quantity for component ${index + 1}`}
                  className="rounded border border-gray-300 p-2"
                />
                <button
                  type="button"
                  onClick={() => setShortageRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                  className="rounded border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  REMOVE
                </button>
              </div>
            ))}
          </section>
          <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
            <button type="button" onClick={() => setReceivingItem(null)} className="rounded border border-gray-300 px-4 py-2">
              CANCEL
            </button>
            <button type="submit" disabled={savingReceipt} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {savingReceipt ? 'SUBMITTING...' : 'SUBMIT RECEIPT'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const copyFormattedPlan = async () => {
    if (!formattedPlanGroups.length) return;

    const headers = ['SL NO', 'VENDOR', 'MODEL', 'ARTICLE', 'GENDER', 'COLOUR', 'SIZE', 'LEFT', 'RIGHT', 'CASE', 'CATEGORY', 'REMARKS'];
    const tables = formattedPlanGroups.map((planGroup) => {
      const totalPairs = planGroup.totals.puCorkPairs + planGroup.totals.singleDensityPairs;
      const totalCases = planGroup.totals.puCorkCases + planGroup.totals.singleDensityCases;
      const summaryRows = [
        `<tr><th colspan="12" style="background:#238b83;border:1px solid #222;color:#fff;font-size:16px;padding:8px;text-align:center;white-space:normal">VEEKESY ELASTOMERS - CALICUT - CLICKER PLAN</th></tr>`,
        `<tr><th colspan="3" style="background:#82d5cf;padding:7px">PLAN DATE: ${escapeHtml(formatPlanDate(planGroup.planningDate))}</th><th colspan="3" style="background:#82d5cf;padding:7px">${escapeHtml(uppercasePlanText(planGroup.planCode))}</th><th colspan="2" style="background:#82d5cf;padding:7px">PU CORK: ${planGroup.totals.puCorkPairs} PR, ${planGroup.totals.puCorkCases} CS</th><th colspan="2" style="background:#82d5cf;padding:7px">SD: ${planGroup.totals.singleDensityPairs} PR, ${planGroup.totals.singleDensityCases} CS</th><th colspan="2" style="background:#82d5cf;padding:7px">TOTAL: ${totalPairs} PR, ${totalCases} CS</th></tr>`,
        `<tr>${headers.map((header) => `<th style="background:#d2f1ef;border:1px solid #222;padding:6px;text-align:center;vertical-align:middle">${header}</th>`).join('')}</tr>`,
      ].join('');

      let serialNumber = 0;
      const bodyRows = planGroup.items.map((item) => {
        serialNumber += 1;
        const itemSizes = item.sizes.length ? item.sizes : [{ size: '', leftQty: 0, rightQty: 0 }];
        return itemSizes.map((size, sizeIndex) => {
          const cells = [];
          if (sizeIndex === 0) {
            [
              serialNumber,
              item.vendorName,
              item.model,
              item.article,
              item.gender,
              item.colour,
            ].forEach((value) => cells.push(`<td rowspan="${itemSizes.length}" style="border:1px solid #222;padding:6px;text-align:center;vertical-align:middle">${escapeHtml(uppercasePlanText(value))}</td>`));
          }
          cells.push(`<td style="border:1px solid #222;padding:6px;text-align:center">${escapeHtml(uppercasePlanText(size.size))}</td>`);
          cells.push(`<td style="border:1px solid #222;padding:6px;text-align:center">${escapeHtml(size.leftQty)}</td>`);
          cells.push(`<td style="border:1px solid #222;padding:6px;text-align:center">${escapeHtml(size.rightQty)}</td>`);
          if (sizeIndex === 0) {
            [
              item.caseQty,
              item.category,
              item.remarks,
            ].forEach((value) => cells.push(`<td rowspan="${itemSizes.length}" style="border:1px solid #222;padding:6px;text-align:center;vertical-align:middle">${escapeHtml(uppercasePlanText(value))}</td>`));
          }
          return `<tr>${cells.join('')}</tr>`;
        }).join('');
      }).join('');

      const plainRows = planGroup.items.flatMap((item, index) =>
        (item.sizes.length ? item.sizes : [{ size: '', leftQty: 0, rightQty: 0 }]).map((size) => [
          index + 1, item.vendorName, item.model, item.article, item.gender, item.colour,
          size.size, size.leftQty, size.rightQty, item.caseQty, item.category, item.remarks,
        ].map(uppercasePlanText).join('\t'))
      );
      return {
        html: `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;table-layout:fixed;width:100%"><thead>${summaryRows}</thead><tbody>${bodyRows}</tbody></table>`,
        text: [
          'VEEKESY ELASTOMERS - CALICUT - CLICKER PLAN',
          `PLAN DATE: ${formatPlanDate(planGroup.planningDate)}\t${uppercasePlanText(planGroup.planCode)}\tPU CORK: ${planGroup.totals.puCorkPairs} PR, ${planGroup.totals.puCorkCases} CS\tSD: ${planGroup.totals.singleDensityPairs} PR, ${planGroup.totals.singleDensityCases} CS\tTOTAL: ${totalPairs} PR, ${totalCases} CS`,
          headers.join('\t'),
          ...plainRows,
        ].join('\n'),
      };
    });

    const html = `<html><head><meta charset="utf-8"></head><body>${tables.map((table) => table.html).join('<br/>')}</body></html>`;
    const text = tables.map((table) => table.text).join('\n\n');
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([html], { type: 'text/html' }),
              'text/plain': new Blob([text], { type: 'text/plain' }),
            }),
          ]);
        } catch (clipboardWriteError) {
          const clipboardContainer = document.createElement('div');
          clipboardContainer.contentEditable = 'true';
          clipboardContainer.style.position = 'fixed';
          clipboardContainer.style.left = '-9999px';
          clipboardContainer.innerHTML = tables.map((table) => table.html).join('<br/>');
          document.body.appendChild(clipboardContainer);
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(clipboardContainer);
          selection.removeAllRanges();
          selection.addRange(range);
          const copied = document.execCommand('copy');
          selection.removeAllRanges();
          document.body.removeChild(clipboardContainer);
          if (!copied) throw clipboardWriteError;
        }
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard access is not available in this browser.');
      }
      setCopyMessage('Formatted plan copied.');
    } catch (error) {
      window.alert(`Unable to copy the plan: ${error.message}`);
    }
  };

  const renderPlanSheet = () => (
    <>
      {viewOnly && (
        <div className="text-sm text-gray-600">
          Select plan lines as needed. Use the last column to record received quantities and optional BOM component shortages.
        </div>
      )}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        {viewOnly || canManagePlans ? (
          <span className="text-sm text-gray-600">{selectedPlanIds.length} plan item(s) selected</span>
        ) : <span />}
        <div className="flex items-center gap-3">
          {!viewOnly && (
            <>
              {copyMessage && <span role="status" className="text-sm text-green-700">{copyMessage}</span>}
              <button
                type="button"
                onClick={copyFormattedPlan}
                disabled={!formattedPlanGroups.length}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copy Plan
              </button>
            </>
          )}
          {canManagePlans && (
            <button
              type="button"
              onClick={deleteSelectedPlans}
              disabled={!selectedPlanIds.length}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete Selected
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[60vh] min-w-0 space-y-5 overflow-auto">
        {formattedPlanGroups.map((planGroup) => {
          const totalPairs = planGroup.totals.puCorkPairs + planGroup.totals.singleDensityPairs;
          const totalCases = planGroup.totals.puCorkCases + planGroup.totals.singleDensityCases;
          const showPlanSelection = canManagePlans || viewOnly;
          const totalColumnCount = 13 + (showPlanSelection ? 1 : 0) + (viewOnly ? 1 : 0);
          let serialNumber = 0;

          return (
            <div key={planGroup.key} className="overflow-auto border border-gray-400">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th colSpan={totalColumnCount} className="border border-gray-400 bg-teal-700 p-2 text-center text-base font-bold text-white">
                      VEEKESY ELASTOMERS - CALICUT - CLICKER PLAN
                    </th>
                  </tr>
                  <tr className="bg-teal-200 text-center text-xs font-bold">
                    <td colSpan="3" className="border border-gray-400 p-2">PLAN DATE: {formatPlanDate(planGroup.planningDate)}</td>
                    <td colSpan="3" className="border border-gray-400 p-2">{uppercasePlanText(planGroup.planCode)}</td>
                    <td colSpan="2" className="border border-gray-400 p-2">PU CORK: {planGroup.totals.puCorkPairs} PR, {planGroup.totals.puCorkCases} CS</td>
                    <td colSpan="2" className="border border-gray-400 p-2">SD: {planGroup.totals.singleDensityPairs} PR, {planGroup.totals.singleDensityCases} CS</td>
                    <td colSpan={3 + (showPlanSelection ? 1 : 0) + (viewOnly ? 1 : 0)} className="border border-gray-400 p-2">TOTAL: {totalPairs} PR, {totalCases} CS</td>
                  </tr>
                  <tr className="bg-teal-100 text-center text-xs font-bold">
                    {showPlanSelection && (
                      <th className="border border-gray-400 p-2">
                        <label className="flex items-center justify-center gap-1">
                          <input
                            type="checkbox"
                            aria-label={`Select full plan ${planGroup.planCode}`}
                            checked={planGroup.items.length > 0 && planGroup.items
                              .flatMap((item) => item.plans)
                              .every((plan) => selectedPlanIds.includes(plan.id))}
                            onChange={() => togglePlanGroupSelection(planGroup)}
                          />
                          <span>SELECT PLAN</span>
                        </label>
                      </th>
                    )}
                    {['SL NO', 'VENDOR', 'MODEL', 'ARTICLE', 'GENDER', 'COLOUR', 'SIZE', 'LEFT', 'RIGHT', 'CASE', 'CATEGORY', 'REMARKS', 'LOT NUMBER'].map((heading) => (
                      <th key={heading} className="whitespace-nowrap border border-gray-400 p-2">{heading}</th>
                    ))}
                    {viewOnly && <th className="whitespace-nowrap border border-gray-400 p-2">RECEIVING STATUS</th>}
                  </tr>
                </thead>
                <tbody>
                  {planGroup.items.map((item) => {
                    serialNumber += 1;
                    const itemSizes = item.sizes.length ? item.sizes : [{ size: '', leftQty: 0, rightQty: 0, plans: item.plans }];
                    return itemSizes.map((size, sizeIndex) => (
                      <tr key={`${item.key}-${size.size}-${sizeIndex}`} className="text-center">
                        {showPlanSelection && (
                          <td className="border border-gray-400 p-2">
                            <div className="flex flex-col gap-1">
                              {(size.plans || item.plans).map((plan) => (
                                <input
                                  key={plan.id}
                                  type="checkbox"
                                  aria-label={`Select plan ${plan.planCode || ''}, ${plan.article || ''}, size ${plan.size || ''}`}
                                  checked={selectedPlanIds.includes(plan.id)}
                                  onChange={() => togglePlanSelection(plan.id)}
                                />
                              ))}
                            </div>
                          </td>
                        )}
                        {sizeIndex === 0 && (
                          <>
                            <td rowSpan={itemSizes.length} className="border border-gray-400 p-2 align-middle">{serialNumber}</td>
                            <td rowSpan={itemSizes.length} className="border border-gray-400 p-2 align-middle">
                              {viewOnly ? (
                                uppercasePlanText(item.vendorName || '-')
                              ) : clickerVendors.length > 0 ? (
                                <select
                                  aria-label={`Vendor for ${item.article}`}
                                  value={item.vendorName}
                                  onChange={(event) => updatePlanItemField(item, 'vendorName', event.target.value)}
                                  className="max-w-32 rounded border border-gray-300 p-1"
                                >
                                  {!item.vendorName && <option value="">Select vendor</option>}
                                  {clickerVendors.map((vendor) => <option key={vendor.id} value={vendor.vendorName}>{uppercasePlanText(vendor.vendorName)}</option>)}
                                </select>
                              ) : <span className="text-xs text-red-700">No vendor in Clicker area</span>}
                            </td>
                            {[item.model, item.article, item.gender, item.colour].map((value, index) => (
                              <td key={index} rowSpan={itemSizes.length} className="border border-gray-400 p-2 align-middle">{uppercasePlanText(value)}</td>
                            ))}
                          </>
                        )}
                        <td className="border border-gray-400 p-2">{uppercasePlanText(size.size)}</td>
                        <td className="border border-gray-400 p-2">{size.leftQty}</td>
                        <td className="border border-gray-400 p-2">{size.rightQty}</td>
                        {sizeIndex === 0 && (
                          <>
                            <td rowSpan={itemSizes.length} className="border border-gray-400 p-2 align-middle">{item.caseQty}</td>
                            <td rowSpan={itemSizes.length} className="border border-gray-400 p-2 align-middle">{uppercasePlanText(item.category)}</td>
                            <td rowSpan={itemSizes.length} className="border border-gray-400 p-2 align-middle">
                              {viewOnly ? uppercasePlanText(item.remarks) : (
                                <input
                                  type="text"
                                  aria-label={`Remarks for ${item.article}`}
                                  defaultValue={item.remarks}
                                  onBlur={(event) => updatePlanItemField(item, 'remarks', event.target.value)}
                                  className="w-32 rounded border border-gray-300 p-1 text-center uppercase"
                                />
                              )}
                            </td>
                            <td rowSpan={itemSizes.length} className="border border-gray-400 p-2 align-middle">
                              {viewOnly ? item.lotNumber : (
                                <input
                                  type="text"
                                  aria-label={`Lot number for ${item.article}`}
                                  defaultValue={item.lotNumber}
                                  onBlur={(event) => updatePlanItemField(item, 'lotNumber', event.target.value)}
                                  className="w-32 rounded border border-gray-300 p-1 text-center"
                                />
                              )}
                            </td>
                            {viewOnly && (
                              <td rowSpan={itemSizes.length} className="min-w-40 border border-gray-400 p-2 align-middle">
                                {(() => {
                                  const planHasReceivedQuantity = (plan) => {
                                    const linkedReceiptIds = String(plan.receiptIds || '')
                                      .split(',')
                                      .map((id) => id.trim())
                                      .filter(Boolean);
                                    const linkedReceipts = receiptRecords.filter((receipt) =>
                                      linkedReceiptIds.includes(receipt.id)
                                    );
                                    if (!linkedReceipts.length) return plan.receivingStatus === 'RECEIVED';
                                    return linkedReceipts.some((receipt) =>
                                      (receipt.receivedSizes || []).some((size) =>
                                        Number(size.leftQty) > 0 || Number(size.rightQty) > 0
                                      )
                                    );
                                  };
                                  const receivedPlans = item.plans.filter(planHasReceivedQuantity);
                                  const status = receivedPlans.length === 0
                                    ? 'NOT RECEIVED'
                                    : receivedPlans.length === item.plans.length ? 'RECEIVED' : 'PARTIALLY RECEIVED';
                                  const latestReceivedDate = receivedPlans
                                    .map((plan) => {
                                      const linkedReceiptIds = String(plan.receiptIds || '')
                                        .split(',')
                                        .map((id) => id.trim())
                                        .filter(Boolean);
                                      const linkedReceipts = receiptRecords.filter((receipt) =>
                                        linkedReceiptIds.includes(receipt.id) &&
                                        (receipt.receivedSizes || []).some((size) =>
                                          Number(size.leftQty) > 0 || Number(size.rightQty) > 0
                                        )
                                      );
                                      return linkedReceipts.map((receipt) => receipt.receivedDate)
                                        .filter(Boolean)
                                        .sort()
                                        .pop() || plan.receivedDate;
                                    })
                                    .filter(Boolean)
                                    .sort()
                                    .pop();
                                  return (
                                    <div className="flex flex-col items-center gap-2">
                                      <span className={`text-xs font-semibold ${status === 'RECEIVED' ? 'text-green-700' : status === 'PARTIALLY RECEIVED' ? 'text-yellow-700' : 'text-gray-600'}`}>
                                        {status}{latestReceivedDate ? ` — ${formatPlanDate(latestReceivedDate)}` : ''}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => openReceivingForm(item)}
                                        disabled={!receiptRecordsLoaded}
                                        className="whitespace-nowrap rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50"
                                      >
                                        {receiptRecordsLoaded ? 'UPDATE RECEIVING' : 'LOADING...'}
                                      </button>
                                    </div>
                                  );
                                })()}
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ));
                  })}
                  {!planGroup.items.length && (
                    <tr><td colSpan={totalColumnCount} className="p-4 text-center text-gray-500">No plan items found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
        {!formattedPlanGroups.length && (
          <div className="border border-gray-200 p-4 text-center text-gray-500">No submitted Clicking Plans match the filters.</div>
        )}
      </div>
    </>
  );

  if (viewOnly) {
    return (
      <div className="h-full min-w-0 overflow-auto bg-blue-50 px-3 pb-2 pt-4">
        <div className="flex min-w-0 flex-col gap-4 rounded bg-white p-4">
          <h1 className="text-lg font-semibold">Clicker Plan</h1>
          {renderPlanSheet()}
          {renderReceivingForm()}
        </div>
      </div>
    );
  }

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
