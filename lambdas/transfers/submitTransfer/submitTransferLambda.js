const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const transferSeqId = body.transferSeqId;
        const userId = body.userId;

        // Check the status in the process.env.tableName
        const processStatusParams = {
            TableName: process.env.tableName,
            Key: {
                'PK': `HEAD#${transferSeqId}`,
                'SK': `HEAD#${transferSeqId}`
            }
        };
        const processData = await dynamoDb.get(processStatusParams).promise();

        if (processData.Item && processData.Item.status === 'INPROGRESS') {
            // Check the latest userId associated with the transferSeqId in the auditTable
            const auditParams = {
                TableName: process.env.auditTable,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': transferSeqId
                },
                ScanIndexForward: false,
                Limit: 1 // Retrieve only the latest entry
            };
            const auditData = await dynamoDb.query(auditParams).promise();

            if (auditData.Count > 0 && auditData.Items[0].userId === userId) {
                // Update status to 'SUBMITTED' in the process.env.tableName
                const updateParams = {
                    TableName: process.env.tableName,
                    Key: {
                        'PK': `HEAD#${transferSeqId}`,
                        'SK': `HEAD#${transferSeqId}`
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
                    // Delete all entries in the auditTable corresponding to PK
                    const deleteAuditEntriesParams = {
                        TableName: process.env.auditTable,
                        Key: {
                            'PK': transferSeqId
                        }
                    };
                    await dynamoDb.delete(deleteAuditEntriesParams).promise();

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
        }

        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Invalid transferSeqId, status is not INPROGRESS, or userId mismatch" }),
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
