const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const params = {
            TableName: process.env.tableName,
            IndexName: 'locationIndex',
            ProjectionExpression: 'destIdGSK1', 
        };

        const result = await dynamoDb.scan(params).promise();
        
       
        const destLocIds = Array.from(new Set(result.Items.map(item => {
            const splitValues = item.destIdGSK1.split('#');
            return splitValues[1]; // Extracting the destId value
        })));

        const response = {
            destLocIds: destLocIds,
            count: destLocIds.length
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
