import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

function UserSettings({ section = 'User Settings' }) {
  const [setSelectedLink, setOpenedTab] = useOutletContext();

  useEffect(() => {
    setSelectedLink(`user-settings/${section.toLowerCase().replace(/ /g, '-')}`);
    setOpenedTab('userSettings');
  }, [section, setSelectedLink, setOpenedTab]);

  return (
    <div className="h-full bg-blue-50 px-3 pb-2 pt-4">
      <div className="rounded bg-white p-4">
        <div className="font-semibold text-lg">{section}</div>
      </div>
    </div>
  );
}

export default UserSettings;
