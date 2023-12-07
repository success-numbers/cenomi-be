const axios = require('axios');
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    try {
        const databricksEndpoint = 'https://adb-218500037178863.3.azuredatabricks.net/api/2.0/sql/statements/';
        const databricksToken = 'Bearer dapi403f06fb4fd99ee03377165e3984db86'; // Replace with your Databricks token

        const sqlStatement = "select * from fin_recon.cenomi_app.movement where landing_update_timestamp > '2023-09-14T05:59:04.283+0000' and `p:Colour` = 700"; // Your SQL statement
        const queryPayload = {
            statement: sqlStatement,
            warehouse_id: '7d5e01a202a675ca',
            disposition: 'EXTERNAL_LINKS',
            format: 'JSON_ARRAY',
            byte_limit: 10485760,
            wait_timeout: '10s'
        };

        const response = await axios.post(databricksEndpoint, queryPayload, {
            headers: {
                Authorization: databricksToken,
                'Content-Type': 'application/json'
            }
        });
       
        const statementId = response.data.statement_id;
        const manifest = response.data.manifest;
        const totalChunks = manifest.total_chunk_count;

        const fetchChunkDetails = async (statementId, totalChunks) => {
            const promises = [];
            for (let i = 0; i < totalChunks; i++) {
                const chunkDetails = await axios.get(`${databricksEndpoint}${statementId}/result/chunks/${i}`);
                const externalLinks = chunkDetails.data.external_links;
                const { chunk_index, external_link } = externalLinks[0];
                
                const params = {
                    TableName: process.env.tableName,
                    Item: {
                        PK: statementId,
                        SK: `Chunk-${chunk_index}`,
                        ExternalLink: external_link,
                        Status: 'InProgress' // You can set an initial status here
                        // Add other attributes if needed
                    }
                };
                
                promises.push(docClient.put(params).promise());
            }
            return Promise.all(promises);
        };

        await fetchChunkDetails(statementId, totalChunks);

        // Return necessary details like statement ID, manifest, and total chunks
        return {
            statusCode: 200,
            body: JSON.stringify({ statementId, manifest, totalChunks })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
