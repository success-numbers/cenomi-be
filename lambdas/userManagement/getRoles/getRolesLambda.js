const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {

    const { roleIds, limit, paginationToken } = event.queryStringParameters ?? {};
    const pattern = /^[a-zA-Z,0-1]*$/;
    if (!pattern.test(roleIds)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
      },
        body: JSON.stringify({ message: `Invalid roles: ${roleIds}` }),
      };
    }

    const roleTable = process.env.roleTable;
    const operationsTable = process.env.operationsTable;

    const roleQueryParams = {
      TableName: roleTable,
      IndexName: 'EntityTypeIndex',
      ExclusiveStartKey: !roleIds && paginationToken ? JSON.parse(atob(paginationToken)) : undefined,
      KeyConditionExpression: "entityType = :rolesEntity",
      ExpressionAttributeValues: {
        ":rolesEntity": "ROLE"
      },
      Limit: limit ?? parseInt(process.env.defaultLimit ?? 20)
    };

    if (roleIds) {
      roleQueryParams.Limit = undefined;
      let qRoles = roleIds.split(',');
      let qFilter = "";
      for (let i = 0; i < qRoles.length; i++) {
        qFilter = i === 0 ? `PK= :role${i}` : `${qFilter} or PK= :role${i}`;
        roleQueryParams.ExpressionAttributeValues[`:role${i}`] = qRoles[i];
      }
      roleQueryParams.FilterExpression = qFilter
    }

    console.log('Getting roles', roleQueryParams);

    const result = (await dynamoDb.query(roleQueryParams).promise());
    console.log('Got roles', result);

    const currentPaginationToken = result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined;
    const roles = result.Items;

    const operationsQueryParams = {
      TableName: operationsTable,
      IndexName: 'EntityTypeIndex',
      KeyConditionExpression: "entityType = :operationsEntity",
      ExpressionAttributeValues: {
        ":operationsEntity": "OPERATION"
      },
    };

    const operations = (await dynamoDb.query(operationsQueryParams).promise()).Items;
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
      body: JSON.stringify({ paginationToken: currentPaginationToken, roles: finalRoles }),
    };
  } catch (e) {
    console.error('Error:', e.message);
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
      body: JSON.stringify({ message: e.message }),
    };

  }
}

function hex2bin(hex) {
  return (parseInt(hex, 16).toString(2).padStart(4, '0'));
}

function getOperationsForRole(roleHexString, operations) {
  let roleOperations = [];
  operations.forEach(op => {
    if (roleHexString.charAt(parseInt(op.PK)) !== undefined && roleHexString.charAt(parseInt(op.PK)) !== '') {
      roleOperations.push(
        {
          seqNo: op.PK,
          operationId: op.operationId,
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
          seqNo: op.PK,
          operationId: op.operationId,
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