const cdk = require("aws-cdk-lib");
const { Stack, StackProps } = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
const ssm = require("aws-cdk-lib/aws-ssm");
const apigw = require("aws-cdk-lib/aws-apigateway");
const sqs = require("aws-cdk-lib/aws-sqs");
const cognito = require('aws-cdk-lib/aws-cognito');
const eventSource = require('aws-cdk-lib/aws-lambda-event-sources');
const eventTarget = require("aws-cdk-lib/aws-events-targets");
const events = require("aws-cdk-lib/aws-events");

// const lambdaEventSources = require('@aws-cdk/aws-lambda-event-sources');

class CenomiIntegrationUserManagementStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { resourcePrefix, dbTables, attributes } = props;

    const masterApiGatewayName = resourcePrefix + attributes.masterApiGateway.masterGatewayName;
    const masterApiResourceId = resourcePrefix + attributes.masterApiGateway.exportResourceId;
    const masterApiExportId = resourcePrefix + attributes.masterApiGateway.exportApiId;

    /*const auth = new apigw.CognitoUserPoolsAuthorizer(this, resourcePrefix + 'bearer-token-authorizer', {
      cognitoUserPools: [cognito.UserPool.fromUserPoolId(this, resourcePrefix + 'UserPoolId', 'ap-south-1_HL3QxPlEs')],
      identitySource: 'method.request.header.Authorizer'
    });*/

    // const FileTransferDataTable = dynamodb.Table.fromTableName(this, "CenomiImportedFileTransferDataTable", `${resourcePrefix}${dbTables.FileTransferDataTable}`);
    // Import Lambda role using ARN

    const lambdaRole = iam.Role.fromRoleArn(
      this,
      "ImportedLambdaRole",
      `arn:aws:iam::${props.env.account}:role/${resourcePrefix}LambdaRole`, // Update the account ID
      {
        mutable: false,
      }
    );

    const utilLayer = cdk.aws_lambda.LayerVersion.fromLayerVersionArn(
      this,
      `${props.resourcePrefix}${props.layersData.npmLayer.name}`,
      `arn:aws:lambda:${this.region}:${this.account}:layer:${props.resourcePrefix}${props.layersData.npmLayer.name}:${props.layersData.npmLayer.version}`
    );
    const allLayersList = [utilLayer];

    const usersTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.UsersTable}`, {
      tableName: `${resourcePrefix}${dbTables.UsersTable}`,
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const RoleTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.RoleTable}`, {
      tableName: `${resourcePrefix}${dbTables.RoleTable}`,
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const OperationsTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.OperationsTable}`, {
      tableName: `${resourcePrefix}${dbTables.OperationsTable}`,
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const createUserLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}createUserLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}createUserLambda`,
        code: lambda.Code.asset("lambdas/userManagement/createUser"),
        handler: "createUserLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          userTable: `${resourcePrefix}${dbTables.UsersTable}`,
          roleTable: `${resourcePrefix}${dbTables.RoleTable}`,
          operationsTable: `${resourcePrefix}${dbTables.OperationsTable}`,
          congnitoUserPoolId: `ap-south-1_HL3QxPlEs`,
          congnitoUserPoolClientId: `7v7b28o9a8hs6o8njj5jojnhk0`,
          REGION: this.region,
        },
      }
    );
    const updateUserLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}updateUserLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}updateUserLambda`,
        code: lambda.Code.asset("lambdas/userManagement/updateUser"),
        handler: "updateUserLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          userTable: `${resourcePrefix}${dbTables.UsersTable}`,
          roleTable: `${resourcePrefix}${dbTables.RoleTable}`,
          operationsTable: `${resourcePrefix}${dbTables.OperationsTable}`,
          congnitoUserPoolId: `ap-south-1_HL3QxPlEs`,
          congnitoUserPoolClientId: `7v7b28o9a8hs6o8njj5jojnhk0`,
          REGION: this.region,
        },
      }
    );

    const api = apigw.RestApi.fromRestApiAttributes(
      this,
      `${props.resourcePrefix}ApiGateway`,
      {
        restApiId: cdk.Fn.importValue(masterApiExportId),
        rootResourceId: cdk.Fn.importValue(masterApiResourceId),
      }
    );

    api.root.defaultCorsPreflightOptions = {
      allowHeaders: [
        "Content-Type",
        "X-Amz-Date",
        "Authorization",
        "X-Api-Key",
      ],
      allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
      allowCredentials: true,
      allowOrigins: props.allowCrossOrigins,
    };

    api.root
      .resourceForPath("usermanagement/user")
      .addMethod("POST", new apigw.LambdaIntegration(createUserLambda));

    api.root
      .resourceForPath("usermanagement/user")
      .addMethod("PUT", new apigw.LambdaIntegration(updateUserLambda));
  }
}

module.exports = { CenomiIntegrationUserManagementStack };
