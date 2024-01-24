const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        console.log('Event body:', event);
        const requestBody = JSON.parse(event.body || '{}');

        const { user_id, dest_id, transferSeqId, pickedItems } = requestBody;

        if (!dest_id || !transferSeqId || !pickedItems) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ "message": "Missing mandatory request fields" }),
            };
        }

        console.log(pickedItems);
        const updatePromises = pickedItems.map(async item => {
            const params = {
              TableName: process.env.tableName,
              Key: {
                'PK': `DET#${transferSeqId}`,
                'SK': item.barcode
              },
              UpdateExpression: 'SET pickedQuantity = pickedQuantity + :val, isScanned = :scanned',
              ExpressionAttributeValues: {
                ':val': item.scannedQuantity,
                ':scanned': "true"
              },
              ConditionExpression: 'attribute_exists(PK)',
            };
          
            console.log("Picked Transfer DB Params", JSON.stringify(params));
          
            try {
              return await dynamoDb.update(params).promise();
            } catch (error) {

              if (error.code === 'ConditionalCheckFailedException') {
                // Item doesn't exist, so let's add it
                const addParams = {
                  TableName: process.env.tableName,
                  Item: {
                    'PK': `DET#${transferSeqId}`,
                    'SK': item.barcode,
                    'pickedQuantity': item.scannedQuantity,
                    'quantity': item.quantity,
                    'timestamp': item.timestamp,
                    'barcode': item.barcode,
                    'isScanned': "true",
                    'entityType': 'DETAILS'
                  }
                };
                console.log("Adding item to DynamoDB", JSON.stringify(addParams));
                return dynamoDb.put(addParams).promise();
              }
          
              throw error;
            }
          });
          

        await Promise.all(updatePromises);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": "Picked items updated successfully" }),
        };
    } catch (e) {
        console.error('Error picking transfer items:', e.toString());
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ "message": `Error! ${JSON.stringify(e)}` }),
        };
    }
};
