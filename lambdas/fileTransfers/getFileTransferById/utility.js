const constants = require('./constants');

const convertToReadableDateTime = (timestamp, targetTimeZone = "Asia/Riyadh") => {
    // Check if timestamp is null
    if (timestamp === null || timestamp === undefined) {
        return null;
    }

    // Create a Date object from the timestamp
    const dateTime = new Date(timestamp);

    // Convert to the target timezone
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
        timeZone: targetTimeZone,
    };

    const readableDateTime = dateTime.toLocaleString('en-US', options);

    return readableDateTime;
};

exports.dbTransformMapper = (e) => {
    
    return {
        "fileName": e.PK,
        "fileType": e.fileType,
        "entityType": e.entityType,
        "userId": e.userId,
        "status": constants.statusDispMapper(e.status),
        "createdAt": convertToReadableDateTime(e.createdAt),
        "updatedAt": convertToReadableDateTime(e.updatedAt ?? null),
        "display_name" : constants.ColumnMappings
    };
}