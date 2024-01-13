const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const deleteUserLock = async (lockTable, fileName, key) => {
    const deleteParam = {
        TableName: lockTable,
        Key: {
          PK: `${fileName}`,
          SK: `${key}`,
        },
      };
    await dynamoDb.delete(deleteParam).promise();
    console.log("Delete User Lock from DB", key);
}
exports.handler = async (event) => {
    try {
        const { userId, fileName, fileType, timestamp, key, force = false } = JSON.parse(event.body);
        if (!userId || !fileName || !fileType || !timestamp || !key) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'key, userId, fileName, fileType, and timestamp are required.' }),
            };
        }

        // return {
        //     statusCode: 200,
        //     body: JSON.stringify({ message: 'Picking is in progress by another user.' }),
        // };
        // TODO: Releasing Mechanism 
        // await updateHeaderStatus(fileName, process.env.dataTable);

        const fileTransferLockTable = process.env.lockTable;
        const fileTransferDataTable = process.env.dataTable;

        const existingLockUserDetails = {
            TableName: fileTransferLockTable,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': fileName            
            },
        };

        const existingLocksForTsf = await dynamoDb.query(existingLockUserDetails).promise();
        
        //FILE TSFs
        if (existingLocksForTsf.Count > 0) {
            const currentUserLock = existingLocksForTsf.Items.find((element) => element.SK == key);
            if(existingLocksForTsf.Count > 1){
                if(currentUserLock != null){
                    try{
                        await deleteUserLock(fileTransferLockTable, fileName, key);
                        console.log("Delete User Lock from DB", key);
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
                    await updateHeaderStatus(fileName, process.env.dataTable);
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
                await updateHeaderStatus(fileName, process.env.dataTable);
                try{
                    await deleteUserLock(fileTransferLockTable, fileName, key);
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
                    await updateHeaderStatus(fileName, process.env.dataTable);
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
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Error! ${error.toString()}` }),
        };
    }
};

async function updateHeaderStatus(fileName, dataTable) {
    const updateParams = {
        TableName: dataTable,
        Key: {
            PK: fileName,
            SK: `HEAD#${fileName}`,
        },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ':status': 'SUBMITTED',
        },
    };

    try {
        await dynamoDb.update(updateParams).promise();
    } catch (error) {
        console.error('Update Header Status Error:', error.message);
        throw new Error(`Update Header Status Error: ${error.message}`);
    }
}
