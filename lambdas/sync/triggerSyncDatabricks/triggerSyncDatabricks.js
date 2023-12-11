const axios = require('axios');
const AWS = require('aws-sdk');
const utility = require('./utility')
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    try {
        const syncStartTime =  new Date().toISOString();
        const databrickApiInit = await utility.databricksApi();
        if(!databrickApiInit.data  && !databrickApiInit.data.statement_id){
            console.log("Error! DATABRICKS API FAILED TO CREATE STATEMENT ID");
            throw "Error! DATABRICKS API FAILED TO CREATE STATEMENT ID";
        }
        const statementId = databrickApiInit.data.statement_id;
        const params = {
            TableName: process.env.syncTableName,
            Item: {
                PK: statementId,
                SK: syncStartTime,
                status: 'PENDING'
            }
        };
        await docClient.put(params).promise();
        console.log("Successfully Triggered Syncing Data from Databricks");
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: JSON.stringify(error) })
        };
    }
};
