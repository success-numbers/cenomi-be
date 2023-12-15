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

exports.dbTransformMapper = (items) => {
    const reqdItemsList = items.map((e) => {
        return {
            "fileName": e.PK,
            "entityType": "HEADER",
            "userId": e.userId,
            "status": e.status,
            "asn": e.asn ?? null,
            "createdAt": e.createdAt,
            "updatedAt": e.updatedAt ?? null
        };
    })
    return reqdItemsList;
}