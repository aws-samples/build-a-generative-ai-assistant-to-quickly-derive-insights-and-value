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

import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "../basics/button";
import { IconClose, IconInfo } from "../basics/icons";

export function MessageInfo(message) {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <Button variant="ghost" size="icon">
                    <IconInfo />
                    <span className="sr-only">Open Context</span>
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-20 bg-black/25" />
                <Dialog.Content className="fixed inset-x-0 inset-y-0 mx-auto my-auto z-50 p-4 bg-slate-800 text-slate-200 rounded-xl border-slate-200 border-2 shadow-2xl md:max-w-xl md:max-h-[75%] max-h-[75%] top-[0%] left-[0%] -translate-x-[0%] -translate-y-[0%] ">
                    <div className="max-h-full flex flex-col flex-auto px-2 py-1">
                        <Dialog.Title className="text-lg font-medium mb-2">
                            Understand LLM Context
                        </Dialog.Title>
                        <Dialog.Description className="text-md font-normal mb-5 mt-3">
                            Below you will find the context information that the LLM has received to
                            generate the response. You can use this to understand why the LLM may
                            have made certain statements or come to certain conclusions.
                        </Dialog.Description>
                        <div className="text-sm font-normal overflow-auto">{message.context}</div>
                        <Dialog.Close className="absolute top-3.5 right-3.5 inline-flex items-center justify-center p-1">
                            <IconClose />
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
