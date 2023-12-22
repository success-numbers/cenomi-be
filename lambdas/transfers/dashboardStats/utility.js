const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const constants = require('./constants');
exports.getStatsForSearchCriteria = async (filters) => {
    const {tsfType} = filters;
    let baseParams = {
        TableName: process.env.FILE_TRN_TABLE,
        IndexName: 'fileType-createdAt-index',
        ...baseConditionalExpressionsBuilder(filters)
    };
    console.log("MEOW BASE PARMS FINAL", baseParams);
    const result = await docClient.query(baseParams).promise();
    console.log("DB Result", result);
    const modifiedResponse = dashStatsDataFormatterResponse(filters, result.Items ?? []);
    return modifiedResponse;
} 

const baseConditionalExpressionsBuilder = (filters) => {
    const { tsfType, tsfStatus, startDate, endDate } = filters;
    let queryExpression = {};
    switch(tsfType){
        case "ALL":{
            queryExpression = allTransferQueryHandler(tsfStatus, startDate, endDate);
            break;
        }
        case "ALLOC":
        case "GRN":
        case "DSD":
        case "BRI":
            {
                console.log("MEOW MOye 1");
            queryExpression = tsfHeaderQueryBasedOnFilterAndType(tsfType, tsfStatus, startDate, endDate);
            console.log("MOYE 4", queryExpression);
            break;
        }
        default: throw "Wrong Transfer File Type provided to query for";
    }
    return queryExpression;

}

const allTransferQueryHandler = (tsfStatus, startDate, endDate) => {
    let expressionAttributeNames = {}
    let baseExpressionAttributesValues = {}
    let baseFilterExpression = null;
    let keyConditionExpression = "entityType = :entityType ";
    baseExpressionAttributesValues = {
        ...baseExpressionAttributesValues,
    ":entityType": "HEADER"
    }
    if (tsfStatus && tsfStatus != "ALL"){
        baseFilterExpression = '#st = :tsfStatus';
        expressionAttributeNames = {
            ...expressionAttributeNames,
            "#st": "status"
        }
        baseExpressionAttributesValues = {
            ...baseExpressionAttributesValues,
            ":tsfStatus":  tsfStatus
        }
    }
    if(startDate && endDate){
        keyConditionExpression += 'AND createdAt BETWEEN :startDate AND :endDate';
        baseExpressionAttributesValues = {
            ...baseExpressionAttributesValues,
            ":startDate": startDate,
            ":endDate": endDate, 
        }
    }

    const baseconstrainsts = {
        IndexName: 'entityType-createdAt-index',
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: baseFilterExpression != null ? baseFilterExpression : undefined,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames: undefined,
        ExpressionAttributeValues: baseExpressionAttributesValues
    }

    return baseconstrainsts;

}

const tsfHeaderQueryBasedOnFilterAndType =  (tsfType, tsfStatus, startDate, endDate) => {
    let expressionAttributeNames = {}
    let baseExpressionAttributesValues = {}
    let baseFilterExpression = null;
    let keyConditionExpression = "fileType = :fileType ";
    baseExpressionAttributesValues = {
        ...baseExpressionAttributesValues,
        ":fileType": `${tsfType}`
    }
    if (tsfStatus && tsfStatus != "ALL"){
        baseFilterExpression = '#st = :tsfStatus';
        expressionAttributeNames = {
            ...expressionAttributeNames,
            "#st": "status"
        }
        baseExpressionAttributesValues = {
            ...baseExpressionAttributesValues,
            ":tsfStatus":  tsfStatus
        }
    }
    if(startDate && endDate){
        keyConditionExpression += 'AND createdAt BETWEEN :startDate AND :endDate';
        baseExpressionAttributesValues = {
            ...baseExpressionAttributesValues,
            ":startDate": startDate,
            ":endDate": endDate, 
        }
    }

    const baseconstrainsts = {
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: baseFilterExpression != null ? baseFilterExpression : undefined,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames: undefined,
        ExpressionAttributeValues: baseExpressionAttributesValues
    }
    return baseconstrainsts;
}

const dashStatsDataFormatterResponse = (filters, dbItems ) => {
    const { tsfType, tsfStatus } = filters;
    let response = {
        tsf_type: tsfType,
        tsf_status: tsfStatus
    };
    console.log("MEOW 1", dbItems);

    let statusMap = {
        "OPEN": 0,
        "INPROGRESS": 0,
        "SUBMITTED": 0
    }
    let fileTypeStatusStat = {
        "ALLOC": {
            "OPEN": 0,
            "INPROGRESS": 0,
            "SUBMITTED": 0
        },
        "GRN": {
            "OPEN": 0,
            "INPROGRESS": 0,
            "SUBMITTED": 0
        },
        "DSD": {
            "OPEN": 0,
            "INPROGRESS": 0,
            "SUBMITTED": 0
        }
    }

    let fileTsf = constants.FILE_TRN_TYPES.map((e) => {
        return {
            "key": e.fileKey,
            "disp_key": e.dispKey,
            "value": 0
        }
    })
    console.log("MEOW reach 2", fileTsf);
    let totalPieVal = 0

    dbItems.forEach((e) => {
        console.log("MEOW reach 4", e);
        if(e['status'] && e.status == "OPEN") {
            statusMap["OPEN"] += 1;
            fileTypeStatusStat[e.fileType]["OPEN"] += 1;

        }
        if(e['status'] && e.status == "INPROGRESS") {
            statusMap["INPROGRESS"] += 1;
            fileTypeStatusStat[e.fileType]["INPROGRESS"] += 1;
        }
        if(e['status'] && e.status == "SUBMITTED") {
            statusMap["SUBMITTED"] += 1;
            fileTypeStatusStat[e.fileType]["SUBMITTED"] += 1;
        }

        let f = fileTsf.findIndex((d) => d.key == e.fileType);
        fileTsf[f].value += 1; 
    })
    fileTsf.forEach((e) => {
            console.log("MEOW reach 3", e);
        totalPieVal+= e.value;
    })
    let stats = constants.statsTypes.map((stat) => {
        return {
            "key": stat.dbKey,
            "disp_key": stat.dispKey,
            "value": statusMap[stat.dbKey]
        }
    })

    response.stats = stats;
    response['tsf_stats'] = {
        total: totalPieVal,
        pie_stats: fileTsf
    }
    let barStat = []
    console.log("MEOW REACh4",response);
    Object.keys(fileTypeStatusStat).forEach((e) =>{
        barStat.push({
            type: e,
            stats: [
                {
                    "status": "OPEN",
                    "display_status": "Open",
                    "count": fileTypeStatusStat[e]["OPEN"] ?? 0
                },
                {
                    "status": "INPROGRESS",
                    "display_status": "In Progress",
                    "count": fileTypeStatusStat[e]["INPROGRESS"] ?? 0
                },
                {
                    "status": "SUBMITTED",
                    "display_status": "Submitted",
                    "count": fileTypeStatusStat[e]["SUBMITTED"] ?? 0
                }
            ]

        });
    });
    response['bar_stats'] = barStat;
    return response;
}