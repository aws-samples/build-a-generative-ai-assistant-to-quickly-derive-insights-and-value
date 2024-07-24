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
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const buttonVariants = cva(
    "inline-flex items-center justify-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default:
                    "bg-slate-800 text-slate-200 rounded-lg shadow-md hover:font-semibold hover:bg-slate-700",
                negative:
                    "bg-gradient-to-r from-purple-600 via-fuchsia-700 to-pink-600 hover:from-purple-800 hover:via-fuchsia-900 hover:to-pink-800 rounded-xl shadow-lg text-white font-medium",
                outline:
                    "bg-transparent text-white font-semibold border-2 border-slate-200 hover:border-slate-300 hover:text-slate-300 rounded-xl",
                black: "bg-black text-white font-medium border border-black hover:border-grey hover:bg-grey",
                text: "bg-transparent text-slate-200 font-semibold",
                ghost: "bg-slate-800 text-slate-200 font-semibold rounded-xl shadow-md hover:bg-slate-700",
                ghost_bottom:
                    "bg-slate-800 text-slate-200 font-semibold rounded-b-xl shadow-md hover:bg-slate-700",
                ghost_top:
                    "bg-slate-800 text-slate-200 font-semibold rounded-t-xl shadow-md hover:bg-slate-700",
                link: "text-slate-200 underline-offset-4 shadow-none hover:underline",
            },
            size: {
                default: "h-8 px-4 py-2",
                sm: "h-8 px-3",
                lg: "h-11 px-8",
                icon: "h-9 w-9 p-0",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

// if asChild is set, this elemnent is not coming with its own HTML button-tag but will instead inherit from class around it, see Slot documentation of Radix
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
        <Comp
            className={twMerge(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    );
});
Button.displayName = "Button";

export { Button, buttonVariants };
