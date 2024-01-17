const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const convertToReadableDateTime = (timestamp, targetTimeZone = "Asia/Riyadh") => {
    // Check if timestamp is null
    if (timestamp === null || timestamp === undefined) {
        return null;
    }

    // Create a Date object from the timestamp
    const dateTime = new Date(timestamp);

    // Convert to the target timezone
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
        timeZone: targetTimeZone,
    };

    const readableDateTime = dateTime.toLocaleString('en-US', options);

    return readableDateTime;
};


const statusDispMapper = (status) => {
    const map = {
            "OPEN": "Open",
            "INPROGRESS": "In Progress",
            "SUBMITTED": "Submitted"
    }
    if(map[status] != undefined){
            return map[status];
    }
    return status;
}
async function getTransferDetails(transferId) {
    console.log(`Get Transfer Details called for transferId: ${transferId}`);

    const params = {
        TableName: process.env.tableName,
        Key: {
            'PK': `HEAD#${transferId}`,
            'SK': `HEAD#${transferId}`
        }
    };

    try {
        const result = await dynamoDb.get(params).promise();
        if (!result.Item) {
            throw new Error('Transfer details not found');
        }

        return result.Item;
    } catch (error) {
        console.error('Error getting transfer details:', error.message);
        throw error;
    }
}

exports.handler = async (event) => {
    try {
        const transferId = event.queryStringParameters.transferSeqId;
        const destLocId = event.queryStringParameters.destLocId;

        if (!transferId || !destLocId) {
            const res = {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "transferSeqId or destLocId parameter is missing" }),
            };
            return res;
        }

        const transferDetails = await getTransferDetails(transferId);

        if (transferDetails.destId !== destLocId) {
            const res = {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "Transfer does not exist in this location" }),
            };
            return res;
        }
        if(statusDispMapper(transferDetails.status).toUpperCase() == "SUBMITTED"){
            throw "Tsf is already in submitted state"; 
        }
        const response = {
            seqNo: transferId,
            destId: destLocId,
            status: statusDispMapper(transferDetails.status),
            fromStoreId: transferDetails['fromStoreId'] ?? null,
            fromStoreDesc: transferDetails['fromStoreDesc'] ?? null,
            destStoreId: transferDetails['destStoreId'] ?? null,
            docNo: transferDetails['docNo'],
            createdAt: convertToReadableDateTime(transferDetails.timestamp),
            display_name: {
                docNo: "Document No",
                destId: "StoreId",
                status: "Status",
                fromStoreId: "From Store ID",
                destStoreId: "Dest Store ID",
                createdAt: "Created At",
                seqNo: "Sequence No"
            }
        };
        
        const res = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
        };
        return res;
    } catch (e) {
        console.log(e);
        const res = {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": `Error! ${e.toString()}`}),
        };
        return res;
    }
};
