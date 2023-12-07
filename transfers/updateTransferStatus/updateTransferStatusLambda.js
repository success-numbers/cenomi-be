const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const transferId = body.transferId;
        const status=body.status;

        const params = {
            TableName: process.env.tableName,
            Key: {
                'PK': `HEAD#${transferId}`,
                'SK': `HEAD#${transferId}`
            },
            UpdateExpression: 'SET #status = :newStatus',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':newStatus': status
            }
        };

        const updateResult = await dynamoDb.update(params).promise();

        if (updateResult) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "Status updated successfully" }),
            };
        }

        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Failed to update status" }),
        };
    } catch (e) {
        console.error('Error updating status:', e.message);
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
