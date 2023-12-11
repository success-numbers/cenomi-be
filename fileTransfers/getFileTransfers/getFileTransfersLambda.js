const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { type, status } = event.queryStringParameters;

        const validFileTypes = ['ALLOC', 'GRN', 'GSD', 'BRI'];
        const validStatusValues = ['OPEN', 'INPROGRESS', 'SUBMITTED'];

        if (!validFileTypes.includes(type)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid fileType' }),
            };
        }

        const statuses = status.split(',').map((s) => s.trim());

        for (const s of statuses) {
            if (!validStatusValues.includes(s)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: `Invalid status: ${s}` }),
                };
            }
        }

        const params = {
            TableName: process.env.tableName,
            FilterExpression: 'begins_with(SK, :fileType) AND #st IN (:status) AND entityType = :entityType',
            ExpressionAttributeNames: {
                '#st': 'status',
            },
            ExpressionAttributeValues: {
                ':fileType': type,
                ':status': statuses,
                ':entityType': 'HEADER',
            },
        };

        const result = await dynamoDb.scan(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(result.Items),
        };
    } catch (error) {
        console.error('Error fetching transfers:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    }
};
