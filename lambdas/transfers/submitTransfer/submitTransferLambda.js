const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();


const deleteUserLock = async (lockTable, tsfSeqNo, key) => {
    const deleteParam = {
        TableName: lockTable,
        Key: {
          PK: `${tsfSeqNo}`,
          SK: `${key}`,
        },
      };
    await dynamoDb.delete(deleteParam).promise();
    console.log("Delete User Lock from DB", key);
}

const updateHeaderInditexDataTable = async (transferSeqId) => {
    try{
    const updateParams = {
                TableName: process.env.tableName, 
                Key: {
                    'PK': `HEAD#${transferSeqId}`,
                    'SK': `HEAD#${transferSeqId}`
                },
                UpdateExpression: 'SET #status = :newStatus',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':newStatus': 'SUBMITTED'
                }
            };

    await dynamoDb.update(updateParams).promise();
    }catch(e){
        console.log("Error! DB Updating Header", e.toString());
        throw e;
    }

}

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        console.log("Incoming Event Submit Tsf", JSON.stringify(event));
        const {transferSeqId, key, force = false, userId } = body;
        
        const params = {
            TableName: process.env.tableName, 
            Key: {
                'PK': `HEAD#${transferSeqId}`,
                'SK': `HEAD#${transferSeqId}`
            }
        };
        console.log("Get Tsf SeqNo DB Params", JSON.stringify(params));
        const data = await dynamoDb.get(params).promise();
        console.log("Get Tsf SeqNo Data Details", JSON.stringify(data));

        if (data.Item && data.Item.status === 'INPROGRESS') {
            const fileTransferLockTable = process.env.lockTable;
            // Release Logic for lock
            const existingLockUserDetails = {
                TableName: fileTransferLockTable,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': transferSeqId            
                },
            };
    
            const existingLocksForTsf = await dynamoDb.query(existingLockUserDetails).promise();

            if (existingLocksForTsf.Count > 0) {
                const currentUserLock = existingLocksForTsf.Items.find((element) => element.SK == key);
                if(existingLocksForTsf.Count > 1) {
                    if(currentUserLock != null){
                        try{
                            await deleteUserLock(fileTransferLockTable, transferSeqId, key);
                        }catch(e){
                            return {
                                statusCode: 500,
                                body: JSON.stringify({ 
                                    message: `Error! ${e}` 
                                }),
                            };
                        }
    
                    }
                    if(force){
                        await updateHeaderInditexDataTable(transferSeqId);
                        return {
                            statusCode: 200,
                            body: JSON.stringify({ 
                                code: "E00001",
                                message: 'Successfully Submitted Transfer.' 
                            }),
                        };
                    }
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ 
                            code: "E02001",
                            message: 'Picking is still inprogress by another users.' 
                        }),
                    };
                }else if(existingLocksForTsf.Count == 1 && currentUserLock != null ){
                    // This is the last user to submit
                    //Check UnScanned Items ->  For File Tsf not sure
                    await updateHeaderInditexDataTable(transferSeqId);
                    try{
                        await deleteUserLock(fileTransferLockTable, transferSeqId, key);
                        return {
                            statusCode: 200,
                            body: JSON.stringify({ 
                                message: 'Successfully Submitted Transfer.' 
                            }),
                        };
                    }catch(e){
                        return {
                            statusCode: 500,
                            body: JSON.stringify({ 
                                message: `Error! ${e}` 
                            }),
                        };
                    }
                } else {
                    if(force){
                        await updateHeaderInditexDataTable(transferSeqId);
                        return {
                            statusCode: 200,
                            body: JSON.stringify({ 
                                code: "E00001",
                                message: 'Successfully Submitted Transfer.' 
                            }),
                        };
                    }
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ 
                            code: "E02001",
                            message: 'Picking is still inprogress by another users.' 
                        }),
                    };
                }
    
            
            } else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'No Lock entries found for the given fileName.' }),
                };
            }
        }else{
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "Invalid transferSeqId or status is not INPROGRESS" }),
            };
        }

    } catch (e) {
        console.error('Error updating status:', e.message);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": `Error! ${e}` }),
        };
    }
};
