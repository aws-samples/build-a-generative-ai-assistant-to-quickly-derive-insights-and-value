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

import * as React from "react";
import { useContext } from "react";
import Textarea from "react-textarea-autosize";

import { Button } from "../basics/button";
import { IconArrowElbow } from "../basics/icons";
import ChatContext from "../context/chat-context";

export function ChatPromptForm() {
    const { append, isLoading, input, setInput } = useContext(ChatContext);
    // ref to detect enter key press
    const formRef = React.useRef(null);
    const onKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            formRef.current?.requestSubmit();
            event.preventDefault();
        }
    };
    // ref to focus input
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault();
                if (!input?.trim()) {
                    return; // don't submit empty input
                }
                setInput(""); // clear input
                await append({
                    // submit input with given function
                    content: input,
                    role: "user", // determines the icon next to the message - check chat-message component to see how this is used
                });
            }}
            ref={formRef}
        >
            <div className="text-slate-200 relative flex max-h-60 w-full grow flex-col overflow-hidden pl-5 pr-10 sm:pl-5 sm:pr-14">
                <Textarea
                    ref={inputRef}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)} // update input state
                    placeholder="Ask a question..."
                    spellCheck={false}
                    className="min-h-[60px] w-full resize-none bg-transparent py-[1.3rem] focus-within:outline-none sm:text-sm"
                />
                <div className="absolute right-0 top-3 sm:right-3">
                    <Button
                        variant="negative"
                        type="submit"
                        size="icon"
                        disabled={isLoading || input === ""}
                    >
                        <IconArrowElbow />
                        <span className="sr-only">Send message</span>
                    </Button>
                </div>
            </div>
        </form>
    );
}
