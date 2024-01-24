exports.ColumnMappings  = {
        "userId" : "User",
        "fileName": "File Name",
        "fileType": "File Type",
        "status": "Status",
        "asn": "ASN",
        "createdAt": "Create Date",
        "updatedAt": "Update Date"
}

exports.statusDispMapper = (status) => {
        const map = {
                "OPEN": "Open",
                "INPROGRESS": "In Progress",
                "SUBMITTED": "Submitted"
        }
        if(map[status] != undefined){
                return map[status];
        }
        return status;
}