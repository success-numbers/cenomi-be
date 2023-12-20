const AWS = require('aws-sdk');
const axios = require('axios');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.databricksApi = async () => {
    const databricksEndpoint = 'https://adb-218500037178863.3.azuredatabricks.net/api/2.0/sql/statements/';
    const databricksToken = 'Bearer dapi403f06fb4fd99ee03377165e3984db86'; // Replace with your Databricks token

    const sqlStatement = "select * from fin_recon.cenomi_app.movement where landing_update_timestamp > '2023-09-14T05:59:04.283+0000' and `p:Colour` = 700"; // Your SQL statement
    const queryPayload = {  
        statement: sqlStatement,
        warehouse_id: '7d5e01a202a675ca',
        disposition: 'EXTERNAL_LINKS',
        format: 'JSON_ARRAY',
        byte_limit: 10485760,
        wait_timeout: '0s'
    };

    const response = await axios.post(databricksEndpoint, queryPayload, {
        headers: {
            Authorization: databricksToken,
            'Content-Type': 'application/json'
        }
    });

    return response;
}


exports.queryStatusAndChunkDetails = async (statementId) => {
    const databricksEndpoint = `https://adb-218500037178863.3.azuredatabricks.net/api/2.0/sql/statements/${statementId}`;
    const databricksToken = 'Bearer dapi403f06fb4fd99ee03377165e3984db86'; // Replace with your Databricks token
    const response = await axios.get(databricksEndpoint, {
        headers: {
            Authorization: databricksToken,
            'Content-Type': 'application/json'
        }
    });

    return response;
}



exports.getLatestStatementIdFromDB = async (syncTableName) => {
    const params = {
        TableName: syncTableName,
        IndexName: "status-timestamp-index",
        KeyConditionExpression: "#status = :value",
        ExpressionAttributeValues: {
            ":value": "PENDING",
        },
        ExpressionAttributeNames: {
            "#status": "status",  
        },
        ScanIndexForward: false,
        Limit: 1,
    };
    

    const result = await docClient.query(params).promise();
    if (result.Count && result.Count > 0) {
        return result.Items[0];
    }else{
        throw "No Latest Statement ID found with Status = PENDING"
    }
}

exports.insertChunksDataToDynamoDB = async (chunksList, chunkTableName, statementId, parentDataTimestamp) => {
    const createdAt = new Date().toISOString();
    const batchSize = 25; // Maximum number of items per batch write operation

    // Function to perform a batch write for a given chunk
    const performBatchWrite = async (chunk) => {
        const putItemConditionRequest = chunk.map((chunkItem) => {
            return {
                PutRequest: {
                    Item: {
                        PK: statementId,
                        SK: `${chunkItem.chunk_index}`,
                        parentDataTimestamp: parentDataTimestamp,
                        createdAt: createdAt
                    },
                    ConditionExpression: 'attribute_not_exists(PK)',
                },
            };
        });

        const batchWriteParams = {
            RequestItems: {
                [chunkTableName]: putItemConditionRequest,
            },
        };

        console.log("MEOW DB PARAMS", JSON.stringify(batchWriteParams));

        try {
            const result = await docClient.batchWrite(batchWriteParams).promise();
            console.log("DYNAMODB BATCH WRITE RESULT", JSON.stringify(result));
        } catch (error) {
            console.error("DYNAMODB BATCH WRITE ERROR", error);
            // Handle errors or specific error codes, such as ConditionalCheckFailedException
        }
    };

    // Chunk the array into batches
    const chunks = [];
    for (let i = 0; i < chunksList.length; i += batchSize) {
        chunks.push(chunksList.slice(i, i + batchSize));
    }

    // Perform batch writes in parallel using Promise.all
    try {
        await Promise.all(chunks.map(performBatchWrite));
        console.log("All batch writes completed successfully");
    } catch (error) {
        console.error("Error during batch writes", error);
        // Handle errors or retries if needed
    }
}

exports.updateSyncHeaderStatus = async (statementId, parentDataTimestamp) => {
    const params = {
      TableName: process.env.syncTableName,
      Key: {
        'PK': statementId,
        'SK': parentDataTimestamp
      },
      UpdateExpression: 'SET #status = :newValue',
      ExpressionAttributeValues: {
        ':newValue': 'DONE'
      },
      ExpressionAttributeNames: {
        '#status': 'status' 
      }
    };
    console.log("MEOW update header status", params);
    await docClient.update(params).promise();
  };
  