const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const utility = require('./utility');
const constants = require('./constants');

exports.handler = async (event) => {
    try {
        const { type, status = "", limit = 100, startDate = null, endDate = null, lastEvaluatedKey = null } = event.queryStringParameters;

        const validFileTypes = ["ALLOC", "GRN", "DSD", "BRI", "ALL"];
        const validStatusValues = ["OPEN", "INPROGRESS", "SUBMITTED", "ALL"];
        

        if (!validFileTypes.includes(type)) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ message: "Invalid fileType" }),
            };
        }

        let statuses = status.split(",").map((s) => s.trim());

        for (const s of statuses) {
            if (!validStatusValues.includes(s)) {
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ message: `Invalid status: ${s}` }),
                };
            }
        }
        console.log("STATUSES", statuses);
        if(statuses.includes("ALL")){
            statuses = ['OPEN', 'INPROGRESS', 'SUBMITTED'];
        }
        switch(type){
            case "ALL": {

                const params = {
                    TableName: process.env.tableName,
                    ...utility.allTransferQueryHandler(statuses, startDate, endDate, lastEvaluatedKey),
                    Limit: limit,
                };
                console.log("DB PARAMS", params);
                const result = await dynamoDb.query(params).promise();
                let lastUpdatedKey = null;
                if (result && result.LastEvaluatedKey) {
                    lastUpdatedKey = btoa(JSON.stringify(result.LastEvaluatedKey))
                }
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        fileType: type,
                        paginationToken: lastUpdatedKey,
                        transfers: utility.dbTransformMapper(result.Items),
                        display_name : constants.ColumnMappings
                    }),
                };
            }
            case "ALLOC":
            case "GRN":
            case "DSD":
                {
                    const params = {
                        TableName: process.env.tableName,
                        IndexName: "fileType-createdAt-index",
                        ...utility.buildSearchConstraints(statuses, type, startDate, endDate, lastEvaluatedKey),
                        Limit: limit,
                    };
                            console.log("DB PARAMS", params);

                    const result = await dynamoDb.query(params).promise();
                    let lastUpdatedKey = null;
                    if (result && result.LastEvaluatedKey) {
                        lastUpdatedKey = btoa(JSON.stringify(result.LastEvaluatedKey))
                    }
                    return {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            fileType: type,
                            paginationToken: lastUpdatedKey,
                            transfers: utility.dbTransformMapper(result.Items),
                            display_name : constants.ColumnMappings
                        }),
                    };
                }
                case "BRI":
                    {
                        const params = {
                            TableName: process.env.tableName,
                            IndexName: "fileType-createdAt-index",
                            ...utility.buildSearchConstraints(['OPEN', "INPROGRESS", "SUBMITTED"], type, startDate, endDate, lastEvaluatedKey, "BRIHEADER"),
                            Limit: limit,
                        };
                
                        const result = await dynamoDb.query(params).promise();
                        let lastUpdatedKey = null;
                        if (result && result.LastEvaluatedKey) {
                            lastUpdatedKey = btoa(JSON.stringify(result.LastEvaluatedKey))
                        }
                        return {
                            statusCode: 200,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            body: JSON.stringify({
                                fileType: type,
                                paginationToken: lastUpdatedKey,
                                transfers: utility.dbTransformMapper(result.Items),
                                display_name : constants.ColumnMappings
                            }),
                        };
                    }
            default: throw "Error! fileType not accepted"
        }

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
