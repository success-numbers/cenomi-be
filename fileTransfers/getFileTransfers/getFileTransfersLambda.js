const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const utility = require('./utility');
exports.handler = async (event) => {
    try {
        const { type, status = "", limit = 100, startDate = null, endDate = null, lastEvaluatedKey = null } = event.queryStringParameters;

        const validFileTypes = ["ALLOC", "GRN", "GSD", "BRI"];
        const validStatusValues = ["OPEN", "INPROGRESS", "SUBMITTED"];

        if (!validFileTypes.includes(type)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid fileType" }),
            };
        }

        const statuses = status.split(",").map((s) => s.trim());

        for (const s of statuses) {
            if (!validStatusValues.includes(s)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: `Invalid status: ${s}` }),
                };
            }
        }

        const params = {
            TableName: process.env.tableName,
            IndexName: "fileType-createdAt-index",
            ...utility.buildSearchConstraints(statuses, type, startDate, endDate, lastEvaluatedKey),
            Limit: limit,
        };

        const result = await dynamoDb.query(params).promise();
        let lastUpdatedKey = null;
        if (result && result.LastEvaluatedKey) {
            lastUpdatedKey = btoa(JSON.stringify(result.LastEvaluatedKey))
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                fileType: type,
                paginationToken: lastUpdatedKey,
                transfers: utility.dbTransformMapper(result.Items)
            }),
        };
    } catch (error) {
        console.error("Error fetching transfers:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Error! ${error.toString()}` }),
        };
    }
};
