const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function batchWriteToDynamoDB(tableName, items) {
    try {
        const batchRequests = [];
        for (let i = 0; i < items.length; i += 25) {
            const batch = items.slice(i, i + 25);
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

                if (!foundItem) {
                    const payloadItem = items.find(
                        (item) => item.barcode === `${requestedBarcode}`
                    );
                    // New Item to Insert
                    barcodeQuantityMap[requestedBarcode] = {
                        "updatedQty": payloadItem.quantity
                    }
                    
                }else {
                    // Item Already Exists then merge
                    barcodeQuantityMap[requestedBarcode] = {
                        "updatedQty": foundItem.quantity ?? 0 + payloadItem.quantity 
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

            items.push({ PutRequest: { Item: itemEntry } });

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
        // for (const boxId in transferBoxes) {
        //     if (Object.hasOwnProperty.call(transferBoxes, boxId)) {
        //         const boxItems = transferBoxes[boxId];
                
        //     }
        // }

        // if (items.length > 0) {
        //     await batchWriteToDynamoDB(syncTable, items);
        //     await Promise.all(updateRequests);
        // }
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

module.exports = {
    processALLOC,
    processGRN,
    processDSD,
    processAlternateALLOC
};
