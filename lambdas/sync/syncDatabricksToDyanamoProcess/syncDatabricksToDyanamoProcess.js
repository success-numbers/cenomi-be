const axios = require('axios');
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ region: process.env.REGION });
const docClient = new AWS.DynamoDB.DocumentClient();
const utility = require('./utility')
exports.handler = async (event, context) => {
    try {
        console.log(JSON.stringify(event));
        await Promise.all(event.Records.map(async (record) => {
            const recordBody = JSON.parse(record.body || '{}');
            const items = recordBody.items ?? [];
            await utility.fetchChunkDetails(items);
        }));
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: JSON.stringify(error) }),
        };
    }
};
