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
import { twMerge } from "tailwind-merge";

import { Button } from "../basics/button";
import { IconArrowDown } from "../basics/icons";

//import { useAtBottom } from '@/lib/hooks/use-at-bottom'

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

export function ChatButtonScrollToBottom({ className, ...props }) {
    const isAtBottom = useAtBottom();

    return (
        <Button
            variant="outline"
            size="icon"
            className={twMerge(
                "absolute right-4 top-1 z-10 bg-background transition-opacity duration-300 sm:right-8 md:top-2",
                isAtBottom ? "opacity-0" : "opacity-100",
                className
            )}
            onClick={() =>
                window.scrollTo({
                    top: document.body.offsetHeight,
                    behavior: "smooth",
                })
            }
            {...props}
        >
            <IconArrowDown />
            <span className="sr-only">Scroll to bottom</span>
        </Button>
    );
}
