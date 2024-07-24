# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
import os



def lambda_handler(event, context):
    endpoint = os.environ["OPENSEARCH_ENDPOINT"]

    snapshot_bucket = os.environ["SNAPSHOT_BUCKET"]
    iam_role = os.environ["IAM_ROLE"]

    port = os.environ.get("OPENSEARCH_ENDPOINT_PORT", 443)
    region = os.environ["REGION"]
    service = 'es'
    credentials = boto3.Session().get_credentials()

    auth = AWSV4SignerAuth(credentials, region, service)
    opensearch = OpenSearch(
        hosts=[{"host": endpoint, "port": int(port)}],
        http_auth=auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=300,
    )
    
    #delete indices (just in case)
    r = opensearch.indices.delete(
        index = "*"
    )
    print("INDICES DELETED",r)
    
    repository_name = "last_snapshot_repo"
    snapshot_name = "last_snapshot"
    
    
    #register repository:
    payload = {
    "type": "s3",
    "settings": {
        "bucket": snapshot_bucket,
        "base_path": "snapshot/",
        "region": region,
        "role_arn": iam_role
    }
    }
    print("Sending put request for register the repository")
    response = opensearch.snapshot.create_repository(repository=repository_name, body=payload)
    print("Repository registered",response)
    
   
    # Restore the snapshot to a specific index
    index_to_restore = "*" # Name of the index to restore

    r = opensearch.snapshot.restore(repository=repository_name, snapshot=snapshot_name, body={
     "indices": index_to_restore,
     "ignore_unavailable": True,
     "include_global_state": False
    })
    print("INDICES restored",r)
    
    return r
