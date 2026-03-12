import { describe, expect, it } from "vitest";
import { getSanitizedRawHtml } from "../puckRendererRawHtml";

describe("PuckRenderer RawHTML sanitization", () => {
  it("removes scripts and unsafe attributes", () => {
    const result = getSanitizedRawHtml({
      html: `<p onclick="alert(1)">Safe</p><script>alert('xss')</script><img src="https://cdn.example.com/image.jpg" onerror="alert(2)" />`,
    });

    expect(result).toContain("<p>Safe</p>");
    expect(result).toContain('<img src="https://cdn.example.com/image.jpg"');
    expect(result).not.toContain("onclick=");
    expect(result).not.toContain("onerror=");
    expect(result).not.toContain("<script");
  });

  it("uses content field fallback and hardens anchor attributes", () => {
    const result = getSanitizedRawHtml({
      content: '<a href="https://example.com/docs">Docs</a>',
    });

    expect(result).toContain('<a href="https://example.com/docs"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="nofollow noopener noreferrer"');
  });

  it("strips javascript URLs from links", () => {
    const result = getSanitizedRawHtml({
      html: '<a href="javascript:alert(1)">Unsafe</a>',
    });

    expect(result).not.toContain("javascript:");
    expect(result).toContain("Unsafe");
  });
});
