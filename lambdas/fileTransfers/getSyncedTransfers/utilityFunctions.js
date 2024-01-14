// Mapper for ALLOC type
const transferItemALLOCHandler = (items) => {
    return items.map((e) => {
        return {
            asn: e.ASN || null,
            brand: e.brand || null,
            storeCode: e.storeCode || null,
            boxId: e.boxId || null,
            itemBarcode: e.barcode || null,
            quantity: e.quantity || null,
            userId: e.userId || null,
            timestamp: e.timestamp || null  
        }
    });
}

// Mapper for GRN type
const transferItemGRNHandler = (items) => {
    return items.map((e) => {
        return {
            asn: e.ASN || null,
            brand: e.brand || null,
            storeCode: e.storeCode || null,
            boxId: e.boxId || null,
            itemBarcode: e.barcode || null,
            quantity: e.quantity || null,
            userId: e.userId || null,
            timestamp: e.timestamp || null  
        }
    });
}

// Mapper for DSD type
    const transferItemDSDHandler = (items, asn = null, brand = null) => {
        return items.map((e) => {
            return {
                asn: e.ASN || asn || null,
                brand: e.brand || brand || null,
                storeCode: e.storeCode || null,
                inputBoxId: e.inputBoxId || null,
                scannedBoxId: e.scannedBoxId|| null,
                quantity: e.quantity || 0,
                status: ((e?.quantity || 0) > 0) ? "Received": "Missing Box",
                userId: e.userId || null,
                timestamp: e.timestamp || null  
            }
        });
    }

module.exports = {
    transferItemALLOCHandler,
    transferItemGRNHandler,
    transferItemDSDHandler
};
