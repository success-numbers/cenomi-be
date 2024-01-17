const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const utility = require('./utility');

exports.handler = async (event) => {
    try {
        const { fileName = null, fileType = null, validateFileType = false } = event.queryStringParameters;

        if(!fileName){
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ message: "Invalid fileName" }),
            };  
        }

        const params = {
            TableName: process.env.FILE_TRN_TABLE,
            KeyConditionExpression: 'PK= :fName AND SK= :hId',
            ExpressionAttributeValues: {
                ":fName": fileName,
                ":hId": `HEAD#${fileName}`
            },
            Limit: 1,
        };
        const result = await dynamoDb.query(params).promise();

        if (result.Count && result.Count > 0) {
            const item = result.Items[0];
            if(validateFileType){
                if(item?.fileType ?? "" != fileType){
                    return {
                        statusCode: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({ message: `Wrong file Type searched for tsf name` }),
                    }
                }
            }
            if(item.status.toUpperCase() == 'SUBMITTED'){
                return {
                    statusCode: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ message: `File Tsf is already submitted` }),
                }
            }

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(utility.dbTransformMapper(item)),
            };
        }else{
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ message: `Given File Transfer Name Not Found` }),
            }
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
