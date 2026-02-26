function isEditableTarget(target) {
  if (!target || typeof target !== "object") {
    return false;
  }

  const tagName = typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  return target.isContentEditable === true;
}

export function getTransportCommandForKeyEvent(event) {
  if (!event || event.defaultPrevented || isEditableTarget(event.target)) {
    return null;
  }

  if (event.code === "Space" && event.shiftKey) {
    return "BACK";
  }

  if (event.code === "Space" || event.code === "ArrowRight") {
    return "GO";
  }

  if (event.code === "ArrowLeft") {
    return "BACK";
  }

  if (event.code === "KeyS") {
    return "SKIP";
  }

  return null;
}
