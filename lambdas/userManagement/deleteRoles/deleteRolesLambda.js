const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { roleId } = event.queryStringParameters ?? {};

  if (!roleId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'roleId is required' }),
    };
  }
  
  const pattern = /^[a-zA-Z0-9]*$/;
  if (!pattern.test(roleId)) {
      return {
          statusCode: 400,
          body: JSON.stringify({ message: `Invalid roleId: ${roleId}. Only Alphanumeric values allowed.` }),
      };
  }

  try {
    const roleTable = process.env.roleTable;
    const params = {
      TableName: roleTable,
      Key:{
        PK: roleId,
        SK: roleId,
      }
    };

    console.log('Delete In progress: ', params);
    await dynamoDb.delete(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Role ${roleId} deleted` }),
    };
  } catch (e) {
    console.error('Error:', e.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: e.message }),
    };

  }
}