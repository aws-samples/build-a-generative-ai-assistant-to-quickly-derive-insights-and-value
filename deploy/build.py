# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import argparse
# import boto3
import json
import os
import subprocess
import sys
import shutil

print(sys.version)
print(sys.executable)

print("pip show boto3")
subprocess.run(['pip', 'show', 'boto3'], stderr=subprocess.STDOUT)

import boto3

OPENSEARCH_ROLE_EXISTS_ERROR = "An error occurred (InvalidInput) when calling the CreateServiceLinkedRole operation: Service role name AWSServiceRoleForAmazonOpenSearchService has been taken in this account, please try a different suffix."

def create_opensearch_role():
    iam_client = boto3.client('iam')
    try:
        response = iam_client.create_service_linked_role(
            AWSServiceName='opensearchservice.amazonaws.com',
        )
        print("An OpenSearch Service Role has been created, ready to proceed.")
    except Exception as error:
        if str(error) == OPENSEARCH_ROLE_EXISTS_ERROR:
            print("Role already exists, ready to proceed.")
        else:
            print(f"An error occurred: '{error}'")
        


def exit_on_failure(exit_code, msg):
    if exit_code != 0:
        print(msg)
        exit(exit_code)


def install_packages():
    npm_cmd = shutil.which("npm")
    npx_cmd = shutil.which("npx")

    cmd = [npm_cmd, "install"]
    proc = subprocess.run(cmd, stderr=subprocess.STDOUT)
    exit_on_failure(proc.returncode, "Cdk npm install failed")


def main():
    parser = argparse.ArgumentParser(
        description="Builds parts or all of the solution.  If no arguments are passed then all builds are run"
    )
    parser.add_argument("--install", action="store_true", help="builds web app")
    parser.add_argument("--opensearch", action="store_true", help="builds iac")
    args = parser.parse_args()

    if len(sys.argv) == 1:
        install_packages()
        
    else:
        if args.install:
            install_packages()
        if args.opensearch:
            create_opensearch_role()


if __name__ == "__main__":
    main()