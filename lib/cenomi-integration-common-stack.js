const { Stack, Duration, CfnOutput } = require('aws-cdk-lib');
const AWS = require('aws-sdk');
const lambda = require('aws-cdk-lib/aws-lambda');
const apigw = require('aws-cdk-lib/aws-apigateway');
const iam = require('aws-cdk-lib/aws-iam');
const cdk = require('aws-cdk-lib');
const ssm = require('aws-cdk-lib/aws-ssm');
const { Construct } =require('constructs');
const cognito = new AWS.CognitoIdentityServiceProvider({
  apiVersion: "2016-04-18",
});

class CenomiIntegrationCommonStack extends cdk.Stack {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
  

const { attributes, resourcePrefix, allowCrossOrigins = [], roles } = props;

if(roles.role_1 == null){
  const customLambdaRole = new iam.Role(this, `${props.resourcePrefix}LambdaRole`, {
    assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    roleName: `${props.resourcePrefix}LambdaRole`,
  });

  customLambdaRole.addManagedPolicy(
    iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
  );
  customLambdaRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ["cognito-idp:*"], 
      resources: ["*"], 
    })
  );
  
  customLambdaRole.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"],
    })
  );
  
  customLambdaRole.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:*"],
      resources: ["*"],
    })
  );
  
  customLambdaRole.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["ssm:GetParameter"],
      resources: [
        "*",
      ],
    })
  );
  
  customLambdaRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ["sns:Publish"],
      resources: ["*"],
    })
  );
  
  customLambdaRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ["sqs:*"],
      resources: ["*"],
    })
  );
  
  customLambdaRole.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["ssm:GetParameter"],
      resources: ["*"],
    })
  );
  
}


const masterApiExportId =
resourcePrefix + attributes.masterApiGateway.exportApiId;
const masterApiGatewayName =
resourcePrefix + attributes.masterApiGateway.masterGatewayName;
const masterApiResourceId =
resourcePrefix + attributes.masterApiGateway.exportResourceId;
const masterApiStageName = attributes.masterApiGateway.stageName;



//////////////////////////////////////////// API GATEWAY ////////////////////////////////////////////////////////////

    this.api = new apigw.RestApi(this, masterApiGatewayName, {
      binaryMediaTypes:["application/pdf"],
      deployOptions: {
        stageName: masterApiStageName,
      },
      description: `Cenomi API gateway`,
      defaultCorsPreflightOptions: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "Authorizer"
        ],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: allowCrossOrigins,
      },
    });

    new cdk.CfnOutput(this, "HTTP API Gateway Export", {
      exportName: masterApiExportId,
      value: this.api.restApiId,
    });
    new cdk.CfnOutput(this, `${resourcePrefix}api-export`, {
      exportName: masterApiResourceId,
      value: this.api.root.resourceId,
    });
  }
}

module.exports = { CenomiIntegrationCommonStack };
