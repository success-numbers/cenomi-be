const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { UserId, fileName, fileType, TimeStamp } = JSON.parse(event.body);

        if (!UserId || !fileName || !fileType || !TimeStamp) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'UserId, fileName, fileType, and TimeStamp are required.' }),
            };
        }
        
        const auditTable = process.env.auditTable;
        console.log(auditTable);
        const params = {
            TableName: auditTable,
            Item: {
                PK: fileName,
                SK: TimeStamp,
                userId: UserId,
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
