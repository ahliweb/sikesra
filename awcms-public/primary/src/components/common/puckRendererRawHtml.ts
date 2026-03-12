import { sanitizeHTML } from "../../utils/sanitize";

type RawHtmlProps = {
  html?: unknown;
  content?: unknown;
};

export const getSanitizedRawHtml = (props: RawHtmlProps = {}): string => {
  const html =
    (typeof props.html === "string" && props.html) ||
    (typeof props.content === "string" && props.content) ||
    "";

  return sanitizeHTML(html);
};
