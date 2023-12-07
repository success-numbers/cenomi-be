const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const seqId = event.queryStringParameters.seqId;

        if (!seqId) {
            const res = {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "seqId parameter is missing" }),
            };
            return res;
        }

        const params = {
            TableName: process.env.tableName,
            KeyConditionExpression: 'PK = :pkVal',
            ExpressionAttributeValues: {
                ':pkVal': `DET#${seqId}`,
            },
        };

        const result = await dynamoDb.query(params).promise();
        
        const Items = result.Items.map(item => ({
            itemSeqId: seqId,
            barcode: item.SK,
            timestamp: item.timestamp,
            quantity: item.quantity,
            pickedQuantity: item.pickedQuantity,
            brand: item.brand
        }));

        const response = {
            transferSeqId: seqId,
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
            body: JSON.stringify({ "message": `Error! ${JSON.stringify(e)}` }),
        };
        return res;
    }
};
