const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Import utility functions for payload validation
const { validateALLOC, validateGRN, validateGSD, validateBRI } = require('./utilityFunctions');
const { processALLOC, processGRN, processGSD, processBRI } = require('./processingFunctions');

exports.handler = async (event) => {
    try {
        // const fileType = event.queryStringParameters.fileType;
        const payload = JSON.parse(event.body);
        const tableName = process.env.tableName;
        let validationResponse;
        switch (payload.fileType) {
            case 'ALLOC':
                validationResponse = validateALLOC(payload);
                if (validationResponse.isValid) {
                    const processingResponse = await processALLOC(payload,tableName);
                    if (processingResponse.success) {
                        return {
                            statusCode: 200,
                            body: JSON.stringify({ message: 'Payload inserted successfully' }),
                        };
                    } else {
                        return {
                            statusCode: 500,
                            body: JSON.stringify({ message: processingResponse.errorMessage }),
                        };
                    }
                }
                break;
            case 'GRN':
                validationResponse = validateGRN(payload);
                if (validationResponse.isValid) {
                    const processingResponse = await processGRN(payload,tableName);
                    if (processingResponse.success) {
                        return {
                            statusCode: 200,
                            body: JSON.stringify({ message: 'Payload inserted successfully' }),
                        };
                    } else {
                        return {
                            statusCode: 500,
                            body: JSON.stringify({ message: processingResponse.errorMessage }),
                        };
                    }
                }
                break;
            case 'GSD':
                validationResponse = validateGSD(payload);
                if (validationResponse.isValid) {
                    const processingResponse = await processGSD(payload,tableName);
                    if (processingResponse.success) {
                        return {
                            statusCode: 200,
                            body: JSON.stringify({ message: 'Payload inserted successfully' }),
                        };
                    } else {
                        return {
                            statusCode: 500,
                            body: JSON.stringify({ message: processingResponse.errorMessage }),
                        };
                    }
                }
                break;
            case 'BRI':
                validationResponse = validateBRI(payload);
                if (validationResponse.isValid) {
                    const processingResponse = await processBRI(payload,tableName);
                    if (processingResponse.success) {
                        return {
                            statusCode: 200,
                            body: JSON.stringify({ message: 'Payload inserted successfully' }),
                        };
                    } else {
                        return {
                            statusCode: 500,
                            body: JSON.stringify({ message: processingResponse.errorMessage }),
                        };
                    }
                }
                break;
            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Invalid fileType' }),
                };
        }
    } catch (e) {
        console.error('Error fetching destLocIds:', e.message);
        const res = {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: 'Internal server error' }),
        };
        return res;
    }
};


// {
//     "fileName": "RTUSKKKFHHJX",
//     "fileType": "ALLOC",
//     "userId": "utsav",
//     "createdAt": 1231937193719,
//     "rows": [
//         {
//             "storeCode": "123",
//             "barcode": "534555",           
//             "quantity": 100,
//             "brand": "Brand4"
//         }
//     ]
// }