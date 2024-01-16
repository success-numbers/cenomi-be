const axios = require('axios');
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ region: process.env.REGION });
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    try {
        console.log(JSON.stringify(event));
        const changeRecords = [];
        event.Records = event.Records.map((record) => {
            const mRecord = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
            console.log("Unmarshalled JSON Object", JSON.stringify(mRecord));
            changeRecords.push(mRecord);
        })
        console.log("MEOW after conversion", JSON.stringify(changeRecords));
        const queueUrl = process.env.syncChunkSQS;

        const params = {
            MessageBody: JSON.stringify({
                "items": changeRecords
            }), // Pass the event message to SQS
            QueueUrl: queueUrl,
        };

        await sqs.sendMessage(params).promise();
        console.log("Event message sent to SQS successfully");
    } catch (error) {
        console.error('Error sending message to SQS:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Error sending message to SQS' }),
        };
    }
};
