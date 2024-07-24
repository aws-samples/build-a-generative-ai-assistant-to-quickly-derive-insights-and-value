# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
import os


def lambda_handler(event, context):
    endpoint = os.environ["OPENSEARCH_ENDPOINT"]
    port = os.environ.get("OPENSEARCH_ENDPOINT_PORT", 443)
    region = os.environ["REGION"]
    service = "es"
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

    # Register repository

    repository_name = "last_snapshot_repo"
    snapshot_name = "last_snapshot"

    payload = {
        "type": "s3",
        "settings": {
            "bucket": "re-invent-chatbot-snapshotbucketb2bf31d3-1xclu7rubowji",
            "base_path": "snapshot/",
            "region": region,
            "role_arn": "arn:aws:iam::385951263826:role/re-invent-chatbot-SnapshotRole53D7C789-Cklx4EoEwiLA",
        },
    }

    print("Sending put request for register the repository")

    response = opensearch.snapshot.create_repository(
        repository=repository_name, body=payload
    )
    print("registry created", response)

    # Take snapshot
    # Define the snapshot name
    # Define the indices to include in the snapshot (use "*" to include all indices)
    indices_to_snapshot = "*"
    # Create the snapshot
    response = opensearch.snapshot.create(
        repository=repository_name,
        snapshot=snapshot_name,
        body={
            "indices": indices_to_snapshot,
            "ignore_unavailable": True,  # Ignore unavailable indices
            "include_global_state": False,  # Exclude cluster global state
        },
    )
    print("snapshot created", response)

    # Print the response
    response = opensearch.snapshot.status(
        repository=repository_name, snapshot=snapshot_name
    )

    while response["snapshots"][0]["state"] == "STARTED":
        response = opensearch.snapshot.status(
            repository=repository_name, snapshot=snapshot_name
        )
        print("in process", response["snapshots"][0]["state"])


    return response
