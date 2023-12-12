const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function batchWriteToDynamoDB(tableName, items) {
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
}

async function processALLOC(payload, tableName) {
    try {
        const createdAt = new Date().toISOString();
        const { fileName, userId, rows, fileType } = payload;

        const existingHeaderItem = await dynamoDb.get({
            TableName: tableName,
            Key: {
                PK: fileName,
                SK: `HEAD#${fileName}`,
            },
        }).promise();

        if (existingHeaderItem.Item) {
            throw new Error('Entry with Same fileName exist');
        }

        const items = rows.map((row) => {
            const { storeCode, barcode, quantity, brand } = row;
            return {
                PutRequest: {
                    Item: {
                        PK: fileName,
                        SK: `ALLOC#BAR#${barcode}`,
                        pickedQuantity: 0,
                        entityType:"DETAIL",
                        storeCode,
                        barcode,
                        quantity,
                        brand,
                    },
                },
            };
        });

        await batchWriteToDynamoDB(tableName, items);
        await dynamoDb.put({
            TableName: tableName,
            Item: {
                PK: fileName,
                SK: `HEAD#${fileName}`,
                userId,
                fileType: fileType, 
                entityType: 'HEADER',
                status:'OPEN',
                createdAt: createdAt
            },
        }).promise();

        return { success: true };
    } catch (error) {
        console.error('Error processing ALLOC payload:', error.message);
        return { success: false, errorMessage: error.message };
    }
}

async function processGRN(payload, tableName) {
    try {
        const { fileName, userId, rows, fileType } = payload;

        const existingHeaderItem = await dynamoDb.get({
            TableName: tableName,
            Key: {
                PK: fileName,
                SK: `HEAD#${fileName}`,
            },
        }).promise();

        if (existingHeaderItem.Item) {
            throw new Error('The same header level info already exists');
        }

        const items = rows.map((row) => {
            const { barcode } = row;
            return {
                PutRequest: {
                    Item: {
                        PK: fileName,
                        SK: `GRN#BAR#${barcode}`,
                        entityType:"DETAIL",
                        pickedQuantity: 0,
                        barcode,
                    },
                },
            };
        });

        await batchWriteToDynamoDB(tableName, items);
        const createdAt = new Date().toISOString();
        await dynamoDb.put({
            TableName: tableName,
            Item: {
                PK: fileName,
                SK: `HEAD#${fileName}`,
                userId,
                entityType: 'HEADER',
                status:'OPEN',
                createdAt: createdAt
            },
        }).promise();

        return { success: true };
    } catch (error) {
        console.error('Error processing GRN payload:', error.message);
        return { success: false, errorMessage: error.message };
    }
}

async function processGSD(payload, tableName) {
    try {
        const { fileName, userId, rows } = payload;

        const existingHeaderItem = await dynamoDb.get({
            TableName: tableName,
            Key: {
                PK: fileName,
                SK: `HEAD#${fileName}`,
            },
        }).promise();

        if (existingHeaderItem.Item) {
            throw new Error('The same header level info already exists');
        }

        const items = rows.map((row) => {
            const { storeCode, inputBoxId } = row;
            return {
                PutRequest: {
                    Item: {
                        PK: fileName,
                        SK: `GSD#IBXID#${inputBoxId}`,
                        storeCode,
                        inputBoxId,
                        entityType:"DETAIL",
                    },
                },
            };
        });

        await batchWriteToDynamoDB(tableName, items);

        await dynamoDb.put({
            TableName: tableName,
            Item: {
                PK: fileName,
                SK: `HEAD#${fileName}`,
                userId,
                entityType: 'HEADER',
                status:'OPEN',
            },
        }).promise();

        return { success: true };
    } catch (error) {
        console.error('Error processing GSD payload:', error.message);
        return { success: false, errorMessage: error.message };
    }
}

async function processBRI(payload, tableName) {
    try {
        const { fileName, userId, rows } = payload;

        // Check if the same header level info exists
        const existingHeaderItem = await dynamoDb.get({
            TableName: tableName,
            Key: {
                PK: fileName,
                SK: `HEAD#${fileName}`,
            },
        }).promise();

        if (existingHeaderItem.Item) {
            throw new Error('The same header level info already exists');
        }

        // Prepare items for batch write
        const items = rows.map((row) => ({
            PutRequest: {
                Item: {
                    PK: fileName,
                    SK: `BRI#BAR#${row.barcode}`,
                    ...row,
                },
            },
        }));

        // BatchWriteItem to insert items in DynamoDB
        await batchWriteToDynamoDB(tableName, items);

        // Store header level information in the same table
        await dynamoDb.put({
            TableName: tableName,
            Item: {
                PK: fileName,
                SK: `HEAD#${fileName}`,
                userId,
                entityType: 'HEADER',
                status:'OPEN',
            },
        }).promise();

        return { success: true };
    } catch (error) {
        console.error('Error processing BRI payload:', error.message);
        return { success: false, errorMessage: error.message };
    }
}


module.exports = {
    processALLOC,
    processGRN,
    processGSD,
    processBRI,
};
