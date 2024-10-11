"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Layout, Loader2 } from "lucide-react";
import { Icons } from "@/components/icons";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import xml from "highlight.js/lib/languages/xml";
import { marked } from "marked";
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("xml", xml);

interface CodeExample {
  language: string;
  code: string;
}

interface ComponentShowcaseProps {
  component: React.ReactNode;
  codeExamples: {
    react: CodeExample;
    svelte: CodeExample;
    astro: CodeExample;
    solid: CodeExample;
    nuxt: CodeExample;
  };
  title: string;
}

export function ComponentShowcase({
  component,
  codeExamples,
  title,
}: ComponentShowcaseProps) {
  const [copiedStates, setCopiedStates] = useState({
    react: false,
    svelte: false,
    astro: false,
    nuxt: false,
    solid: false,
  });
  const [fm, setFm] = useState("react");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    hljs.highlightAll();
  }, [fm, codeExamples]);
  useEffect(() => {
    hljs.highlightAll();
  });
  const copyToClipboard = (
    text: string,
    framework: keyof typeof copiedStates
  ) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStates((prev) => ({ ...prev, [framework]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [framework]: false }));
      }, 2000);
    });
  };

  return (
    <Card className="w-full bg-transparent max-w-5xl mx-auto rounded-none">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <Tabs defaultValue="preview" className="w-full ">
          <TabsList className="flex data-[state=active]:bg-background items-center bg-tranparent gap-3 w-fit grid-cols-7 rounded-none">
            <TabsTrigger
              className="rounded-none flex items-center gap-2 data-[state=active]:bg-stone-900 "
              value="preview"
              onClick={() => setFm("")}
            >
              <Layout className="w-4 h-4" />
              Preview
            </TabsTrigger>
            <div className="mx-5">
              <div className="w-[1px] h-[28px] z-20 bg-white/50"></div>
            </div>
            <TabsTrigger
              className="flex  rounded-none gap-2 items-center data-[state=active]:bg-stone-900"
              value="react"
              onClick={() => setFm("react")}
            >
              <Icons.react className="w-4 h-4" />
              React
            </TabsTrigger>
            <TabsTrigger
              className="flex rounded-none gap-2 items-center  data-[state=active]:bg-stone-900"
              value="svelte"
              onClick={() => setFm("svelte")}
            >
              <Icons.svelteKit />
              Svelte
            </TabsTrigger>
            <TabsTrigger
              className="flex rounded-none gap-2 items-center data-[state=active]:bg-stone-900 "
              value="astro"
              onClick={() => setFm("astro")}
            >
              <Icons.astro />
              Astro
            </TabsTrigger>
            <TabsTrigger
              className="flex rounded-none gap-2 items-center data-[state=active]:bg-stone-900"
              value="solid"
              onClick={() => setFm("solid")}
            >
              <Icons.solidStart />
              Solid{" "}
            </TabsTrigger>
            <TabsTrigger
              className="flex rounded-none gap-2 items-center data-[state=active]:bg-stone-900"
              value="nuxt"
              onClick={() => setFm("nuxt")}
            >
              <Icons.nuxt />
              Nuxt
            </TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="p-4 border rounded-none mt-2">
            <main className="overflow-hidden bg-gray-50 dark:bg-gradient-to-tr dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
              <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
                {component}
              </div>
            </main>
          </TabsContent>
          {Object.entries(codeExamples).map(([framework, example]) => (
            <TabsContent
              className="border data-[state=active]:bg-transparent bg-transparent rounded-none"
              key={framework}
              value={framework}
            >
              <div className="relative">
                {loading ? (
                  <div className="flex justify-center items-center">
                    <Loader2 className="animate-spin w-5 h-5" />
                  </div>
                ) : (
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: marked(example.code) }}
                  ></div>
                  // <pre className="rounded-none overflow-auto">
                  //   <code className={`language-${example.language}`}>
                  //     {/* {example.code} */}
                  //     {markdown}
                  //   </code>
                  // </pre>
                )}

                {/* <SyntaxHightlight fm={fm} code={example.code} key={framework} /> */}
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyToClipboard(
                      example.code,
                      framework as keyof typeof copiedStates
                    )
                  }
                >
                  {copiedStates[framework as keyof typeof copiedStates] ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="sr-only">Copy code</span>
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}