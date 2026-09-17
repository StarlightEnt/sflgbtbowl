"use client";

// Quill needs `document`, so it's dynamically imported client-only.
// Uses react-quill-new (a maintained fork) instead of the task's
// suggested react-quill — react-quill's peer deps cap at React 18
// (confirmed against the npm registry) and this project runs React
// 19.2.8; react-quill-new is a drop-in replacement with the same API
// and real React 19 support.
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import "./RichTextEditor.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const modules = {
  toolbar: [[{ header: [false, 2, 3] }], ["bold", "italic", "underline", "link"], ["clean"]],
};

const formats = ["header", "bold", "italic", "underline", "link"];

export default function RichTextEditor({ value, onChange }) {
  return (
    <ReactQuill
      theme="snow"
      value={value ?? ""}
      onChange={onChange}
      modules={modules}
      formats={formats}
    />
  );
}
