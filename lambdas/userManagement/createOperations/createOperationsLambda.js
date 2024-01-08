const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { seqNo, operationId, operationDesc } = JSON.parse(event.body);

  if (!seqNo || !operationId || !operationDesc) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'seqNo, operationId, operationDesc is required' }),
    };
  }
  try {
    const operationsTable = process.env.operationsTable;
    const date = Math.floor(new Date().getTime() / 1000);
    const params = {
      TableName: operationsTable,
      Item: {
        PK: seqNo,
        SK: operationId,
        operationDesc,
        entityType: 'OPERATION',
        createDate: date,
        active: true
      }
    };

    console.log('Insert In progress: ', params);
    await dynamoDb.put(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Operation ${operationId} created` }),
    };
  } catch (e) {
    console.error('Error:', e.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: e.message }),
    };

  }
}