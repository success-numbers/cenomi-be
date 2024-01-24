const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function getItemsByDestId(destId, limit, lastEvaluatedKey = null) {
    console.log(`Get Data From DynamoDB called for dest_id: ${destId}`);

    const keyConditionExpression = 'destIdGSK1 = :gsk';
    const filterExpression = 'attribute_not_exists(#st) OR #st <> :submitted';

    const expressionAttributeValues = {
        ':gsk': `HEADER#${destId}`,
        ':submitted': 'SUBMITTED'
    };

    const expressionAttributeNames = {
        '#st': 'status'
    };

    let params = {
        TableName: process.env.tableName,
        IndexName: 'locationIndex',
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        Limit: limit
    };
    if (lastEvaluatedKey && lastEvaluatedKey != "null") {
        const decodedKey = JSON.parse(atob(lastEvaluatedKey));
        params.ExclusiveStartKey = decodedKey;
    }
    console.log("DB QUERY PARAMS", params);
    try {
        const result = await dynamoDb.query(params).promise();
        console.log(`Items retrieved for dest_id ${destId} from DynamoDB:`, result.Items);
        if(result.Items && result.Count > 0){
            return {
                items: result.Items,
                latestEvaluatedKey: result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : null
            }
        }else{
            return {
                items: [],
                latestEvaluatedKey: null
            }
        }


    } catch (error) {
        console.error(`Error getting items for dest_id ${destId} from DynamoDB:`, error);
        throw error;
    }
}

exports.handler = async (event) => {
    try {
        console.log("Incoming Event", event);
        const { lastEvaluatedKey, limit = 100 } = event.queryStringParameters;
        const destId = event.queryStringParameters?.destId ?? null; 
        if (!destId) {
            const res = {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "destId query param is required" }),
            };
            return res;
        }

        
        const { items = [], latestEvaluatedKey = null } = await getItemsByDestId(destId, limit, lastEvaluatedKey);

        
        const transfers = items.map(item => ({
            transferSeqId: item.PK.split('#')[1], 
            fromStoreId: item['fromStoreId'],
            destStoreId: item['destStoreId'],
            fromStoreDesc: item['fromStoreDesc'],
            brand: item['brand'],
            boxId: item['boxId'],
            docNo: item['docNo'],
            docDate: item.timestamp,
            status: item.status 
        }));

        const response = {
            destLocId: destId,
            lastEvaluatedKey: latestEvaluatedKey,
            transfers: transfers
        };

        const res = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
        };
        return res;
    } catch (e) {
        console.log(e);
        const res = {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": `Error ${JSON.stringify(e)}` }),
        };
        return res;
    }
};
