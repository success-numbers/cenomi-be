const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function getItemsByDestId(destId) {
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

    const params = {
        TableName: process.env.tableName,
        IndexName: 'locationIndex',
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames
    };

    try {
        const result = await dynamoDb.query(params).promise();
        console.log(`Items retrieved for dest_id ${destId} from DynamoDB:`, result.Items);
        return result.Items;
    } catch (error) {
        console.error(`Error getting items for dest_id ${destId} from DynamoDB:`, error);
        throw error;
    }
}

exports.handler = async (event) => {
    try {
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

        
        const headerItems = await getItemsByDestId(destId);

        
        const transfers = headerItems.map(item => ({
            transferSeqId: item.PK.split('#')[1], 
            fromStore: item['fromStore'],
            fromStoreName: item['fromStoreName'],
            docDate: item.timestamp,
            status: item.status 
        }));

        const response = {
            destLocId: destId,
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
