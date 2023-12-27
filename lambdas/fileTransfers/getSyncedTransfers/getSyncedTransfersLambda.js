const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const {
    transferItemALLOCHandler,
    transferItemGRNHandler,
    transferItemDSDHandler
} = require('./utilityFunctions');

const transferItemUnifiedHandler = (items = [], type = null) => {
    switch(type){
        case 'ALLOC': return transferItemALLOCHandler(items);
        case 'GRN': return transferItemGRNHandler(items);
        case 'DSD': return transferItemDSDHandler(items);
        default: throw "WRONG FILE TRANSFER TYPE";
    }
}

exports.handler = async (event) => {
    try {
        const { fileType, fileName } = event.queryStringParameters || {};

        if (!fileName || !fileType) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Filename and fileType are required.' }),
            };
        }

        const syncTable = process.env.syncTable;
        const dataTable = process.env.dataTable;

        // Fetch items from the sync table with the given filename
        const syncParams = {
            TableName: syncTable,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': fileName,
            },
        };

        const syncResult = await dynamoDb.query(syncParams).promise();

        // const unscannedParams = {
        //     TableName: dataTable,
        //     IndexName: 'scnnedIndex',
        //     KeyConditionExpression: 'PK = :filename',
        //     ExpressionAttributeValues: {
        //         ':filename': filename,
        //     },
        //     FilterExpression: 'attribute_not_exists(isScanned) OR isScanned = :scanned',
        //     ExpressionAttributeValues: {
        //         ':scanned': false,
        //     },
        // };
        

        // const unscannedResult = await dynamoDb.query(unscannedParams).promise();

        const combinedResult = syncResult.Items || [];
        // combinedResult.push(...(unscannedResult.Items || []));

        // Map the combined data based on transfer type
        const mappedData = transferItemUnifiedHandler(combinedResult, fileType);
        const formattedData = {
            fileName: fileName,
            fileType: fileType,
            Items: mappedItems,
        };
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data fetched successfully.', body : mappedData }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};
