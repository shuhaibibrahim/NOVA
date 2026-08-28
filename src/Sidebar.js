import React, { useState } from 'react'
import {Link} from "react-router-dom";

function Sidebar({spareData, selectedLink, setSelectedLink, openedTab, setOpenedTab, userRole, preallocatedProcesses, isAdmin}) {
    const [currentOpenedTab, setCurrentOpenedTab] = useState(openedTab);

    const sideBarComponent=(mainTabLabel, mainTabValue, subTabsArray)=>{
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
                    subTabsArray.map((tabItem, index) => (
                        tabItem.children ? (
                            <React.Fragment key={tabItem.value || index}>
                                <button
                                    type="button"
                                    onClick={() => setCurrentOpenedTab((tab) => tab === tabItem.value ? mainTabValue : tabItem.value)}
                                    className={"flex w-full flex-row items-center space-x-2 px-2 pl-4 py-3 text-left hover:bg-blue-300 " + (currentOpenedTab === tabItem.value ? "bg-blue-100" : "")}
                                >
                                    <div>{tabItem.icon}</div>
                                    <div className="font-medium text-sm">{tabItem.label}</div>
                                </button>
                                <div className={"flex w-full flex-col bg-blue-50 " + (currentOpenedTab === tabItem.value ? "dropdown-visible" : "dropdown-hidden")}>
                                    {tabItem.children.map((child) => (
                                        <Link
                                            key={child.to}
                                            to={child.to}
                                            className={"flex w-full flex-row space-x-2 px-2 py-3 pl-8 hover:bg-blue-300 " + (selectedLink === child.to ? "bg-gray-300 border-r-4 border-blue-500" : "")}
                                        >
                                            <div>{child.icon}</div>
                                            <div className="font-medium text-sm">{child.label}</div>
                                        </Link>
                                    ))}
                                </div>
                            </React.Fragment>
                        ) : (
                            <Link
                                key={index}
                                to={tabItem.to}
                                className={" flex flex-row space-x-2 px-2 pl-4 hover:bg-blue-300 w-full py-3 "+ (selectedLink===tabItem.to?" bg-gray-300 border-r-4 border-blue-500":"")}
                            >
                                <div>{tabItem.icon}</div>
                                <div className="font-medium text-sm">{tabItem.label}</div>
                            </Link>
                        )
                    ))
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
            
            {(isAdmin || userRole === 'PP Head' || userRole === 'MM Head' || userRole === 'Store Incharge' || (userRole === 'Production Section Charge' && preallocatedProcesses && preallocatedProcesses.length > 0)) &&
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
                            label: "Stiching Plan",
                            icon: (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>)
                        },
                        // Conditionally render Stuckon Plan
                        (userRole !== 'Production Section Charge' || (preallocatedProcesses && preallocatedProcesses.includes('Stuckon'))) && {
                            to:"planning-desk/stuckon-plan",
                            label:"Stuckon Prodn Plan",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                        </svg>)
                        },
                        // Filter out null or undefined items that might result from false conditions
                    ].filter(item => item)
            )}

            {isAdmin ? sideBarComponent("Admin Desk", "adminDesk", // Assuming isAdmin prop is used for Admin role
                    [
                        {
                            to:"admin/data-entry",
                            label:"Article Entry",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                </svg>)
                        },
                        {
                            to:"admin/bom-data-entry",
                            label:"BOM Entry",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                </svg>)
                        },
                        {
                            to:"admin/requirement-entry",
                            label:"Requirement Entry",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                </svg>)
                        },
                        {
                            to:"admin/packingcombination-entry",
                            label:"Packing Combination",
                            icon:(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
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
        </div>
    </div>
  )
}

export default Sidebar