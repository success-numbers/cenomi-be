const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const constants = require('./constants');
exports.handler = async (event) => {
  try {

    const { userIds, paginationToken, limit } = event.queryStringParameters ?? {};

    const userTable = process.env.userTable;
    const roleTable = process.env.roleTable;

    const userQueryParams = {
      TableName: userTable,
      IndexName: 'EntityTypeIndex',
      KeyConditionExpression: "entityType = :usersEntity",
      ExclusiveStartKey: !userIds && paginationToken ? JSON.parse(atob(paginationToken)) : undefined,
      ExpressionAttributeValues: {
        ":usersEntity": "USER"
      },
      Limit: limit ?? parseInt(process.env.defaultLimit ?? 20)
    };

    if (userIds) {
      userQueryParams.Limit = undefined;
      let qusers = userIds.split(',');
      let qFilter = "";
      for (let i = 0; i < qusers.length; i++) {
        qFilter = i === 0 ? `#PK= :user${i} or #SK= :user${i}` : `${qFilter} or #PK= :user${i} or #SK= :user${i}`;
        userQueryParams.ExpressionAttributeValues[`:user${i}`] = qusers[i];
      }
      userQueryParams.ExpressionAttributeNames = { '#PK': 'PK', '#SK': 'SK' }
      userQueryParams.FilterExpression = qFilter
    }


    const result = (await dynamoDb.query(userQueryParams).promise());
    const users = result.Items;
    const currentPaginationToken = result.LastEvaluatedKey ? btoa(JSON.stringify(result.LastEvaluatedKey)) : undefined;


    const finalusers = [];
    users.forEach(user => {
      if (user.active) {
        finalusers.push({
          userId: user.SK,
          email: user.PK,
          userName: user.userName ?? user.SK,
          createdBy: user.createdBy,
          createDate: user.createDate,
          updatedBy: user.createDate,
          updateDateDate: user.createDate,
          roleId: user.roleId,
          isActive: user.active
        });
      }
    });

    if (userIds) {
      const roleQueryParams = {
        TableName: roleTable,
        IndexName: 'EntityTypeIndex',
        KeyConditionExpression: "entityType = :rolesEntity",
        ExpressionAttributeValues: {
          ":rolesEntity": "ROLE"
        },
      };
      let qFilter = "";
      for (let i = 0; i < users.length; i++) {
        qFilter = i === 0 ? `PK= :role${i}` : `${qFilter} or PK= :role${i}`;
        roleQueryParams.ExpressionAttributeValues[`:role${i}`] = users[i].roleId;
      }
      roleQueryParams.FilterExpression = qFilter;
      console.log('Getting roles', roleQueryParams);
      const resultRoles = (await dynamoDb.query(roleQueryParams).promise()).Items;
      console.log('Got roles', result);
      finalusers.forEach(user => {
        if (resultRoles.find((role) => role.PK === user.roleId) === undefined) {
          user.roleStatus = 'INVALID'
        } else {
          user.roleStatus = 'VALID'
        }
      });
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
      body: JSON.stringify({ paginationToken: currentPaginationToken, users: finalusers, 
        display_name: constants.ColumnMappings,
      }),
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
  return (parseInt(hex, 16).toString(2));
}

function getOperationsForuser(userHexString, operations) {
  let userOperations = [];
  for (let i = 0; i < userHexString.length; i++) {
    const op = operations.find((op) => op.PK == i);
    if (op !== undefined && op.active) {
      userOperations.push(
        {
          operationId: op.SK,
          operationDesc: op.operationDesc,
          create: hex2bin(userHexString.charAt(i)).charAt(0) === '1',
          update: hex2bin(userHexString.charAt(i)).charAt(1) === '1',
          read: hex2bin(userHexString.charAt(i)).charAt(2) === '1',
          delete: hex2bin(userHexString.charAt(i)).charAt(3) === '1',
        }
      )
    }
  }
  return userOperations;
}