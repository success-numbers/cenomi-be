const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.getAllTsfItemData = async (tsfSeqNo) => {
    const params = {
        TableName: process.env.InditexDataTable,
        KeyConditionExpression: 'PK = :pkVal',
        ExpressionAttributeValues: {
            ':pkVal': `DET#${tsfSeqNo}`,
        },
    };

    const result = await dynamoDb.query(params).promise();
    
    if(result.Count > 0) {
        return result.Items.map((item) => {
            return {
                "seq_no": item.PK.split("#")[1],
                "barcode": item.SK,
                "scanned_time": item.timestamp,
                "quantity": item.quantity,
                "scanned_qty": item.pickedQuantity,
                "brand": (item.brand != "null" && item.brand != null) ? item.brand : undefined,
                "container_id": item.boxId
            }
        });
    }else{
        throw 'No items found for given tsfNo';
    }
}