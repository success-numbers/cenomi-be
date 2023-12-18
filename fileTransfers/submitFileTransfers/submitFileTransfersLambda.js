const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { type } = event.queryStringParameters || {};
        const { fileName } = JSON.parse(event.body);

        if (!type || !fileName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Type and fileName are required.' }),
            };
        }

        const dataTable = process.env.dataTable;

        switch (type.toUpperCase()) {
            case 'ALLOC':
                // Check if all detail items for fileName in dataTable have isScanned as true
                const allocParams = {
                    TableName: dataTable,
                    KeyConditionExpression: 'PK = :pk',
                    ExpressionAttributeValues: {
                        ':pk': fileName,
                    },
                    FilterExpression: 'entityType = :entityType AND attribute_exists(isScanned) AND isScanned = :scanned',
                    ExpressionAttributeValues: {
                        ':entityType': 'DETAIL',
                        ':scanned': true,
                    },
                };

                const allocResult = await dynamoDb.query(allocParams).promise();

                if (allocResult.Count === 0) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Not all detail items are scanned for ALLOC.' }),
                    };
                }

                // Change status of header level row to SUBMITTED in dataTable for ALLOC
                await updateHeaderStatus(fileName, dataTable);
                break;

            case 'GRN':
            case 'DSD':
                // Change status of header level row to SUBMITTED in dataTable for GRN or DSD
                await updateHeaderStatus(fileName, dataTable);
                break;

            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Invalid type provided.' }),
                };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Status updated to SUBMITTED for ${type}.` }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};

async function updateHeaderStatus(fileName, dataTable) {
    const updateParams = {
        TableName: dataTable,
        Key: {
            PK: fileName,
            SK: `HEAD#${fileName}`,
        },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ':status': 'SUBMITTED',
        },
    };

    await dynamoDb.update(updateParams).promise();
}
