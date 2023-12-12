exports.dbTransformMapper = (e) => {
    return {
        "fileName": "File101ALLOC",
        "entityType": "HEADER",
        "userId": e.userId,
        "status": e.status,
        "createdAt": e.createdAt,
        "updatedAt": e.updatedAt ?? null
    };
}