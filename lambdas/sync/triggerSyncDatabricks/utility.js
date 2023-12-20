const axios = require('axios');

exports.databricksApi = async (timestamp) => {
    const databricksEndpoint = 'https://adb-218500037178863.3.azuredatabricks.net/api/2.0/sql/statements/';
    const databricksToken = 'Bearer dapi403f06fb4fd99ee03377165e3984db86'; // Replace with your Databricks token

    const sqlStatement = `select * from fin_recon.cenomi_app.movement where Insert_Datetime > '${timestamp}' LIMIT 10;`;
    const queryPayload = {  
        statement: sqlStatement,
        warehouse_id: '7d5e01a202a675ca',
        disposition: 'EXTERNAL_LINKS',
        format: 'JSON_ARRAY',
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
