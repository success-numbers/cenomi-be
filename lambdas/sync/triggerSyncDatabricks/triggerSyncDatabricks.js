const axios = require('axios');
const AWS = require('aws-sdk');
const utility = require('./utility')
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    try {
        console.log("Trigger Sync Databricks Event", JSON.stringify(event));
        let syncStartTime = null;
        if(event.body != null){
            const eventBody = JSON.parse(event.body);
            // const { startSyncTime = null} = eventBody;
            if(!eventBody.syncStartTime) {
                throw "Error! syncStartTime Field is Required for manual trigger";
            }
            syncStartTime = eventBody.syncStartTime;
        }else{
            // Fetch Latest last Synced Time from DB
        let params = {
            TableName: process.env.syncTableName,
            IndexName: 'status-timestamp-index',
            KeyConditionExpression: '#status = :value', // Using expression attribute name
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':value': 'DONE'
            },
            ScanIndexForward: false,
            Limit: 1
            };
            const result = await docClient.query(params).promise();
            console.log("MEOW 2424", result);
            if(result.Count > 0){
                syncStartTime = result.Items[0].SK;
            }else{
                syncStartTime =  new Date().toISOString();
            }
        }
        console.log("MEOW SYNCT IME", syncStartTime);
        const databrickApiInit = await utility.databricksApi(syncStartTime);
        if(!databrickApiInit.data  && !databrickApiInit.data.statement_id){
            console.log("Error! DATABRICKS API FAILED TO CREATE STATEMENT ID");
            throw "Error! DATABRICKS API FAILED TO CREATE STATEMENT ID";
        }
        const statementId = databrickApiInit.data.statement_id;
        const params = {
            TableName: process.env.syncTableName,
            Item: {
                PK: statementId,
                SK: new Date().toISOString(),
                status: 'PENDING'
            }
        };
        await docClient.put(params).promise();
        console.log("Successfully Triggered Syncing Data from Databricks");
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Syncing Started Successfully" })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: JSON.stringify(error) })
        };
    }
};
