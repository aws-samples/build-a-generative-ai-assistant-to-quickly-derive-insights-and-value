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
import { Construct } from "constructs";

/**
 * defines the scope for the WebACL
 * Cloudfront - for cloud front for cloud front distributions
 * Regional - for load balancers and api gateway's
 */
export enum WafV2Scope {
    /**
     * for cloudfront distributions
     */
    CLOUDFRONT = "CLOUDFRONT",
    /**
     * for api gateways, loadbalancers and other supported resources
     */
    REGIONAL = "REGIONAL",
}

export interface Wafv2BasicConstructProps extends cdk.StackProps {
    /**
     * The ACL scope.
     */
    readonly wafScope: WafV2Scope;

    /**
     * Optional rules for the firewall
     */
    readonly rules?:
    | Array<cdk.aws_wafv2.CfnWebACL.RuleProperty | cdk.IResolvable>
    | cdk.IResolvable;

    /**
     * The region where the WAF will be deployed
     */
    readonly region?: string;
}

/**
 * Default input properties
 */
const defaultProps: Partial<Wafv2BasicConstructProps> = {
    region: "us-east-1",
};

/**
 * Deploys a basic WAFv2 ACL that is open by default
 */
export class Wafv2BasicConstruct extends Construct {
    public webacl: cdk.aws_wafv2.CfnWebACL;

    constructor(parent: Construct, name: string, props: Wafv2BasicConstructProps) {
        super(parent, name);

        props = { ...defaultProps, ...props };

        const wafScopeString = props.wafScope.toString();

        if (props.wafScope === WafV2Scope.CLOUDFRONT && props.region !== "us-east-1") {
            throw new Error(
                "Only supported region for WAFv2 scope when set to CLOUDFRONT is us-east-1. " +
                "see - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-webacl.html"
            );
        }

        const webacl = new cdk.aws_wafv2.CfnWebACL(this, "webacl", {
            description: "Basic waf",
            defaultAction: {
                allow: {}, // allow everything by default
            },
            rules: props.rules,
            scope: wafScopeString,
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: "WAFACLGlobal",
                sampledRequestsEnabled: true,
            },
        });

        this.webacl = webacl;
    }
}
