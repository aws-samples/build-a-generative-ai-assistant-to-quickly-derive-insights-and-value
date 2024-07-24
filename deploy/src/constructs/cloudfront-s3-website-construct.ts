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
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";

export interface CloudFrontS3WebSiteConstructProps extends cdk.StackProps {
    /**
     * The path to the build directory of the web site, relative to the project root
     * ex: "./app/build"
     */
    readonly webSiteBuildPath: string;

    /**
     * The Arn of the WafV2 WebAcl.
     */
    readonly webAclArn?: string;
}

const defaultProps: Partial<CloudFrontS3WebSiteConstructProps> = {};

/**
 * Deploys a CloudFront Distribution pointing to an S3 bucket containing the deployed web application {webSiteBuildPath}.
 * Creates:
 * - S3 bucket
 * - CloudFrontDistribution
 * - OriginAccessIdentity
 *
 * On redeployment, will automatically invalidate the CloudFront distribution cache
 */
export class CloudFrontS3WebSiteConstruct extends Construct {
    /**
     * The origin access identity used to access the S3 website
     */
    public originAccessIdentity: cloudfront.OriginAccessIdentity;

    /**
     * The cloud front distribution to attach additional behaviors like `/api`
     */
    public cloudFrontDistribution: cloudfront.Distribution;

    /**
     * The bucket hosting the site
     */
    public siteBucket: s3.Bucket;

    constructor(parent: Construct, name: string, props: CloudFrontS3WebSiteConstructProps) {
        super(parent, name);

        props = { ...defaultProps, ...props };
        const stack = cdk.Stack.of(this);

        const originAccessIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(
            this,
            "OriginAccessIdentity",
        );

        // When using Distribution, do not set the s3 bucket website documents
        // if these are set then the distribution origin is configured for HTTP communication with the
        // s3 bucket and won't configure the cloudformation correctly.
        const logBucket = new s3.Bucket(this, "CloudFrontS3LogBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE
        });
        logBucket.grantWrite(originAccessIdentity);

        const siteBucket = new cdk.aws_s3.Bucket(this, "WebApp", {
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            serverAccessLogsBucket: logBucket,
            serverAccessLogsPrefix: 'site-bucket-logs/',
        });
        this.siteBucket = siteBucket

        siteBucket.grantRead(originAccessIdentity);

        const s3origin = new cloudfront_origins.S3Origin(siteBucket, {
            originAccessIdentity: originAccessIdentity,
        });



        const cloudFrontDistribution = new cloudfront.Distribution(
            this,
            "WebAppDistribution",
            {
                defaultBehavior: {
                    origin: s3origin,
                    cachePolicy: new cloudfront.CachePolicy(this, "CachePolicy", {
                        defaultTtl: cdk.Duration.hours(1),
                    }),
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
                },
                errorResponses: [
                    {
                        httpStatus: 404,
                        ttl: cdk.Duration.hours(0),
                        responseHttpStatus: 200,
                        responsePagePath: "/index.html",
                    },
                ],
                defaultRootObject: "index.html",
                webAclId: props.webAclArn,
                minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021, // Required by security
                enableLogging: true,
                logBucket: logBucket,
                logFilePrefix: "cloudfront-logs/",
            },
        );


        const siteDeployment = new cdk.aws_s3_deployment.BucketDeployment(this, "DeployWithInvalidation", {
            sources: [cdk.aws_s3_deployment.Source.asset(props.webSiteBuildPath)], // from root directory
            destinationBucket: siteBucket,
            distribution: cloudFrontDistribution, // this assignment, on redeploy, will automatically invalidate the cloudfront cache
            distributionPaths: ["/*"],
            // default of 128 isn't large enough for larger website deployments. More memory doesn't improve the performance.
            // You want just enough memory to guarantee deployment
            memoryLimit: 512,
        });


        // export any cf outputs
        new cdk.CfnOutput(this, "SiteBucket", { value: siteBucket.bucketName });
        new cdk.CfnOutput(this, "CloudFrontDistributionId", {
            value: cloudFrontDistribution.distributionId,
        });
        new cdk.CfnOutput(this, "CloudFrontDistributionDomainName", {
            value: cloudFrontDistribution.distributionDomainName,
            exportName: "CloudFrontDistributionDomainName",
        });

        // assign public properties
        this.originAccessIdentity = originAccessIdentity;
        this.cloudFrontDistribution = cloudFrontDistribution;
    }
}



