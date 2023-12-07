const cdk = require('aws-cdk-lib');
const ssm = require('aws-cdk-lib/aws-ssm');
const { Construct } = require('constructs');
const dynamodb = require("aws-cdk-lib/aws-dynamodb");

class CenomiIntegrationDynamoDbStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        const dataTable = new dynamodb.Table(this, `${props.resourcePrefix}-DataTable`, {
            tableName: `${props.resourcePrefix}-Data`,
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
            indexName: 'TypeIndex',
            partitionKey: {
                name: 'entityType',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'timestamp', 
                type: dynamodb.AttributeType.NUMBER,
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
                type: dynamodb.AttributeType.NUMBER,
            },
        });
        new cdk.CfnOutput(this, "CenomiDataTableExport", {
            exportName: "cenomi-data-table",
            value: dataTable.tableName,
        });

        const configTable = new dynamodb.Table(this, `${props.resourcePrefix}-Config`, {
            tableName: `${props.resourcePrefix}-Config`,
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

        const chunkTable = new dynamodb.Table(this, `${props.resourcePrefix}ChunkTable`, {
            tableName: `${props.resourcePrefix}ChunkTable`,
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
        new cdk.CfnOutput(this, "CenomiChunkTableExport", {
            exportName: "cenomi-chunk-table",
            value: chunkTable.tableName,
        });
        const fileTransferDataTable = new dynamodb.Table(this, `${props.resourcePrefix}FileTransferDataTable`, {
            tableName: `${props.resourcePrefix}FileTransferDataTable`,
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
        new cdk.CfnOutput(this, "CenomiFileTransferDataTableExport", {
            exportName: "cenomi-file-transfer-data-table",
            value: fileTransferDataTable.tableName,
        });
        new ssm.StringParameter(this, `/${props.resourcePrefix}/DataTableName`, {
            parameterName: `/${props.resourcePrefix}/DataTableName`,
            stringValue: `${dataTable.tableName}`,
        });

        new ssm.StringParameter(this, `/${props.resourcePrefix}/ConfigTableName`, {
            parameterName: `/${props.resourcePrefix}/ConfigTableName`,
            stringValue: `${configTable.tableName}`,
        });
    }
}

module.exports = { CenomiIntegrationDynamoDbStack };
