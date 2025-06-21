import openai from "@/lib/openai";
import { marked } from "marked"; // You may need to install this package
import { tenant } from "@/lib/config";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import fs from "fs";
import path from "path";

const exampleHtmlPath = path.join(
    process.cwd(),
    "public",
    "assets",
    "example-output.html"
  );

  const examplecssPath = path.join(
    process.cwd(),
    "public",
    "assets",
    "example-css.css"
  );
  // Synchronously load it into memory
  const exampleoutput = fs.readFileSync(exampleHtmlPath, "utf8");
  const examplecss = fs.readFileSync(examplecssPath, "utf8");

export async function summarizeArticle(content) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", //GPT model
            messages: [
                {
                    role: "system",
                    content:
                        "Can you write this as 2-3 sentence teaser summary for a Scientific American article for a lay person. Please define key medical terms. Specify the year the article was written. Maximum of 280 characters",
                },
                { role: "user", content },
            ],
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error summarizing article:", error);
        throw error;
    }
}

export async function simplifyArticle(content, lengthString) {
    try {
        const instruction = `
        You simplify scientific articles into a science article understandable by an 8th grader, with medical terms explained at least once. 
        Don’t include the title or authors at the beginning, but refer to experimenters by their last name. 
        Each paragraph should be medium length. Include limitations of the study if applicable.
        
        Respond using HTML formatting, with visually appealing headers and whitespace. 
        Use only the CSS classes in the example css file, given below, prefixed with "apicss-". 
        Do not start your response with "<!DOCTYPE html>" or markdown fences.
        No copyright sign or extra boilerplate.
            `.trim();
        
            const messages = [
            { role: "system", content: instruction },
            { role: "assistant", content: exampleoutput + examplecss },
            { role: "user", content: `Now simplify this article:\n\n${content}` },
            ];
        
            // Stream so you can handle very long outputs incrementally
            const stream = await openai.chat.completions.create(
            {
                model: "gpt-4.1",      
                messages,
                max_tokens: 8192,     // bump to the snapshot’s token limit
                temperature: 0.7,
                stream: true,         // get a token stream
            },
            { responseType: "stream" }
            );
        
            let html = "";
            for await (const chunk of stream) {
            if (chunk.choices?.[0]?.delta?.content) {
                html += chunk.choices[0].delta.content;
                // you could also flush each chunk to the client here
            }
            }
        
            // strip fences if present
            if (html.startsWith("```html")) {
            html = html.replace(/^```html\s*/, "").replace(/\s*```$/, "");
            }
    
        return html.trim();
    } catch (error) {
        console.error("Error simplifying article:", error);
        throw error;
    }
  }

// Utility function to convert Markdown to HTML
function markdownToHtml(markdown) {
    return marked(markdown);
}
