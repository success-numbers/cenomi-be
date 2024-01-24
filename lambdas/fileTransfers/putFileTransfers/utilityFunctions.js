function validateALLOC(payload) {
    const requiredFields = ['storeCode', 'barcode', 'quantity', 'brand'];
    const payloadRows = payload.rows;

    for (const row of payloadRows) {
        const payloadFields = Object.keys(row);

        for (const field of requiredFields) {
            if (!payloadFields.includes(field)) {
                return {
                    isValid: false,
                    errorMessage: `Field '${field}' is missing in one of the rows for 'ALLOC'`,
                };
            }
        }

        if (payloadFields.length !== requiredFields.length) {
            return {
                isValid: false,
                errorMessage: 'Extra or invalid fields found in one of the rows for \'ALLOC\'',
            };
        }
    }

    return { isValid: true };
}

function validateGRN(payload) {
    const requiredFields = ['barcode'];
    const payloadRows = payload.rows;

    for (const row of payloadRows) {
        const payloadFields = Object.keys(row);

        for (const field of requiredFields) {
            if (!payloadFields.includes(field)) {
                return {
                    isValid: false,
                    errorMessage: `Field '${field}' is missing in one of the rows for 'GRN'`,
                };
            }
        }

        if (payloadFields.length !== requiredFields.length) {
            return {
                isValid: false,
                errorMessage: 'Extra or invalid fields found in one of the rows for \'GRN\'',
            };
        }
    }

    return { isValid: true };
}

function validateGSD(payload) {
    const requiredFields = ['storeCode', 'inputBoxId'];
    const payloadRows = payload.rows;

    for (const row of payloadRows) {
        const payloadFields = Object.keys(row);

        for (const field of requiredFields) {
            if (!payloadFields.includes(field)) {
                return {
                    isValid: false,
                    errorMessage: `Field '${field}' is missing in one of the rows for 'DSD'`,
                };
            }
        }

        if (payloadFields.length !== requiredFields.length) {
            return {
                isValid: false,
                errorMessage: 'Extra or invalid fields found in one of the rows for \'DSD\'',
            };
        }
    }

    return { isValid: true };
}

function validateBRI(payload) {
    const requiredFields = ['barcode'];
    const payloadRows = payload.rows;

    for (const row of payloadRows) {
        const payloadFields = Object.keys(row);

        for (const field of requiredFields) {
            if (!payloadFields.includes(field)) {
                return {
                    isValid: false,
                    errorMessage: `Field '${field}' is missing in one of the rows for 'BRI'`,
                };
            }
        }
    }

    return { isValid: true };
}

module.exports = { validateALLOC, validateGRN, validateGSD, validateBRI };
