// Stock booked by a plan against an upstream store (e.g. Molding Plan using Printing Comp stock).
// Actual stock is used first, then Planning stock; any shortfall makes the Actual stock negative.
// When the upstream receipt later deletes the planned stock, the same consumption is charged to Actual.
export const CONSUMPTION_NODE = 'stockConsumption';

// Stages whose requirements are taken from the Planning + Actual stock of their child components.
export const STOCK_STAGES = ['molding', 'grinding', 'stuckon', 'packing'];

export const consumptionKey = (articleId, componentId, size) => `${articleId}|${componentId}|${size}`;

// Splits the consumption of one side between the Planning and Actual stock.
export const stockAfterConsumption = (planned, actual, consumed) => {
  const plannedQty = Math.max(0, Number(planned) || 0);
  const actualQty = Number(actual) || 0;
  const consumedQty = Number(consumed) || 0;
  const fromActual = Math.min(consumedQty, Math.max(0, actualQty));
  const rest = consumedQty - fromActual;
  const fromPlanned = Math.min(rest, plannedQty);
  return {
    planning: plannedQty - fromPlanned,
    actual: actualQty - fromActual - (rest - fromPlanned),
  };
};

// Quantity that can be planned: only a positive stock counts.
export const availableStock = (planned, actual, consumed) => {
  const stock = stockAfterConsumption(planned, actual, consumed);
  return stock.planning + Math.max(0, stock.actual);
};
