const TRNTYPES = ["ALLOC", "GRN", "DSD", "BRI"];
const statsTypes = [{dbKey: "OPEN", dispKey: "Open" },
{dbKey: "INPROGRESS", dispKey: "In Progress" },
{dbKey: "SUBMITTED", dispKey: "Submitted" }
]

const FILE_TRN_TYPES = [{fileKey: "ALLOC", dispKey: "Allocation" }, {fileKey: "GRN", dispKey: "Grn" }, { fileKey: "DSD", dispKey: "Dsd" }]

const SKPREFIX = {
    "ALLOC": "ALLOC#BAR",
    "GRN": "GRN#BAR",
    "BRI": "BRI#BAR",
    "DSD": "DSD#IBXID"
}

module.exports = {
    TRNTYPES,
    SKPREFIX,
    statsTypes,
    FILE_TRN_TYPES
};

