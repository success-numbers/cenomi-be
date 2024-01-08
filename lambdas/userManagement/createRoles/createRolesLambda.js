const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { roleId, role, createdBy } = JSON.parse(event.body);

  if (!roleId || !role || !createdBy) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'roleId, role, createdBy is required' }),
    };
  }
  try {
    const roleTable = process.env.roleTable;
    const date = Math.floor(new Date().getTime() / 1000)
    const params = {
      TableName: roleTable,
      Item: {
        PK: roleId,
        SK: roleId,
        access: role,
        createdBy,
        createDate: date,
        entityType: 'ROLE',
        active: true
      }
    };

    console.log('Insert In progress: ', params);
    await dynamoDb.put(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Role ${roleId} created` }),
    };
  } catch (e) {
    console.error('Error:', e.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: e.message }),
    };

  }
}