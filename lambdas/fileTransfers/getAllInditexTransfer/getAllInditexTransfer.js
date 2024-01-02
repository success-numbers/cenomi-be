const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {

        const { lastEvaluatedKey, limit, status } = event.queryStringParameters;
        const pattern = /^[a-zA-Z,]*$/;
        if (!pattern.test(status)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: `Invalid status: ${status}` }),
            };
        }

        const statuses = status.split(',');
        let statusFilter = "";
        let expValues = {};

        for (let i = 0; i < statuses.length; i++) {
            statusFilter = i === 0 ? `#status= :stat${i}` : `${statusFilter} or #status= :stat${i}`;
            expValues[`:stat${i}`] = statuses[i];
        }
        
        expValues[`:headDataInd`] = 'HEADER'

        const qParams = {
            TableName: process.env.indexTable,
            IndexName: 'TypeIndex',
            KeyConditionExpression: "entityType = :headDataInd",
            ExclusiveStartKey: lastEvaluatedKey ? JSON.parse(atob(lastEvaluatedKey)) : undefined,
            FilterExpression: statusFilter,
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: expValues,
            Limit: limit,
        };
        const result = await dynamoDb.query(qParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(
                {
                    paginationToken: result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined,
                    transfers: result.Items,
                    display_name: {
                        userId: "USER ID",
                        docNo: "Document No",
                        destId: "StoreId",
                        status: "Status",
                        createdAt: "Created At",
                        seqNo: "Sequence No"
                    }
                }),
        };

    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};
