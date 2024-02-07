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

    const { resourcePrefix, dbTables, attributes, roles } = props;

    const masterApiGatewayName = resourcePrefix + attributes.masterApiGateway.masterGatewayName;
    const masterApiResourceId = resourcePrefix + attributes.masterApiGateway.exportResourceId;
    const masterApiExportId = resourcePrefix + attributes.masterApiGateway.exportApiId;
    const existingCognitoUserPoolId = ssm.StringParameter.valueForStringParameter(
      this, `/${resourcePrefix}/UserPoolId`); 
      const existingCognitoClientId = ssm.StringParameter.valueForStringParameter(
        this, `/${resourcePrefix}/ClientId`); 
    /*const auth = new apigw.CognitoUserPoolsAuthorizer(this, resourcePrefix + 'bearer-token-authorizer', {
      cognitoUserPools: [cognito.UserPool.fromUserPoolId(this, resourcePrefix + 'UserPoolId', 'ap-south-1_HL3QxPlEs')],
      identitySource: 'method.request.header.Authorizer'
    });*/

    // Import Lambda role using ARN

    // const lambdaRole = iam.Role.fromRoleArn(
    //   this,
    //   "ImportedLambdaRole",
    //   `arn:aws:iam::${props.env.account}:role/${resourcePrefix}LambdaRole`, // Update the account ID
    //   {
    //     mutable: false,
    //   }
    // );
    const role1 = roles.role_1 ?? null;

    const lambdaRole = iam.Role.fromRoleArn(
      this,
      "ImportedLambdaRole",
      role1 != null ? `arn:aws:iam::${props.env.account}:${role1}` : `arn:aws:iam::${props.env.account}:role/${resourcePrefix}LambdaRole`,
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

    usersTable.addGlobalSecondaryIndex({
      indexName: 'EntityTypeIndex',
      partitionKey: { name: 'entityType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createDate', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
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
          congnitoUserPoolId: existingCognitoUserPoolId,
          congnitoUserPoolClientId: existingCognitoClientId,
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
          congnitoUserPoolClientId: existingCognitoClientId,
          REGION: this.region,
        },
      }
    );


    const getUsersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}getUsersLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getUsersLambda`,
        code: lambda.Code.asset("lambdas/userManagement/getUsers"),
        handler: "getUsersLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          userTable: `${resourcePrefix}${dbTables.UsersTable}`,
          roleTable: `${resourcePrefix}${dbTables.RoleTable}`,
          defaultLimit: '20',
          REGION: this.region,
        },
      }
    );

    const createRolesLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}createRolesLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}createRolesLambda`,
        code: lambda.Code.asset("lambdas/userManagement/createRoles"),
        handler: "createRolesLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          roleTable: `${resourcePrefix}${dbTables.RoleTable}`,
          REGION: this.region,
        },
      }
    );

    const updateRolesLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}updateRolesLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}updateRolesLambda`,
        code: lambda.Code.asset("lambdas/userManagement/updateRoles"),
        handler: "updateRolesLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          operationsTable: `${resourcePrefix}${dbTables.OperationsTable}`,
          roleTable: `${resourcePrefix}${dbTables.RoleTable}`,
          REGION: this.region,
        },
      }
    );

    const deleteRolesLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}deleteRolesLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}deleteRolesLambda`,
        code: lambda.Code.asset("lambdas/userManagement/deleteRoles"),
        handler: "deleteRolesLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          roleTable: `${resourcePrefix}${dbTables.RoleTable}`,
          REGION: this.region,
        },
      }
    );

    const getRolesLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}getRolesLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getRolesLambda`,
        code: lambda.Code.asset("lambdas/userManagement/getRoles"),
        handler: "getRolesLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          roleTable: `${resourcePrefix}${dbTables.RoleTable}`,
          operationsTable: `${resourcePrefix}${dbTables.OperationsTable}`,
          defaultLimit: '20',
          REGION: this.region,
        },
      }
    );


    const createOperationsLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}createOperationsLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}createOperationsLambda`,
        code: lambda.Code.asset("lambdas/userManagement/createOperations"),
        handler: "createOperationsLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          operationsTable: `${resourcePrefix}${dbTables.OperationsTable}`,
          REGION: this.region,
        },
      }
    );

    const updateOperationsLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}updateOperationsLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}updateOperationsLambda`,
        code: lambda.Code.asset("lambdas/userManagement/updateOperations"),
        handler: "updateOperationsLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          operationsTable: `${resourcePrefix}${dbTables.OperationsTable}`,
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
        "Authorizer"
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

    api.root
      .resourceForPath("usermanagement/user")
      .addMethod("GET", new apigw.LambdaIntegration(getUsersLambda));

    api.root
      .resourceForPath("usermanagement/role")
      .addMethod("POST", new apigw.LambdaIntegration(createRolesLambda));

    api.root
      .resourceForPath("usermanagement/role")
      .addMethod("PUT", new apigw.LambdaIntegration(updateRolesLambda));
    api.root
      .resourceForPath("usermanagement/role")
      .addMethod("GET", new apigw.LambdaIntegration(getRolesLambda));

    api.root
      .resourceForPath("usermanagement/role")
      .addMethod("DELETE", new apigw.LambdaIntegration(deleteRolesLambda));

    api.root
      .resourceForPath("usermanagement/operations")
      .addMethod("POST", new apigw.LambdaIntegration(createOperationsLambda));

    api.root
      .resourceForPath("usermanagement/operations")
      .addMethod("PUT", new apigw.LambdaIntegration(updateOperationsLambda));
  }
}

module.exports = { CenomiIntegrationUserManagementStack };
