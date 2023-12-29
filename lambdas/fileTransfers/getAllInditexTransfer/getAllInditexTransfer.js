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

        /*
        Issue::
        Query needs key condition is needed so scan.. 
        but in scan limit means how many records will be scanned
        not how many will be returned.
        */

        const qParams = lastEvaluatedKey ? {
            TableName: process.env.indexTable,
            FilterExpression: statusFilter,
            ExclusiveStartKey: { "PK": lastEvaluatedKey.split("_SK_")[0], "SK": lastEvaluatedKey.split("_SK_")[1] },
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: expValues,
            PageSize: limit,
        } : {
            TableName: process.env.indexTable,
            FilterExpression: statusFilter,
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: expValues,
            PageSize: limit,
        };
        const result = await dynamoDb.scan(qParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(
                {
                    paginationToken: result.LastEvaluatedKey ? `${result.LastEvaluatedKey.PK}_SK_${result.LastEvaluatedKey.SK}` : undefined,
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
