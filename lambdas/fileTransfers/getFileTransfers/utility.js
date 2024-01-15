const constants = require('./constants');

const convertToReadableDateTime = (timestamp) => {
    // Check if timestamp is null
    if (timestamp === null || timestamp == undefined) {
        return null;
    }

    // Create a Date object from the timestamp
    const dateTime = new Date(timestamp);

    // Format the date-time as a string in DD/MM/YYYY, h:mm:ss A format
    const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true };
    const readableDateTime = dateTime.toLocaleString(options);

    return readableDateTime;
}

exports.buildSearchConstraints = (statuses, fileType, startDate, endDate, lastEvaluatedKey = null, entityType = "HEADER") => {
    
    let baseFilterExpression = "#st IN (" +
    statuses.map((_, index) => `:status${index}`).join(", ") +
    ") AND entityType = :entityType "
    let baseKeyConditionExpression = "fileType = :fType ";

    let baseExpressionAttributesValues = {
        ":fType": fileType,
        ...statuses.reduce(
          (acc, status, index) => ({ ...acc, [`:status${index}`]: status }),
          {}
        ),
        ":entityType": entityType,
      }


    if(startDate && endDate){
        baseKeyConditionExpression += 'AND createdAt BETWEEN :startDate AND :endDate';
        baseExpressionAttributesValues = {
            ...baseExpressionAttributesValues,
            ":startDate": startDate,
            ":endDate": endDate, 
        }
    }

    const baseconstrainsts = {
        KeyConditionExpression: baseKeyConditionExpression,
        FilterExpression: baseFilterExpression,
        ExpressionAttributeNames: {
          "#st": "status",
        },
        ExpressionAttributeValues: baseExpressionAttributesValues
    }
    if(lastEvaluatedKey){
        const decodedKey = JSON.parse(atob(lastEvaluatedKey));
        baseconstrainsts.ExclusiveStartKey = decodedKey
    }

    return baseconstrainsts;
    
}

exports.allTransferQueryHandler = (tsfStatus, startDate, endDate, lastEvaluatedKey = null) => {
    let expressionAttributeNames = {}
    let baseExpressionAttributesValues = {}
    let baseFilterExpression = null;
    let keyConditionExpression = "entityType = :entityType ";
    baseExpressionAttributesValues = {
        ...baseExpressionAttributesValues,
    ":entityType": "HEADER"
    }
    if (tsfStatus && tsfStatus != "ALL"){
        baseFilterExpression = "#st IN (" +
        tsfStatus.map((_, index) => `:status${index}`).join(", ") +
        ")"

        expressionAttributeNames = {
            ...expressionAttributeNames,
            "#st": "status"
        }
        baseExpressionAttributesValues = {
            ...baseExpressionAttributesValues,
            ...tsfStatus.reduce(
                (acc, status, index) => ({ ...acc, [`:status${index}`]: status }),
                {}
              )
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


    let baseconstrainsts = {
        IndexName: 'entityType-createdAt-index',
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: baseFilterExpression != null ? baseFilterExpression : undefined,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames: undefined,
        ExpressionAttributeValues: baseExpressionAttributesValues
    }

    if(lastEvaluatedKey){
        const decodedKey = JSON.parse(atob(lastEvaluatedKey));
        baseconstrainsts.ExclusiveStartKey = decodedKey
    }

    return baseconstrainsts;

}

exports.dbTransformMapper = (items) => {
    const reqdItemsList = items.map((e) => {
        return {
            "fileName": e.PK,
            "entityType": e.entityType,
            "fileType": e.fileType,
            "userId": e.userId,
            "status": constants.statusDispMapper(e.status),
            "asn": e.asn ?? null,
            "createdAt": convertToReadableDateTime(e.createdAt),
            "updatedAt": convertToReadableDateTime(e.updatedAt) ?? null
        };
    })
    return reqdItemsList;
}