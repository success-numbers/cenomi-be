const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { roleId, role, updatedBy, isActive } = JSON.parse(event.body);

  if (!roleId || !role || !updatedBy || isActive === undefined) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
      body: JSON.stringify({ message: 'roleId, role, updatedBy,isActive is required' }),
    };
  }

  try {
    const roleTable = process.env.roleTable;
    const operationsTable = process.env.operationsTable;
    const date = Math.floor(new Date().getTime() / 1000);
    const updateParams = {
      TableName: roleTable,
      Key: {
        PK: roleId,
        SK: roleId,
      },
      ConditionExpression: '#pk = :pk and #sk = :sk and #entityType =:entityType',
      UpdateExpression: 'SET #access = :access, #active = :active, #updatedBy = :updatedBy, #updateDate = :updateDate',
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK',
        '#active': 'active',
        '#updatedBy': 'updatedBy',
        '#access': 'access',
        '#updateDate': 'updateDate',
        "#entityType": 'entityType',
      },
      ExpressionAttributeValues: {
        ':pk': roleId,
        ':sk': roleId,
        ':access': role,
        ':updatedBy': updatedBy ?? 'ADMIN',
        ':updateDate': date,
        ':active': isActive,
        ':entityType': 'ROLE'
      }
    }

    console.log('Update In progress: ', updateParams);
    try {
      await dynamoDb.update(updateParams).promise();

      const roleQueryParams = {
        TableName: roleTable,
        Index: 'EntityTypeIndex',
        FilterExpression: "entityType = :rolesEntity and PK = :pk",
        ExpressionAttributeValues: {
          ":rolesEntity": "ROLE",
          ":pk": roleId
        },
      };

      const queriedRole = (await dynamoDb.scan(roleQueryParams).promise()).Items[0];

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

      const finalRole = {
        roleId: queriedRole.PK,
        createdBy: queriedRole.createdBy,
        createDate: queriedRole.createDate,
        isActive: queriedRole.active,
        operations: getOperationsForRole(queriedRole.access, operations)
      }


      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
      },
        body: JSON.stringify({ finalRole }),
      };
    } catch (e) {
      console.log(e);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
      },
        body: JSON.stringify({ message: `The Role is not valid.` }),
      };
    }
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