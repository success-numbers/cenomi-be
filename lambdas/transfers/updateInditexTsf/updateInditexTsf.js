const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        console.log(event.body)
        const { transferSeqId, row } = JSON.parse(event.body);

        if (!transferSeqId || !row) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'transferSeqId and row are required.' }),
            };
        }

        const indexTable = process.env.indexTable;
        const { itemSeqId, brand, destId, barcode, pickQuantity } = row;


        const params = {
            TableName: indexTable,
            Key: {
                PK: `DET#${transferSeqId}`,
                SK: barcode,
            },
            UpdateExpression: 'SET #pickedQuantity = :pickedQuantity',
            ConditionExpression: 'PK = :pk AND SK = :sk',
            ExpressionAttributeNames: {
                '#pickedQuantity': 'pickedQuantity',
            },
            ExpressionAttributeValues: {
                ':pickedQuantity': pickQuantity,
                ':pk': `DET#${transferSeqId}`,
                ':sk': pickQuantity,
            },
        };

        /*
        const params = {
            TableName: indexTable,
            Item: {
                PK: `DET#${transferSeqId}`,
                SK: barcode,
                brand: brand,
                entityType: 'DETAILS',
                pickedQuantity: pickQuantity,
                timestamp: new Date().toISOString()
            },
        };
        */

        const res = await dynamoDb.update(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Pick Qty Updated.', res: res }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};
