const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {

    const { roleIds } = event.queryStringParameters ?? {};
    const pattern = /^[a-zA-Z,]*$/;
    if (!pattern.test(roleIds)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `Invalid roles: ${roleIds}` }),
      };
    }

    const roleTable = process.env.roleTable;
    const operationsTable = process.env.operationsTable;

    const roleQueryParams = {
      TableName: roleTable,
      Index: 'EntityTypeIndex',
      FilterExpression: "entityType = :rolesEntity",
      ExpressionAttributeValues: {
        ":rolesEntity": "ROLE"
      },
    };

    if (roleIds) {
      let qRoles = roleIds.split(',');
      let qFilter = "";
      for (let i = 0; i < qRoles.length; i++) {
        qFilter = i === 0 ? `#PK= :role${i}` : `${qFilter} or #PK= :role${i}`;
        roleQueryParams.ExpressionAttributeValues[`:role${i}`] = qRoles[i];
      }
      roleQueryParams.ExpressionAttributeNames = { '#PK': 'PK' }
      roleQueryParams.FilterExpression = `${roleQueryParams.FilterExpression} and (${qFilter})`
    }

    const roles = (await dynamoDb.scan(roleQueryParams).promise()).Items;

    const operationsQueryParams = {
      TableName: operationsTable,
      Index: 'EntityTypeIndex',
      FilterExpression: "entityType = :operationsEntity",
      ExpressionAttributeValues: {
        ":operationsEntity": "OPERATION"
      },
    };

    const operations = (await dynamoDb.scan(operationsQueryParams).promise()).Items;
    operations.sort((a, b) => (a.PK > b.PK) ? 1 : ((b.PK > a.PK) ? -1 : 0));

    const finalRoles = [];

    roles.forEach(role => {
      finalRoles.push({
        roleId: role.PK,
        createdBy: role.createdBy,
        createDate: role.createDate,
        isActive: role.active,
        operations: getOperationsForRole(role.access, operations)
      });
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ roles: finalRoles }),
    };
  } catch (e) {
    console.error('Error:', e.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: e.message }),
    };

  }
}

function hex2bin(hex) {
  return (parseInt(hex, 16).toString(2));
}

function getOperationsForRole(roleHexString, operations) {
  let roleOperations = [];
  operations.forEach(op => {
    if (roleHexString.charAt(parseInt(op.PK)) !== undefined && roleHexString.charAt(parseInt(op.PK)) !== '') {
      roleOperations.push(
        {
          operationId: op.SK,
          operationDesc: op.operationDesc,
          isActive: op.active,
          create: hex2bin(roleHexString.charAt(parseInt(op.PK))).charAt(0) === '1',
          read: hex2bin(roleHexString.charAt(parseInt(op.PK))).charAt(1) === '1',
          update: hex2bin(roleHexString.charAt(parseInt(op.PK))).charAt(2) === '1',
          delete: hex2bin(roleHexString.charAt(parseInt(op.PK))).charAt(3) === '1',
        }
      );
    } else {
      roleOperations.push(
        {
          operationId: op.SK,
          operationDesc: op.operationDesc,
          isActive: op.active,
          create: false,
          update: false,
          read: false,
          delete: false,
        }
      );
    }
  });
  for (let i = 0; i < roleHexString.length; i++) {
    const op = operations.find((op) => op.PK == i);
    if (op !== undefined && op.active) {

    }
  }
  return roleOperations;
}