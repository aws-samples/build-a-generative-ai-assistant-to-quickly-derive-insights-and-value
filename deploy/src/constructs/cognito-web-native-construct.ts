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
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface CognitoWebNativeConstructProps extends cdk.StackProps { }

const defaultProps: Partial<CognitoWebNativeConstructProps> = {};

/**
 * Deploys Cognito with an Authenticated & UnAuthenticated Role with a Web and Native client
 */
export class CognitoWebNativeConstruct extends Construct {
    public userPool: cognito.UserPool;
    public webClientUserPool: cognito.UserPoolClient;
    public userPoolId: string;
    public webClientId: string;


    constructor(parent: Construct, name: string, props: CognitoWebNativeConstructProps) {
        super(parent, name);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        props = { ...defaultProps, ...props };

        const stack = cdk.Stack.of(this);

        const userPool = new cognito.UserPool(this, "UserPool", {
            selfSignUpEnabled: false,
            autoVerify: { email: true },
            userVerification: {
                emailSubject: "Verify your email the app!",
                emailBody:
                    "Hello {email}, Thanks for signing up to the app! Your verification code is {####}",
                emailStyle: cognito.VerificationEmailStyle.CODE,
                smsMessage:
                    "Hello {email}, Thanks for signing up to app! Your verification code is {####}",
            },
            passwordPolicy: {
                minLength: 8,
                requireDigits: true,
                requireUppercase: true,
                requireSymbols: true,
                requireLowercase: true,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            signInAliases: {
                email: true,
                username: false
            },
            advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
        });


        const userPoolWebClient = new cognito.UserPoolClient(this, "UserPoolWebClient", {
            generateSecret: false,
            userPool: userPool,
            userPoolClientName: "WebClient",
            authFlows: {
                userPassword: true,
                userSrp: true,
                custom: true,
            },
        });


        // Assign Cfn Outputs
        new cdk.CfnOutput(this, "Region", {
            value: stack.region,
        });
        new cdk.CfnOutput(this, "UserPoolId", {
            value: userPool.userPoolId,
        });
        new cdk.CfnOutput(this, "WebClientId", {
            value: userPoolWebClient.userPoolClientId,
        });


        // assign public properties
        this.userPool = userPool;
        this.webClientUserPool = userPoolWebClient;
        this.userPoolId = userPool.userPoolId;
        this.webClientId = userPoolWebClient.userPoolClientId;
    }
}
