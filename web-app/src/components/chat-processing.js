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

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Transition } from "@headlessui/react";
import ConfettiExplosion from "react-confetti-explosion";
import { Fragment, useState, useEffect, useContext } from "react";

import { Button } from "../basics/button";
import { Separator } from "../basics/separator";
import { IconClose, IconCheck, IconArrowRight, IconInfo, IconSpinner } from "../basics/icons";
import ChatContext from "../context/chat-context";

export function ProcessingInfo({ message, isLoading, latest }) {
    let [isOpen, setIsOpen] = useState(false);
    const { wsComplete } = useContext(ChatContext);

    useEffect(() => {
        if (latest === 1 && isLoading && !wsComplete) {
            setIsOpen(true);
        }
    });

    const largeProps = {
        force: 0.8,
        duration: 3000,
        particleCount: 300,
        width: 1600,
        colors: ["#041E43", "#1471BF", "#5BB4DC", "#FC027B", "#66D805"],
    };

    const renderState = (status, text) => {
        switch (status) {
            case "failed":
                return (
                    <Button variant="text" className="px-2">
                        <IconClose className="mr-2 text-red-600" />
                        {text}
                    </Button>
                );
            case "warning":
                return (
                    <Button variant="text" className="px-2">
                        <IconInfo className="mr-2 text-orange-500" />
                        {text}
                    </Button>
                );
            case "optional":
                return (
                    <Button variant="text" className="px-2">
                        <IconInfo className="mr-2 text-blue-500" />
                        {text}
                    </Button>
                );
            case "working":
                return (
                    <Button variant="text" className="px-2">
                        <IconSpinner className="mr-2 text-yellow-400" />
                        {text}
                    </Button>
                );
            case "completed":
                return (
                    <Button variant="text" className="px-2">
                        <IconCheck className="mr-2 text-green-500" />
                        {text}
                    </Button>
                );
            case "waiting":
                return (
                    <Button variant="text" className="px-2">
                        <IconArrowRight className="mr-2 text-slate-500" />
                        {text}
                    </Button>
                );
            default:
                return (
                    <Button variant="text" className="px-2">
                        <IconArrowRight className="mr-2 text-slate-500" />
                        {text}
                    </Button>
                );
        }
    };

    const infoColor = () => {
        if (Object.values(message.val).indexOf("failed") > -1) {
            return "text-red-600";
        } else if (Object.values(message.val).indexOf("warning") > -1) {
            return "text-orange-500";
        } else {
            return "text-green-500";
        }
    };

    return (
        <AlertDialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogPrimitive.Trigger asChild>
                <Button variant="ghost_top" size="icon">
                    <IconInfo className={infoColor()} />
                    <span className="sr-only">Open Processing</span>
                </Button>
            </AlertDialogPrimitive.Trigger>
            <AlertDialogPrimitive.Portal forceMount>
                <Transition.Root show={isOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        {wsComplete ? (
                            <AlertDialogPrimitive.Overlay
                                forceMount
                                className="fixed inset-0 z-20 bg-black/25"
                            />
                        ) : (
                            <AlertDialogPrimitive.Overlay
                                forceMount
                                className="fixed inset-0 z-20 bg-black/50"
                            />
                        )}
                    </Transition.Child>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <AlertDialogPrimitive.Content
                            forceMount
                            className="fixed z-50 w-[95vw] max-w-md rounded-xl p-4 md:w-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 border-2 border-slate-200"
                        >
                            {wsComplete && <ConfettiExplosion {...largeProps} />}
                            <AlertDialogPrimitive.Title className="text-lg font-medium text-slate-200 p-2">
                                Chatbot Validation
                            </AlertDialogPrimitive.Title>
                            <AlertDialogPrimitive.Description className="mt-3 text-base font-normal text-slate-200">
                                <div>
                                    <div>{renderState(message.val.step1, "Classification")}</div>
                                    <div>{renderState(message.val.step2, "Retrieval")}</div>
                                    <div>
                                        {renderState(message.val.step3, "Prompt Engineering")}
                                    </div>
                                    <div>{renderState(message.val.step4, "Chunking")}</div>
                                    <div>
                                        {renderState(message.val.step5, "Improving Accuracy")}
                                    </div>
                                    <div className="p-2 mt-2 font-formal text-sm">
                                        {message.val.info}
                                    </div>
                                    <Separator className="my-2 md:my-2" />
                                    <div className="text-base font-semibold px-2 mt-4 mb-2">
                                        Outputs:{" "}
                                    </div>
                                    <div className="max-h-48 overflow-auto">
                                        <div className="p-2 font-formal text-sm">
                                            {"company" in message.val
                                                ? "Company: " +
                                                  message.val.company.charAt(0).toUpperCase() +
                                                  message.val.company.slice(1)
                                                : ""}
                                        </div>
                                        <div className="px-2 font-formal text-sm">
                                            {"context" in message
                                                ? "Context: " + message.context
                                                : ""}
                                        </div>
                                    </div>
                                </div>
                            </AlertDialogPrimitive.Description>

                            <div className="flex justify-end space-x-2">
                                <AlertDialogPrimitive.Action className="absolute top-3.5 right-3.5 inline-flex select-none justify-center rounded-lg px-1 py-1 text-sm font-medium text-white">
                                    <IconClose />
                                </AlertDialogPrimitive.Action>
                            </div>
                        </AlertDialogPrimitive.Content>
                    </Transition.Child>
                </Transition.Root>
            </AlertDialogPrimitive.Portal>
        </AlertDialogPrimitive.Root>
    );
}
