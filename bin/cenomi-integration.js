#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { CenomiIntegrationCognitoStack } = require('../lib/cenomi-integration-cognito-stack');
const { CenomiIntegrationCommonStack } = require('../lib/cenomi-integration-common-stack');
const { CenomiIntegrationDynamoDbStack } = require('../lib/cenomi-integration-dynamodb-stack');
const { CenomiIntegrationBusinessStack } = require('../lib/cenomi-integration-business-stack');
const { CenomiIntegrationLayersStack } = require('../lib/cenomi-integration-layers-stack');
const { CenomiIntegrationUserManagementStack} = require('../lib/cenomi-integration-usermanagement-stack');

const app = new cdk.App();

let config = {};

if (app.node.tryGetContext("deploy-environment") === "sit") {
  config = app.node.tryGetContext("sit-config");
} else if (app.node.tryGetContext("deploy-environment") === "uat") {
  config = app.node.tryGetContext("uat-config");
} else if (app.node.tryGetContext("deploy-environment") === "prod") {
  config = app.node.tryGetContext("prod-config");
}

const projectResourcesPrefix =
config.project.projectName + "-" + config.project.projectEnvironment + "-";
const StackPrefix =
  config.project.projectName.toLowerCase() +
  "-" +
  config.project.projectEnvironment.toLowerCase() +
  "-";


new CenomiIntegrationCognitoStack(app, `${StackPrefix}cognito-stack`, {
  resourcePrefix : projectResourcesPrefix
});

new CenomiIntegrationCommonStack(app,`${StackPrefix}common-stack`,{
  resourcePrefix : projectResourcesPrefix,
  env: config.env,
  attributes: config.attributes,
  roles: config.roles,
  allowCrossOrigins: config.allowCrossOrigins,
});

new CenomiIntegrationLayersStack(app,`${StackPrefix}layers-stack`,{
  resourcePrefix : projectResourcesPrefix,
  layersData: config.layers,
  env: config.env
});

new CenomiIntegrationDynamoDbStack(app, `${StackPrefix}dynamodb-stack`,{
  resourcePrefix : projectResourcesPrefix,
  env: config.env,
  dbTables: config.dynamoDBTables,
  attributes: config.attributes,
  roles: config.roles,
  allowCrossOrigins: config.allowCrossOrigins,
});
new CenomiIntegrationBusinessStack(app, `${StackPrefix}buisness-stack`,{
  resourcePrefix : projectResourcesPrefix,
  env: config.env,
  attributes: config.attributes,
  roles: config.roles,
  dbTables: config.dynamoDBTables,
  allowCrossOrigins: config.allowCrossOrigins,
  layersData:config.layers,
  runtime: cdk.aws_lambda.Runtime.NODEJS_18_X
});

new CenomiIntegrationUserManagementStack(app,`${StackPrefix}usermanagement-stack`,{
  resourcePrefix : projectResourcesPrefix,
  env: config.env,
  attributes: config.attributes,
  roles: config.roles,
  dbTables: config.dynamoDBTables,
  allowCrossOrigins: config.allowCrossOrigins,
  layersData:config.layers,
  runtime: cdk.aws_lambda.Runtime.NODEJS_18_X
});