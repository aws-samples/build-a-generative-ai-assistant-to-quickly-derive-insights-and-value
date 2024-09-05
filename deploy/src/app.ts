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

import { CfWafStack } from "./cf-waf-stack";
import { AppStack } from "./app-stack";
import { VPCNetworkStack } from "./vpc-network-stack";

const app = new cdk.App();

const stackName =
    app.node.tryGetContext("stack_name") || "gen-ai-assistant";

const account =
    app.node.tryGetContext("account") ||
    process.env.CDK_DEPLOY_ACCOUNT ||
    process.env.CDK_DEFAULT_ACCOUNT;
const region =
    app.node.tryGetContext("region") ||
    process.env.CDK_DEPLOY_REGION ||
    process.env.CDK_DEFAULT_REGION;


// Deploy Waf for CloudFront in us-east-1
const cfWafStackName = stackName + "-waf";
const cfWafStack = new CfWafStack(app, cfWafStackName, {
    env: {
        account: account,
        region: region,
    },
    stackName: cfWafStackName,
});


// Deploy Network Stack
const networkStackName = `${stackName}-network`
const networkStack = new VPCNetworkStack(app, networkStackName, {
    env: {
        account: account,
        region: region,
    },
    stackName: networkStackName,
});


// Deploy App Stack
const appStackName = `${stackName}-app`
const appStack = new AppStack(app, appStackName, {
    env: {
        account: account,
        region: region,
    },
    stackName: appStackName,
    prefix: stackName,
    vpc: networkStack.vpc,
    ssmWafArnParameterName: cfWafStack.ssmWafArnParameterName,
    ssmWafArnParameterRegion: cfWafStack.region,
});

appStack.addDependency(cfWafStack);

app.synth();
