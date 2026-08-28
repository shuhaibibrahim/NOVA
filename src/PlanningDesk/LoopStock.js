import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

function LoopStock() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();

  useEffect(() => {
    setSelectedLink('planning-desk/loop-stock');
    setOpenedTab('planningDesk');
  }, [setSelectedLink, setOpenedTab]);

  return (
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="rounded bg-white p-4">
        <h1 className="text-lg font-semibold">Loop Stock</h1>
      </div>
    </div>
  );
}

export default LoopStock;
