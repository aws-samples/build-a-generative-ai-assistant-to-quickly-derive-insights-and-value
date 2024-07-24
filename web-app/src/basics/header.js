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

// import { IconRIVFull } from "../basics/icons";
// import { Amplify, Auth, API } from "aws-amplify";
// import { useNavigate } from 'react-router-dom';


// const CF_ENDPOINT = 'https://d1qy0ig6l7ccff.cloudfront.net'
// const COGNITO_UI_ENDPOINT = 'https://test-auth-19165458466.auth.us-east-1.amazoncognito.com'


export async function Header() {
    return (
        <header className="sticky top-0 flex items-center justify-between w-full h-16 px-4 shrink-0 backdrop-blur-sm z-10">
            {/* <div className="flex items-center font-md text-2xl">
                <IconRIVFull />
            </div> */}
        </header >
    );
}
