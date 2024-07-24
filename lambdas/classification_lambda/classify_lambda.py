# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import boto3
import json
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver, CORSConfig
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from langchain_community.llms import Bedrock
tracer = Tracer()
logger = Logger()
# CORS will match when Origin is only https://www.example.com
cors_config = CORSConfig(allow_origin="*", max_age=300)

app = APIGatewayHttpResolver(cors=cors_config)


string = """{
"company": "company name"
}"""
prompt =  """\n\nHuman: We want to detect which company is related to the following question "{question}".
the list of possible companies names are {companies}. if no one is related, answer none.
Provide the response following the JSON format as above example:
{string}\n\nAssistant:"""

@app.post("/api/classifier")
@tracer.capture_method
def get_relevant_documents():
    query: dict = json.loads(app.current_event.json_body)
    message_text = query["message"]
    logger.info(query)
    model_id = os.environ["BEDROCK_TEXT_MODEL_ID"]
    region = os.environ["REGION"]

    llm = Bedrock(
            model_id=model_id,
            region_name=region,
            client=get_bedrock_client(),
            model_kwargs={"max_tokens_to_sample":200}
        )
    logger.info(llm)
    companies = ["amazon", "google"]
    formatted_prompt = prompt.format(question=message_text,companies=companies,string=string)
    response = llm._call(prompt = formatted_prompt)
    response = {
        "index": json.loads(response)["company"],
        "companies": companies
    }    
    logger.info(response)

    return response


@logger.inject_lambda_context(
    log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST
)
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)


def get_bedrock_client():
    return boto3.client(
        "bedrock-runtime"
    )
