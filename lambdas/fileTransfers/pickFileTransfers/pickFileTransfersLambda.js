const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { key, entityId, userId, fileType, timestamp, deviceId } = JSON.parse(event.body);

        if (!key || !entityId || !userId || !fileType || !timestamp || !deviceId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'key, entityId, userId, fileType, timestamp, deviceId are required.' }),
            };
        }

        const lockTable = process.env.lockTable;
        const dataTable = process.env.dataTable;
        const inditexTable = process.env.inditexTable;

        const updateParams = {
            TableName: fileType === 'ALLOC' || fileType === 'GRN' || fileType === 'DSD' ? dataTable : inditexTable,
            Key: {
                PK: (fileType === 'ALLOC' || fileType === 'GRN' || fileType === 'DSD') ?
                    (entityId.indexOf("/") > 0 ? entityId.substring(0, entityId.indexOf("/")) : entityId)
                    : `HEAD#${entityId}`,
                SK: (fileType === 'ALLOC' || fileType === 'GRN' || fileType === 'DSD') ?
                    `HEAD#${(entityId.indexOf("/") > 0 ? entityId.substring(0, entityId.indexOf("/")) : entityId)}`
                    : `HEAD#${entityId}`,
            },
            ConditionExpression: '#status = :openStatus or #status = :inProgressStatus',
            UpdateExpression: 'SET #status = :inProgressStatus',
            ExpressionAttributeNames: {
                "#status": 'STATUS'
            },
            ExpressionAttributeValues: {
                ":openStatus": 'OPEN',
                ":inProgressStatus": 'INPROGRESS'
            },
            Limit: 1,
        };

        console.log('Updating to In progress: ', updateParams);

        try {
            await dynamoDb.update(updateParams).promise();
        }
        catch (ex) {
            console.log(ex);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: `Invalid data provided` }),
            };
        }

        const qParams = {
            TableName: process.env.lockTable,
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
                body: JSON.stringify({ message: `Data already exists in lockTable created at ${result.Items[0].timestamp}.` }),
            };
        }

        const params = {
            TableName: lockTable,
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
            body: JSON.stringify({ message: 'Data inserted into lockTable successfully.' }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};
