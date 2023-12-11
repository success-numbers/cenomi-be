const axios = require('axios');

exports.databricksApi = async () => {
    const databricksEndpoint = 'https://adb-218500037178863.3.azuredatabricks.net/api/2.0/sql/statements/';
    const databricksToken = 'Bearer dapi403f06fb4fd99ee03377165e3984db86'; // Replace with your Databricks token

    const sqlStatement = "SELECT *, CONCAT(LPAD(p_Id_Product, 1, '0'), LPAD(`p:Model`, 4, '0'), LPAD(`p:Quality`, 3, '0'), LPAD(`p:Colour`, 3, '0'), LPAD(`p:Size`, 2, '0')) AS barcode FROM fin_recon.cenomi_app.movement WHERE landing_update_timestamp > '2023-09-14T05:59:04.283+0000';";
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
