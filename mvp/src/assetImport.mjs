function hasExtension(filename, extensions) {
  const lower = filename.toLowerCase();
  return extensions.some((extension) => lower.endsWith(extension));
}

export function inferCueTypeForAsset(filename, mimeType = "") {
  const name = String(filename ?? "");
  const type = String(mimeType ?? "").toLowerCase();

  if (name.toLowerCase().includes("stinger")) {
    return "STINGER";
  }

  if (type.startsWith("video/") || hasExtension(name, [".mp4", ".mov", ".mkv", ".webm"])) {
    return "VID";
  }

  if (type.startsWith("audio/") || hasExtension(name, [".mp3", ".wav", ".aac", ".m4a", ".ogg", ".flac"])) {
    return "AUDIO";
  }

  if (type.startsWith("image/") || hasExtension(name, [".png", ".jpg", ".jpeg", ".gif", ".webp"])) {
    return "IMG";
  }

  if (hasExtension(name, [".ppt", ".pptx", ".key"])) {
    return "PPT";
  }

  return "PPT";
}

export function createImportedAssetRecord(file) {
  if (!file || typeof file.name !== "string" || file.name.trim() === "") {
    throw new Error("Asset file requires a valid filename");
  }

  const assetPath = `assets/imports/${file.name}`;
  return {
    assetUri: assetPath,
    suggestedType: inferCueTypeForAsset(file.name, file.type ?? "")
  };
}
