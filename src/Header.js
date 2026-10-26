import React, { useEffect, useMemo, useState } from 'react'
import { auth, db } from './firebase_config';
import { onValue, ref } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { clearNotifications, dismissNotification, subscribeNotifications } from './notifications';

const functionOf = (record) => String(record.functionName || record.process || '').trim().toUpperCase();

function Header({heading, setUser, setHideSideBar}) {
    
    const navigate = useNavigate();
    const [bomRecords, setBomRecords] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [articles, setArticles] = useState([]);

    useEffect(() => onValue(ref(db, 'articleData/'), (snapshot) => {
        setArticles(Object.entries(snapshot.val() || {}).map(([id, record]) => ({ ...record, id })));
    }), []);

    useEffect(() => onValue(ref(db, 'bomData/'), (snapshot) => {
        setBomRecords(Object.entries(snapshot.val() || {}).map(([id, record]) => ({ ...record, id })));
    }), []);

    // A Stitching component must have Clicking or Printing components as children.
    const [runtimeNotices, setRuntimeNotices] = useState([]);

    useEffect(() => subscribeNotifications((list) => {
        setRuntimeNotices((previous) => {
            if (list.length > previous.length) setShowNotifications(true);
            return list;
        });
    }), []);

    const bomNotifications = useMemo(() => {
        const byId = new Map(bomRecords.map((record) => [record.id, record]));
        const articleById = new Map(articles.map((article) => [article.id, article]));
        return bomRecords
            .filter((record) => functionOf(record) === 'STITCHING' && articleById.has(record.articleId))
            .filter((record) => !(record.childComponentIds || []).some((id) =>
                ['CLICKING', 'PRINTING'].includes(functionOf(byId.get(id) || {}))
            ))
            .map((record) => {
                const article = articleById.get(record.articleId);
                const articleLabel = [article.model, article.article, article.colour ?? article.color].filter(Boolean).join(' ');
                return {
                    id: `bom:${record.id}`,
                    type: 'error',
                    persistent: true,
                    message: `BOM incomplete [${articleLabel}]: Stitching component "${record.componentDetails || record.materialDesc || record.id}" has no Clicking or Printing child. Fix in BOM Entry.`,
                };
            });
    }, [bomRecords, articles]);

    const notifications = [...runtimeNotices, ...bomNotifications];

    const logout = () => {
        auth.signOut().then(() => {
            navigate('/'); // Navigate to the login screen
            setUser(null);
        });
    };
    return (
        <div className=" py-4 pl-2 pr-4 flex flex-row items-center justify-between bg-gray-100 filter drop-shadow-lg w-full">
            <div className='flex flex-col text-gray-900 text-left'>
                <div className="font-bold text-xl">
                    {heading}   
                </div>
                <div className='text-brandnote'>4 WALKAROO</div>
                {/* <div className='text-brandnote'>WALKAROO</div> */}

                <div onClick={()=>{setHideSideBar(t=>!t)}} className='cursor-pointer pt-2 hover:text-blue-500'>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </div>
            </div>

            <div className="flex flex-row items-center gap-6">
                <div className="relative">
                    <button
                        type="button"
                        aria-label={`Notifications (${notifications.length})`}
                        onClick={() => setShowNotifications((current) => !current)}
                        className="relative text-gray-700 hover:text-blue-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                        {notifications.length > 0 && (
                            <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{notifications.length}</span>
                        )}
                    </button>
                    {showNotifications && (
                        <div className="absolute right-0 top-full z-50 mt-2 max-h-80 w-96 overflow-auto rounded border border-gray-200 bg-white p-2 text-left text-sm shadow-lg">
                            {runtimeNotices.length > 0 && (
                                <div className="flex justify-end border-b border-gray-100 pb-1">
                                    <button type="button" onClick={clearNotifications} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Clear all</button>
                                </div>
                            )}
                            {notifications.length ? notifications.map((notice) => (
                                <div key={notice.id} className="flex items-start justify-between gap-2 border-b border-gray-100 p-2 last:border-0">
                                    <span className={notice.type === 'error' ? 'text-red-700' : 'text-gray-800'}>
                                        {notice.message}{notice.count > 1 ? ` (x${notice.count})` : ''}
                                    </span>
                                    {!notice.persistent && (
                                        <button type="button" aria-label="Dismiss" onClick={() => dismissNotification(notice.id)} className="text-gray-400 hover:text-red-600">✕</button>
                                    )}
                                </div>
                            )) : <div className="p-2 text-gray-500">No notifications.</div>}
                        </div>
                    )}
                </div>
                <button
                    className="text-blue-500 hover:text-blue-800 font-bold"
                    onClick={logout}
                >
                        Logout
                </button>
            </div>
        </div>
    )
}

export default Header