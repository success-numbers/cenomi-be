const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { userId, email, roleId, userName, isActive } = JSON.parse(event.body);

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
      ConditionExpression: '#pk = :pk and #sk=:sk and #entityType =:entityType',
      ExpressionAttributeNames: {
        "#entityType": 'entityType',
        "#pk": 'PK',
        "#sk": 'SK'
      },
      ExpressionAttributeValues: {
        ":pk": email,
        ":sk": userId,
        ":entityType": 'USER'
      }
    };

    if (roleId !== undefined) {
      updateParams.UpdateExpression = `SET #roleId = :roleId`;
      updateParams.ExpressionAttributeNames["#roleId"] = 'roleId';
      updateParams.ExpressionAttributeValues[":roleId"] = roleId;
    }

    if (isActive !== undefined) {
      updateParams.UpdateExpression = updateParams.UpdateExpression ? `${updateParams.UpdateExpression}, #active = :active` : `SET #active = :active`;
      updateParams.ExpressionAttributeNames["#active"] = 'active';
      updateParams.ExpressionAttributeValues[":active"] = isActive;
    }

    if (userName !== undefined) {
      updateParams.UpdateExpression = updateParams.UpdateExpression ? `${updateParams.UpdateExpression}, #userName = :userName` : `SET #userName = :userName`;
      updateParams.ExpressionAttributeNames["#userName"] = 'userName';
      updateParams.ExpressionAttributeValues[":userName"] = userName;
    }

    if(updateParams.UpdateExpression === undefined) {
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