const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { seqNo, operationId, operationDesc, isActive, updatedBy } = JSON.parse(event.body ?? "{}");

  if (!seqNo || !operationId || !operationDesc || isActive === undefined) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'seqNo, operationId, operationDesc,isActive is required' }),
    };
  }
  try {
    const operationsTable = process.env.operationsTable;

    const updateParams = {
      TableName: operationsTable,
      Key: {
        PK: seqNo,
        SK: seqNo,
      },
      ConditionExpression: '#pk = :pk and #sk = :sk and #entityType =:entityType',
      UpdateExpression: 'SET #desc = :desc, #active = :active, #updatedBy = :updatedBy, #updateDate = :updateDate',
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK',
        '#desc': 'operationDesc',
        '#active': 'active',
        "#entityType": 'entityType',
      },
      ExpressionAttributeValues: {
        ':pk': seqNo,
        ':sk': seqNo,
        ':desc': operationDesc,
        ':active': isActive,
        ':updatedBy': updatedBy ?? 'ADMIN',
        ':updateDate': new Date().getTime(),
        ":entityType": 'OPERATION'
      }
    }

    console.log('Update In progress: ', updateParams);

    try {
      await dynamoDb.update(updateParams).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: `Operation ${operationId} updated` }),
      };
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `The Operation is not valid.` }),
      };
    }
  } catch (e) {
    console.error('Error:', e.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: e.message }),
    };

  }
}