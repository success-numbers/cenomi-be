const cdk = require('aws-cdk-lib');
const { UserPool, UserPoolProps, AccountRecovery, StringAttribute } = require('aws-cdk-lib/aws-cognito');
const { Construct } = require('constructs');
const ssm = require('aws-cdk-lib/aws-ssm');
// const sqs = require('aws-cdk-lib/aws-sqs');

class CenomiIntegrationCognitoStack extends cdk.Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
    const customAttributes = {
      role: new StringAttribute({
        minLen: 1,
        maxLen: 50,
        mutable: true,
      }),
    };
    // Create Cognito User Pool
    const userPool = new UserPool(this, `${props.resourcePrefix}UserPool`, {
      userPoolName: `${props.resourcePrefix}UserPool`,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      accountRecovery: AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      signInAliases: { email: true, username: true },
      customAttributes,
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
      },
    });

    new cdk.CfnOutput(this, `${props.resourcePrefix}UserPoolId`, {
      exportName: `${props.resourcePrefix}UserPoolId`,
      value: userPool.userPoolId,
    });

    // Add an App Client to the User Pool with client secret generation disabled
    const appClient = userPool.addClient('CinomeAppClient', {
      generateSecret: false,
      authFlows: {
        adminUserPassword: true, // Enable ADMIN_USER_PASSWORD_AUTH flow
        userSrp: true, // Include other required flows
      },
    });

    new cdk.CfnOutput(this, 'CinomeAppClientID', {
      value: appClient.userPoolClientId,
      description: 'Admin App Client ID',
    });

    new ssm.StringParameter(this, `/${props.resourcePrefix}/UserPoolId`, {
      parameterName: `/${props.resourcePrefix}/UserPoolId`,
      stringValue: `${userPool.userPoolId}`,
    });

    new ssm.StringParameter(this, `/${props.resourcePrefix}/ClientId`, {
      parameterName: `/${props.resourcePrefix}/ClientId`,
      stringValue: `${appClient.userPoolClientId}`,
    });
  }
}

module.exports = { CenomiIntegrationCognitoStack }
