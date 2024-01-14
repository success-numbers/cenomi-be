const cdk = require('aws-cdk-lib');
const ssm = require('aws-cdk-lib/aws-ssm');
const { Construct } = require('constructs');
const dynamodb = require("aws-cdk-lib/aws-dynamodb");

class CenomiIntegrationDynamoDbStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { resourcePrefix, dbTables } = props;
        const dataTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.InditexDataTable}`, {
            tableName: `${resourcePrefix}${dbTables.InditexDataTable}`,
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

        dataTable.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: {
                name: 'status',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK', 
                type: dynamodb.AttributeType.STRING,
            },
        });
        dataTable.addGlobalSecondaryIndex({
            indexName: 'statusTsfSeqNoIndex',
            partitionKey: {
                name: 'status',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'PK', 
                type: dynamodb.AttributeType.STRING,
            },
        });
        dataTable.addGlobalSecondaryIndex({
            indexName: 'TypeIndex',
            partitionKey: {
                name: 'entityType',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'timestamp', 
                type: dynamodb.AttributeType.STRING,
            },
        });
        dataTable.addGlobalSecondaryIndex({
            indexName: 'locationIndex',
            partitionKey: {
                name: 'destIdGSK1',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'timestamp', 
                type: dynamodb.AttributeType.STRING,
            },
        });
        // new cdk.CfnOutput(this, "CenomiDataTableExport", {
        //     exportName: "cenomi-data-table",
        //     value: dataTable.tableName,
        // });

        const configTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.ConfigTable}`, {
            tableName: `${resourcePrefix}${dbTables.ConfigTable}`,
            partitionKey: {
                name: "PK",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "SK",
                type: dynamodb.AttributeType.STRING,
            },
            stream: dynamodb.StreamViewType.NEW_IMAGE,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const chunkTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.ChunkTable}`, {
            tableName: `${resourcePrefix}${dbTables.ChunkTable}`,
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
        // new cdk.CfnOutput(this, "CenomiChunkTableExport", {
        //     exportName: "cenomi-chunk-table",
        //     value: chunkTable.tableName,
        // });
        const fileTransferLockTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.FileTransferLockTable}`, {
            tableName: `${resourcePrefix}${dbTables.FileTransferLockTable}`,
            partitionKey: {
                name: "PK",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "SK",
                type: dynamodb.AttributeType.STRING,
            },
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const fileTransferDataTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.FileTransferDataTable}`, {
            tableName: `${resourcePrefix}${dbTables.FileTransferDataTable}`,
            partitionKey: {
                name: "PK",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "SK",
                type: dynamodb.AttributeType.STRING,
            },
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        fileTransferDataTable.addGlobalSecondaryIndex({
            indexName: 'scannedIndex',
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'isScanned', 
                type: dynamodb.AttributeType.STRING,
            },
        });

        fileTransferDataTable.addGlobalSecondaryIndex({
            indexName: 'fileType-createdAt-index',
            partitionKey: {
                name: 'fileType',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'createdAt', 
                type: dynamodb.AttributeType.STRING,
            },
        });


        fileTransferDataTable.addGlobalSecondaryIndex({
            indexName: 'entityType-createdAt-index',
            partitionKey: {
                name: 'entityType',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'createdAt', 
                type: dynamodb.AttributeType.STRING,
            },
        });
        const fileTransferSyncTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.FileTransferSyncTable}`, {
            tableName: `${resourcePrefix}${dbTables.FileTransferSyncTable}`,
            partitionKey: {
                name: "PK",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "SK",
                type: dynamodb.AttributeType.STRING,
            },
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const syncDataTable = new dynamodb.Table(this, `${resourcePrefix}${dbTables.SyncDataTable}`, {
            tableName: `${resourcePrefix}${dbTables.SyncDataTable}`,
            partitionKey: {
                name: "PK",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "SK",
                type: dynamodb.AttributeType.STRING,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        
        syncDataTable.addGlobalSecondaryIndex({
            indexName: 'status-timestamp-index',
            partitionKey: {
                name: 'status',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK', 
                type: dynamodb.AttributeType.STRING,
            },
        });
        new ssm.StringParameter(this, `/${resourcePrefix}/ChunkTableStream`, {
            parameterName: `/${resourcePrefix}/ChunkTableStream`,
            stringValue: `${chunkTable.tableStreamArn}`
          })
        // new cdk.CfnOutput(this, "CenomiFileTransferDataTableExport", {
        //     exportName: "cenomi-file-transfer-data-table",
        //     value: fileTransferDataTable.tableName,
        // });
        // new ssm.StringParameter(this, `/${props.resourcePrefix}/DataTableName`, {
        //     parameterName: `/${props.resourcePrefix}/DataTableName`,
        //     stringValue: `${dataTable.tableName}`,
        // });

        // new ssm.StringParameter(this, `/${props.resourcePrefix}/ConfigTableName`, {
        //     parameterName: `/${props.resourcePrefix}/ConfigTableName`,
        //     stringValue: `${configTable.tableName}`,
        // });
    }
}

module.exports = { CenomiIntegrationDynamoDbStack };
