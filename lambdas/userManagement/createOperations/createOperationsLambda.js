const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { seqNo, operationId, operationDesc } = JSON.parse(event.body);

  if (!seqNo || !operationId || !operationDesc) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
      body: JSON.stringify({ message: 'seqNo, operationId, operationDesc is required' }),
    };
  }

  const pattern = /^[0-9]*$/;
  if (!pattern.test(seqNo)) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
      body: JSON.stringify({ message: `Invalid SeqNo: ${seqNo}. Only Numeric Values Allowed` }),
    };
  }

  try {
    const operationsTable = process.env.operationsTable;
    const date = Math.floor(new Date().getTime() / 1000);
    const params = {
      TableName: operationsTable,
      Item: {
        PK: seqNo,
        SK: seqNo,
        operationId: operationId,
        operationDesc,
        entityType: 'OPERATION',
        createDate: date,
        active: true
      },
      ConditionExpression: 'attribute_not_exists(PK)'
    };

    console.log('Insert In progress: ', params);
    await dynamoDb.put(params).promise();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    },
      body: JSON.stringify({ message: `Operation ${operationId} created` }),
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