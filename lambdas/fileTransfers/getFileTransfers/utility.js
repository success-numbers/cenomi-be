exports.buildSearchConstraints = (statuses, fileType, startDate, endDate, lastEvaluatedKey = null) => {
    
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
        ":entityType": "HEADER",
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
            "status": e.status,
            "asn": e.asn ?? null,
            "createdAt": e.createdAt,
            "updatedAt": e.updatedAt ?? null
        };
    })
    return reqdItemsList;
}