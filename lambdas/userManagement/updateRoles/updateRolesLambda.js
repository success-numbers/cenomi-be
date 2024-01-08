const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { roleId, role, updatedBy, isActive } = JSON.parse(event.body);

  if (!roleId || !role || !updatedBy || isActive === undefined) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'roleId, role, updatedBy,isActive is required' }),
    };
  }

  try {
    const roleTable = process.env.roleTable;
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
    await dynamoDb.update(updateParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Role ${roleId} updated` }),
    };
  } catch (e) {
    console.error('Error:', e.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: e.message }),
    };

  }
}