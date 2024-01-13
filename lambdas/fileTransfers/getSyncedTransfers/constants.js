exports.ColumnMappings = {
  asn: "ASN",
  brand: "Brand",
  storeCode: "Store Code",
  boxId: "BoxId",
  itemBarcode: "Barcode",
  quantity: "Quantity",
  timestamp: "Timestamp",
  userId: "User Id",
  inputBoxId: "Input Box Id",
  scannedBoxId: "Scanned Box Id"
};

exports.CSVColumMappings =  (fileType) => {
  switch(fileType){
    case "ALLOC":{
      return [
        {
          "key": "asn",
          "displayName": "ASN"
        },
        {
          "key": "brand",
          "displayName":  "BRAND"
        },
        {
          "key": "storeCode",
          "displayName":  "STORE CODE"

        },
        {
          "key": "boxId",
          "displayName":  "BOX ID"

        },
        {
          "key": "itemBarcode",
          "displayName":  "ITEM BARCODE"  
        },
        {
          "key": "quantity",
          "displayName":  "QTY"  
        }
      ];
    }
    case "GRN":{
      return [
        {
          "key": "asn",
          "displayName": "ASN"
        },
        {
          "key": "brand",
          "displayName":  "BRAND"
        },
        {
          "key": "storeCode",
          "displayName":  "STORE CODE"

        },
        {
          "key": "boxId",
          "displayName":  "BOX ID"

        },
        {
          "key": "itemBarcode",
          "displayName":  "ITEM BARCODE"  
        },
        {
          "key": "quantity",
          "displayName":  "QTY"  
        }
      ];
    }
    case "DSD":{
      return [
        {
          "key": "asn",
          "displayName": "ASN"
        },
        {
          "key": "brand",
          "displayName":  "BRAND"
        },
        {
          "key": "storeCode",
          "displayName":  "STORE CODE"

        },
        {
          "key": "inputBoxId",
          "displayName":  "INPUT BOX ID"

        },
        {
          "key": "scannedBoxId",
          "displayName":  "SCANNED BOX ID"

        },
        {
          "key": "quantity",
          "displayName":  "QTY"  
        },
        {
          "key": "status",
          "displayName":  "Status"  
        }
      ];
    }
    default: return [];
  }
};
