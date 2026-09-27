"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfileImageUploader({ image, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(image || null);

  const handleClick = () => {
    inputRef.current?.click(); // open file picker
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(file, url); // send file + preview to parent
  };

  return (
    <div className="relative w-28 h-28 cursor-pointer" onClick={handleClick}>
      <Avatar className="w-28 h-28">
        {preview ? (
          <AvatarImage src={preview} alt="Profile image" />
        ) : (
          <AvatarFallback className="bg-blue-600 text-white text-2xl">
            ?
          </AvatarFallback>
        )}
      </Avatar>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
