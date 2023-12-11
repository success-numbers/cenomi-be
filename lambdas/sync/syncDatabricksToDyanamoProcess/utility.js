const axios = require('axios');
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

exports.fetchChunkDetails = async (items) => {
    const promises = [];
    const databricksEndpoint = `https://adb-218500037178863.3.azuredatabricks.net/api/2.0/sql/statements/`;
    const databricksToken = 'Bearer dapi403f06fb4fd99ee03377165e3984db86'; // Replace with your Databricks token

    await Promise.all(items.map(async (item) => {
        console.log("MEOW start")
        const chunkDetails = await axios.get(`${databricksEndpoint}${item.PK}/result/chunks/${item.SK}`, {
            headers: {
                Authorization: databricksToken,
                'Content-Type': 'application/json'
            }
        });
        const { chunk_index, external_link } = chunkDetails.data.external_links[0];
        const chunkDataFetch = await axios.get(`${external_link}`);
        console.log("MEOW CHUNK DATA FETCH", JSON.stringify(chunkDataFetch.data));

        const performBatchWrite = async (chunk) => {

            const putItemConditionRequest = chunk.map((item) => {
                const d = new Date().toISOString();
                return {
                    PutRequest: {
                        Item: {
                            PK: `DET#${item[7]}`,
                            SK: `${item[42]}`,
                            brand: 'Test',
                            status: 'OPEN',
                            timestamp: d
                        },          
                        ConditionExpression: 'attribute_not_exists(PK)',
                    },                                  
                };
            });

            const batchWriteParams = {
                RequestItems: {
                    'Cenomi-Integration-SIT-Config': putItemConditionRequest,
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
        const itemsDataList = chunkDataFetch.data;
        let batchSize = 25;
        for (let i = 0; i < itemsDataList.length; i += batchSize) {
            chunks.push(itemsDataList.slice(i, i + batchSize));
        }

        // Perform batch writes in parallel using Promise.all
        try {
            await Promise.all(chunks.map(performBatchWrite));
            // BATCH PROCESSED NOW UPDATE THE SYNC DB TABLE STATUS For statement Id
            await updateSyncHeaderStatus(item.PK);
            console.log("All batch writes completed successfully");
        } catch (error) {
            console.error("Error during batch writes", error);
            // Handle errors or retries if needed
        }
    }));
};

const updateSyncHeaderStatus = async (statementId) => {
    const params = {
      TableName: process.env.syncDataTable,
      Key: {
        'PK': statementId
      },
      UpdateExpression: 'SET #status = :newValue', // Use ExpressionAttributeNames for 'status'
      ExpressionAttributeValues: {
        ':newValue': 'DONE'
      },
      ExpressionAttributeNames: {
        '#status': 'status' // Provide an alias for the reserved keyword 'status'
      }
    };
  
    await docClient.update(params).promise();
  };
  