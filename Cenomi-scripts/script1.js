// Load the AWS SDK for Node.js

const operations = require("./operations");
const roles = require("./roles");
const { exec } = require('child_process');

const AWS = require("aws-sdk");
// Set the region
AWS.config.update({
  region: process.argv[2],
  credentials: {
    accessKeyId: process.argv[3],
    secretAccessKey: process.argv[4],
  },
});
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        reject(stderr);
        return;
      }
      resolve(stdout);
    });
  });
}
// Name of the Table for UserManagement
const userManagementTable = "Cenomi-Integration-PROD-User-Management";

// Create DynamoDB document client
var docClient = new AWS.DynamoDB.DocumentClient();

const populateOperations = async () => {
  const failedUpdateList = [];
  for (let pkSkIndex = 0; pkSkIndex < operations.length; pkSkIndex++) {
    let pkSkDataObj = operations[pkSkIndex];
    try {
      const putItemParams = {
        TableName: userManagementTable,
        Item: {
          ...pkSkDataObj
        },
      };
      await docClient.put(putItemParams).promise();
    } catch (err) {
      console.log("Error:", err);
      failedUpdateList.push(pkSkDataObj);
    }
    console.log(`Successfully Updated Operations PK:${pkSkDataObj.PK} SK:${pkSkDataObj.SK}`);
  }
  if(failedUpdateList.length == 0){
    console.log("ALL ITEMS Processed");
  }else{
    console.log("FAILED ITEMS", JSON.stringify(failedUpdateList));
  }
};

const populateRoles = async () => {
  const failedUpdateList = [];
  for (let pkSkIndex = 0; pkSkIndex < roles.length; pkSkIndex++) {
    let pkSkDataObj = roles[pkSkIndex];
    try {
      const putItemParams = {
        TableName: userManagementTable,
        Item: {
          ...pkSkDataObj
        },
      };
      await docClient.put(putItemParams).promise();
    } catch (err) {
      console.log("Error:", err);
      failedUpdateList.push(pkSkDataObj);
    }
    console.log(`Successfully Updated Roles PK:${pkSkDataObj.PK} SK:${pkSkDataObj.SK}`);
  }
  if(failedUpdateList.length == 0){
    console.log("All Items processed");
  }else{
    console.log("FAILED ITEMS", JSON.stringify(failedUpdateList));
  }
};
const createNewUser = async () => {
  try {
    await executeCommand(`aws cognito-idp admin-create-user --user-pool-id ${process.argv[5]} --username admin --temporary-password Welcome@2024`);
    await executeCommand(`aws cognito-idp admin-set-user-password --user-pool-id ${process.argv[5]} --username admin --password Welcome@2024 --permanent`);
    await executeCommand(`aws dynamodb put-item --table-name ${userManagementTable} --item \'{"PK": {"S": "admin@gmail.com" }, "SK": { "S": "admin" }, "active": { "BOOL": true }, "createDate": { "N": "1705912378" }, "entityType": { "S": "USER" }, "roleId": { "S": "ADMIN" }, "userName": { "S": "admin" }}\'`);
    console.log('Commands executed successfully');
  } catch (error) {
    console.error('Error executing commands:', error);
  }
}
populateOperations().then((data) => {
  console.log("Script populateOperations Processing Completed");
});

// populateRoles().then((data) => {
//   console.log("Script populateRoles Processing Completed");
// });

// createNewUser().then((data) => {
//   console.log("Script createNewAdminUser Processing Completed with Username: admin & Password: Welcome@2024 ");

// })