module.exports = [
    {
        "PK": "WAREHOUSES",
        "SK": "ALL",
        "created_at": "2023-06-16T07:47:26.075258286Z",
        "created_by": "admin",
        "data": [
         {
          "desc": "CNM",
          "id": "11393"
         }
        ]
    },
    {
        "PK": "STATUSES",
        "SK": "ALL",
        "created_at": "2023-06-16T07:47:26.075258286Z",
        "created_by": "admin",
        "data": [
         {
          "dispId": "Open",
          "id": "OPEN"
         },
         {
          "dispId": "In Progress",
          "id": "INPROGRESS"
         },
         {
          "dispId": "Submitted",
          "id": "SUBMITTED"
         }
        ]
       },
       {
        "PK": "FLTYPES",
        "SK": "ALL",
        "created_at": "2023-06-16T07:47:26.075258286Z",
        "created_by": "admin",
        "data": [
         {
          "headers": [
           "STORE CODE",
           "BARCODE",
           "QTY",
           "BRAND"
          ],
          "id": "ALLOC"
         },
         {
          "headers": [
           "BARCODE"
          ],
          "id": "GRN"
         },
         {
          "headers": [
           "STORE CODE",
           "INPUT BOX ID"
          ],
          "id": "DSD"
         },
         {
          "headers": [
           "BARCODE"
          ],
          "id": "BRI"
         }
        ]
       }
]