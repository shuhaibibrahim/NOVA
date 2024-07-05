const fieldHeadings=[
    "Code",
    "Part Name",
    "Part Numnber",
    "Nick Name",
    "Specification",
    "New Quantity",//QUANTITY
    "Local Quantity",
    "Serviced Quantity",
    "Total Quantity",// NO NEED TO ENTER THIS VALUE NEED TO SUM ALL THE QUANTITIES"
    "Unit Of Measurement",
    "OG Value",
    "Service Value",
    "Service Vendor",
    "SAP",
    "Material Number",
    "Local Value",
    "Total Value",// (NEW QTY X OG VALUE LOCAL QTY X LOCAL VALUE) NO NEED TO ENTER THIS VALUE IN SPARE ADD"
    "Origin",
    "Local Vendor",
    "Machine",
    "Remarks",
    "Life",
    "Minimum Stock",
]

const fieldKeys=[
    "code:text",
    "partName:text",
    "partNumber:number",
    "nickName:text",
    "spec:text",
    "qty:number", //new qty
    "localQty:number", //local qty
    "servQty:number",//serviced qty
    "totalQty:number", //calculated
    "unit:text",
    "value:number",//og value
    "servValue:number",
    "servVendor:text",
    "sap:radio:Yes,No",
    "materialNumber:text",
    "localValue:number",
    "totalValue:number", //calculated
    "origin:text",
    "localVendor:text",
    "machine:text",
    "remarks:text",
    "life:number",
    "minStock:number"
]
// const fieldHeadings=[
//     "Code",
//     "Machine",
//     "Nickname",
//     "Part Name",
//     "Part Number",
//     "Origin",
//     "Minimum Stock",
//     "Quantity",
//     "Local Quantity",
//     "Unit",
//     "Local Vendor Name",
//     "Value",
//     "Total Value",
//     "Specification",
//     "Life",
//     "Remarks",
// ]

// const fieldKeys=[
//     "code",
//     "machine",
//     "Nickname",
//     "partName",
//     "partNumber",
//     "origin",
//     "minStock",
//     "qty",
//     "localQty",
//     "unit",
//     "localVendor",
//     "value",
//     "totValue",
//     "spec",
//     "life",
//     "remarks",
// ]

export {fieldHeadings, fieldKeys}