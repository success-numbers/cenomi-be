const axios = require('axios');
const AWS = require('aws-sdk');
const utility = require('./utility')
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    try {
        const syncStartTime =  new Date().toISOString();
        const getLatestStatementQueryItem = await utility.getLatestStatementIdFromDB(process.env.syncTableName);
        console.log("MEOW ", JSON.stringify(getLatestStatementQueryItem));
        const statementId = getLatestStatementQueryItem.PK;
        const statemnentIdStatus = await utility.queryStatusAndChunkDetails(statementId);
        console.log("MEOW 2", statemnentIdStatus);
        if(statemnentIdStatus.data.status.state == "SUCCEEDED"){
            const manifest = statemnentIdStatus.data.manifest;
            const chunksList = manifest.chunks;
            await utility.insertChunksDataToDynamoDB(chunksList,process.env.chunkTableName,getLatestStatementQueryItem.PK);
            console.log("MEOW PROCESSED SUCCEFULLY");
            return;
        }else{
            console.log("Status still is PENDING SKIPPING EXECUTION");
            return;
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: JSON.stringify(error) })
        };
    }
};
