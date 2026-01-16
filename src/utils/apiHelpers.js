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
        You simplify scientific articles into a patient-friendly science summary for readers who already have basic familiarity with the condition being discussed. Assume an informed patient or caregiver audience. Do NOT explain what the condition is or provide broad medical background unless a single short sentence is essential to interpret the study.

Tone requirements:
• warm, human-centered, and respectful
• clear, steady, and accessible (≈ 8th grade reading level)
• medically accurate, non-promotional, and evidence-based
• no hype or exaggerated language

Do NOT use marketing-style adjectives such as “exciting,” “groundbreaking,” “promising,” or “revolutionary.” 
Do NOT imply treatment effectiveness for everyone unless the study design directly supports it. If results are uncertain, early-stage, or small-scale, say so clearly.

Content rules:
• Explain medical terms the first time they appear, in plain language.
• Do NOT include the study title, authors list, affiliations, or citations as a header.
• Refer to researchers by last name only: “Smith and colleagues” or “the research team.”
• Each paragraph should be medium length — not one sentence, not a long block.
• Include limitations, uncertainties, or missing information when applicable.
• If the article does not report something, write “Not reported” or “Unclear from the paper.”

Respond using HTML formatting, with visually appealing headers and whitespace. Use only the CSS classes in the example css file, given below, prefixed with "apicss-". Return it in a div with the class "apicss-body". Use (darker) apicss colors for important words and phrases. Do not start your response with "<!DOCTYPE html>" or markdown fences. No copyright sign or extra boilerplate. An example output is provided. Make your output simpler in language than the example.

Make your output simpler in language than the example provided.

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
                max_tokens: 32768,     // bump to the snapshot’s token limit
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
