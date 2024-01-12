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
    const transferItemDSDHandler = (items) => {
        return items.map((e) => {
            return {
                asn: e.ASN || null,
                brand: e.brand || null,
                storeCode: e.storeCode || null,
                inputBoxId: e.inputBoxId || null,
                scannedBoxId: e.scannedBoxId|| null,
                quantity: e.quantity || null,
                status: e.status|| null,
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
