import React, { useState } from 'react';
import { todayIso } from './plannedStore';

function ReceivedDateDialog({ title, subtitle, saving, onSubmit, onClose }) {
  const [date, setDate] = useState(todayIso());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (date) onSubmit(date);
        }}
        className="w-full max-w-sm space-y-4 rounded bg-white p-5 shadow-xl"
      >
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Date of Receiving
          <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="rounded border border-gray-300 p-2" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReceivedDateDialog;
