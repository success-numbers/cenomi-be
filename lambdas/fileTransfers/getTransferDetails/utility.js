const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const constant = require('./constants');

const validationQueryParams = (queryParams) => {
    const { type = null } = queryParams;
    if(type == null || type == undefined){
        throw "type is missing in query param";
    }

    if (!constant.TRNTYPES.includes(type)) {
        throw "Invalid transfer file type"
    }

}

const getTransferItemByFTypeAndFName = async (fileName, trnType) => {
    let params = {
        TableName: process.env.FILE_TRN_TABLE,
        KeyConditionExpression: `PK = :fileName and begins_with(SK, :skPrefix)`,
        ExpressionAttributeValues: {
            ':fileName': fileName,
            ':skPrefix': constant.SKPREFIX[trnType]
        },
    };
    console.log("MEOW 1", params);
    const result = await docClient.query(params).promise();
        console.log("MEOW 2", result);

    if (result.Count && result.Count > 0) {
        return result.Items;
    }else{
        return [];
    }
}

const transferItemMapperByTransferType = (items = [], type = null) => {
    switch(type){
        case 'ALLOC': {
            const mp = transferItemALLOCHandler(items);
            return mp;
        }
        case 'GRN': {
            const mp = transferItemGRNHandler(items);
            return mp;
        }      
        case 'DSD': {
            const mp = transferItemDSDHandler(items);
            return mp;
        }
        case 'BRI': {
            const mp = transferItemBRIHandler(items);
            return mp;
        }
        default: throw "WRONG FILE TRANSFER TYPE";
    }
}

const transferItemALLOCHandler = (items) => {
    let mappedItems = [];
    mappedItems = items.map((e) => {
        return {
            brand: e.brand,
            storeCode: e.storeCode,
            barcode: e.barcode,
            quantity: e.quantity,
            pickedQuantity: e.pickedQuanity
        }
    })
    return mappedItems;
}

const transferItemGRNHandler = (items) => {
    let mappedItems = [];
    mappedItems = items.map((e) => {
        return {
            barcode: e.barcode,
            quantity: e.quantity,
            pickedQuantity: e.quantity
        }
    })
    return mappedItems;
}

const transferItemDSDHandler = (items) => {
    let mappedItems = [];
    mappedItems = items.map((e) => {
        return {
            storeCode: e.storeCode,
            inputBoxId: e.inputBoxId
        }
    })
    return mappedItems;
}

const transferItemBRIHandler = (items) => {
    return items;
}



module.exports = {
    validationQueryParams,
    getTransferItemByFTypeAndFName,
    transferItemALLOCHandler,
    transferItemMapperByTransferType
};
