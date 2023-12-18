exports.dbTransformMapper = (e) => {
    return {
        "fileName": e.PK,
        "entityType": "HEADER",
        "userId": e.userId,
        "status": e.status,
        "createdAt": e.createdAt,
        "updatedAt": e.updatedAt ?? null
    };
}