const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const {  key, entityId, userId, fileType, timestamp, deviceId } = JSON.parse(event.body);

        if (!key || !entityId || !userId || !fileType || !timestamp || !deviceId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'key, entityId, userId, fileType, timestamp, deviceId are required.' }),
            };
        }

        const lockTbale = process.env.lockTbale;


        const qParams = {
            TableName: process.env.lockTbale,
            KeyConditionExpression: 'PK= :entityId and SK= :key',
            ExpressionAttributeValues: {
                ":entityId": entityId,
                ":key": key
            },
            Limit: 1,
        };

        const result = await dynamoDb.query(qParams).promise();
        console.log('SearchedExisting:', result);

        if (result && result.Count > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: `Data already exists in lockTbale created at ${result.Items[0].timestamp}.` }),
            };
        }

        const params = {
            TableName: lockTbale,
            Item: {
                PK: entityId,
                SK: key,
                userId: userId,
                timestamp: timestamp,
                fileType: fileType,
                deviceId: deviceId
            },
        };

        console.log(params);
        await dynamoDb.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data inserted into lockTbale successfully.' }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};
