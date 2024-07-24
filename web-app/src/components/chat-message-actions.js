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

import * as React from "react";
import { useContext } from "react";
import { twMerge } from "tailwind-merge";

import { MessageInfo } from "../components/chat-message-info";
import { ProcessingInfo } from "../components/chat-processing";

import { Button } from "../basics/button";
import { IconCheck, IconCopy } from "../basics/icons";

import ChatContext from "../context/chat-context";

function useCopyToClipboard({ timeout = 2000 }) {
    const [isCopied, setIsCopied] = React.useState(false);

    const copyToClipboard = (value) => {
        if (typeof window === "undefined" || !navigator.clipboard?.writeText) {
            return;
        }

        if (!value) {
            return;
        }

        navigator.clipboard.writeText(value).then(() => {
            setIsCopied(true);

            setTimeout(() => {
                setIsCopied(false);
            }, timeout);
        });
    };

    return { isCopied, copyToClipboard };
}

export function ChatMessageActions({ message, latest, className, ...props }) {
    const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 });
    const { isLoading } = useContext(ChatContext);

    const onCopy = () => {
        if (isCopied) return;
        copyToClipboard(message.content);
    };

    return (
        <div
            className={twMerge(
                "flex flex-col items-center py-1 justify-end md:absolute md:-right-10 md:-top-2",
                className
            )}
            {...props}
        >
            {message.role === "bot-waiting" || message.role === "bot" ? (
                <ProcessingInfo message={message} isLoading={isLoading} latest={latest} />
            ) : (
                ""
            )}
            {message.role === "bot-waiting" || message.role === "bot" ? (
                <Button variant="ghost_bottom" size="icon" onClick={onCopy}>
                    {isCopied ? <IconCheck /> : <IconCopy />}
                    <span className="sr-only">Copy message</span>
                </Button>
            ) : (
                <Button variant="ghost" size="icon" onClick={onCopy}>
                    {isCopied ? <IconCheck /> : <IconCopy />}
                    <span className="sr-only">Copy message</span>
                </Button>
            )}
        </div>
    );
}
