const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const statusDispMapper = (status) => {
    const map = {
            "OPEN": "Open",
            "INPROGRESS": "In Progress",
            "SUBMITTED": "Submitted"
    }
    if(map[status] != undefined){
            return map[status];
    }
    return status;
}

const dbItemMapper = (item) => {

    return {
        seqNo: item.PK.split("#")[1],
        docNo: item.docNo,
        destId: item.destId,
        status: statusDispMapper(item.status),
        createdAt: item.timestamp
    }
}


exports.handler = async (event) => {
    try {

        const { lastEvaluatedKey, limit, status } = event.queryStringParameters;
        const pattern = /^[a-zA-Z]*$/;
        if (!pattern.test(status)) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ message: `Invalid status: ${status}` }),
            };
        }

        let statuses = status.split(',');
        let statusFilter = "";
        let expValues = {};
        if(status.includes("ALL")){
            statuses = ["OPEN", "INPROGRESS"];
        }
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
        let result = await dynamoDb.query(qParams).promise();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(
                {
                    paginationToken: result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined,
                    transfers: result.Items.map((e) => dbItemMapper(e)),
                    display_name: {
                        docNo: "Document No",
                        destId: "StoreId",
                        status: "Status",
                        createdAt: "Create Date",
                        seqNo: "Sequence No"
                    }
                }),
        };

    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};
