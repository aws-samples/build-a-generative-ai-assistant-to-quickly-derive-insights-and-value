# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


# Import required modules and packages
import os
import boto3
import json
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver, CORSConfig
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from langchain_community.llms import Bedrock

# Initialize Tracer for AWS X-Ray and Logger for logging
tracer = Tracer()
logger = Logger()

# Set CORS configuration for the API Gateway
cors_config = CORSConfig(allow_origin="*", max_age=300)

# Create an API Gateway HTTP Resolver with CORS configuration
app = APIGatewayHttpResolver(cors=cors_config)





#TODO - PROMPT NEEDS TO BE IMPROVED, IT DOES NOT CONTAIN CONTEXT FROM THE DOCUMENTS OR ANY TYPE OF PROMPT ENGINEER 
prompt = "{question}"





# Define a POST endpoint "/api/response"
@app.post("/api/response")
@tracer.capture_method  # Capture this method for AWS X-Ray
def get_relevant_documents():
    # Parse the JSON body from the incoming event
    query: dict = json.loads(app.current_event.json_body)

    # Extract response and message text from the query
    chunks = query["response"]
    message_text = query["message"]

    # Log the query
    logger.info(query)

    # Get Bedrock model ID and region from environment variables
    model_id = os.environ["BEDROCK_TEXT_MODEL_ID"]

    # Initialize the Bedrock Large Language Model (LLM) client
    llm = Bedrock(
            model_id=model_id,
            client=get_bedrock_client(),
            model_kwargs={
                "max_tokens_to_sample":400,
                "temperature":1
                }
        )
    # Log the Bedrock LLM client info
    logger.info(llm)
    
    # Combine chunks of documents into a single string
    full_chunks = ""
    for chunk in chunks:
        chunk = chunk["page_content"]
        full_chunks += "\n<document>\n{}\n</document>".format(chunk)

    # Format the prompt with the question and the combined documents
    formatted_prompt = prompt.format(question=message_text, documents=full_chunks)
    logger.info(f"LOGGING PROMPT:   {formatted_prompt}")

    # Call the Bedrock LLM with the formatted prompt
    response = llm._call(prompt=formatted_prompt)


    # Check if the prompt is still the initial template and return a specific response
    if '{documents}' not in prompt and '{context}' not in prompt:
        response = {
                "result": response,
                "context": full_chunks,
                "error_explication": "It seems like the responses do not have the proper context. That means the model will use its training knowledge which may not be accurate.",
                "error": "prompt does not contain context"
                }
        logger.info(response)
        return response
        
    # Check if the prompt does not include "<document>" and return a specific response
    if "<document>" not in prompt and "<documents>" not in prompt:
        response = {
                "result": response,
                "context": full_chunks,
                "error_explication": "It looks like the prompt can be improved using best practices of Anthropic Claude, try mentioning the XML tags present.",
                "error": "prompt does not contain tags"
                }
        logger.info(response)
        return response
    
    # Check the temperature and return a specific response
    if llm.model_kwargs['temperature'] > 0.2:
        response = {
                "result": response,
                "context": full_chunks,
                "error_explication": "It looks like the temperature is not optimal for this use case.",
                "error": "tempurature not optimal"
                }
        logger.info(response)
        return response

    # Prepare the final response
    response = {
        "result": response,
        "context": full_chunks
    }
    
    # Log and return the final response
    logger.info(response)
    return response

# Decorator to inject logging and tracing contexts into the lambda handler
@logger.inject_lambda_context(
    log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST
)
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    # Resolve the event using the app (APIGatewayHttpResolver)
    return app.resolve(event, context)

# Function to get a Bedrock client using boto3
def get_bedrock_client():
    bedrock_region_name = os.environ["BEDROCK_REGION"]
    return boto3.client(
        "bedrock-runtime",
        region_name=bedrock_region_name
    )
