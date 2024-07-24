# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


# Import necessary modules and packages
import os
import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver, CORSConfig
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from langchain_community.embeddings import BedrockEmbeddings
from langchain_community.vectorstores import OpenSearchVectorSearch
from opensearchpy import RequestsHttpConnection, AWSV4SignerAuth
import json

# Initialize Tracer for X-Ray tracing
tracer = Tracer()
# Initialize Logger for logging capabilities
logger = Logger()
# Configure CORS for API Gateway
cors_config = CORSConfig(allow_origin="*", max_age=300)

# Create an API Gateway HTTP resolver with CORS configuration
app = APIGatewayHttpResolver(cors=cors_config)

model_id = os.environ["BEDROCK_EMBEDDING_MODEL_ID"]


# Define a POST route for '/api/retriever'
@app.post("/api/retriever")
@tracer.capture_method  # Tracer decorator to capture method for tracing
def get_relevant_documents():
    # Parse the incoming JSON body to a Python dictionary
    query: dict = json.loads(app.current_event.json_body)
    logger.info(query)  # Log the received query
    message_text = query["message"]
    index = query["index"]
    logger.info(query)
    index_name = index

    # Construct OpenSearch endpoint URL
    endpoint = "https://" + os.environ["OPENSEARCH_ENDPOINT"] + ":443"





    #TODO: Initialize Bedrock client with Boto3, uncomment next line and initiate boto3 bedrock client
    #bedrock_client = 

    



    #TODO select index to used based on the Chunk sized used to split the documents. Values: small, medium, large
    chunk_size_index = "small"




    # Try block to handle potential errors during vector store creation
    try:

        ###Bedrock Embeddings Class Below
        embeddings = BedrockEmbeddings(
            client=bedrock_client,
            model_id=model_id)

        # Initialize OpenSearchVectorSearch with the necessary parameters selecting the index defined before in chunk size index
        vector_store = OpenSearchVectorSearch(
            index_name=index_name + "_" + chunk_size_index+ "_index",
            embedding_function=embeddings,
            opensearch_url=endpoint,
            http_auth=get_aws4_auth(),
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
        )
    except Exception as e:
        # Handle exceptions and log error
        response = {
            "response": [],
            "error_explication": "Looks like we dont have Bedrock Boto3 SDK client Implemented.",
            "error": "boto3 not implemented"
        }
        logger.info(response)
        return response

    # Create a retriever from the vector store
    retriever = vector_store.as_retriever(search_kwargs={'k': 3})
    logger.info(retriever)

    # Retrieve relevant documents based on the query
    docs = retriever.get_relevant_documents(message_text)
    logger.info(docs)

    # Performance data retrieval for analysis
    performance_data = OpenSearchVectorSearch(
        index_name=index_name + "_performance",
        embedding_function=embeddings,
        opensearch_url=endpoint,
        http_auth=get_aws4_auth(),
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
    )
    retriever_performance = performance_data.as_retriever(search_kwargs={'k': 1})
    performance = retriever_performance.get_relevant_documents(message_text)

    if chunk_size_index == "small":
        response = {
        "response": [
            {
                "page_content": doc.page_content,
                "metadata": {
                    k: v for k, v in doc.metadata.items() if k != "vector_field"
                },
            }
            for doc in docs
        ],
        "json": json.loads(performance[0].page_content),
        "error_explication": "Seems like your chunk configuration may be to small. Meaning you are using very small chunks of the documents. Try to fix it in the Retriever.",
        "error": "chunk configuration not optimal"
        }
        logger.info(response)
        return response

    # Construct response with document data and performance information
    response = {
        "response": [
            {
                "page_content": doc.page_content,
                "metadata": {
                    k: v for k, v in doc.metadata.items() if k != "vector_field"
                },
            }
            for doc in docs
        ],
        "json": json.loads(performance[0].page_content)
    }
    logger.info(response)

    return response



# Decorator to inject Lambda context into the logger
@logger.inject_lambda_context(log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST)
# Tracer decorator to capture the Lambda handler for tracing
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    # Resolve the incoming event using the APIGatewayHttpResolver
    return app.resolve(event, context)

# Function to generate AWS4Auth object for OpenSearch authentication
def get_aws4_auth():
    region = os.environ["REGION"]
    service = "es"
    # Get AWS credentials from the current session
    credentials = boto3.Session().get_credentials()
    # Return the AWSV4SignerAuth object
    return AWSV4SignerAuth(credentials, region, service)
