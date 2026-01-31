"use client";

import dynamic from "next/dynamic";
import React, { useState, useRef } from "react";
import { Loader2, X } from "lucide-react";
import "react-quill/dist/quill.snow.css";
import "./EditArticleForm.scss";
import Image from "next/image";
import sanitizeHtml from "sanitize-html";
import { cleanName } from "@/lib/utils";
import { toast } from "react-toastify";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import ImageUpload from "../ImageUpload/ImageUpload";
import Editor from "../ContentEditor";

// ADDED: export to word
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
// End

const predefinedTags = [
    "Clinical Trial",
    "Meta-Analysis",
    "Review",
    "REiNS",
    "Clinical Research",
    "Basic Science",
    "Artificial Intelligence",
    "Original Research",
    "Case Studies",
    "Methodologies",
    "Other",
];

const EditArticleForm = ({
    articleData,
    onSaveEdits,
    onPublishOrRetract,
    onDelete,
    loadingStates,
    formType,
}) => {
    const [title, setTitle] = useState(articleData?.title || "");
    const [sourceLink, setSourceLink] = useState(
        articleData?.article_link || ""
    );
    const [tags, setTags] = useState(articleData?.tags || []);
    const [currentTag, setCurrentTag] = useState("");
    const [content, setContent] = useState(
        sanitizeHtml(articleData?.innertext || "", {
            allowedTags: [
                "p",
                "br",
                "strong",
                "em",
                "u",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "ul",
                "ol",
                "li",
                "a",
            ],
            allowedAttributes: {
                a: ["href", "target"],
                "*": ["class"],
            },
        })
    );
    const [summary, setSummary] = useState(
        sanitizeHtml(articleData?.summary || "", {
            allowedTags: [
                "p",
                "br",
                "strong",
                "em",
                "u",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "ul",
                "ol",
                "li",
                "a",
            ],
            allowedAttributes: {
                a: ["href", "target"],
                "*": ["class"],
            },
        })
    );
    const [imageUrl, setImageUrl] = useState(articleData?.image_url || null);
    // after your imageUrl state
    const [authors, setAuthors] = useState(articleData?.authors || []);
    const [newAuthor, setNewAuthor] = useState("");
    const [publicationDate, setPublicationDate] = useState(articleData?.publication_date || "");

    // AI Generation loading state
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const [sourcePublication, setSourcePublication] = useState(articleData?.source_publication || "");
    const [imageCredit, setImageCredit] = useState(articleData?.image_credit || "");
 
    // Generate image button
    const handleGenerateAIImage = async () => {
    if (!content.trim()) {
        toast.error("Add article content first.");
        return;
    }

    setIsGeneratingImage(true);

    try {
        const res = await fetch("/api/images/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: content,
                articleId: articleData?.id,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Failed to generate image");
        }

        setImageUrl(data.url);
        toast.success("AI-generated image added!");
    } catch (err) {
        toast.error("Image generation failed: " + err.message);
    } finally {
        setIsGeneratingImage(false);
    }
};

    const handleAddTag = (tag) => {
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
        }
        setCurrentTag(""); // Clear current tag after adding
    };

    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleImageUpload = (url) => {
        console.log("Image uploaded: ", url);
        setImageUrl(url);
    };

    // update one author’s name
    const updateAuthor = (idx, value) =>
        setAuthors(list => {
        const copy = [...list];
        copy[idx] = value;
        return copy;
        });
    
    // remove one author
    const removeAuthor = idx =>
        setAuthors(list => list.filter((_, i) => i !== idx));
    
    // clear all authors
    const clearAuthors = () =>
        setAuthors([]);
    
    // onChange for the “new author” input: auto-split on commas
    const handleNewAuthorChange = e => {
        const val = e.target.value;
        if (val.includes(",")) {
        const bits = val
            .split(",")
            .map(cleanName)
            .filter(Boolean);
        setAuthors(old => [...old, ...bits]);
        setNewAuthor("");
        } else {
        setNewAuthor(val);
        }
    };
    
    // manual Add button
    const addAuthors = () => {
        if (!newAuthor.trim()) return;
        setAuthors(old => [...old, cleanName(newAuthor)]);
        setNewAuthor("");
    };
  

    const handleSave = () => {
        return {
            title,
            tags,
            innertext: sanitizeHtml(content, {
                allowedTags: [
                    "p",
                    "br",
                    "strong",
                    "em",
                    "u",
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "h5",
                    "h6",
                    "ul",
                    "ol",
                    "li",
                    "a",
                ],
                allowedAttributes: {
                    a: ["href", "target"],
                    "*": ["class"],
                },
            }),
            summary: sanitizeHtml(summary, {
                allowedTags: [
                    "p",
                    "br",
                    "strong",
                    "em",
                    "u",
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "h5",
                    "h6",
                    "ul",
                    "ol",
                    "li",
                    "a",
                ],
                allowedAttributes: {
                    a: ["href", "target"],
                    "*": ["class"],
                },
            }),
            article_link: sourceLink,
            image_url: imageUrl,
            authors: authors,
            publication_date: publicationDate,
            source_publication: sourcePublication,
            image_credit: imageCredit,
        };
    };

    const handlePublishWithSave = async () => {
        const updatedArticle = handleSave();
        await onPublishOrRetract(updatedArticle);
    };

   // ADDED: Export article to Word
const handleExportToWord = async () => {
    if (!articleData) return;

    const doc = new Document({
        sections: [
            {
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: title,
                                bold: true,
                                size: 36,
                            }),
                        ],
                        spacing: { after: 300 },
                    }),

                    publicationDate &&
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Publication Date: ${publicationDate}`,
                                    italics: true,
                                }),
                            ],
                            spacing: { after: 200 },
                        }),

                    authors.length > 0 &&
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Authors: ${authors.join(", ")}`,
                                }),
                            ],
                            spacing: { after: 200 },
                        }),

                    tags.length > 0 &&
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Tags: ${tags.join(", ")}`,
                                }),
                            ],
                            spacing: { after: 300 },
                        }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Summary",
                                bold: true,
                                size: 28,
                            }),
                        ],
                        spacing: { after: 200 },
                    }),

                    ...summary
                        .replace(/<[^>]+>/g, "")
                        .split("\n")
                        .map(
                            line =>
                                new Paragraph({
                                    children: [new TextRun(line)],
                                })
                        ),

                    new Paragraph({
                        text: "",
                        spacing: { after: 300 },
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Article Content",
                                bold: true,
                                size: 28,
                            }),
                        ],
                        spacing: { after: 200 },
                    }),

                    ...content
                        .replace(/<[^>]+>/g, "")
                        .split("\n")
                        .map(
                            line =>
                                new Paragraph({
                                    children: [new TextRun(line)],
                                })
                        ),
                ].filter(Boolean),
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title || "article"}.docx`);
};


    return (
        <form className="edit-article-form">
            <div className="edit-article-form__row">
                <div className="edit-article-form__field">
                    <Label htmlFor="title" className="edit-article-form__label">
                        Article Title
                    </Label>
                    <Input
                        id="title"
                        className="edit-article-form__input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter article title"
                    />
                </div>
                <div className="edit-article-form__field">
                    <Label
                        htmlFor="sourceLink"
                        className="edit-article-form__label"
                    >
                        Source Link
                    </Label>
                    <Input
                        id="sourceLink"
                        className="edit-article-form__input"
                        value={sourceLink}
                        onChange={(e) => setSourceLink(e.target.value)}
                        placeholder="Enter source link"
                    />
                </div>
            </div>

            <div className="edit-article-form__field">
                <Label htmlFor="tags" className="edit-article-form__label">
                    Tags
                </Label>
                <div className="edit-article-form__tags">
                    {tags.map((tag) => (
                        <span key={tag} className="edit-article-form__tag">
                            {tag}
                            <Button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="edit-article-form__tag-remove"
                                variant="ghost"
                                size="icon"
                            >
                                <X size={14} />
                            </Button>
                        </span>
                    ))}
                </div>
                <Select
                    value={currentTag}
                    onValueChange={(value) => handleAddTag(value)}
                >
                    <SelectTrigger
                        id="tags"
                        className="edit-article-form__input edit-article-form__select"
                    >
                        <SelectValue placeholder="Select tags" />
                    </SelectTrigger>
                    <SelectContent className="edit-article-form__select-content">
                        {predefinedTags
                            .filter((tag) => !tags.includes(tag))
                            .map((tag) => (
                                <SelectItem
                                    key={tag}
                                    className="edit-article-form__select-item"
                                    value={tag}
                                >
                                    {tag}
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Source Publication Date + Source Publication (side by side) */}
            <div className="edit-article-form__row">
                <div className="edit-article-form__field">
                    <Label htmlFor="pubDate" className="edit-article-form__label">
                        Source Publication Date
                    </Label>
                    <Input
                        id="pubDate"
                        type="text"
                        placeholder="e.g. 2025 January 6"
                        value={publicationDate}
                        onChange={e => setPublicationDate(e.target.value)}
                        className="edit-article-form__input"
                    />
                </div>
                <div className="edit-article-form__field">
                    <Label htmlFor="sourcePublication" className="edit-article-form__label">
                        Source Publication
                    </Label>
                    <Input
                        id="sourcePublication"
                        type="text"
                        placeholder="e.g. JAMA Dermatology"
                        value={sourcePublication}
                        onChange={e => setSourcePublication(e.target.value)}
                        className="edit-article-form__input"
                    />
                </div>
            </div>

            {/* Authors editor */}
            <div className="edit-article-form__field">
            <Label className="edit-article-form__label">Source Authors</Label>

            {/* existing authors as editable boxes */}
            <div className="edit-article-form__authors-list">
                {authors.map((name, i) => (
                <div key={i} className="edit-article-form__authors-list-item">
                    <Input
                    value={name}
                    onChange={e => updateAuthor(i, e.target.value)}
                    className="edit-article-form__input"
                    />
                    <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAuthor(i)}
                    className="edit-article-form__tag-remove"
                    >
                    <X size={14} />
                    </Button>
                </div>
                ))}
            </div>

            {/* bottom row: paste/type, add & clear */}
            <div className="edit-article-form__add-author">
                <Input
                placeholder="Paste or type author(s)…"
                value={newAuthor}
                onChange={handleNewAuthorChange}
                onKeyDown={e => {
                    if (e.key === "Enter") {
                    e.preventDefault();
                    addAuthors();
                    }
                }}
                className="edit-article-form__input"
                />
                <Button
                type="button"
                onClick={addAuthors}
                className="edit-article-form__add-button"
                >
                Add Authors
                </Button>
                <Button
                type="button"
                onClick={clearAuthors}
                className="edit-article-form__clear-button"
                >
                Clear All
                </Button>
            </div>
            </div>


            <div className="edit-article-form__field">
                <Label className="edit-article-form__label">Summary</Label>
                <Editor
                    content={summary}
                    onChange={setSummary}
                    className="edit-article-form__editor"
                />
            </div>

            <div className="edit-article-form__field">
                <Label className="edit-article-form__label">
                    Article Content
                </Label>
                <Editor
                    content={content}
                    onChange={setContent}
                    className="edit-article-form__editor"
                />
            </div>

            <div className="edit-article-form__field">
    <Label className="edit-article-form__label">Cover image</Label>
    <div className="edit-article-form__input !h-auto">
        <div className="flex flex-col-reverse md:flex-row items-center gap-16">

            <div className="flex flex-col gap-4">

                {/* MANUAL UPLOAD (force update imageUrl immediately) */}
                <ImageUpload
                  onImageUpload={(url) => {
                  setImageUrl(url);
                  toast.success("Image uploaded");
                  }}
               initialImageUrl={imageUrl}   // <-- use LOCAL STATE, not articleData
                />

                {/* GENERATE AI IMAGE — white button */}
                <Button
                    type="button"
                    className="btn btn-primary"
                    disabled={isGeneratingImage}
                    onClick={handleGenerateAIImage}
                >
                    {isGeneratingImage ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        "Generate AI Image"
                    )}
                </Button>

                
            </div>

            {/* Preview */}
            {imageUrl && (
                <Image
                    src={imageUrl}
                    alt="cover image"
                    width={320}
                    height={200}
                    style={{ objectFit: "contain" }}
                />
            )}

            

        </div>
    </div>
</div>

        {/* Image Credit Field */}
        <div className="edit-article-form__field">
            <Label htmlFor="imageCredit" className="edit-article-form__label">
                Image Credit
            </Label>
            <Input
                id="imageCredit"
                type="text"
                placeholder="e.g. Getty Images, unsplash.com"
                value={imageCredit}
                onChange={e => setImageCredit(e.target.value)}
                className="edit-article-form__input"
                style={{ maxWidth: "400px" }}
            />
        </div>

        
            {/* Button actions */}
            
            <div className="edit-article-form__actions">

          {/* ADDED: Export to Word (review only) */}
            {formType === "review" && (
            <Button
                 type="button"
                 className="btn btn-primary"
                 onClick={handleExportToWord}
            >
                 Export to Word
                </Button>
    )}
         {/* END ADDED */}

                <Button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onSaveEdits(handleSave())}
                    disabled={loadingStates.saving}
                >
                    {loadingStates.saving ? (
                        <>
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        "Save Edits"
                    )}
                </Button>
                <Button
                    type="button"
                    className="btn btn-primary-green"
                    onClick={
                        formType === "review"
                            ? handlePublishWithSave
                            : onPublishOrRetract
                    }
                    disabled={loadingStates.publishing}
                >
                    {loadingStates.publishing ? (
                        <>
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            {formType === "edit"
                                ? "Retracting..."
                                : "Publishing..."}
                        </>
                    ) : formType === "edit" ? (
                        "Retract"
                    ) : (
                        "Publish"
                    )}
                </Button>

                <Button
                    type="button"
                    className="btn btn-primary-red"
                    onClick={onDelete}
                    disabled={loadingStates.deleting}
                >
                    {loadingStates.deleting ? (
                        <>
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            Deleting...
                        </>
                    ) : (
                        "Delete"
                    )}
                </Button>
            </div>
        </form>
    );
};

export default EditArticleForm;
