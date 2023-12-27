const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const { validateALLOC, validateGRN, validateDSD } = require('./utilityFunctions');
const { processALLOC, processGRN, processDSD } = require('./processingFunctions');

exports.handler = async (event) => {
    try {
        const payload = JSON.parse(event.body);
        const syncTable = process.env.syncTable;
        const dataTable = process.env.dataTable;
        let validationResponse;

        switch (payload.fileType) {
            case 'ALLOC':
                validationResponse = await validateALLOC(payload, dataTable);
                if (validationResponse.isValid) {
                    const processingResponse = await processALLOC(payload, syncTable, dataTable);
                    return generateResponse(processingResponse);
                } else {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: `Validation failed for ALLOC: ${validationResponse.errorMessage}` }),
                    };
                }
                break;
            case 'GRN':
                if (payload.withValidation !== undefined && payload.withValidation === false) {
                    const processingResponse = await processGRN(payload, syncTable,dataTable);
                    return generateResponse(processingResponse);
                } else {
                    validationResponse = await validateGRN(payload, dataTable);
                    if (validationResponse.isValid) {
                        const processingResponse = await processGRN(payload, syncTable, dataTable);
                        return generateResponse(processingResponse);
                    } else {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({ message: `Validation failed for GRN: ${validationResponse.errorMessage}` }),
                        };
                    }
                }
                break;
            case 'DSD':
                validationResponse = await validateDSD(payload, syncTable,dataTable);
                if (validationResponse.isValid) {
                    const processingResponse = await processDSD(payload, dataTable, syncTable);
                    return generateResponse(processingResponse);
                } else {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: `Validation failed for DSD: ${validationResponse.errorMessage}` }),
                    };
                }
                break;
            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Invalid fileType' }),
                };
        }
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};

// Helper function to generate response
function generateResponse(processingResponse) {
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
