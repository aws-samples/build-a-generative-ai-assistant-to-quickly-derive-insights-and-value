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

import { createContext, useState } from "react";
import { Auth, API } from "aws-amplify";

const ChatContext = createContext();

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function listToOrString(list) {
    let list_str = ""
    if (list.length == 1) {
        list_str += capitalizeFirstLetter(list[0]);
    }
    else if (list.length == 2) {
        list_str += capitalizeFirstLetter(list[0]) + " or " + capitalizeFirstLetter(list[1]);
    }
    else if (list.length > 2) {
        n = list.length;
        for (i in Range(0, n)) {
            if (i == n - 1) {
                list_str += "or " + list[i];
            }
            else {
                list_str += list[i] + ", ";
            }
        }
    }
    return list_str
}


export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [wsComplete, setWsComplete] = useState(false);

    console.log("Authorized User: ", Auth.user)

    const callAPI = async (body, endpoint) => {
        try {
            console.log(body);
            const response = await API.post("api", endpoint, {
                body: JSON.stringify(body), // ToDo Stringfy is probably not necessary, causing issues on lambda input
                headers: {
                    "Content-Type": "application/json",
                },
            });
            console.log(response);
            return response;
        } catch (error) {
            console.error("API call error:", error);
            return "none";
        }
    };

    const setTempMessage = (message, content, validation) => {
        setMessages([
            ...messages,
            message,
            {
                content: content,
                role: "bot-waiting",
                val: validation,
                userQ: message.content,
                messageID: "ID" + String(Date.now()),
            },
        ]);
    };

    const setFinalMessage = (message, content, context, validation, graph) => {
        setMessages([
            ...messages,
            message,
            {
                content: content,
                context: context,
                role: "bot",
                val: validation,
                userQ: message.content,
                messageID: "ID" + String(Date.now()),
                graph: graph,
            },
        ]);
    };

    const append = (message) => {
        setIsLoading(true);
        let body = { message: message.content };
        let val = {
            step1: "working",
            step2: "waiting",
            step3: "waiting",
            step4: "waiting",
            step5: "waiting",
            info: "",
        };
        let graph = "none";
        setTempMessage(message, "Generating answer...", val);

        try {
            callAPI(body, "/api/classifier").then((classifierResponse) => {
                if (classifierResponse === "none") {
                    val.step1 = "failed";
                    val.info =
                        "Lambda Error: You either forgot to enable Bedrock, or have some error in your code. Please check the CloudWatch logs of your Classification Lambda to see what went wrong.";
                    setFinalMessage(
                        message,
                        "Validation failed, no answer received.",
                        "Validation failed, no context received.",
                        val,
                        graph
                    );
                    setIsLoading(false);
                    return;
                }
                let company = classifierResponse.index;
                let company_list = classifierResponse.companies;
                console.log(`Company: ${company}`);
                console.log(`Company List: ${company_list}`);
                if (!company_list.includes(company)) {
                    const company_list_str = listToOrString(company_list)
                    val.step1 = "failed";
                    val.info =
                        `Question Error: The classifier cannot determine which company you are asking about. Please reword the question and be sure to be asking about ${company_list_str}.`;
                    setFinalMessage(
                        message,
                        `It is unclear which company you are asking about. Please reword the question and be sure to be asking about ${company_list_str}.`,
                        "Validation failed, no context received.",
                        val,
                        graph
                    );
                    setIsLoading(false);
                    return;
                }
                val.step1 = "completed";
                val.step2 = "working";
                val.company = company;
                setTempMessage(message, "Generating answer...", val);
                try {
                    callAPI({ ...body, ...classifierResponse }, "/api/retriever").then(
                        (retrieverResponse) => {
                            if (retrieverResponse === "none") {
                                val.step2 = "failed";
                                val.info =
                                    "Lambda Error: There seems to be a logic or syntax error in your code. Please check the CloudWatch logs of your Retrieval Lambda to see what went wrong.";
                                setFinalMessage(
                                    message,
                                    "Validation failed, no answer received.",
                                    "Validation failed, no context received.",
                                    val,
                                    graph
                                );
                                setIsLoading(false);
                                return;
                            }
                            let chunks = retrieverResponse.response;
                            if (
                                "json" in retrieverResponse &&
                                "Annual Data" in retrieverResponse.json
                            ) {
                                let data = retrieverResponse.json;
                                let title = data.Label;
                                let data_years = data["Annual Data"].map(({ Date }) => Date);
                                let data_values = data["Annual Data"].map(({ Value }) =>
                                    parseFloat(Value.split(" ")[0].substr(1))
                                ); //value is like "$45.23 Billion"
                                let data_growth = data["Annual Data"].map(({ Growth }) =>
                                    parseFloat(Growth)
                                ); // value is like "83.21%"
                                switch (data["Annual Data"][0]["Value"].split(" ")[1]) {
                                    case "Million":
                                    case "M":
                                        data_values = data_values.map((x) => x * 1000000);
                                        break;
                                    case "Billion":
                                    case "B":
                                        data_values = data_values.map((x) => x * 1000000000);
                                        break;
                                    default:
                                        break;
                                }
                                data = [
                                    {
                                        x: data_years,
                                        y: data_values,
                                        name: "Value",
                                        type: "bar",
                                        marker: { color: "rgb(2, 132, 199)" },
                                    },
                                    {
                                        x: data_years,
                                        y: data_growth,
                                        name: "Growth",
                                        yaxis: "y2",
                                        type: "scatter",
                                        mode: "lines+markers",
                                        marker: { color: "rgb(125, 211, 252)" },
                                    },
                                ];
                                graph = {
                                    data: data,
                                    layout: {
                                        title: title,
                                        xaxis: { title: "Year" },
                                        yaxis: { title: "Value" },
                                        yaxis2: { title: "Growth", overlaying: "y", side: "right" },
                                    },
                                };
                            }

                            if (
                                "error" in retrieverResponse &&
                                retrieverResponse.error === "boto3 not implemented"
                            ) {
                                val.step2 = "failed";
                                val.info = "RAG Error: " + retrieverResponse.error_explication;
                                setFinalMessage(
                                    message,
                                    "Validation failed, no answer received.",
                                    "Validation failed, no context received.",
                                    val,
                                    graph
                                );
                                setIsLoading(false);
                                return;
                            } else {
                                val.step2 = "completed";
                                // val.step4 = "completed";
                                val.step3 = "working";
                                setTempMessage(message, "Generating answer...", val);
                            }
                            try {
                                callAPI({ ...body, ...retrieverResponse }, "/api/response").then(
                                    (generatorResponse) => {
                                        if (generatorResponse === "none") {
                                            val.step3 = "failed";
                                            val.info =
                                                "Lambda Error: There seems to be a logic or syntax error in your code. Please check the CloudWatch logs of your Response Generation Lambda to see what went wrong.";
                                            setFinalMessage(
                                                message,
                                                "Validation failed, no answer received.",
                                                "Validation failed, no context received.",
                                                val,
                                                graph
                                            );
                                            setIsLoading(false);
                                            return;
                                        }
                                        let result = generatorResponse.result;
                                        let context = generatorResponse.context;
                                        if (
                                            "error" in generatorResponse &&
                                            (generatorResponse.error ===
                                                "prompt does not contain context" ||
                                                generatorResponse.error ===
                                                "prompt does not contain tags")
                                        ) {
                                            val.step3 = "warning";
                                            context = "Validation failed, no context received.";
                                            val.info =
                                                "Warning: " + generatorResponse.error_explication;
                                            setFinalMessage(message, result, context, val, graph);
                                            setIsLoading(false);
                                            return;
                                        } else {
                                            val.step3 = "completed";
                                            if ("error" in retrieverResponse) {
                                                val.step4 = "warning";
                                                val.info =
                                                    "Warning: " +
                                                    retrieverResponse.error_explication;
                                            } else if ("error" in generatorResponse) {
                                                val.step4 = "completed";
                                                setWsComplete(true);
                                                val.step5 = "optional";
                                                val.info =
                                                    "Validation successful! \n \n \n One optional task left: " +
                                                    generatorResponse.error_explication;
                                            } else {
                                                val.step4 = "completed";
                                                val.step5 = "completed";
                                                val.info = "Validation successful!";
                                                setWsComplete(true);
                                            }
                                            setFinalMessage(message, result, context, val, graph);
                                            setIsLoading(false);
                                            return;
                                        }
                                    }
                                );
                            } catch (error) {
                                val.step3 = "failed";
                                val.info =
                                    "Processing Error: Make sure the return body of the Response Generation Lambda contains a 'result' key and a 'context' key.";
                                setFinalMessage(
                                    message,
                                    "Validation failed, no answer received.",
                                    "Validation failed, no context received.",
                                    val,
                                    graph
                                );
                                setIsLoading(false);
                            }
                        }
                    );
                } catch (error) {
                    val.step2 = "failed";
                    val.info =
                        "Processing Error: Make sure the return body of the Retrival Lambda contains a 'response' key with a list of dictionaries that each have a 'page_content' and 'metadata' key.";
                    setFinalMessage(
                        message,
                        "Validation failed, no answer received.",
                        "Validation failed, no context received.",
                        val,
                        graph
                    );
                    setIsLoading(false);
                }
            });
        } catch (error) {
            val.step1 = "failed";
            val.info =
                "Processing Error: Make sure that you have Bedrock enabled in your Account and that the return body of the Classification Lambda contains an 'index' key.";
            setFinalMessage(
                message,
                "Validation failed, no answer received.",
                "Validation failed, no context received.",
                val,
                graph
            );
            setIsLoading(false);
        }
    };

    const reload = () => {
        let lastBotMessage = messages.pop();
        let lastUserMessage = messages.pop();
        append(lastUserMessage);
    };

    const reset = () => {
        setMessages([]);
    };

    return (
        <ChatContext.Provider
            value={{
                messages,
                reset,
                append,
                reload,
                isLoading,
                input,
                setInput,
                wsComplete,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;
