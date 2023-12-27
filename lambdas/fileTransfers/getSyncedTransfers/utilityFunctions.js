// Mapper for ALLOC type
const transferItemALLOCHandler = (items) => {
    return items.map((e) => {
        return {
            asn: e.ASN || null,
            brand: e.brand || null,
            storeCode: e.storeCode || null,
            boxId: e.boxId || null,
            itemBarcode: e.barcode || null,
            quantity: e.quantity || null
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
            quantity: e.quantity || null
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
                scannedBoxId: e.boxId|| null,
                quantity: e.quantity || null,
                status: e.status|| null
            }
        });
    }

module.exports = {
    transferItemALLOCHandler,
    transferItemGRNHandler,
    transferItemDSDHandler
};
