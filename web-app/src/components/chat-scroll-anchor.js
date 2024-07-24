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
import { useInView } from "react-intersection-observer";

import ChatContext from "../context/chat-context";

function useAtBottom(offset = 0) {
    const [isAtBottom, setIsAtBottom] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => {
            setIsAtBottom(
                window.innerHeight + window.scrollY >= document.body.offsetHeight - offset
            );
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [offset]);

    return isAtBottom;
}

export function ChatScrollAnchor() {
    const { isLoading } = useContext(ChatContext);

    const isAtBottom = useAtBottom();

    const { ref, entry, inView } = useInView({
        isLoading,
        delay: 100,
        rootMargin: "0px 0px -150px 0px",
    });

    React.useEffect(() => {
        if (isAtBottom && isLoading && !inView) {
            entry?.target.scrollIntoView({
                block: "start",
            });
        }
    }, [inView, entry, isAtBottom, isLoading]);

    return <div ref={ref} className="h-px w-full" />;
}
