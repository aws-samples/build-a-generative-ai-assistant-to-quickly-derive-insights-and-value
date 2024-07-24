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

"use client";

import { useContext } from "react";
import { twMerge } from "tailwind-merge";

import ChatContext from "../context/chat-context";

import { ChatList } from "../components/chat-list"; // chat feed of messages
import { ChatPanel } from "../components/chat-panel"; // chat prompt panel with textbox and send button
import { ChatStartScreen } from "../components/chat-start-screen"; // initial screen with example prompts
import { ChatScrollAnchor } from "../components/chat-scroll-anchor"; // small element at the bottom of the feed to work lika an anchor and pull chat back up if needed

export function Chat({ className }) {
    const { messages } = useContext(ChatContext);

    return (
        <>
            <div className={twMerge("z-0 pb-[200px] pt-4 md:pt-10", className)}>
                {messages.length ? (
                    // only show chat-list if there are messages
                    <>
                        <ChatList />
                        <ChatScrollAnchor />
                    </>
                ) : (
                    // initial screen with example questions - give setInput functions so examples can populate the prompt-box
                    <ChatStartScreen />
                )}
            </div>

            <ChatPanel />
        </>
    );
}
