const constants = require('./constants');

exports.dbTransformMapper = (e) => {
    return {
        "fileName": e.PK,
        "fileType": e.fileType,
        "entityType": e.entityType,
        "userId": e.userId,
        "status": e.status,
        "createdAt": e.createdAt,
        "updatedAt": e.updatedAt ?? null,
        "display_name" : constants.ColumnMappings

    };
}