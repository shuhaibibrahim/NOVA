import React, { useEffect, useState } from 'react';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { db } from '../firebase_config';

const EMPTY_VENDOR = { vendorName: '', area: '' };
const normalizeArea = (area) => String(area || '').trim().toLowerCase();

function VendorDetails() {
  const [vendors, setVendors] = useState([]);
  const [newVendor, setNewVendor] = useState(EMPTY_VENDOR);
  const [editingId, setEditingId] = useState(null);
  const [editingVendor, setEditingVendor] = useState(EMPTY_VENDOR);

  useEffect(() => {
    const vendorsRef = ref(db, 'vendorDetails/');
    return onValue(vendorsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setVendors(Object.entries(data).map(([id, vendor]) => ({ ...vendor, id })));
    });
  }, []);

  const createVendor = async (event) => {
    event.preventDefault();
    const vendorRef = push(ref(db, 'vendorDetails/'));
    await set(vendorRef, {
      id: vendorRef.key,
      vendorName: newVendor.vendorName.trim(),
      area: newVendor.area.trim(),
    });
    setNewVendor(EMPTY_VENDOR);
  };

  const startEditing = (vendor) => {
    setEditingId(vendor.id);
    setEditingVendor({ vendorName: vendor.vendorName || '', area: vendor.area || '' });
  };

  const saveVendor = async () => {
    const currentVendor = vendors.find((vendor) => vendor.id === editingId);
    const area = editingVendor.area.trim();
    const changes = {
      vendorName: editingVendor.vendorName.trim(),
      area,
    };
    const updates = {
      [`vendorDetails/${editingId}/vendorName`]: changes.vendorName,
      [`vendorDetails/${editingId}/area`]: changes.area,
    };

    if (currentVendor?.isDefault) {
      vendors
        .filter((vendor) => vendor.id !== editingId && normalizeArea(vendor.area) === normalizeArea(area))
        .forEach((vendor) => {
          updates[`vendorDetails/${vendor.id}/isDefault`] = false;
        });
    }

    await update(ref(db), updates);
    setEditingId(null);
    setEditingVendor(EMPTY_VENDOR);
  };

  const setDefaultVendor = async (vendor, isDefault) => {
    const updates = { [`vendorDetails/${vendor.id}/isDefault`]: isDefault };
    if (isDefault) {
      vendors
        .filter((otherVendor) => otherVendor.id !== vendor.id && normalizeArea(otherVendor.area) === normalizeArea(vendor.area))
        .forEach((otherVendor) => {
          updates[`vendorDetails/${otherVendor.id}/isDefault`] = false;
        });
    }
    await update(ref(db), updates);
  };

  const deleteVendor = async (vendor) => {
    if (!window.confirm(`Please confirm deleting ${vendor.vendorName || 'this vendor'}.`)) return;
    await remove(ref(db, `vendorDetails/${vendor.id}`));
    if (editingId === vendor.id) {
      setEditingId(null);
      setEditingVendor(EMPTY_VENDOR);
    }
  };

  return (
    <div className="h-full min-w-0 overflow-auto bg-blue-50 px-3 pb-2 pt-4">
      <div className="flex min-w-0 flex-col gap-4 rounded bg-white p-4">
        <h1 className="text-lg font-semibold">Vendor Details</h1>

        <form onSubmit={createVendor} className="flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-gray-50 p-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Vendor Name
            <input
              required
              type="text"
              value={newVendor.vendorName}
              onChange={(event) => setNewVendor((current) => ({ ...current, vendorName: event.target.value }))}
              className="w-64 max-w-full rounded border border-gray-300 bg-white p-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Area
            <input
              required
              type="text"
              value={newVendor.area}
              onChange={(event) => setNewVendor((current) => ({ ...current, area: event.target.value }))}
              className="w-52 max-w-full rounded border border-gray-300 bg-white p-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            Add Vendor
          </button>
        </form>

        <div className="overflow-auto border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-200 text-left text-xs font-semibold">
              <tr>
                <th className="p-3 text-center">Vendor Name</th>
                <th className="p-3 text-center">Area</th>
                <th className="p-3 text-center">Default</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => {
                const isEditing = editingId === vendor.id;
                return (
                  <tr key={vendor.id} className="border-t border-gray-200">
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <input
                          required
                          type="text"
                          aria-label="Vendor Name"
                          value={editingVendor.vendorName}
                          onChange={(event) => setEditingVendor((current) => ({ ...current, vendorName: event.target.value }))}
                          className="w-full rounded border border-gray-300 p-2"
                        />
                      ) : vendor.vendorName}
                    </td>
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <input
                          required
                          type="text"
                          aria-label="Area"
                          value={editingVendor.area}
                          onChange={(event) => setEditingVendor((current) => ({ ...current, area: event.target.value }))}
                          className="w-full rounded border border-gray-300 p-2"
                        />
                      ) : vendor.area}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Set ${vendor.vendorName} as default for ${vendor.area}`}
                        checked={Boolean(vendor.isDefault)}
                        onChange={(event) => setDefaultVendor(vendor, event.target.checked)}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-wrap gap-3">
                        {isEditing ? (
                          <>
                            <button type="button" onClick={saveVendor} disabled={!editingVendor.vendorName.trim() || !editingVendor.area.trim()} className="text-blue-700 hover:underline disabled:opacity-50">Save</button>
                            <button type="button" onClick={() => setEditingId(null)} className="text-gray-600 hover:underline">Cancel</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => startEditing(vendor)} className="text-blue-700 hover:underline">Modify</button>
                        )}
                        <button type="button" onClick={() => deleteVendor(vendor)} className="text-red-600 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!vendors.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">No vendors have been added.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default VendorDetails;
