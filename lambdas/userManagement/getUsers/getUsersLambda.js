const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {

    const { userIds } = event.queryStringParameters ?? {};

    const userTable = process.env.userTable;

    const userQueryParams = {
      TableName: userTable,
      Index: 'EntityTypeIndex',
      FilterExpression: "entityType = :usersEntity",
      ExpressionAttributeValues: {
        ":usersEntity": "USER"
      },
    };

    if (userIds) {
      let qusers = userIds.split(',');
      let qFilter = "";
      for (let i = 0; i < qusers.length; i++) {
        qFilter = i === 0 ? `#PK= :user${i} or #SK= :user${i}` : `${qFilter} or #PK= :user${i} or #SK= :user${i}`;
        userQueryParams.ExpressionAttributeValues[`:user${i}`] = qusers[i];
      }
      userQueryParams.ExpressionAttributeNames = { '#PK': 'PK', '#SK': 'SK' }
      userQueryParams.FilterExpression = `${userQueryParams.FilterExpression} and (${qFilter})`
    }

    const users = (await dynamoDb.scan(userQueryParams).promise()).Items;
    const finalusers = [];
    users.forEach(user => {
      if (user.active) {
        finalusers.push({
          userId: user.SK,
          email: user.PK,
          createdBy: user.createdBy,
          createDate: user.createDate,
          updatedBy: user.createDate,
          updateDateDate: user.createDate,
          roleId: user.roleId,
          isActive: user.active
        });
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ users: finalusers }),
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