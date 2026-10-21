import React, { useState } from 'react'
import {Link} from "react-router-dom";
import { controlKey } from './userControls';

function Sidebar({spareData, selectedLink, setSelectedLink, openedTab, setOpenedTab, userRole, preallocatedProcesses, isAdmin, canAccessUserSettings, ribbonPermissions, permissionsConfigured}) {
    const [currentOpenedTab, setCurrentOpenedTab] = useState(openedTab);
    const [expandedSubTab, setExpandedSubTab] = useState('');

    const filterTabPermissions = (tabItem) => {
        if (!tabItem) return null;
        if (!permissionsConfigured || isAdmin || (!tabItem.to && !tabItem.children)) return tabItem;
        if (tabItem.children) {
            const children = tabItem.children.map(filterTabPermissions).filter(Boolean);
            return children.length > 0 ? { ...tabItem, children } : null;
        }
        return ribbonPermissions?.[controlKey(tabItem.to)] ? tabItem : null;
    };

    const sideBarComponent=(mainTabLabel, mainTabValue, subTabsArray, showWhenEmpty = false)=>{
        const visibleTabs = subTabsArray
            .map(filterTabPermissions)
            .filter(Boolean);

        if (!showWhenEmpty && permissionsConfigured && !isAdmin && visibleTabs.length === 0) return null;

        const renderNavigationItem = (tabItem, index, parentKey = '', level = 0) => {
            const tabKey = `${parentKey}${tabItem.value || tabItem.to || tabItem.label || index}`;
            const isExpanded = expandedSubTab === tabKey;
            const paddingClass = level > 0 ? 'pl-8' : 'pl-4';

            if (tabItem.children) {
                return (
                    <React.Fragment key={tabKey}>
                        <button
                            type="button"
                            onClick={() => setExpandedSubTab((tab) => tab === tabKey ? '' : tabKey)}
                            aria-expanded={isExpanded}
                            className={`flex w-full flex-row items-center space-x-2 py-3 pr-2 text-left hover:bg-blue-300 ${paddingClass} ${isExpanded ? 'bg-blue-100' : ''}`}
                        >
                            <div>{tabItem.icon}</div>
                            <div className="font-medium text-sm">{tabItem.label}</div>
                        </button>
                        <div className={`flex w-full flex-col bg-blue-50 ${isExpanded ? 'dropdown-visible' : 'dropdown-hidden'}`}>
                            {tabItem.children.map((child, childIndex) =>
                                renderNavigationItem(child, childIndex, `${tabKey}/`, level + 1)
                            )}
                        </div>
                    </React.Fragment>
                );
            }

            return (
                <Link
                    key={tabKey}
                    to={tabItem.to}
                    className={`flex w-full flex-row space-x-2 py-3 pr-2 hover:bg-blue-300 ${paddingClass} ${selectedLink === tabItem.to ? 'bg-gray-300 border-r-4 border-blue-500' : ''}`}
                >
                    <div>{tabItem.icon}</div>
                    <div className="font-medium text-sm">{tabItem.label}</div>
                </Link>
            );
        };

        return (
            <div className='px-1'>
                <div 
                    className={" flex flex-row space-x-2 hover:bg-gray-300 w-full py-3 cursor-pointer "+ (openedTab==mainTabValue?" border-l-4 border-blue-500":"")}
                    onClick={()=>{setCurrentOpenedTab(tab=>{return tab===mainTabValue?"":mainTabValue})}}
                >
                    <div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                        </svg>
                    </div>
                    <div className="font-medium text-base">{mainTabLabel}</div>
                </div>

                <div className={"flex flex-col items-start w-full bg-blue-50"+(currentOpenedTab===mainTabValue?" dropdown-visible":" dropdown-hidden")}>
                {
                    visibleTabs.map((tabItem, index) => renderNavigationItem(tabItem, index))
                }
                </div>

            </div>
        )

    }

    return (
    <div className='flex flex-row bg-primary w-full h-full text-sm'>
        <div className='flex flex-col w-full bg-white overflow-y-auto '>

            {sideBarComponent("Spare Management", "spare",
                    [
                        { 
                            to:"spareview",
                            label:"Spare View",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                        </svg>)
                        },
                        {
                            to:"sparehistory",
                            label:"Spare History",
                            icon:(<svg className="h-5 w-5"  viewBox="0 0 48 48" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M25.99 6c-9.95 0-17.99 8.06-17.99 18h-6l7.79 7.79.14.29 8.07-8.08h-6c0-7.73 6.27-14 14-14s14 6.27 14 14-6.27 14-14 14c-3.87 0-7.36-1.58-9.89-4.11l-2.83 2.83c3.25 3.26 7.74 5.28 12.71 5.28 9.95 0 18.01-8.06 18.01-18s-8.06-18-18.01-18zm-1.99 10v10l8.56 5.08 1.44-2.43-7-4.15v-8.5h-3z" opacity=".9"/>
                        </svg>)
                        },
                        {
                            to:"sparein",
                            label:"Spare In",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                        </svg>)
                        },
                        {
                            to:"spareout",
                            label:"Spare Out",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                        </svg>)
                        },
                    ]
            )}
            
            {(isAdmin || userRole === 'PP Head' || userRole === 'MM Head' || userRole === 'Store Incharge' || (userRole === 'Production Section Charge' && preallocatedProcesses && preallocatedProcesses.length > 0) || (permissionsConfigured && Object.keys(ribbonPermissions || {}).some((key) => key.startsWith('planning-desk%2F')))) &&
                sideBarComponent("Planning Desk", "planningDesk",
                [
                        // Conditionally render Knitting Plan
                        (userRole !== 'Production Section Charge' || (preallocatedProcesses && preallocatedProcesses.includes('Knitting'))) && {
                            to: "planning-desk/knitting-plan",
                            label: "Knitting Plan",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>)
                        },
                        // Conditionally render Clicking Plan
                        (userRole !== 'Production Section Charge' || (preallocatedProcesses && preallocatedProcesses.includes('Clicking'))) && {
                            to: "planning-desk/clicking-plan",
                            label: "Clicking Plan",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>)
                        },
                        // Conditionally render Printing Plan
                        (userRole !== 'Production Section Charge' || (preallocatedProcesses && preallocatedProcesses.includes('Printing'))) && {
                            to: "planning-desk/printing-plan",
                            label: "Printing Plan",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>)
                        },
                        // Conditionally render Stitching Plan
                        (userRole !== 'Production Section Charge' || (preallocatedProcesses && preallocatedProcesses.includes('Stitching'))) && {
                            to: "planning-desk/stitching-plan",
                            label: "Stitching Plan",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>)
                        },
                        (userRole !== 'Production Section Charge' || (preallocatedProcesses && preallocatedProcesses.includes('Stitching'))) && {
                            to: "planning-desk/molding-plan",
                            label: "Molding Plan",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>)
                        },
                        (userRole !== 'Production Section Charge' || (preallocatedProcesses && preallocatedProcesses.includes('Stitching'))) && {
                            to: "planning-desk/grinding-plan",
                            label: "Grinding Plan",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>)
                        },
                        // Conditionally render Stuckon Plan
                        (userRole !== 'Production Section Charge' || (preallocatedProcesses && preallocatedProcesses.includes('Stuckon'))) && {
                            to:"planning-desk/stuckon-plan",
                            label: "Stuckon Prodn Plan",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                        </svg>)
                        },
                        (userRole !== 'Production Section Charge' || (preallocatedProcesses && preallocatedProcesses.includes('Stuckon'))) && {
                            to: "planning-desk/packing-plan",
                            label: "Packing Plan",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                        </svg>)
                        },
                        // Filter out null or undefined items that might result from false conditions
                    ].filter(item => item)
            )}

            {sideBarComponent("Execution", "execution",
                    [
                        {
                            to: "execution/clicker-plan",
                            label: "Clicker Plan",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5" />
                            </svg>)
                        }
                    ], true)}

            {sideBarComponent("Analysis", "analysis",
                    [
                        {
                            to: "analysis/loop-stocks",
                            label: "Loop Stocks",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18M7 14l4-4 4 4 6-7" />
                            </svg>)
                        },
                        {
                            label: "Shortage Details",
                            children: [
                                {
                                    to: "analysis/shortage-details/clicker-shortage",
                                    label: "Clicker Shortage",
                                    icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.3 3.86L1.82 18a2 2 0 001.7 3h16.96a2 2 0 001.7-3L13.7 3.86a2 2 0 00-3.4 0z" />
                                    </svg>)
                                }
                            ]
                        }
                    ])}

            {sideBarComponent("Production Planning Inputs", "productionPlanningInputs",
                    [
                        {
                            to: "production-planning-inputs/requirement-entry",
                            label: "Requirement Entry",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>)
                        },
                        {
                            to: "production-planning-inputs/coois-data",
                            label: "Coois Data",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5" />
                            </svg>)
                        }
                    ])}

            {(isAdmin || (permissionsConfigured && Object.keys(ribbonPermissions || {}).some((key) => key.startsWith('admin%2F')))) ? sideBarComponent("Admin Desk", "adminDesk", // Assuming isAdmin prop is used for Admin role
                    [
                        {
                            to:"admin/data-entry",
                            label:"Article Entry",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                </svg>)
                        },
                        {
                            to:"admin/bom-entry",
                            label:"BOM Entry",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5" />
                            </svg>)
                        },
                        {
                            to:"admin/packingcombination-entry",
                            label:"Packing Combination",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                        </svg>)
                        },
                        {
                            to:"admin/vendor-details",
                            label:"Vendor Details",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>)
                        }
                    ]) : [] // Render empty array if not Admin
            }
            
            {sideBarComponent("MM Department", "mmDept",
                    [
                        {
                            value: "rmStore",
                            label: "RM Store",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M5 7v12h14V7M9 11h6" />
                            </svg>),
                            children: [
                                {
                                    to:"mmdept/stock-entry",
                                    label:"Stock Entry",
                                    icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                    </svg>)
                                },
                                {
                                    to:"mmdept/material-outward",
                                    label:"Material Outward",
                                    icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                    </svg>)
                                },
                                {
                                    to:"mmdept/material-inward",
                                    label:"Material Inward",
                                    icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                    </svg>)
                                }
                            ]
                        },
                        {
                            value: "sfgStore",
                            label: "SFG Store",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M5 7v12h14V7M9 11h6" />
                            </svg>),
                            children: [
                                {
                                    to:"mmdept/clicker-comp-store",
                                    label:"Clicker Comp Store",
                                    icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M12 22a10 10 0 100-20 10 10 0 000 20z" />
                                    </svg>)
                                },
                                {
                                    to:"mmdept/printing-comp-store",
                                    label:"Printing Comp Store",
                                    icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M12 22a10 10 0 100-20 10 10 0 000 20z" />
                                    </svg>)
                                },
                                {
                                    to:"mmdept/molding-receiving-store",
                                    label:"Molding Receiving Store",
                                    icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M12 22a10 10 0 100-20 10 10 0 000 20z" />
                                    </svg>)
                                }
                            ]
                        }
                    ])
            }

            {sideBarComponent("QC Department", "qcDepartment",
                    [
                        {
                            to:"qc-department/fiu-qc",
                            label:"FIU QC",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M12 22a10 10 0 100-20 10 10 0 000 20z" />
                            </svg>)
                        }
                    ])
            }

            {sideBarComponent("History", "history",
                    [
                        {
                            to:"history/article-entry",
                            label:"Article Entry",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 19.5V4.75A2.75 2.75 0 016.75 2h10.5A2.75 2.75 0 0120 4.75V19.5M4 19.5h16M8 7h8M8 11h8M8 15h5" />
                            </svg>)
                        }
                    ])
            }

            {canAccessUserSettings && sideBarComponent("User Settings", "userSettings",
                    [
                        {
                            to:"user-settings/request",
                            label:"User Request",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.5 6h3m-1.5 0v12m-5.25-9h9.5M6 18h12" />
                            </svg>)
                        },
                        {
                            to:"user-settings/control",
                            label:"User Control",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.7 1.7 0 00.34 1.88l.06.06-1.8 1.8-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.06 1.56V20h-2.5v-.1a1.7 1.7 0 00-1.06-1.56 1.7 1.7 0 00-1.88.34l-.06.06-1.8-1.8.06-.06A1.7 1.7 0 008.1 15a1.7 1.7 0 00-1.56-1.06H6v-2.5h.1A1.7 1.7 0 007.66 10a1.7 1.7 0 00-.34-1.88l-.06-.06 1.8-1.8.06.06A1.7 1.7 0 0011 6.66 1.7 1.7 0 0012.06 5.1H12.5v2.5" />
                            </svg>)
                        },
                        {
                            to:"user-settings/password",
                            label:"Password Settings",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a4 4 0 11-7.75 1.25L3 12.5V16h3v-2h2v-2h2.25A4 4 0 0015 7z" />
                            </svg>)
                        }
                    ])}
        </div>
    </div>
  )
}

export default Sidebar