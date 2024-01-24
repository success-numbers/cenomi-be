const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        console.log(event.body)
        const { fileName, fileType, row } = JSON.parse(event.body);

        if (!fileName || !fileType || !row) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ message: 'fileName, fileType, and row are required.' }),
            };
        }

        const syncTable = process.env.syncTable;
        const dataTable = process.env.dataTable;
        const { brand, storeCode, itemBarcode, quantity, asn, boxId } = row;

        // Calculate the difference between the new and old quantity values
        const currentQuantity = parseInt(quantity);

        // Retrieve the old quantity from the syncTable
        const syncParams = {
            TableName: syncTable,
            Key: {
                PK: fileName,
                SK: `BXID#${boxId}#BAR#${itemBarcode}`,
            },
        };
        
        console.log('fetching ',syncParams);

        const syncResult = await dynamoDb.get(syncParams).promise();

        if (!syncResult || !syncResult.Item || !syncResult.Item.quantity) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ message: 'No quantity found for the provided itemBarcode and boxId.' }),
            };
        }

        const previousQuantity = parseInt(syncResult.Item.quantity);
        const quantityDifference = currentQuantity - previousQuantity;

        // Update the syncTable with the new quantity
        const updateSyncParams = {
            TableName: syncTable,
            Key: {
                PK: fileName,
                SK: `BXID#${boxId}#BAR#${itemBarcode}`,
            },
            UpdateExpression: 'SET #quantity = :quantity',
            ExpressionAttributeNames: {
                '#quantity': 'quantity',
            },
            ExpressionAttributeValues: {
                ':quantity': quantity,
            },
        };

        await dynamoDb.update(updateSyncParams).promise();

        // Update the pickedQuantity field in the dataTable
        const updateDataParams = {
            TableName: dataTable,
            Key: {
                PK: fileName,
                SK: `${fileType}#BAR#${itemBarcode}`,
            },
            UpdateExpression: 'ADD #pickedQuantity :quantityDiff',
            ExpressionAttributeNames: {
                '#pickedQuantity': 'pickedQuantity',
            },
            ExpressionAttributeValues: {
                ':quantityDiff': quantityDifference,
            },
        };

        await dynamoDb.update(updateDataParams).promise();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ message: 'Quantity updated in syncTable and dataTable.' }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};
