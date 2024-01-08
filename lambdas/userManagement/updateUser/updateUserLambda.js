const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { userId, email, roleId, isActive } = JSON.parse(event.body);

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'userId is required' }),
    };
  }

  try {
    const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

    if (isActive !== undefined) {
      const cognitoUser = {
        UserPoolId: process.env.congnitoUserPoolId,
        Username: userId,
      }
      let cognitoRes;
      if (isActive) {
        cognitoRes = await cognitoidentityserviceprovider.adminEnableUser(cognitoUser).promise();
      } else {
        cognitoRes = await cognitoidentityserviceprovider.adminDisableUser(cognitoUser).promise();
      }
      console.log('Cognito Response:', cognitoRes);
    }

    const userTable = process.env.userTable;

    const updateParams = {
      TableName: userTable,
      Key: {
        PK: email,
        SK: userId,
      },
      ConditionExpression: '#pk = :pk and #sk=:sk and #entityType =:entityType'
    };

    if (roleId !== undefined && isActive !== undefined) {
      updateParams.UpdateExpression = `SET #roleId = :roleId, #active = :active`;
      updateParams.ExpressionAttributeNames = {
        "#active": 'active',
        "#roleId": 'roleId',
        "#entityType": 'entityType',
        "#pk": 'PK',
        "#sk": 'SK'
      };
      updateParams.ExpressionAttributeValues = {
        ":active": isActive,
        ":roleId": roleId,
        ":pk": email,
        ":sk": userId,
        ":entityType": 'USER'
      };
    } else if (roleId !== undefined && isActive === undefined) {
      updateParams.UpdateExpression = `SET #roleId = :roleId`;
      updateParams.ExpressionAttributeNames = {
        "#roleId": 'roleId',
        "#entityType": 'entityType',
        "#pk": 'PK',
        "#sk": 'SK'
      };
      updateParams.ExpressionAttributeValues = {
        ":roleId": roleId,
        ":pk": email,
        ":sk": userId,
        ":entityType": 'USER'
      };
    } else if (roleId === undefined && isActive !== undefined) {
      updateParams.UpdateExpression = `SET #active = :active`;
      updateParams.ExpressionAttributeNames = {
        "#active": 'active',
        "#entityType": 'entityType',
        "#pk": 'PK',
        "#sk": 'SK'
      };
      updateParams.ExpressionAttributeValues = {
        ":active": isActive,
        ":pk": email,
        ":sk": userId,
        ":entityType": 'USER'
      };
    } else {

      return {
        statusCode: 400,
        body: JSON.stringify({ message: `No Role/Status change detected from request` })
      };
    }

    console.log('Update to In progress: ', updateParams);
    await dynamoDb.update(updateParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `User ${userId} updated` }),
    };
  } catch (e) {
    console.error('Error fetching destLocIds:', e.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: e.message }),
    };

  }
}