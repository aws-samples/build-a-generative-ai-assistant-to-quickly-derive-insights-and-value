/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigwAuthorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface AmplifyConfigLambdaConstructProps extends cdk.StackProps {
    /**
     * The Cognito UserPoolId to authenticate users in the front-end
     */
    readonly userPoolId: string;

    /**
     * The Cognito AppClientId to authenticate users in the front-end
     */
    readonly appClientId: string;

    /**
     * The ApiGatewayV2 HttpApi to attach the lambda
     */
    readonly api: apigw.HttpApi;

    /**
     * VPC to place the Amplify Config lambda in
     */
    readonly vpc: ec2.IVpc;

    /**
     * Security group for auth lambda
     */
    readonly lambdaSecurityGroup: ec2.SecurityGroup
}

const defaultProps: Partial<AmplifyConfigLambdaConstructProps> = {};

/**
 * Deploys a lambda to the api gateway under the path `/api/amplify-config`.
 * The route is unauthenticated.  Use this with `apigatewayv2-cloudfront` for a CORS free
 * amplify configuration setup
 */
export class AmplifyConfigLambdaConstruct extends Construct {
    constructor(parent: Construct, name: string, props: AmplifyConfigLambdaConstructProps) {
        super(parent, name);

        props = { ...defaultProps, ...props };

        // get the parent stack reference for the stackName and the aws region
        const stack = cdk.Stack.of(this);

        const cloudwatchLambdaPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["logs:PutLogEvents", "logs:CreateLogStream"],
                    resources: [`arn:aws:logs:${stack.region}:${stack.account}:*`],
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["logs:CreateLogGroup"],
                    resources: [`arn:aws:logs:${stack.region}:${stack.account}:log-group:*`],
                }),
            ],
        });

        const eniLambdaPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "ec2:CreateNetworkInterface",
                    ],
                    resources: [
                        `arn:aws:ec2:${stack.region}:${stack.account}:network-interface/*`,
                        `arn:aws:ec2:${stack.region}:${stack.account}:subnet/*`,
                        `arn:aws:ec2:${stack.region}:${stack.account}:security-group/*`,
                    ],
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "ec2:DeleteNetworkInterface",
                        "ec2:DescribeNetworkInterfaces",
                    ],
                    resources: [
                        '*',
                    ],
                }),
            ],
        });

        const authLambdaRole = new iam.Role(this, "Auth Lambda Role", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "Allows Authorizer Lambda to add cloudwatch logs",
            inlinePolicies: {
                cloudwatchLambdaPolicy: cloudwatchLambdaPolicy,
            },
        });

        const authorizerLambda = new cdk.aws_lambda.Function(this, "AuthorizerLambda", {
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_12,
            handler: "index.lambda_handler",
            code: cdk.aws_lambda.Code.fromInline(this.getAuthorizerLambdaCode()), // TODO: support both python and typescript versions
            timeout: cdk.Duration.seconds(15),
            role: authLambdaRole
        });
        authorizerLambda.grantInvoke(new cdk.aws_iam.ServicePrincipal("apigateway.amazonaws.com"));
        const authorizer = new apigwAuthorizers.HttpLambdaAuthorizer("authorizer", authorizerLambda, {
            authorizerName: "CognitoConfigAuthorizer",
            resultsCacheTtl: cdk.Duration.seconds(3600),
            identitySource: ["$context.routeKey"],
            responseTypes: [apigwAuthorizers.HttpLambdaResponseType.SIMPLE],
        });

        const amplifyConfigLambdaRole = new iam.Role(this, "Amplify Config Lambda Role", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "Allows Amplify Config Lambda to add cloudwatch logs",
            inlinePolicies: {
                cloudwatchLambdaPolicy: cloudwatchLambdaPolicy,
                eniLambdaPolicy: eniLambdaPolicy,
            },
        });

        const amplifyConfigLambda = new cdk.aws_lambda.Function(this, "AmplifyConfigLambda", {
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_12,
            handler: "index.lambda_handler",
            code: cdk.aws_lambda.Code.fromInline(this.getPythonLambdaFunction()), // TODO: support both python and typescript versions
            timeout: cdk.Duration.seconds(15),
            environment: {
                USER_POOL_ID: props.userPoolId,
                APP_CLIENT_ID: props.appClientId,
                // IDENTITY_POOL_ID: props.identityPoolId,
                REGION: stack.region,
            },
            vpc: props.vpc,
            securityGroups: [props.lambdaSecurityGroup],
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            retryAttempts: 0,
            role: amplifyConfigLambdaRole,
        });


        // add lambda policies
        amplifyConfigLambda.grantInvoke(new cdk.aws_iam.ServicePrincipal("apigateway.amazonaws.com"));

        // add lambda integration
        const lambdaFnIntegration = new apigwIntegrations.HttpLambdaIntegration(
            "apiInt",
            amplifyConfigLambda,
            {}
        );

        // add route to the api gateway
        props.api.addRoutes({
            path: "/api/amplify-config",
            methods: [apigw.HttpMethod.GET],
            integration: lambdaFnIntegration,
            authorizer: authorizer,
        });

    }

    private getAuthorizerLambdaCode(): string {
        return `
def lambda_handler(event, context): 
    return {
        "isAuthorized": True
    }
            `;
    }

    private getPythonLambdaFunction(): string {
        return `
import json
import os

def lambda_handler(event, context):
  region = os.getenv("REGION", None)
  user_pool_id = os.getenv("USER_POOL_ID", None)
  app_client_id = os.getenv("APP_CLIENT_ID", None)
  response = {
      "region": region,
      "userPoolId": user_pool_id,
      "appClientId": app_client_id
  }
  return {
      "statusCode": "200",
      "body": json.dumps(response),
      "headers": {
          "Content-Type": "application/json"
      },
  }
      `;
    }
}
