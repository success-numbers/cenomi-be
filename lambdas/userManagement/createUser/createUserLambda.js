const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { userId, email, password, roleId, userName } = JSON.parse(event.body ?? "{}");

  if (!userId || !email || !password || !roleId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'userId, email, password, roleId is required' }),
    };
  }

  const pattern = /^[a-zA-Z0-9]*$/;
  if (!pattern.test(userId)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Invalid userId: ${userId}. Only Alphanumeric values allowed.` }),
    };
  }

  try {
    const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

    const user = {
      UserPoolId: process.env.congnitoUserPoolId,
      Username: userId,
      MessageAction: 'SUPPRESS',
      TemporaryPassword: password,
      UserAttributes: [
        {
          Name: "email",
          Value: email
        }
      ],
    }

    console.log('creating user', user);
    let res = await cognitoidentityserviceprovider.adminCreateUser(user).promise();
    console.log('created user');

    console.log('removing temporary password and finalizing provided password.');
    const initAuthResponse = await cognitoidentityserviceprovider.adminInitiateAuth({
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      ClientId: process.env.congnitoUserPoolClientId,
      UserPoolId: process.env.congnitoUserPoolId,
      AuthParameters: {
        USERNAME: userId,
        PASSWORD: password
      }
    }).promise()

    if (initAuthResponse.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      await cognitoidentityserviceprovider.adminRespondToAuthChallenge({
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: process.env.congnitoUserPoolClientId,
        UserPoolId: process.env.congnitoUserPoolId,
        ChallengeResponses: {
          USERNAME: userId,
          NEW_PASSWORD: password,
        },
        Session: initAuthResponse.Session
      }).promise()
      console.log('created user');
    }

    const userTable = process.env.userTable;
    const date = Math.floor(new Date().getTime() / 1000);
    const params = {
      TableName: userTable,
      Item: {
        PK: email,
        SK: userId,
        roleId: roleId,
        userName: userName ?? userId,
        createDate: date,
        entityType: 'USER',
        active: true
      }
    };
    console.log('Insert In progress: ', params);
    await dynamoDb.put(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `User ${userId} created` }),
    };
  } catch (e) {
    console.error('Error:', e.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: e.message }),
    };

  }
}