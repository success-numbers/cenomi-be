exports.ColumnMappings  = {
        "userId" : "User ID",
        "fileName": "File Name",
        "fileType": "File Type",
        "status": "Status",
        "asn": "ASN",
        "createdAt": "Created At",
        "updatedAt": "Updated At"
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