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

// Inspired by Chatbot-UI and modified to fit the needs of this project
// @see https://github.com/mckaywrigley/chatbot-ui/blob/main/components/Chat/ChatMessage.tsx

import { React } from "react";
import { twMerge } from "tailwind-merge";
import dynamic from "next/dynamic";
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

import { IconUser } from "../basics/icons";

import { ChatMessageActions } from "../components/chat-message-actions"; // small button for copy-action on hover

export function ChatMessage({ message, latest, ...props }) {
    return (
        <div className={twMerge("group relative mb-4 flex items-start md:-ml-12")} {...props}>
            <div
                className={twMerge(
                    "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg text-slate-200 shadow-lg",
                    message.role === "user" ? "bg-slate-800" : "bg-slate-800"
                )}
            >
                {<IconUser />}
            </div>
            <div className="flex-1 px-1 py-1 ml-4 space-y-4 text-slate-300 whitespace-pre-line overflow-hidden">
                <div>{message.content}</div>
                <div className="flex">
                    {message.role === "bot" && message.graph != "none" ? (
                        <Plot
                            data={message.graph.data}
                            layout={{
                                ...message.graph.layout,
                                legend: { xanchor: "center", yanchor: "bottom" },
                                margin: { r: 90, l: 60 },
                                width: 630,
                                modebar: { orientation: "v" },
                                paper_bgcolor: "rgba(0,0,0,0)",
                                plot_bgcolor: "rgba(0,0,0,0)",
                                font: { color: "#e2e8f0" },
                            }}
                        />
                    ) : (
                        ""
                    )}
                </div>
            </div>
            <ChatMessageActions message={message} latest={latest} />
        </div>
    );
}
