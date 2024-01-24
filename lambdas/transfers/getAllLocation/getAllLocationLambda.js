const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        let params = {
            TableName: process.env.configTable,
            KeyConditionExpression: `PK = :fileName and SK = :sk`,
            ExpressionAttributeValues: {
                ':fileName': "WAREHOUSES",
                ':sk': "ALL"
            },
        };

        const response = await dynamoDb.query(params).promise();
        if(response && response.Count > 0){
            const apiResp = {
                destLocIds: response.Items[0].data,
                count: response.Count
            }
            const res = {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(apiResp),
            };
            return res;
        }else{
            throw "LOV Value doesnt exists";
        }
       
        // const destLocIds = Array.from(new Set(result.Items.map(item => {
        //     const splitValues = item.destIdGSK1.split('#');
        //     return splitValues[1]; // Extracting the destId value
        // })));

        // const response = {
        //     destLocIds: destLocIds,
        //     count: destLocIds.length
        // };

        // const res = {
        //     statusCode: 200,
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Access-Control-Allow-Origin': '*',
        //     },
        //     body: JSON.stringify(response),
        // };
    } catch (e) {
        console.error('Error fetching destLocIds:', e.message);
        const res = {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Internal server error" }),
        };
        return res;
    }
};
