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

import { useContext } from "react";
import { Button } from "../basics/button";
import { IconArrowRight } from "../basics/icons";
import ChatContext from "../context/chat-context";

const exampleMessages = [
    {
        heading: "What was the 2022 revenue of Amazon?",
        message: `What was the 2022 revenue of Amazon?`,
    },
    {
        heading: "What were some changes to Amazon's business in 2022?",
        message: `What were some changes to Amazon's business in 2022?`,
    },
    {
        heading: "What were the different revenue segments of Amazon in 2022?",
        message: `What were the different revenue segments of Amazon in 2022?`,
    },
];

export function ChatStartScreen() {
    const { setInput } = useContext(ChatContext);

    return (
        <div className="mx-auto max-w-2xl px-4">
            <div className="text-slate-200 bg-gray-800 p-8 rounded-xl shadow-xl">
                <h1 className="mb-4 text-lg font-semibold">
                    Welcome to the Generative AI Financial Assistant!
                </h1>
                <p className="mb-4 leading-normal">
                    We have created this page for you to try out the generative AI chatbot you will
                    be building over to course of the next hour.
                </p>
                <p className="mb-4 leading-normal">
                    Each time you are asking a question, there will be a validation process, making
                    sure to point out any open tasks you still have to work on.
                </p>
                <p className="mb-4 leading-normal">
                    To complete these tasks, refer back to the instructions or reach out to your
                    instructor in case you are facing issues. Feel free to use the sample questions
                    provided below to test your chatbot.
                </p>
                <p className="mb-14 leading-normal font-semibold">Happy building!</p>
                <p className="mb-4 leading-normal">Example Questions:</p>
                <div className="mt-4 flex flex-col space-y-2">
                    {exampleMessages.map((message, index) => (
                        <Button
                            key={index}
                            variant="link"
                            className="h-auto p-0 text-base justify-start text-left items-start"
                            onClick={() => setInput(message.message)}
                        >
                            <IconArrowRight className="mr-2 mt-1" />
                            {message.heading}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
