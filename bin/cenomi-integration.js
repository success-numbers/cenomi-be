#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { CenomiIntegrationCognitoStack } = require('../lib/cenomi-integration-cognito-stack');
const { CenomiIntegrationCommonStack } = require('../lib/cenomi-integration-commmon-stack');
const { CenomiIntegrationDynamoDbStack } = require('../lib/cenomi-integration-dynamodb-stack');
const { CenomiIntegrationBusinessStack } = require('../lib/cenomi-integration-buisness-stack');
const { CenomiIntegrationLayersStack } = require('../lib/cenomi-integration-layers-stack');

const app = new cdk.App();

let config = {};
config = app.node.tryGetContext('sit-config');

new CenomiIntegrationCognitoStack(app, 'cenomi-integration-cognito-stack', {
  resourcePrefix : config.project.projectName
});

new CenomiIntegrationCommonStack(app,'cenomi-integration-common-stack',{
  resourcePrefix : config.project.projectName,
  env: config.env,
  attributes: config.attributes,
  roles: config.roles,
  allowCrossOrigins: config.allowCrossOrigins,
});

new CenomiIntegrationDynamoDbStack(app, 'cenomi-integration-dynamodb-stack',{
  resourcePrefix : config.project.projectName,
  env: config.env,
  attributes: config.attributes,
  roles: config.roles,
  allowCrossOrigins: config.allowCrossOrigins,
});
new CenomiIntegrationBusinessStack(app, 'cenomi-integration-buisness-stack',{
  resourcePrefix : config.project.projectName,
  env: config.env,
  attributes: config.attributes,
  roles: config.roles,
  allowCrossOrigins: config.allowCrossOrigins,
  layersData:config.layers,
  runtime: cdk.aws_lambda.Runtime.NODEJS_18_X
});
new CenomiIntegrationLayersStack(app,'cenomi-integration-layers-stack',{
  resourcePrefix : config.project.projectName,
  layersData: config.layers,
  env: config.env
});