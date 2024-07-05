let x = [
    {name: "a", qty: 2, unit: "cm"},
    {name: "b", qty: 3, unit: "cm"},
    {name: "a", qty: 4, unit: "m"},
    {name: "b", qty: 5, unit: "m"}
  ];
  
  let y = x.reduce((accumulator, currentValue) => {
    // Check if there's already an entry with the same name in accumulator
    let existingItem = accumulator.find(item => item.name === currentValue.name);
  
    if (existingItem) {
      // If name already exists, update qty and add new unit if not already present
      existingItem.qty += currentValue.qty;
      if (!existingItem.units.includes(currentValue.unit)) {
        existingItem.units.push(currentValue.unit);
      }
    } else {
      // If name doesn't exist, add new entry
      accumulator.push({
        name: currentValue.name,
        qty: currentValue.qty,
        units: [currentValue.unit]
      });
    }
  
    return accumulator;
  }, []);
  
  console.log(y);
  