const fieldHeadings=[
    "CODE",
    "PART NAME",
    "PART NUMBER",
    "NICK NAME",
    "SPECIFICATION",
    "NEW QUANTITY",//QUANTITY
    "LOCAL QUANTITY",
    "SERVICED QTY",
    "TOTAL QUANTITY ",// NO NEED TO ENTER THIS VALUE NEED TO SUM ALL THE QUANTITIES"
    "UNIT OF MEASUREMENT",
    "OG VALUE",
    "SERVICE VALUE",
    "SERVICE VENDOR",
    "SAP",
    "LOCAL VALUE",
    "TOTAL VALUE",// (NEW QTY X OG VALUE LOCAL QTY X LOCAL VALUE) NO NEED TO ENTER THIS VALUE IN SPARE ADD"
    "ORIGIN",
    "LOCAL VENDOR",
    "MACHINE",
    "REMARKS",
    "LIFE",
    "MINIMUM STOCK",
]

const fieldKeys=[
    "code:text",
    "partName:text",
    "partNumber:text",
    "nickName:text",
    "spec:text",
    "qty:number", //new qty
    "localQty:number", //local qty
    "servQty:number",//serviced qty
    "totalQty:number", //calculated
    "unit:text",
    "value:text",//og value
    "servValue:text",
    "servVendor:text",
    "sap:radio:Yes,No",
    "localValue:text",
    "totalValue:text", //calculated
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