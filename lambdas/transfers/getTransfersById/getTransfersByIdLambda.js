const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const constants = require('./constants');
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

exports.handler = async (event) => {
    try {
        const seqId = event.queryStringParameters.seqId;

        if (!seqId) {
            const res = {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "seqId parameter is missing" }),
            };
            return res;
        }

        const params = {
            TableName: process.env.tableName,
            KeyConditionExpression: 'PK = :pkVal',
            ExpressionAttributeValues: {
                ':pkVal': `DET#${seqId}`,
            },
        };

        const result = await dynamoDb.query(params).promise();
        
        const Items = result.Items.map(item => ({
            itemSeqId: seqId,
            barcode: item.SK,
            timestamp: convertToReadableDateTime(item.timestamp, "Asia/Riyadh"),
            quantity: item.quantity,
            pickedQuantity: item.pickedQuantity,
            brand: item.brand,
            boxId: item.boxId
        }));

        const response = {
            transferSeqId: seqId,
            Items: Items,
            display_name: constants.ColumnMappings        
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
        console.error('Error fetching transfer items:', e.message);
        const res = {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": `Error! ${JSON.stringify(e)}` }),
        };
        return res;
    }
};
