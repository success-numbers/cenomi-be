const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const transferId = event.queryStringParameters.transferId;

        if (!transferId) {
            const res = {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "transferId parameter is missing" }),
            };
            return res;
        }

        const params = {
            TableName: process.env.tableName,
            KeyConditionExpression: 'PK = :pkVal',
            ExpressionAttributeValues: {
                ':pkVal': `DET#${transferId}`,
            },
        };

        const result = await dynamoDb.query(params).promise();
        
        const Items = result.Items.map(item => ({
            itemPK: transferId,
            barcode: item.SK,
            timestamp: item.timestamp,
            quantity: item.quantity,
            pickedQuantity: item.pickedQuantity,
            brand: item.brand
        }));

        const response = {
            transferId: transferId,
            Items: Items
        };

        const res = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
        };
        return res;
    } catch (e) {
        console.error('Error fetching transfer items:', e.message);
        const res = {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Internal server error" }),
        };
        return res;
    }
};
