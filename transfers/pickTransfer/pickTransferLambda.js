const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        console.log('Event body:', event);
        const requestBody = JSON.parse(event.body || '{}');

        const { user_id, dest_id, transferId, pickedItems } = requestBody;

        if (!user_id || !dest_id || !transferId || !pickedItems) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "Invalid request parameters" }),
            };
        }

        console.log(pickedItems);
        const updatePromises = pickedItems.map(async item => {
            const params = {
                TableName: process.env.tableName, 
                Key: {
                    'PK': `DET#${transferId}`,
                    'SK': item.barcode
                },
                UpdateExpression: 'SET pickedQuantity = pickedQuantity + :val',
                ExpressionAttributeValues: {
                    ':val': item.scannedQuantity,
                },
                ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)'
            };
            console.log("this is params", params);
            return dynamoDb.update(params).promise();
        });

        await Promise.all(updatePromises);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Picked items updated successfully" }),
        };
    } catch (e) {
        console.error('Error picking transfer items:', e.message);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Internal server error" }),
        };
    }
};
