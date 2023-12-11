const cdk = require("aws-cdk-lib");
const { Stack, StackProps } = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
const ssm = require("aws-cdk-lib/aws-ssm");
const apigw = require("aws-cdk-lib/aws-apigateway");
const sqs = require("aws-cdk-lib/aws-sqs");
// const lambdaEventSources = require('@aws-cdk/aws-lambda-event-sources');

class CenomiIntegrationBusinessStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { resourcePrefix, dbTables, attributes } = props;
    const masterApiGatewayName =
      resourcePrefix + attributes.masterApiGateway.masterGatewayName;
    const masterApiResourceId =
      resourcePrefix + attributes.masterApiGateway.exportResourceId;
    const masterApiExportId =
      resourcePrefix + attributes.masterApiGateway.exportApiId;

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
    const chunkTableDlq = new sqs.Queue(this, "ChunkTableDlq", {
      queueName: "ChunkTableDlq",
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(14),
    });
    const putFileTransfersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}putFileTransfersLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}putFileTransfersLambda`,
        code: lambda.Code.asset("fileTransfers/putFileTransfers"),
        handler: "putFileTransfersLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          REGION: this.region,
        },
      }
    );
    const getFileTransfersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}getFileTransfersLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getFileTransfersLambda`,
        code: lambda.Code.asset("fileTransfers/getFileTransfers"),
        handler: "getFileTransfersLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          REGION: this.region,
        },
      }
    );
    const getTransfersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}getAllTransferLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getAllTransferLambda`,
        code: lambda.Code.asset("transfers/getAllTransfers"),
        handler: "getTransfersLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );
    const syncDatabricksLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}syncDatabricksLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}syncDatabricksLambda`,
        code: lambda.Code.asset("sync/syncDatabricks"),
        handler: "syncDatabricksLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
        timeout: cdk.Duration.seconds(10),
      }
    );
    const syncDatabricksTriggerLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}syncDatabricksTriggerLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}syncDatabricksTriggerLambda`,
        code: lambda.Code.asset("sync/syncDatabricksTrigger"),
        handler: "syncDatabricksTriggerLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.ChunkTable}`,

          REGION: this.region,
          DLQ_ARN: chunkTableDlq.queueArn,
        },
        timeout: cdk.Duration.seconds(10),
      }
    );
    const syncDatabricksProcessingLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}syncDatabricksProcessingLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}syncDatabricksProcessingLambda`,
        code: lambda.Code.asset("sync/syncDatabricksProcessing"),
        handler: "syncDatabricksProcessingLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.ChunkTable}`,

          REGION: this.region,
          DLQ_ARN: chunkTableDlq.queueArn,
        },
        timeout: cdk.Duration.seconds(10),
      }
    );
    const getTransfersByIdLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}getTransfersByIdLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getTransfersByIdLambda`,
        code: lambda.Code.asset("transfers/getTransfersById"),
        handler: "getTransfersByIdLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );
    const getAllLocationLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}getAllLocationLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getAllLocationLambda`,
        code: lambda.Code.asset("transfers/getAllLocation"),
        handler: "getAllLocationLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );
    const searchTransfersByDestLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}SearchTransfersByIdAndDestLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}SearchTransfersByIdAndDestLambda`,
        code: lambda.Code.asset("transfers/searchTransfersByDest"),
        handler: "searchTransfersByIdAndDestLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );
    const pickTransferLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}pickTransferLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}pickTransferLambda`,
        code: lambda.Code.asset("transfers/pickTransfer"),
        handler: "pickTransferLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );
    const getRepickTransferLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}getRepickTransferLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getRepickTransferLambda`,
        code: lambda.Code.asset("transfers/getRepickTransfer"),
        handler: "getRepickTransferLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );
    const submitTransferLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}submitTransferLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}submitTransferLambda`,
        code: lambda.Code.asset("transfers/submitTransfer"),
        handler: "submitTransferLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );
    const updateTransferStatusLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}updateTransferStatusLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}updateTransferStatusLambda`,
        code: lambda.Code.asset("transfers/updateTransferStatus"),
        handler: "updateTransferStatusLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

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
      .resourceForPath("transfer/getAllTransfersByDestId")
      .addMethod("GET", new apigw.LambdaIntegration(getTransfersLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });
    api.root
      .resourceForPath("transfer/getItemsById")
      .addMethod("GET", new apigw.LambdaIntegration(getTransfersByIdLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });
    api.root
      .resourceForPath("transfer/getAllDest")
      .addMethod("GET", new apigw.LambdaIntegration(getAllLocationLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });
    api.root
      .resourceForPath("transfer/search")
      .addMethod(
        "GET",
        new apigw.LambdaIntegration(searchTransfersByDestLambda),
        {
          // authorizationType: apigw.AuthorizationType.COGNITO,
          // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
        }
      );
    api.root
      .resourceForPath("transfer/getRepick")
      .addMethod("GET", new apigw.LambdaIntegration(getRepickTransferLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });
    api.root
      .resourceForPath("transfer/pick")
      .addMethod("POST", new apigw.LambdaIntegration(pickTransferLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });
    api.root
      .resourceForPath("transfer/submit")
      .addMethod("POST", new apigw.LambdaIntegration(submitTransferLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });
    api.root
      .resourceForPath("transfer/updateStatus")
      .addMethod(
        "POST",
        new apigw.LambdaIntegration(updateTransferStatusLambda),
        {
          // authorizationType: apigw.AuthorizationType.COGNITO,
          // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
        }
      );
    api.root
      .resourceForPath("fileTransfers")
      .addMethod("POST", new apigw.LambdaIntegration(putFileTransfersLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });
      api.root
      .resourceForPath("fileTransfers")
      .addMethod("GET", new apigw.LambdaIntegration(getFileTransfersLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });
        

    // syncDatabricksTriggerLambda.addEventSource(new lambdaEventSources.DynamoEventSource(chunkTable, {
    //     startingPosition: lambda.StartingPosition.LATEST,
    //     batchSize: 1, // Adjust the batch size as per your requirement
    //     bisectBatchOnError: true,
    //     retryAttempts: 10,
    //     onFailure: new lambdaEventSources.SqsDlq(new sqs.Queue(this, 'ChunkTableDlq')),
    // }));
    // syncDatabricksProcessingLambda.addEventSource(new lambdaEventSources.SqsEventSource(chunkTableDlq, {
    //     batchSize: 10, // Set the batch size here
    // }));
  }
}

module.exports = { CenomiIntegrationBusinessStack };
