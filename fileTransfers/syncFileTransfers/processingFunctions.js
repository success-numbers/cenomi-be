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
                        ...item,
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

async function processGRN(payload, syncTable, dataTable) {
    try {
        const { fileType, fileName, transferBoxes } = payload;
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
};
