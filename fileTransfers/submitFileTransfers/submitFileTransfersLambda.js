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
        const fileTransferDataTable = process.env.dataTable;

        const auditQueryParams = {
            TableName: auditTable,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': fileName,
            },
            ScanIndexForward: false,
        };

        const auditQueryResult = await dynamoDb.query(auditQueryParams).promise();

        if (auditQueryResult.Count > 0) {
            const latestAuditEntry = auditQueryResult.Items[0];

            if (latestAuditEntry.userId === UserId) {
                await updateHeaderStatus(fileName, fileTransferDataTable);
                await deleteAuditEntries(fileName, auditTable);

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: `Status updated to SUBMITTED for ${fileType}.` }),
                };
            } else {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Picking is in progress by another user.' }),
                };
            }
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'No audit entries found for the given fileName.' }),
            };
        }
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

    try {
        await dynamoDb.update(updateParams).promise();
    } catch (error) {
        console.error('Update Header Status Error:', error.message);
        throw new Error(`Update Header Status Error: ${error.message}`);
    }
}

async function deleteAuditEntries(fileName, auditTable) {
    const queryParams = {
        TableName: auditTable,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
            ':pk': fileName,
        },
    };

    try {
        const queryResult = await dynamoDb.query(queryParams).promise();

        // Delete each item found by the query
        const deletePromises = queryResult.Items.map(async (item) => {
            const deleteParams = {
                TableName: auditTable,
                Key: {
                    PK: item.PK,
                    SK: item.SK,
                },
                ConditionExpression: 'attribute_exists(PK)', // Add any conditions if needed
            };

            return dynamoDb.delete(deleteParams).promise();
        });

        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Delete Audit Entries Error:', error.message);
        throw new Error(`Delete Audit Entries Error: ${error.message}`);
    }
}
