const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function batchWriteToDynamoDB(tableName, items) {
    try {
        const batchRequests = [];
        for (let i = 0; i < items.length; i += 25) {
            const batch = items.slice(i, i + 25);
            console.log("MEOW BATCH WRITE", JSON.stringify(batch));
            batchRequests.push(
                dynamoDb.batchWrite({
                    RequestItems: {
                        [tableName]: batch,
                    },
                }).promise()
            );
        }
        console.log("batchWriteToDynamoDB Batchrequest", batchRequests);
        await Promise.all(batchRequests);
    } catch (error) {
        console.error('Error in batch writing to DynamoDB:', error.message);
        throw new Error(`Error in batch writing to DynamoDB: ${error.message}`);
    }
}

async function processALLOC(payload, syncTable, dataTable) {
    try {
        const { fileType, fileName, transferBoxes, asn } = payload;
        let items = [];
        let updateRequests = [];

        for (const boxId in transferBoxes) {
            if (Object.hasOwnProperty.call(transferBoxes, boxId)) {
                const boxItems = transferBoxes[boxId];
                for (const item of boxItems) {
                    const { barcode, quantity } = item;

                    const itemEntry = {
                        PK: fileName,
                        SK: `BXID#${boxId}#BAR#${barcode}`,
                        ASN: asn,
                        entityType: 'DETAIL',
                        boxId: boxId,
                        ...item,
                    };

                    // items.push({ PutRequest: { Item: itemEntry } });
                    items.push({
                        Update: {
                          TableName: syncTable,
                          Key: {
                            PK: fileName,
                            SK: `BXID#${boxId}#BAR#${barcode}`,
                          },
                          UpdateExpression: 'SET quantity = quantity + :mergePickedQty',
                          ExpressionAttributeValues: {
                            ':mergePickedQty': quantity,
                          },
                        },
                      })
                    const updateParams = {
                        TableName: dataTable,
                        Key: {
                            PK: fileName,
                            SK: `ALLOC#BAR#${barcode}`,
                        },
                        UpdateExpression: 'SET pickedQuantity = pickedQuantity + :quantity, isScanned = :scanned',
                        ExpressionAttributeValues: {
                            ':quantity': quantity,
                            ':scanned': true,
                        },
                    };
                    updateRequests.push(dynamoDb.update(updateParams).promise());

                    if (items.length === 25) {
                        await batchWriteToDynamoDB(syncTable, items);
                        await Promise.all(updateRequests);
                        items = [];
                        updateRequests = [];
                    }
                }
            }
        }

        if (items.length > 0) {
            await batchWriteToDynamoDB(syncTable, items);
            await Promise.all(updateRequests);
        }
        return { success: true };
    } catch (error) {
        console.error('Error processing ALLOC payload:', error.message);
        throw new Error(`Error processing ALLOC payload: ${error.message}`);
    }
}


async function processAlternateALLOC(payload, syncTable, dataTable, barcodeBatches = []) {
    try {
        const { fileType, fileName, items, asn, boxId } = payload;
        let updateRequests = [];
        let putRequests = [];
        let barcodeQuantityMap = {};
        for (const batch of barcodeBatches) {
            const params = {
                RequestItems: {
                    [syncTable]: {
                        Keys: batch.map((barcode) => ({
                            PK: payload.fileName,
                            SK: `BXID#${boxId}#BAR#${barcode}`,
                        })),
                    },
                },
            };

            const batchResult = await dynamoDb.batchGet(params).promise();
            console.log("MEOW 3 batchresult", JSON.stringify(batchResult));

            for (const requestedBarcode of batch) {
                const foundItem = batchResult.Responses[syncTable].find(
                    (item) => item.SK === `BXID#${boxId}#BAR#${requestedBarcode}`
                );
                const payloadItem = items.find(
                    (item) => item.barcode === `${requestedBarcode}`
                );
                if (!foundItem) {
                    
                    // New Item to Insert
                    barcodeQuantityMap[requestedBarcode] = {
                        "updatedQty": payloadItem.quantity
                    }
                    
                }else {
                    // Item Already Exists then merge
                    barcodeQuantityMap[requestedBarcode] = {
                        "updatedQty": foundItem.quantity + payloadItem.quantity 
                    }
                }
            }
        }
        for (const item of items) {
            const { barcode, quantity } = item;

            const itemEntry = {
                PK: fileName,
                SK: `BXID#${boxId}#BAR#${barcode}`,
                ASN: asn,
                entityType: 'DETAIL',
                boxId: boxId,
                ...item,
                quantity: barcodeQuantityMap[barcode].updatedQty ?? undefined,
            };

            putRequests.push({ PutRequest: { Item: itemEntry } });

            const updateParams = {
                TableName: dataTable,
                Key: {
                    PK: fileName,
                    SK: `ALLOC#BAR#${barcode}`,
                },
                UpdateExpression: 'SET pickedQuantity = pickedQuantity + :quantity, isScanned = :scanned',
                ExpressionAttributeValues: {
                    ':quantity': quantity,
                    ':scanned': true,
                },
            };
            updateRequests.push(dynamoDb.update(updateParams).promise());

            if (putRequests.length === 25) {
                await batchWriteToDynamoDB(syncTable, putRequests);
                await Promise.all(updateRequests);
                putRequests = [];
                updateRequests = [];
            }
        }
        // for (const boxId in transferBoxes) {
        //     if (Object.hasOwnProperty.call(transferBoxes, boxId)) {
        //         const boxItems = transferBoxes[boxId];
                
        //     }
        // }

        if (putRequests.length > 0) {
            await batchWriteToDynamoDB(syncTable, putRequests);
            await Promise.all(updateRequests);
        }
        return { success: true };
    } catch (error) {
        console.error('Error processing ALLOC payload:', error.message);
        throw new Error(`Error processing ALLOC payload: ${error.message}`);
    }
}

async function processGRN(payload, syncTable, dataTable) {
    try {
        const { fileType, fileName, transferBoxes, asn} = payload;
        let items = [];
        let updateRequests = [];

        for (const boxId in transferBoxes) {
            if (Object.hasOwnProperty.call(transferBoxes, boxId)) {
                const boxItems = transferBoxes[boxId];
                for (const item of boxItems) {
                    const { barcode } = item;

                    const itemEntry = {
                        PK: fileName,
                        SK: `BXID#${boxId}#BAR#${barcode}`,
                        entityType: 'DETAIL',
                        boxId: boxId,
                        ASN: asn,
                        ...item,
                    };
                    items.push({ PutRequest: { Item: itemEntry } });

                    const updateParams = {
                        TableName: dataTable,
                        Key: {
                            PK: fileName,
                            SK: `GRN#BAR#${barcode}`,
                        },
                        UpdateExpression: 'SET isScanned = :scanned',
                        ExpressionAttributeValues: {
                            ':scanned': true,
                        },
                    };
                    updateRequests.push(dynamoDb.update(updateParams).promise());

                    if (items.length === 25) {
                        await batchWriteToDynamoDB(syncTable, items);
                        items = [];
                    }
                }
            }
        }

        if (items.length > 0) {
            await batchWriteToDynamoDB(syncTable, items);
        }
        await Promise.all(updateRequests);

        return { success: true };
    } catch (error) {
        console.error('Error processing GRN payload:', error.message);
        throw new Error(`Error processing GRN payload: ${error.message}`);
    }
}

async function alternateProcessGRN(payload, syncTable, dataTable, barcodeBatches = []) {
    try {
        const { fileType, fileName, items, asn, boxId } = payload;
        let updateRequests = [];
        let barcodeQuantityMap = {};
        let putRequests = [];

        for (const batch of barcodeBatches) {
            const params = {
                RequestItems: {
                    [syncTable]: {
                        Keys: batch.map((barcode) => ({
                            PK: payload.fileName,
                            SK: `BXID#${boxId}#BAR#${barcode}`,
                        })),
                    },
                },
            };

            const batchResult = await dynamoDb.batchGet(params).promise();
            console.log("MEOW 3 batchresult", JSON.stringify(batchResult));

            for (const requestedBarcode of batch) {
                const foundItem = batchResult.Responses[syncTable].find(
                    (item) => item.SK === `BXID#${boxId}#BAR#${requestedBarcode}`
                );
                const payloadItem = items.find(
                    (item) => item.barcode === `${requestedBarcode}`
                );
                if (!foundItem) {
                    // New Item to Insert
                    barcodeQuantityMap[requestedBarcode] = {
                        "updatedQty": payloadItem.quantity
                    }
                    
                }else {
                    // Item Already Exists then merge
                    barcodeQuantityMap[requestedBarcode] = {
                        "updatedQty": foundItem.quantity + payloadItem.quantity 
                    }
                }
            }
        }
        console.log("MEOW BarcodeQuantity Map", barcodeQuantityMap);
        for (const item of items) {
            const { barcode, quantity } = item;
            
            const itemEntry = {
                PK: fileName,
                SK: `BXID#${boxId}#BAR#${barcode}`,
                ASN: asn,
                entityType: 'DETAIL',
                boxId: boxId,
                ...item,
                quantity: barcodeQuantityMap[barcode].updatedQty ?? undefined,
            };

            putRequests.push({ PutRequest: { Item: itemEntry } });

            if(item.isNew && item.isNew == true){
                const newPutParams = {
                    TableName: dataTable,
                    Item: {
                        PK: fileName,
                        SK: `GRN#BAR#${barcode}`,
                        barcode: barcode,
                        userId: item?.userId ?? null,
                        fileType: fileType,
                        isScanned: true,
                        pickedQuantity: barcodeQuantityMap[barcode].updatedQty ?? undefined, 
                        entityType: 'DETAIL'
                    }, 
                }
                updateRequests.push(dynamoDb.put(newPutParams).promise());

            }else {
                const updateParams = {
                    TableName: dataTable,
                    Key: {
                        PK: fileName,
                        SK: `GRN#BAR#${barcode}`,
                    },
                    UpdateExpression: 'SET pickedQuantity = pickedQuantity + :quantity, isScanned = :scanned',
                    ExpressionAttributeValues: {
                        ':quantity': quantity,
                        ':scanned': true,
                    },
                };
                updateRequests.push(dynamoDb.update(updateParams).promise());
            }


            if (putRequests.length === 25) {
                await batchWriteToDynamoDB(syncTable, putRequests);
                await Promise.all(updateRequests);
                putRequests = [];
                updateRequests = [];
            }
        }

        if (putRequests.length > 0) {
            await batchWriteToDynamoDB(syncTable, putRequests);
            await Promise.all(updateRequests);
        }
        return { success: true };
    } catch (error) {
        console.error('Error processing GRN payload:', error.message);
        throw new Error(`Error processing GRN payload: ${error.message}`);
    }
}
async function processDSD(payload, syncTable, dataTable) {
    try {
        const { fileType, fileName, transferBoxes, asn } = payload;
        let items = [];
        let updateRequests = [];

        for (const boxId in transferBoxes) {
            if (Object.hasOwnProperty.call(transferBoxes, boxId)) {
                const boxItems = transferBoxes[boxId];
                for (const item of boxItems) {
                    const { inputBoxId } = item;

                    const itemEntry = {
                        PK: fileName,
                        SK: `BXID#${boxId}#IBXID#${inputBoxId}`,
                        ASN: asn,
                        entityType: 'DETAIL',
                        inputBoxId: inputBoxId,
                        boxId: boxId,
                        ...item,
                    };
                    items.push({ PutRequest: { Item: itemEntry } });

                    const updateParams = {
                        TableName: dataTable,
                        Key: {
                            PK: fileName,
                            SK: `DSD#IBXID#${inputBoxId}`,
                        },
                        UpdateExpression: 'SET isScanned = :scanned',
                        ExpressionAttributeValues: {
                            ':scanned': true,
                        },
                    };
                    updateRequests.push(dynamoDb.update(updateParams).promise());

                    if (items.length === 25) {
                        await batchWriteToDynamoDB(syncTable, items);
                        items = [];
                    }
                }
            }
        }

        if (items.length > 0) {
            await batchWriteToDynamoDB(syncTable, items);
        }
        await Promise.all(updateRequests);

        return { success: true };
    } catch (error) {
        console.error('Error processing DSD payload:', error.message);
        throw new Error(`Error processing DSD payload: ${error.message}`);
    }
}
async function processAlternateDSD(payload, syncTable, dataTable, inputBoxIdBatches = []) {
    try {
        console.log("MEOW 1 processAlternateDSD", JSON.stringify(inputBoxIdBatches));
        const { fileType, fileName, items, asn, brand } = payload;
        let updateRequests = [];
        let putRequests = [];
        let bxIdQuantityMap = {};
        for (const batch of inputBoxIdBatches) {
            const params = {
                RequestItems: {
                    [syncTable]: {
                        Keys: batch.map((inputBoxId) => ({
                            PK: fileName,
                            SK: `IBXID#${inputBoxId}`,
                        })),
                    },
                },
            };
        console.log("MEOW 2 batches", JSON.stringify(params));

            const batchResult = await dynamoDb.batchGet(params).promise();
            console.log("MEOW 3 batchresult", JSON.stringify(batchResult));

            for (const requestedBxId of batch) {
                const foundItem = batchResult.Responses[syncTable].find(
                    (item) => item.SK === `IBXID#${requestedBxId}`
                );
                const payloadItem = items.find(
                    (item) => item.inputBoxId === `${requestedBxId}`
                );
                if (!foundItem) {
                    // New Item to Insert
                    bxIdQuantityMap[requestedBxId] = {
                        "updatedQty": 1
                    }
                    
                }else {
                    // Item Already Exists then merge
                    bxIdQuantityMap[requestedBxId] = {
                        "updatedQty": 1 
                    }
                }
            }
        }
        for (const item of items) {
            const { inputBoxId, quantity } = item;

            const itemEntry = {
                PK: fileName,
                SK: `IBXID#${inputBoxId}`,
                ASN: asn,
                brand: brand,
                entityType: 'DETAIL',
                inputBoxId: inputBoxId,
                scannedBoxId: inputBoxId,
                ...item,
                quantity: bxIdQuantityMap[inputBoxId]?.updatedQty ?? 1,
            };
            console.log("MEOW 4 itemEntry", JSON.stringify(itemEntry));

            putRequests.push({ PutRequest: { Item: itemEntry } });

            const updateParams = {
                TableName: dataTable,
                Key: {
                    PK: fileName,
                    SK: `DSD#IBXID#${inputBoxId}`,
                },
                UpdateExpression: 'SET pickedQuantity = :quantity, isScanned = :scanned',
                ExpressionAttributeValues: {
                    ':quantity': 1,
                    ':scanned': true,
                },
            };
            console.log("MEOW 5 updateParams", JSON.stringify(updateParams));

            updateRequests.push(dynamoDb.update(updateParams).promise());

            if (putRequests.length === 25) {
                await batchWriteToDynamoDB(syncTable, putRequests);
                await Promise.all(updateRequests);
                putRequests = [];
                updateRequests = [];
            }
        }
        // for (const boxId in transferBoxes) {
        //     if (Object.hasOwnProperty.call(transferBoxes, boxId)) {
        //         const boxItems = transferBoxes[boxId];
                
        //     }
        // }

        if (putRequests.length > 0) {
            await batchWriteToDynamoDB(syncTable, putRequests);
            await Promise.all(updateRequests);
        }
        return { success: true };
    } catch (error) {
        console.error('Error processing DSD payload:', error.message);
        throw new Error(`Error processing DSD payload: ${error.message}`);
    }
}

module.exports = {
    processALLOC,
    processGRN,
    processDSD,
    processAlternateALLOC,
    alternateProcessGRN,
    processAlternateDSD
};
