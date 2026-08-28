import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

function FiuQc() {
  const [setSelectedLink, setOpenedTab] = useOutletContext();

  useEffect(() => {
    setSelectedLink('qc-department/fiu-qc');
    setOpenedTab('qcDepartment');
  }, [setSelectedLink, setOpenedTab]);

  return (
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="rounded bg-white p-4">
        <h1 className="text-lg font-semibold">FIU QC</h1>
      </div>
    </div>
  );
}

export default FiuQc;
