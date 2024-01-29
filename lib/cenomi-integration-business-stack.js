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

    const auth = new apigw.CognitoUserPoolsAuthorizer(this, resourcePrefix + 'bearer-token-authorizer', {
      cognitoUserPools: [cognito.UserPool.fromUserPoolId(this, resourcePrefix + 'UserPoolId', 'ap-south-1_HL3QxPlEs')],
      identitySource: 'method.request.header.Authorizer'
    });
    resourcePrefix + attributes.masterApiGateway.masterGatewayName;


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

    const syncChunkDLQ = new sqs.Queue(
      this,
      `${resourcePrefix}syncChunk-SQS-DLQ`,
      {
        queueName: `${resourcePrefix}syncChunk-SQS-DLQ`,
        visibilityTimeout: cdk.Duration.seconds(300),
      }
    );

    const syncChunkSQS = new sqs.Queue(
      this,
      `${resourcePrefix}syncChunkSQS`,
      {
        queueName: `${resourcePrefix}syncChunkSQS`,
        visibilityTimeout: cdk.Duration.minutes(45),
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: syncChunkDLQ,
        },
      }
    );

    const syncSubmitDataToDatabricksDLQ = new sqs.Queue(
      this,
      `${resourcePrefix}SyncSubmitDataToDatabricksDLQ`,
      {
        queueName: `${resourcePrefix}SyncSubmitDataToDatabricksDLQ`,
        visibilityTimeout: cdk.Duration.minutes(45),
      }
    );

    const syncSubmitDataToDatabricksSQS = new sqs.Queue(
      this,
      `${resourcePrefix}SyncSubmitDataToDatabricksSQS`,
      {
        queueName: `${resourcePrefix}SyncSubmitDataToDatabricksSQS`,
        visibilityTimeout: cdk.Duration.minutes(45),
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: syncSubmitDataToDatabricksDLQ,
        },
      }
    );

    const putFileTransfersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}putFileTransfersLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}putFileTransfersLambda`,
        code: lambda.Code.asset("lambdas/fileTransfers/putFileTransfers"),
        handler: "putFileTransfersLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          REGION: this.region,
        },
      }
    );
    const pickFileTransfersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}pickFileTransfersLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}pickFileTransfersLambda`,
        code: lambda.Code.asset("lambdas/fileTransfers/pickFileTransfers"),
        handler: "pickFileTransfersLambda.handler", // Make sure this path and function name are correct
        environment: {
          lockTable: `${resourcePrefix}${dbTables.FileTransferLockTable}`,
          dataTable: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          inditexTable: `${resourcePrefix}${dbTables.InditexDataTable}`,
          REGION: this.region,
        },
      }
    );
    const updateFileTransfersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}updateFileTransfersLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}updateFileTransfersLambda`,
        code: lambda.Code.asset("lambdas/fileTransfers/updateTsf"),
        handler: "updateTsfLambda.handler", // Make sure this path and function name are correct
        environment: {
          dataTable: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          syncTable: `${resourcePrefix}${dbTables.FileTransferSyncTable}`,
          REGION: this.region,
        },
      }
    );
    const submitFileTransfersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}submitFileTransfersLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}submitFileTransfersLambda`,
        code: lambda.Code.asset("lambdas/fileTransfers/submitFileTransfers"),
        handler: "submitFileTransfersLambda.handler",
        environment: {
          dataTable: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          lockTable: `${resourcePrefix}${dbTables.FileTransferLockTable}`,
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
        code: lambda.Code.asset("lambdas/fileTransfers/getFileTransfers"),
        handler: "getFileTransfersLambda.handler",
        environment: {
          tableName: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          REGION: this.region,
        },
      }
    );
    const getSyncedFileTransfersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}getSyncedFileTransfersLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getSyncedFileTransfersLambda`,
        code: lambda.Code.asset("lambdas/fileTransfers/getSyncedTransfers"),
        handler: "getSyncedTransfersLambda.handler",
        environment: {
          dataTable: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          syncTable: `${resourcePrefix}${dbTables.FileTransferSyncTable}`,
          REGION: this.region,
        },
      }
    );
    const syncFileTransfersLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}syncFileTransfersLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}syncFileTransfersLambda`,
        code: lambda.Code.asset("lambdas/fileTransfers/syncFileTransfers"),
        handler: "syncFileTransfersLambda.handler",
        environment: {
          dataTable: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          syncTable: `${resourcePrefix}${dbTables.FileTransferSyncTable}`,
          REGION: this.region,
        },
      }
    );
    const getFileTransfersDetailLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}GetFileTransfersDetailLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}GetFileTransfersDetailLambda`,
        code: lambda.Code.asset("lambdas/fileTransfers/getTransferDetails"),
        handler: "getTransferDetails.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          FILE_TRN_TABLE: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
          REGION: this.region,
        },
      }
    );

    const getFileTransfersHeaderByIdLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}GetFileTransfersHeaderByIdLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}GetFileTransfersHeaderByIdLambda`,
        code: lambda.Code.asset("lambdas/fileTransfers/getFileTransferById"),
        handler: "getFileTransferById.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          FILE_TRN_TABLE: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
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
        code: lambda.Code.asset("lambdas/transfers/getAllTransfers"),
        handler: "getTransfersLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );
    const syncStatusCheckAndChunkLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}syncStatusCheckAndChunkLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}syncStatusCheckAndChunkLambda`,
        code: lambda.Code.asset("lambdas/sync/syncStatusCheckAndChunkification"),
        handler: "syncStatusCheckAndChunkification.handler",
        environment: {
          syncTableName: `${resourcePrefix}${dbTables.SyncDataTable}`,
          chunkTableName: `${resourcePrefix}${dbTables.ChunkTable}`,
          REGION: this.region,
        },
        timeout: cdk.Duration.minutes(15),
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
        code: lambda.Code.asset("lambdas/sync/triggerSyncDatabricks"),
        handler: "triggerSyncDatabricks.handler",
        timeout: cdk.Duration.seconds(300),

        environment: {
          syncTableName: `${resourcePrefix}${dbTables.SyncDataTable}`,
          chunkTableName: `${resourcePrefix}${dbTables.ChunkTable}`,
          REGION: this.region
        },
        timeout: cdk.Duration.minutes(15),
      }
    );

    const getAllInditexTransferLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}getAllInditexTransfer`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getAllInditexTransfer`,
        code: lambda.Code.asset("lambdas/transfers/getAllInditexTransfer"),
        handler: "getAllInditexTransfer.handler", // Make sure this path and function name are correct
        environment: {
          indexTable: `${resourcePrefix}${dbTables.InditexDataTable}`,
          REGION: this.region,
        },
      }
    );

    const updateInditexTsfLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}updateInditexTsf`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}updateInditexTsf`,
        code: lambda.Code.asset("lambdas/transfers/updateInditexTsf"),
        handler: "updateInditexTsf.handler", // Make sure this path and function name are correct
        environment: {
          indexTable: `${resourcePrefix}${dbTables.InditexDataTable}`,
          REGION: this.region,
        },
      }
    );

    const syncSubmitDatabricksInditexTsfLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}syncSubmitDatabricksInditexTsfLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}syncSubmitDatabricksInditexTsfLambda`,
        code: lambda.Code.asset("lambdas/transfers/syncSubmitDataToDatabricks/syncSubmitValidation"),
        handler: "syncSubmitDataToDatabricks.handler",
        environment: {
          InditexDataTable: `${resourcePrefix}${dbTables.InditexDataTable}`,
          REGION: this.region,
          SYNC_SQS: syncSubmitDataToDatabricksSQS.queueUrl
        },
      }
    );

    const syncSubmitDatabricksInditexTsfLProcessingambda = new lambda.Function(
      this,
      `${props.resourcePrefix}SubmitDatabricksInditexTsfProcessing`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}SubmitDatabricksInditexTsfProcessing`,
        code: lambda.Code.asset("lambdas/transfers/syncSubmitDataToDatabricks/syncSubmitProcessing"),
        handler: "syncSubmitProcessing.handler",
        environment: {
          InditexDataTable: `${resourcePrefix}${dbTables.InditexDataTable}`,
          REGION: this.region,
          BLOB_CONNECTION_STRING: `${attributes.databricks.azureStorage.connectionString}`,
          BLOB_CONTAINER: `${attributes.databricks.azureStorage.container}`,
          BLOB_PATH: `${attributes.databricks.azureStorage.blobPath}`
        },
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
        code: lambda.Code.asset("lambdas/transfers/getTransfersById"),
        handler: "getTransfersByIdLambda.handler",
        timeout: cdk.Duration.seconds(300),

        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );

    const chunkDBDeltaPutChangeLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}chunkDBDeltaPutChangeLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}chunkDBDeltaPutChangeLambda`,
        code: lambda.Code.asset("lambdas/sync/chunkDeltaPutChangeTrigger"),
        handler: "chunkDeltaPutChangeTrigger.handler",
        timeout: cdk.Duration.minutes(15),
        environment: {
          syncChunkSQS: `${syncChunkSQS.queueUrl}`,
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,
          REGION: this.region,
        },
      }
    );

    const syncDtabricksToDynamoProcessLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}syncDtabricksToDynamoProcessLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}syncDtabricksToDynamoProcessLambda`,
        code: lambda.Code.asset("lambdas/sync/syncDatabricksToDyanamoProcess"),
        handler: "syncDatabricksToDyanamoProcess.handler",
        timeout: cdk.Duration.minutes(15),
        memorySize: 10240,
        environment: {
          syncChunkSQS: `${syncChunkSQS.queueUrl}`,
          inditexDataTable: `${resourcePrefix}${dbTables.InditexDataTable}`,
          syncDataTable: `${resourcePrefix}${dbTables.SyncDataTable}`,
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
        code: lambda.Code.asset("lambdas/transfers/getAllLocation"),
        handler: "getAllLocationLambda.handler",
        timeout: cdk.Duration.seconds(300),

        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,
          configTable: `${resourcePrefix}${dbTables.ConfigTable}`,
          REGION: this.region,
        },
      }
    );

    const getLovLamda = new lambda.Function(
      this,
      `${props.resourcePrefix}getLovLamda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}getLovLamda`,
        code: lambda.Code.asset("lambdas/fileTransfers/getLov"),
        handler: "getLov.handler",
        timeout: cdk.Duration.seconds(300),

        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,
          configTable: `${resourcePrefix}${dbTables.ConfigTable}`,
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
        code: lambda.Code.asset("lambdas/transfers/searchTransfersByDest"),
        handler: "searchTransfersByIdAndDestLambda.handler",
        timeout: cdk.Duration.seconds(300),

        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );

    const transfersDashboardLambda = new lambda.Function(
      this,
      `${props.resourcePrefix}TransfersDashboardLambda`,
      {
        runtime: props.runtime,
        layers: allLayersList,
        role: lambdaRole,
        functionName: `${props.resourcePrefix}TransfersDashboardLambda`,
        code: lambda.Code.asset("lambdas/transfers/dashboardStats"),
        handler: "dashboardStats.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          INDITEX_DATA_TABLE: `${resourcePrefix}${dbTables.InditexDataTable}`,
          FILE_TRN_TABLE: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
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
        code: lambda.Code.asset("lambdas/transfers/pickTransfer"),
        handler: "pickTransferLambda.handler",
        timeout: cdk.Duration.seconds(300),

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
        code: lambda.Code.asset("lambdas/transfers/getRepickTransfer"),
        handler: "getRepickTransferLambda.handler",
        timeout: cdk.Duration.seconds(300),

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
        code: lambda.Code.asset("lambdas/transfers/submitTransfer"),
        handler: "submitTransferLambda.handler",
        timeout: cdk.Duration.seconds(300),

        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,
          lockTable: `${resourcePrefix}${dbTables.FileTransferLockTable}`,
          SYNC_SQS: syncSubmitDataToDatabricksSQS.queueUrl,
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
        code: lambda.Code.asset("lambdas/transfers/updateTransferStatus"),
        handler: "updateTransferStatusLambda.handler",
        timeout: cdk.Duration.seconds(300),
        environment: {
          tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,

          REGION: this.region,
        },
      }
    );

    const chunkDBStreamArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        `/${resourcePrefix}/ChunkTableStream`,
        `/${resourcePrefix}/ChunkTableStream`
      ).stringValue;

    chunkDBDeltaPutChangeLambda.addEventSource(
      new eventSource.DynamoEventSource(
        dynamodb.Table.fromTableAttributes(
          this,
          `${resourcePrefix}Chunk-Stream-Sync`,
          {
            tableName: `${resourcePrefix}Chunk-Stream-Sync`,
            tableStreamArn: chunkDBStreamArn,
          }
        ),
        {
          startingPosition: lambda.StartingPosition.LATEST,
          batchSize: 1,
          retryAttempts: 3,
        }
      )
    );

    syncDtabricksToDynamoProcessLambda.addEventSource(new cdk.aws_lambda_event_sources.SqsEventSource(syncChunkSQS, {
      batchSize: 10,
      enabled: true
    }));


    syncSubmitDatabricksInditexTsfLProcessingambda.addEventSource(new cdk.aws_lambda_event_sources.SqsEventSource(syncSubmitDataToDatabricksSQS, {
      batchSize: 1,
      enabled: true
    }));
    const chunkStatusUpdate = new events.Rule(
      this,
      `${resourcePrefix}-Chunk-Status-Update`,
      {
        ruleName: `${resourcePrefix}-Chunk-Status-Update`,
        schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      }
    );

    chunkStatusUpdate.addTarget(
      new eventTarget.LambdaFunction(syncStatusCheckAndChunkLambda)
    );

    const triggerInditexDatabricksToDyanamoSync = new events.Rule(
      this,
      `${resourcePrefix}-Trigger-Inditex-Databricks-Sync`,
      {
        ruleName: `${resourcePrefix}-Trigger-Inditex-Databricks-Sync`,
        schedule: events.Schedule.rate(cdk.Duration.days(1)),
        enabled: false
      }
    );

    triggerInditexDatabricksToDyanamoSync.addTarget(
      new eventTarget.LambdaFunction(syncDatabricksTriggerLambda)
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
      .resourceForPath("transfer/getAllTransfersByDestId")
      .addMethod("GET", new apigw.LambdaIntegration(getTransfersLambda), {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });
    api.root
      .resourceForPath("transfer/getItemsById")
      .addMethod("GET", new apigw.LambdaIntegration(getTransfersByIdLambda), {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });
    api.root
      .resourceForPath("transfer/getAllDest")
      .addMethod("GET", new apigw.LambdaIntegration(getAllLocationLambda), {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });
    api.root
      .resourceForPath("transfer/search")
      .addMethod(
        "GET",
        new apigw.LambdaIntegration(searchTransfersByDestLambda),
        {
          authorizer: auth,
          authorizationType: apigw.AuthorizationType.COGNITO,
        }
      );
    api.root
      .resourceForPath("transfer/getRepick")
      .addMethod("GET", new apigw.LambdaIntegration(getRepickTransferLambda), {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });
    api.root
      .resourceForPath("fileTransfers/dashboard")
      .addMethod("POST", new apigw.LambdaIntegration(transfersDashboardLambda));

    api.root
      .resourceForPath("transfer/pick")
      .addMethod("POST", new apigw.LambdaIntegration(pickTransferLambda), {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });
    api.root
      .resourceForPath("transfer/submit")
      .addMethod("POST", new apigw.LambdaIntegration(submitTransferLambda), {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });
    api.root
      .resourceForPath("transfer/initPick")
      .addMethod("POST", new apigw.LambdaIntegration(pickFileTransfersLambda));
    api.root
      .resourceForPath("/transfer/getAllInditexTsf")
      .addMethod("GET", new apigw.LambdaIntegration(getAllInditexTransferLambda));
    api.root
      .resourceForPath("/transfer/updateInditexTsf")
      .addMethod("POST", new apigw.LambdaIntegration(updateInditexTsfLambda));
    api.root
      .resourceForPath("/transfer/syncSubmitData")
      .addMethod("POST", new apigw.LambdaIntegration(syncSubmitDatabricksInditexTsfLambda), {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      });
    api.root
      .resourceForPath("transfer/inditex/initdatabricksSync")
      .addMethod("POST", new apigw.LambdaIntegration(syncDatabricksTriggerLambda), {
        // authorizer: auth,
        // authorizationType: apigw.AuthorizationType.COGNITO,
      });

    api.root
      .resourceForPath("transfer/updateStatus")
      .addMethod(
        "POST",
        new apigw.LambdaIntegration(updateTransferStatusLambda),
        {
          authorizer: auth,
          authorizationType: apigw.AuthorizationType.COGNITO,
        }
      );
    api.root
      .resourceForPath("fileTransfers")
      .addMethod("POST", new apigw.LambdaIntegration(putFileTransfersLambda));
    api.root
      .resourceForPath("fileTransfers")
      .addMethod("GET", new apigw.LambdaIntegration(getFileTransfersLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });

    api.root
      .resourceForPath("fileTransfers/{fileName}")
      .addMethod("GET", new apigw.LambdaIntegration(getFileTransfersDetailLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });


    api.root
      .resourceForPath("fileTransfers/search")
      .addMethod("GET", new apigw.LambdaIntegration(getFileTransfersHeaderByIdLambda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });

    api.root
      .resourceForPath("fileTransfers/lov")
      .addMethod("GET", new apigw.LambdaIntegration(getLovLamda), {
        // authorizationType: apigw.AuthorizationType.COGNITO,
        // authorizer: {authorizerId: props.authorizer.attrAuthorizerId},
      });
    api.root
      .resourceForPath("fileTransfers/syncBox")
      .addMethod("POST", new apigw.LambdaIntegration(syncFileTransfersLambda));
    api.root
      .resourceForPath("fileTransfers/submitTransfers")
      .addMethod("POST", new apigw.LambdaIntegration(submitFileTransfersLambda));
    api.root
      .resourceForPath("fileTransfers/updateTsf")
      .addMethod("POST", new apigw.LambdaIntegration(updateFileTransfersLambda));

    api.root
      .resourceForPath("fileTransfers/getSyncedTsf")
      .addMethod("GET", new apigw.LambdaIntegration(getSyncedFileTransfersLambda), {
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
