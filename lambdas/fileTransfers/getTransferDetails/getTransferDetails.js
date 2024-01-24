const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const utility = require('./utility');
exports.handler = async (event) => {
    try {
        console.log("GET TRANSFER DETAILS LAMBDA", JSON.stringify(event));
        utility.validationQueryParams(event.queryStringParameters);
        const pathParameters = event.pathParameters ?? null;
        const fileName = pathParameters['fileName'] ?? null;
        const { type = null } = event.queryStringParameters;
        const getTransferItems = await utility.getTransferItemByFTypeAndFName(fileName, type)
        const modifiedItems = utility.transferItemMapperByTransferType(getTransferItems, type);
        const resp = {
            fileName: fileName,
            fileType: type,
            Items: modifiedItems
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(resp),
        };
    } catch (error) {
        console.error("Error fetching transfers:", error);
        return {
            statusCode: 500,
            
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ message: `Error! ${error.toString()}` }),
        };
    }
};
