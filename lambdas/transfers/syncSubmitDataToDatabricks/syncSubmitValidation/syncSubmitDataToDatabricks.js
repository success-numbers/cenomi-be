const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ region: process.env.REGION });
exports.handler = async (event) => {
    try {
        console.log("Incoming Event Sync Submit Databricks", event);
        const body = JSON.parse(event.body ?? '{}');

        if(!body.tsfSeqNo) {
            throw "tsfSeqNo is a reqd field";
        }
        const params = {
            MessageBody: JSON.stringify({
                "tsfSeqNo": body.tsfSeqNo
            }),
            QueueUrl: process.env.SYNC_SQS,
        };

        await sqs.sendMessage(params).promise();
        const res = {
            statusCode: 200,
            body: JSON.stringify({
                "message": "Sync Submit Successfully"
            }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
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
