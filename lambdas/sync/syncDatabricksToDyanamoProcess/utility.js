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
                            PK: `DET#${item[0]}`,
                            SK: `${item[5]}`,
                            brand: `${item[1]}`,
                            entityType: `DETAILS`,
                            quantity: parseInt(item[6], 10),
                            pickedQuantity: 0,
                            timestamp: `${item[7]}`
                        },          
                        ConditionExpression: 'attribute_not_exists(PK)',
                    },                                  
                };
            });

            const batchWriteParams = {
                RequestItems: {
                    [process.env.inditexDataTable]: putItemConditionRequest,
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

        const performBatchHeaderhWrite = async (chunk, headerDataList) => {
            const putItemConditionRequest = chunk.map((item) => {
                return {
                    PutRequest: {
                        Item: headerDataList[item],          
                        ConditionExpression: 'attribute_not_exists(PK)',
                    },                                  
                };
            });

            const batchWriteParams = {
                RequestItems: {
                    [process.env.inditexDataTable]: putItemConditionRequest,
                },
            };
    
            console.log("MEOW DB PARAMS", JSON.stringify(batchWriteParams));
    
            try {
                const result = await docClient.batchWrite(batchWriteParams).promise();
                console.log("DYNAMODB BATCH WRITE HEADERR RESULT", JSON.stringify(result));
            } catch (error) {
                console.error("DYNAMODB HEADERR BATCH WRITE ERROR", error);
                // Handle errors or specific error codes, such as ConditionalCheckFailedException
            }
        };
        // Chunk the array into batches
        const chunks = [];
        const headerChunks = [];

        const itemsDataList = chunkDataFetch.data;
        let batchSize = 25;
        let headerDataList = {};
        for(let j = 0; j < itemsDataList.length; j++){
            headerDataList[itemsDataList[j][0]] = {
                PK: `HEAD#${itemsDataList[j][0]}`,
                SK: `HEAD#${itemsDataList[j][0]}`,
                destId: `${itemsDataList[j][2]}`,
                entityType: `HEADER`,
                docNo: `${itemsDataList[j][3]}`,
                destIdGSK1: `HEADER#${itemsDataList[j][2]}`,
                status: 'OPEN',
                timestamp: `${itemsDataList[j][7]}`
            }
        }
        for (let i = 0; i < itemsDataList.length; i += batchSize) {
            chunks.push(itemsDataList.slice(i, i + batchSize));
        }

        for (let i = 0; i < Object.keys(headerDataList).length; i += batchSize) {
            headerChunks.push(Object.keys(headerDataList).slice(i, i + batchSize));
        }
        // Perform batch writes in parallel using Promise.all
        try {
            await Promise.all(chunks.map(performBatchWrite));
            await Promise.all(headerChunks.map((e) => performBatchHeaderhWrite(e, headerDataList)));
            // BATCH PROCESSED NOW UPDATE THE SYNC DB TABLE STATUS For statement Id
            await updateSyncHeaderStatus(item.PK, item.parentDataTimestamp);
            console.log("All batch writes completed successfully");
        } catch (error) {
            console.error("Error during updatingHeader status", error);
            // Handle errors or retries if needed
        }
    }));
};

const updateSyncHeaderStatus = async (statementId, parentDataTimestamp) => {
    const params = {
      TableName: process.env.syncDataTable,
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
  