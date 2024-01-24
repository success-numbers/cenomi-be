const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const convertToReadableDateTime = (timestamp, targetTimeZone = "Asia/Riyadh") => {
    // Check if timestamp is null
    if (timestamp === null || timestamp === undefined) {
        return null;
    }

    // Create a Date object from the timestamp
    const dateTime = new Date(timestamp);

    // Convert to the target timezone
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
        timeZone: targetTimeZone,
    };

    const readableDateTime = dateTime.toLocaleString('en-US', options);

    return readableDateTime;
};


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
    let storeId = `${item.destId}`;
    if(item.fromStoreDesc != undefined && item.fromStoreDesc != null && item.fromStoreDesc != "null"){
        storeId+=`-${item.fromStoreDesc}`
    }
    return {
        seqNo: item.PK.split("#")[1],
        docNo: item.docNo,
        destId: `${storeId}`,
        status: statusDispMapper(item.status),
        createdAt: convertToReadableDateTime(item.timestamp, "Asia/Riyadh")
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
                        seqNo: "Sequence No",
                        docNo: "Document No",
                        destId: "StoreId",
                        status: "Status",
                        createdAt: "Create Date",
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
