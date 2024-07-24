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

import { Chat } from "../components/chat";
import { ChatProvider } from "../context/chat-context";
import { Amplify, Auth } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import config from "../config.json";
import { useEffect } from "react";

const formFields = {
  signIn: {
    username: {
      placeholder: "Email",
    },
  },
};

export default async function Home() {
  // configure Amplify/Cognito on load (gets Identity Pool, User Pool, Region, App Client ID from API response)
  async function getConfig() {
    // determine API path depending on dev or prod
    let basePath;
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined"
    ) {
      basePath = window.location.origin;
    } else {
      basePath = config.REACT_APP_API_URL || "";
    }

    // call configuration API (returns static info for account cognito config)
    try {
      await fetch(`${basePath}/api/amplify-config`).then(async (response) => {
        const amplifyConfig = await response.json();
        Amplify.configure({
          Auth: {
            mandatorySignIn: true,
            region: amplifyConfig.region,
            userPoolId: amplifyConfig.userPoolId,
            userPoolWebClientId: amplifyConfig.appClientId,
          },
          API: {
            endpoints: [
              {
                name: "api",
                endpoint: basePath,
                region: amplifyConfig.region,
                custom_header: async () => {
                  return {
                    Authorization: `Bearer ${(await Auth.currentSession())
                      .getIdToken()
                      .getJwtToken()}`,
                  };
                },
              },
            ],
          },
        });
      });
    } catch (error) {
      console.log(`Error fetching config with error ${error}`);
      return; // return early if error fetching config (will still try to load chat)
    }
  }

  useEffect(() => {
    getConfig();
  }, []);
  return (
    <Authenticator
      hideSignUp={true}
      formFields={formFields}
    >
      <ChatProvider>
        <Chat />
      </ChatProvider>
    </Authenticator>
  );
}
