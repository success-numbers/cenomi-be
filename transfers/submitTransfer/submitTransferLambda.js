const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        console.log("this is body", body);
        transferId= body.transferId;
        userId= body.userId;
        const params = {
            TableName: process.env.tableName, 
            Key: {
                'PK': `HEAD#${transferId}`,
                'SK': `HEAD#${transferId}`
            }
        };
        console.log(params);
        const data = await dynamoDb.get(params).promise();
        console.log(data);
        if (data.Item && data.Item.status === 'INPROGRESS') {
            const updateParams = {
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
                    ':newStatus': 'SUBMITTED'
                }
            };

            const updateResult = await dynamoDb.update(updateParams).promise();

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
        }

        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Invalid request or status is not INPROGRESS" }),
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
