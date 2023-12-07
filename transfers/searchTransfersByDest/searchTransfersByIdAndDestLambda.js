const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function getTransferDetails(transferId) {
    console.log(`Get Transfer Details called for transferId: ${transferId}`);

    const params = {
        TableName: process.env.tableName,
        Key: {
            'PK': `HEAD#${transferId}`,
            'SK': `HEAD#${transferId}`
        }
    };

    try {
        const result = await dynamoDb.get(params).promise();

        if (!result.Item) {
            throw new Error('Transfer details not found');
        }

        return result.Item;
    } catch (error) {
        console.error('Error getting transfer details:', error.message);
        throw error;
    }
}

exports.handler = async (event) => {
    try {
        const transferId = event.queryStringParameters.transferId;
        const destLocId = event.queryStringParameters.destLocId;

        if (!transferId || !destLocId) {
            const res = {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "transferId or destLocId parameter is missing" }),
            };
            return res;
        }

        const transferDetails = await getTransferDetails(transferId);

        if (transferDetails.destId !== destLocId) {
            const res = {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "Transfer does not exist in this location" }),
            };
            return res;
        }

        const response = {
            transferId: transferId,
            destLocId: destLocId,
            timestamp: transferDetails.timestamp,
            status: transferDetails.status
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
            body: JSON.stringify({ "message": "Internal server error" }),
        };
        return res;
    }
};
