const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const params = {
            TableName: process.env.tableName,
            IndexName: 'StatusIndex', 
            KeyConditionExpression: '#Status = :rejected',
            ExpressionAttributeNames: {
                '#Status': 'status',
            },
            ExpressionAttributeValues: {
                ':rejected': 'rejected',
            },
        };

        const result = await dynamoDb.query(params).promise();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ items: result.Items }),
        };
    } catch (error) {
        console.error('Error getting rejected items from DynamoDB:', error);
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: error.message || 'Error retrieving rejected items' }),
        };
    }
};
