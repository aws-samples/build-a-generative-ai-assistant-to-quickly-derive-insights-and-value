# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import urllib.parse
import boto3
import hashlib
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, S3Event
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_community.embeddings import BedrockEmbeddings

tracer = Tracer()
logger = Logger()

endpoint = os.environ["OPENSEARCH_ENDPOINT"]
port = os.environ.get("OPENSEARCH_ENDPOINT_PORT", 443)
region = os.environ["REGION"]
model_id = os.environ["BEDROCK_EMBEDDING_MODEL_ID"]


service = "es"
credentials = boto3.Session().get_credentials()
s3 = boto3.client("s3")

chunk_size = 28000
chunk_overlap = 0

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=chunk_size, chunk_overlap=chunk_overlap, length_function=len
)

auth = AWSV4SignerAuth(credentials, region, service)

opensearch = OpenSearch(
    hosts=[{"host": endpoint, "port": int(port)}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=300,
)

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
@event_source(data_class=S3Event)
def lambda_handler(event: S3Event, context):
    
    service = 'es'
    credentials = boto3.Session().get_credentials()
    
    logger.info(event)
    documents_to_add, documents_to_remove = get_documents_from_s3_record(event)
    index_documents = []

    for document in documents_to_add:
        index_documents.append(add_document_to_index(document))

    for document in documents_to_remove:
        index_documents.append(remove_document_from_index(document))

    return index_documents


def get_documents_from_s3_record(event):
    logger.debug(f"Getting documents from S3 record: ", event)
    documents_to_add = []
    documents_to_remove = []

    for record in event.records:
        event_name = record.event_name
        if event_name.startswith("ObjectCreated"):
            documents_to_add.append(record)

        if event_name.startswith("ObjectRemoved"):
            documents_to_remove.append(record)

    logger.debug(f"documents_to_add: {documents_to_add}")
    logger.debug(f"documents_to_remove: {documents_to_remove}")
    return documents_to_add, documents_to_remove


@tracer.capture_method
def add_document_to_index(document):
    event_name = document.event_name
    bucket_name = document.s3.bucket.name
    object_key = urllib.parse.unquote_plus(document.s3.get_object.key)
    logger.info(f"bucket_name: {bucket_name}")
    logger.info(f"object_key: {object_key}")
    url = f"s3://{bucket_name}/{object_key}"
    index_name = object_key.split("/")[0].lower()
    logger.info(f"Index: {index_name}")
    if object_key[-1] == "/":
        try:
             # Optional properties
        # change this from event if necessary:
            resource_properties = {}
            dimension = resource_properties.get("Dimension", 1536)
            vector_field = resource_properties.get("VectorField", "vector_field")
            text_field = resource_properties.get("TextField", "text")
            metadata_field = resource_properties.get("MetadataField", "metadata")
            port = resource_properties.get("Port", 443)
            timeout = resource_properties.get("Timeout", 300)
            knn_algo_param_ef_search = resource_properties.get("KnnAlgoParamEfSearch", 512)
            response = create_index(
                opensearch,
                index_name,
                vector_field,
                text_field,
                metadata_field,
                dimension,
                knn_algo_param_ef_search,
            )
            return response
        except Exception as e:
            logger.error(e)
            error = f"Error creating index {index_name}: {e}"
            logger.error(error)
            return error
        
        
    logger.info(f"Loading document from s3://{bucket_name}/{object_key}")
    object_key_local = object_key.replace("/","")
    local_file_name = '/tmp/' + object_key_local
    s3.download_file(bucket_name, object_key, local_file_name)
    

    loader = TextLoader(local_file_name)
    
    logger.debug(f"loader: {loader}")

    logger.info(f"Splitting document from s3://{bucket_name}/{object_key}")
    texts = text_splitter.split_documents(loader.load())
    logger.debug(f"texts: {texts}")

    text_data = [text.page_content for text in texts]
    logger.debug(f"text_data: {text_data}")
    logger.info(text_data)

    text_data_split = [
        text_data[i : i + chunk_size] for i in range(0, len(text_data), chunk_size)
    ]

    query_result = []
    logger.info(f"LOG---> indexing document: {object_key} ----- Using chunk_size: {chunk_size} ----- in index: {index_name}")
    for chunk in text_data_split:
        query_result_current = _get_embeddings(chunk)
        query_result.extend(query_result_current)

    data = list(zip(text_data, query_result))
    logger.debug(f"data: {data}")

    for item in data:
        logger.info(f"Indexing document for {object_key}")
        logger.debug(f"item: {item}")
        index_id = hashlib.md5(item[0].encode()).hexdigest()
        response = opensearch.index(
            index=index_name,
            id = index_id,
            body={"vector_field": item[1], "text": item[0], "url": url},
        )
        print(f"Document {url} added:")
        print(response)

    response = {
        "bucket": bucket_name,
        "key": object_key,
        "indexed": len(query_result),
    }

    logger.debug(f"response: {response}")
    return response


@tracer.capture_method
def remove_document_from_index(document):
    bucket_name = document.s3.bucket.name
    object_key = urllib.parse.unquote_plus(document.s3.get_object.key)

    logger.debug(f"bucket_name: {bucket_name}")
    logger.debug(f"object_key: {object_key}")

    url = f"s3://{bucket_name}/{object_key}"
    index_name = object_key.split("/")[0].lower()
    
    if object_key[-1] == "/":
        response = opensearch.indices.delete(
            index = index_name
        )
        logger.info(f"Found {index_name} index to delete")
        response = {
            "bucket": bucket_name,
            "key": object_key,
            "removed": response,
        }
    else:
        response = opensearch.search(
            index=index_name, body={"query": {"match": {"url": url}},"size": 10000}
        )
        logger.info(f"Found {response['hits']['total']['value']} documents to delete")

        for hit in response["hits"]["hits"]:
            logger.info(f"Deleting document {hit['_id']}")
            opensearch.delete(index=index_name, id=hit["_id"])

        response = {
            "bucket": bucket_name,
            "key": object_key,
            "removed": response["hits"]["total"]["value"],
        }

    logger.debug(f"response: {response}")
    return response



def _get_embeddings(inputs):
    logger.debug(f"Running get embeddings with inputs: {inputs}")

    embeddings = BedrockEmbeddings(
        client=get_bedrock_client(),
        model_id=model_id
    )

    logger.debug("Getting embeddings")
    query_result = embeddings.embed_documents(inputs)
    logger.debug(f"embeddings: {query_result}")

    return query_result


def get_bedrock_client():
    bedrock_region_name = os.environ["BEDROCK_REGION"]
    return boto3.client(
        "bedrock-runtime",
        region_name=bedrock_region_name
    )
    

def create_index(
    opensearch,
    index_name,
    vector_field,
    text_field,
    metadata_field,
    dimension,
    knn_algo_param_ef_search,
):
    index_body = {
        "settings": {
            "index": {
                "knn": True,
                "knn.algo_param.ef_search": knn_algo_param_ef_search,
            }
        },
        "mappings": {
            "properties": {
                vector_field: {
                    "type": "knn_vector",
                    "dimension": int(dimension),
                    "method": {
                        "name": "hnsw",
                        "space_type": "l2",
                        "engine": "nmslib",
                        "parameters": {"ef_construction": 512, "m": 16},
                    },
                },
                text_field: {"type": "text", "index": False},
                "url": {"type": "text", "index": True},
            }
        },
    }
    logger.info(f"Creating index {index_name} with body:")
    logger.info(index_body)

    response = opensearch.indices.create(index_name, body=index_body)
    logger.info(response)
    return response


def delete_index(opensearch, index_name):
    response = opensearch.indices.delete(index_name)
    logger.info(response)
