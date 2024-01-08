const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
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

    const finalRoles = [];

    roles.forEach(role => {
      if (role.active) {
        finalRoles.push({
          roleId: role.PK,
          createdBy: role.createdBy,
          createDate: role.createDate,
          active: role.active,
          operations: getOperationsForRole(role.access, operations)
        });
      }
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
  for (let i = 0; i < roleHexString.length; i++) {
    const op = operations.find((op) => op.PK == i);
    if (op !== undefined && op.active) {
      roleOperations.push(
        {
          operationId: op.SK,
          operationDesc: op.operationDesc,
          create: hex2bin(roleHexString.charAt(i)).charAt(0) === '1',
          update: hex2bin(roleHexString.charAt(i)).charAt(1) === '1',
          read: hex2bin(roleHexString.charAt(i)).charAt(2) === '1',
          delete: hex2bin(roleHexString.charAt(i)).charAt(3) === '1',
        }
      )
    }
  }
  return roleOperations;
}