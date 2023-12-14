const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        console.log("Get all file trn types STATS LAMBDA", JSON.stringify(event));
        const mockResponse = [
            {
                "id": "ALLOC",
                "headers": [
                    "STORE CODE",
                    "BARCODE",
                    "QTY",
                    "BRAND"
                ]
            },
            {
                "id": "GRN",
                "headers": [
                    "BARCODE"
                ]
            },
            {
                "id": "DSD",
                "headers": [
                    "STORE CODE",
                    "INPUT BOX ID"
                ]
            },
                {
                "id": "BRI",
                "headers": [
                    "BARCODE"
                ]
            }
        ]      
        const res = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(mockResponse),
        };
        return res;
    } catch (e) {
        console.error('Error fetching destLocIds:', e.message);
        const res = {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Internal server error" }),
        };
        return res;
    }
};