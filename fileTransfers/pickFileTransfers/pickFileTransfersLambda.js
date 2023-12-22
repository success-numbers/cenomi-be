const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { userId, fileName, fileType, timestamp } = JSON.parse(event.body);

        if (!userId || !fileName || !fileType || !timestamp) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'userId, fileName, fileType, and timestamp are required.' }),
            };
        }
        
        const auditTable = process.env.auditTable;
        console.log(auditTable);
        const params = {
            TableName: auditTable,
            Item: {
                PK: fileName,
                SK: timestamp,
                userId: userId,
                fileType: fileType,
            },
        };
        console.log(auditTable);
        await dynamoDb.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data inserted into auditTable successfully.' }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};
