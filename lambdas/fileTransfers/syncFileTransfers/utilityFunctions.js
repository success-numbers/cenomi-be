const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();




async function validateALLOC(payload, dataTable) {
    try {
        const barcodeMap = {};
        const items = payload.items;
        for (const item of items) {
            const { barcode, quantity } = item;
            if (!barcodeMap[barcode]) {
                barcodeMap[barcode] = 0;
            }
            barcodeMap[barcode] += quantity;
        }
    
        const barcodes = Object.keys(barcodeMap);
        const batchSize = 25; 
        const batches = [];
        for (let i = 0; i < barcodes.length; i += batchSize) {
            batches.push(barcodes.slice(i, i + batchSize));
        }

      
        for (const batch of batches) {
            const params = {
                RequestItems: {
                    [dataTable]: {
                        Keys: batch.map((barcode) => ({
                            PK: payload.fileName,
                            SK: `ALLOC#BAR#${barcode}`,
                        })),
                    },
                },
            };

            const batchResult = await dynamoDb.batchGet(params).promise();
            console.log("MEOW 5 batcreseult", batchResult);
            for (const requestedBarcode of batch) {
                const foundItem = batchResult.Responses[dataTable].find(
                    (item) => item.SK === `ALLOC#BAR#${requestedBarcode}`
                );

               
                if (!foundItem) {
                    return {
                        isValid: false,
                        errorMessage: `Barcode ${requestedBarcode} is missing`,
                    };
                }

                const totalQuantity = barcodeMap[requestedBarcode];
                if (foundItem.pickedQuantity + totalQuantity > foundItem.quantity) {
                    return {
                        isValid: false,
                        errorMessage: `Picked quantity + quantity exceeds the available quantity for barcode ${requestedBarcode}`,
                    };
                }
            }
        }

        return { isValid: true, barcodeBatches: batches };
    } catch (error) {
        console.error('Error validating ALLOC payload:', error.message);
        throw new Error(`Error validating ALLOC payload: ${error.message}`);
    }
}


async function validateGRN(payload, dataTable, validationReqd) {
    try {
        const barcodeMap = {};
        const items = payload.items;
        for (const item of items) {
            const { barcode, quantity } = item;
            if (!barcodeMap[barcode]) {
                barcodeMap[barcode] = 0;
            }
            barcodeMap[barcode] += quantity;
        }
    
        const barcodes = Object.keys(barcodeMap);
        const batchSize = 25; 
        const batches = [];
        for (let i = 0; i < barcodes.length; i += batchSize) {
            batches.push(barcodes.slice(i, i + batchSize));
        }
        console.log(batches);
        if(validationReqd == false){
            return { isValid: true, barcodeBatches: batches };
        }
      
        for (const batch of batches) {
            const params = {
                RequestItems: {
                    [dataTable]: {
                        Keys: batch.map((barcode) => ({
                            PK: payload.fileName,
                            SK: `GRN#BAR#${barcode}`,
                        })),
                    },
                },
            };
        
            const batchResult = await dynamoDb.batchGet(params).promise();
            console.log(batchResult);
            for (const requestedBarcode of batch) {
                const foundItem = batchResult.Responses[dataTable].find(
                    (item) => item.SK === `GRN#BAR#${requestedBarcode}`
                );

               
                if (!foundItem) {
                    return {
                        isValid: false,
                        errorMessage: `Barcode ${requestedBarcode} not found in ${dataTable}`,
                    };
                }
            }
        }

        return { isValid: true, barcodeBatches: batches };
    } catch (error) {
        console.error('Error validating GRN payload:', error.message);
        throw new Error(`Error validating GRN payload: ${error.message}`);
    }
}



async function validateDSD(payload, dataTable) {
    try {
        const inputBoxIds = [];

        const items = payload.items;


        for (const item of items) {
            if (!inputBoxIds.includes(item.inputBoxId)) {
                inputBoxIds.push(item.inputBoxId);
            }
        }
    

        const batchSize = 25; 
        const batches = [];
        for (let i = 0; i < inputBoxIds.length; i += batchSize) {
            batches.push(inputBoxIds.slice(i, i + batchSize));
        }

        for (const batch of batches) {
            const params = {
                RequestItems: {
                    [dataTable]: {
                        Keys: batch.map((inputBoxId) => ({
                            PK: payload.fileName,
                            SK: `DSD#IBXID#${inputBoxId}`,
                        })),
                    },
                },
            };

            const batchResult = await dynamoDb.batchGet(params).promise();

            for (const requestedInputBoxId of batch) {
                const foundItem = batchResult.Responses[dataTable].find(
                    (item) => item.SK === `DSD#IBXID#${requestedInputBoxId}`
                );

                // Validate existence of the inputBoxId item
                if (!foundItem) {
                    return {
                        isValid: false,
                        errorMessage: `Input Box ID ${requestedInputBoxId} not found in ${dataTable}`,
                    };
                }
            }
        }

        return { isValid: true, inputBoxIdBatches: batches };
    } catch (error) {
        console.error('Error validating DSD payload:', error.message);
        throw new Error(`Error validating DSD payload: ${error.message}`);
    }
}


module.exports = {
    validateALLOC,
    validateGRN,
    validateDSD
};