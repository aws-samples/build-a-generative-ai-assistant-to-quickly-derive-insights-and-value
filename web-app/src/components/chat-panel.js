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
import { IconTrash, IconRefresh } from "../basics/icons";

import { ChatPromptForm } from "../components/chat-prompt-form"; // main chat input form
import { ChatButtonScrollToBottom } from "../components/chat-button-scroll-to-bottom"; // button to scroll chat feed to the bottom
import ChatContext from "../context/chat-context";

export function ChatPanel() {
    const { messages, reset, reload, isLoading } = useContext(ChatContext);

    return (
        <div className="fixed inset-x-0 bottom-3">
            <ChatButtonScrollToBottom />
            <div className="mx-auto sm:max-w-2xl sm:px-4">
                <div className="flex space-x-4 h-10 mb-3 items-center justify-center">
                    {!isLoading
                        ? messages?.length > 0 && (
                            <div className="space-x-4">
                                <Button
                                    variant="default"
                                    onClick={(e) => {
                                        // re-generate last prompt
                                        e.preventDefault();
                                        reload();
                                    }}
                                >
                                    <IconRefresh className="mr-2" />
                                    Try Again
                                </Button>
                                <Button variant="default" onClick={() => reset()}>
                                    <IconTrash className="mr-2" />
                                    Clear Chat
                                </Button>
                            </div>
                        )
                        : ""}
                </div>
                <div className="space-y-4 px-4 py-2 bg-slate-800 rounded-xl shadow-xl md:py-4">
                    <ChatPromptForm />
                </div>
            </div>
        </div>
    );
}
