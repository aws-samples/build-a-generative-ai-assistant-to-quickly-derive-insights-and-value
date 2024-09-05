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

import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy } from "aws-cdk-lib";

import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";

import * as triggers from "aws-cdk-lib/triggers";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";

import { configDotenv } from "dotenv";

import { Construct } from "constructs";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";
import { ApiGatewayV2LambdaConstruct } from "./constructs/apigatewayv2-lambda-construct";
import { SsmParameterReaderConstruct } from "./constructs/ssm-parameter-reader-construct";
import { AmplifyConfigLambdaConstruct } from "./constructs/amplify-config-lambda-construct";
import { CloudFrontS3WebSiteConstruct } from "./constructs/cloudfront-s3-website-construct";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";

export interface AppStackProps extends cdk.StackProps {
    readonly vpc: ec2.IVpc;
    readonly ssmWafArnParameterName: string;
    readonly ssmWafArnParameterRegion: string;
    readonly prefix: string;
}

const defaultProps: Partial<AppStackProps> = {};

export class AppStack extends cdk.Stack {
    /**
     * Name of the site bucket
     */
    public siteBucketName: string;
    /**
     * Arn of the site bucket
     */
    public siteBucketARN: string;

    constructor(scope: Construct, id: string, props: AppStackProps) {
        super(scope, id, props);

        configDotenv();

        const bedrock_region = process.env.BEDROCK_REGION || this.region;
        const bedrock_endpoint = `bedrock-runtime.${bedrock_region}.amazonaws.com`

        /* eslint-disable @typescript-eslint/no-unused-vars */
        props = { ...defaultProps, ...props };


        // S3 buckts to store logs, data, OS snapshots
        const logBucket = new s3.Bucket(this, "S3LogBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });

        const dataBucket = new s3.Bucket(this, "data_bucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            serverAccessLogsBucket: logBucket,
            serverAccessLogsPrefix: 'data-bucket-logs/',
        });

        const snapshotBucket = new s3.Bucket(this, "SnapshotBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            serverAccessLogsBucket: logBucket,
            serverAccessLogsPrefix: 'snapshot-bucket-logs/',
        });



        // Frontend constructs with S3 hosting + WAF + API GW + Cognito
        const webAppBuildPath = "../web-app/out";

        const cognito = new CognitoWebNativeConstruct(this, "Cognito", props);

        const cfWafWebAcl = new SsmParameterReaderConstruct(this, "SsmWafParameter", {
            ssmParameterName: props.ssmWafArnParameterName,
            ssmParameterRegion: props.ssmWafArnParameterRegion,
        }).getValue();

        const website = new CloudFrontS3WebSiteConstruct(this, "WebApp", {
            webSiteBuildPath: webAppBuildPath,
            webAclArn: cfWafWebAcl,
        });

        this.siteBucketName = website.siteBucket.bucketName;
        this.siteBucketName = website.siteBucket.bucketArn;

        // Lambda and OS security groups to enable communication between function and cluster
        const opensearchSecurityGroup = new ec2.SecurityGroup(this, "OpenSearchSecurityGroup", {
            vpc: props.vpc,
        });

        const lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSecurityGroup", {
            vpc: props.vpc,
        });

        opensearchSecurityGroup.addIngressRule(
            lambdaSecurityGroup,
            ec2.Port.allTraffic(),
            "Allow all traffic from Lambdas",
        );


        const api = new ApiGatewayV2CloudFrontConstruct(this, "Api", {
            cloudFrontDistribution: website.cloudFrontDistribution,
            userPool: cognito.userPool,
            userPoolClient: cognito.webClientUserPool,
        });

        new AmplifyConfigLambdaConstruct(this, "AmplifyConfigFn", {
            api: api.apiGatewayV2,
            appClientId: cognito.webClientId,
            userPoolId: cognito.userPoolId,
            vpc: props.vpc,
            lambdaSecurityGroup: lambdaSecurityGroup,
        });


        // Create OpenSearch Domain
        const esDomain = new opensearch.Domain(this, "OpenSearchDomain", {
            vpc: props.vpc,
            version: opensearch.EngineVersion.OPENSEARCH_2_11,
            nodeToNodeEncryption: true,
            tlsSecurityPolicy: opensearch.TLSSecurityPolicy.TLS_1_2,
            zoneAwareness: {
                enabled: true,
            },
            encryptionAtRest: {
                enabled: true,
            },
            capacity: {
                masterNodes: 3,
                dataNodes: 2,
            },
            securityGroups: [opensearchSecurityGroup],
            enforceHttps: true,
            removalPolicy: RemovalPolicy.DESTROY,
            logging: {
                slowSearchLogEnabled: true,
                appLogEnabled: true,
                slowIndexLogEnabled: true,
            },
        });



        // Lambda layes for langchain and powertools
        const utilsLayer = new lambda.LayerVersion(this, "UtilsLayer", {
            code: lambda.Code.fromAsset("../layers/utils_layer/python.zip"),
            compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
        });

        const awsPowerToolsLayer = lambda.LayerVersion.fromLayerVersionArn(
            this,
            "AWSLambdaPowertoolsLayer",
            `arn:aws:lambda:${this.region}:017000801446:layer:AWSLambdaPowertoolsPythonV2-Arm64:42`,
        );



        // IAM Policies
        const cloudwatchXRayLambdaPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["logs:PutLogEvents", "logs:CreateLogStream"],
                    resources: [`arn:aws:logs:${this.region}:${this.account}:*`],
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["logs:CreateLogGroup"],
                    resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:*`],
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "xray:PutTelemetryRecords",
                        "xray:PutTraceSegments"
                    ],
                    resources: ["*"],
                })
            ],
        });

        const bedrockLLMLambdaPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["bedrock:InvokeModel"],
                    resources: [`arn:aws:bedrock:${bedrock_region}::foundation-model/${process.env.BEDROCK_TEXT_MODEL_ID!}`],
                }),
            ],
        });

        const bedrockEmbeddingLambdaPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["bedrock:InvokeModel"],
                    resources: [`arn:aws:bedrock:${bedrock_region}::foundation-model/${process.env.BEDROCK_EMBEDDING_MODEL_ID!}`],
                }),
            ],
        });

        const s3SnapshotLambdaPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "s3:GetObject",
                        "s3:ListBucket",
                        "s3:DeleteObject",
                        "s3:PutObject"
                    ],
                    resources: [
                        snapshotBucket.bucketArn,
                        `${snapshotBucket.bucketArn}/*`,
                    ],
                }),
            ],
        });

        const s3DataLambdaPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "s3:GetObject",
                        "s3:ListBucket",
                        "s3:DeleteObject",
                    ],
                    resources: [
                        dataBucket.bucketArn,
                        `${dataBucket.bucketArn}/*`,
                    ],
                }),
            ],
        });

        const osLambdaPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "es:ESHttpGet",
                        "es:ESHttpPut",
                        "es:ESHttpPost",
                        "es:ESHttpDelete",
                    ],
                    resources: [
                        esDomain.domainArn,
                        `${esDomain.domainArn}/*`
                    ],
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
                        `arn:aws:ec2:${this.region}:${this.account}:network-interface/*`,
                        `arn:aws:ec2:${this.region}:${this.account}:subnet/*`,
                        `arn:aws:ec2:${this.region}:${this.account}:security-group/*`,
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



        // Default lambda settings
        const lambdaDefaults = {
            runtime: lambda.Runtime.PYTHON_3_11,
            layers: [awsPowerToolsLayer, utilsLayer],
            architecture: lambda.Architecture.ARM_64,
            environment: {
                BUCKET: dataBucket.bucketName,
                OPENSEARCH_ENDPOINT: esDomain.domainEndpoint,
                BEDROCK_TEXT_MODEL_ID: process.env.BEDROCK_TEXT_MODEL_ID!,
                BEDROCK_EMBEDDING_MODEL_ID: process.env.BEDROCK_EMBEDDING_MODEL_ID!,
                REGION: this.region,
                BEDROCK_REGION: bedrock_region
            },
            timeout: Duration.minutes(5),
            tracing: lambda.Tracing.ACTIVE,
            vpc: props.vpc,
            securityGroups: [lambdaSecurityGroup],
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            retryAttempts: 0,
        };



        // Classification lambda and role
        const classificationLambdaRole = new iam.Role(this, "ClassificationLambdaRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "Allows Classification Lambda task to use services",
            inlinePolicies: {
                cloudwatchXRayLambdaPolicy: cloudwatchXRayLambdaPolicy,
                bedrockLLMLambdaPolicy: bedrockLLMLambdaPolicy,
                eniLambdaPolicy: eniLambdaPolicy,
            },
        });

        const classificationLambda = new lambda.Function(this, "classificationLambda", {
            ...lambdaDefaults,
            code: lambda.Code.fromAsset("../lambdas/classification_lambda"),
            handler: "classify_lambda.lambda_handler",
            role: classificationLambdaRole,
        });

        const classificationLambdaAPI = new ApiGatewayV2LambdaConstruct(this, "ClassificationLambdaIntegration", {
            routePath: "/api/classifier",
            methods: [apigwv2.HttpMethod.POST],
            api: api.apiGatewayV2,
            lambdaFn: classificationLambda,
            apiRouteAuthorizer: api.apiRouteAuthorizer,
        });


        // Retriever lamda and role
        const retrieverLambdaRole = new iam.Role(this, "RetrieverLambdaRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "Allows Retriever Lambda task to use services",
            inlinePolicies: {
                cloudwatchXRayLambdaPolicy: cloudwatchXRayLambdaPolicy,
                bedrockEmbeddingLambdaPolicy: bedrockEmbeddingLambdaPolicy,
                eniLambdaPolicy: eniLambdaPolicy,
                osLambdaPolicy: osLambdaPolicy,
            },
        });

        const retrieverLambda = new lambda.Function(this, "retrieverLambda", {
            ...lambdaDefaults,
            functionName: "gen-ai-assistant-retriever-lambda",
            code: lambda.Code.fromAsset("../lambdas/retrieval_lambda"),
            handler: "retrieval_lambda.lambda_handler",
            role: retrieverLambdaRole,
        });

        const retrieverLambdaAPI = new ApiGatewayV2LambdaConstruct(this, "RetrieverLambdaIntegration", {
            routePath: "/api/retriever",
            methods: [apigwv2.HttpMethod.POST],
            api: api.apiGatewayV2,
            lambdaFn: retrieverLambda,
            apiRouteAuthorizer: api.apiRouteAuthorizer,
        });



        // Response lambda and role
        const responseLambdaRole = new iam.Role(this, "ResponseLambdaRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "Allows Response Lambda task to use services",
            inlinePolicies: {
                cloudwatchXRayLambdaPolicy: cloudwatchXRayLambdaPolicy,
                bedrockLLMLambdaPolicy: bedrockLLMLambdaPolicy,
                eniLambdaPolicy: eniLambdaPolicy,
            },
        });

        const responseLambda = new lambda.Function(this, "responseLambda", {
            ...lambdaDefaults,
            functionName: "gen-ai-assistant-response-lambda",
            code: lambda.Code.fromAsset("../lambdas/response_lambda"),
            handler: "generate_response_lambda.lambda_handler",
            role: responseLambdaRole,
        });

        const responseLambdaAPI = new ApiGatewayV2LambdaConstruct(this, "ResponseLambdaIntegration", {
            routePath: "/api/response",
            methods: [apigwv2.HttpMethod.POST],
            api: api.apiGatewayV2,
            lambdaFn: responseLambda,
            apiRouteAuthorizer: api.apiRouteAuthorizer,
        });


        // Index data lambda and role
        const indexLambdaRole = new iam.Role(this, "IndexDataLambdaRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "Allows Index Data Lambda task to use services",
            inlinePolicies: {
                cloudwatchXRayLambdaPolicy: cloudwatchXRayLambdaPolicy,
                s3DataLambdaPolicy: s3DataLambdaPolicy,
                bedrockEmbeddingLambdaPolicy: bedrockEmbeddingLambdaPolicy,
                eniLambdaPolicy: eniLambdaPolicy,
                osLambdaPolicy: osLambdaPolicy,
            },
        });

        const indexLambda = new lambda.Function(this, "indexDataLambda", {
            code: lambda.Code.fromAsset("../lambdas/index_data_lambda"),
            handler: "index_data_lambda.lambda_handler",
            functionName: "gen-ai-assistant-index-data-lambda",
            ...lambdaDefaults,
            role: indexLambdaRole,
        });


        // Snapshot lambda and role
        const snapshotLambdaRole = new iam.Role(this, "SnapshotLambdaRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "Allows Snapshot Lambda task to use services",
            inlinePolicies: {
                cloudwatchXRayLambdaPolicy: cloudwatchXRayLambdaPolicy,
                s3SnapshotLambdaPolicy: s3SnapshotLambdaPolicy,
                osSnapshotLambdaPolicy: osLambdaPolicy,
                eniLambdaPolicy: eniLambdaPolicy,
            },
        });

        const snapshotLambda = new lambda.Function(this, "utilSnapshotLambda", {
            code: lambda.Code.fromAsset("../lambdas/opensearch_snapshot"),
            handler: "lambda.lambda_handler",
            ...lambdaDefaults,
            role: snapshotLambdaRole,
        });


        // Restore snapshot lambda and role, and OS role
        const restoreSnapshotOSRole = new iam.Role(this, "RestoreSnapshotOSRole", {
            assumedBy: new iam.ServicePrincipal("es.amazonaws.com"),
            description: "Allows Restore Snapshot OS task to use services",
            inlinePolicies: {
                cloudwatchXRayLambdaPolicy: cloudwatchXRayLambdaPolicy,
                s3SnapshotLambdaPolicy: s3SnapshotLambdaPolicy,
                osSnapshotLambdaPolicy: osLambdaPolicy,
                eniLambdaPolicy: eniLambdaPolicy,
            },
        });

        const restoreSnapshotLambdaRole = new iam.Role(this, "RestoreSnapshotLambdaRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "Allows Restore Snapshot Lambda task to use services",
            inlinePolicies: {
                cloudwatchXRayLambdaPolicy: cloudwatchXRayLambdaPolicy,
                s3SnapshotLambdaPolicy: s3SnapshotLambdaPolicy,
                osSnapshotLambdaPolicy: osLambdaPolicy,
                eniLambdaPolicy: eniLambdaPolicy
            },
        });

        const restoreSnapshotLambda = new lambda.Function(this, "utilRestoreSnapshotLambda", {
            code: lambda.Code.fromAsset("../lambdas/opensearch_restore_snapshot"),
            handler: "lambda.lambda_handler",
            ...lambdaDefaults,
            role: restoreSnapshotLambdaRole,
            environment: {
                SNAPSHOT_BUCKET: snapshotBucket.bucketName,
                IAM_ROLE: restoreSnapshotOSRole.roleArn,
                OPENSEARCH_ENDPOINT: esDomain.domainEndpoint,
                REGION: this.region
            },
        });

        const restoreSnapshotLambdaAssumedRole = restoreSnapshotLambdaRole;
        restoreSnapshotLambdaAssumedRole.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["iam:PassRole"],
            resources: [
                restoreSnapshotOSRole.roleArn,
            ],
        }));



        // Add access policy to OS Domain for relevant lambda functions
        const osAccessPolicy = new iam.PolicyStatement({
            actions: [
                "es:CreateDomain",
                "es:DeleteDomain",
                "es:UpdateDomain",
                "es:ESHttpGet",
                "es:ESHttpPut",
            ],
            effect: iam.Effect.ALLOW,
            principals: [
                new iam.ArnPrincipal(restoreSnapshotLambdaRole.roleArn),
                new iam.ArnPrincipal(snapshotLambdaRole.roleArn),
                new iam.ArnPrincipal(retrieverLambdaRole.roleArn),
            ],
            resources: [
                esDomain.domainArn,
                `${esDomain.domainArn}*`,
            ],
        });
        esDomain.addAccessPolicies(osAccessPolicy);



        // Load snapshot data to S3 bucket and add trigger to run lambda
        const deployment = new s3Deployment.BucketDeployment(this, "DeployFiles", {
            sources: [s3Deployment.Source.asset("../data/snapshot")],
            destinationBucket: snapshotBucket,
        });

        const trigger = new triggers.Trigger(this, "MyTrigger", {
            handler: restoreSnapshotLambda,
            timeout: Duration.minutes(5),
            invocationType: triggers.InvocationType.EVENT,
        });
        trigger.executeAfter(deployment);

        // Add trigger to run lambda on S3 bucket events
        const event = new lambdaEventSources.S3EventSource(dataBucket, {
            events: [s3.EventType.OBJECT_CREATED, s3.EventType.OBJECT_REMOVED],
        });
        indexLambda.addEventSource(event);
    }
}
