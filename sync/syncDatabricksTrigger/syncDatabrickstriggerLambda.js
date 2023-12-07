const axios = require('axios');
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

const AWS = require('aws-sdk');

exports.handler = async (event, context) => {
    try {
        console.log(event);
        const sqs = new AWS.SQS({ region: process.env.REGION });
        const queueUrl = process.env.DLQ_ARN; // Replace with your SQS queue URL

        const params = {
            MessageBody: JSON.stringify(event), // Pass the event message to SQS
            QueueUrl: queueUrl,
        };

        await sqs.sendMessage(params).promise();
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Event message sent to SQS successfully' }),
        };
    } catch (error) {
        console.error('Error sending message to SQS:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error sending message to SQS' }),
        };
    }
};
