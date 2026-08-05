import type { ReactNode } from "react";

const URL_PATTERN = /https?:\/\/\S+/g;
const TRAILING_PUNCTUATION = new Set([".", ",", "!", "?", ";", ":", "'", '"', ")", "]"]);

/** Strips sentence punctuation trailing a matched URL, keeping a bracket/paren that balances one earlier in the URL. */
function trimTrailingPunctuation(url: string): string {
    let end = url.length;
    while (end > 0 && TRAILING_PUNCTUATION.has(url[end - 1])) {
        const char = url[end - 1];
        // Compare against the part before this trailing char: an unmatched opener there means
        // this closer belongs to the URL itself and should be kept.
        if (char === ")" && countChar(url, "(", end - 1) > countChar(url, ")", end - 1)) {
            break;
        }
        if (char === "]" && countChar(url, "[", end - 1) > countChar(url, "]", end - 1)) {
            break;
        }
        end -= 1;
    }
    return url.slice(0, end);
}

function countChar(text: string, char: string, upTo: number): number {
    let count = 0;
    for (let i = 0; i < upTo; i += 1) {
        if (text[i] === char) {
            count += 1;
        }
    }
    return count;
}

/**
 * Splits plain text into React nodes, turning bare URLs into real links.
 *
 * Never uses `dangerouslySetInnerHTML`: non-URL segments are returned as plain
 * text nodes, so any HTML-looking text in the input is rendered literally and
 * never interpreted as markup.
 */
export function linkify(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    URL_PATTERN.lastIndex = 0;
    while ((match = URL_PATTERN.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        const url = trimTrailingPunctuation(match[0]);
        nodes.push(
            <a key={match.index} href={url} target="_blank" rel="noopener noreferrer">
                {url}
            </a>,
        );
        lastIndex = match.index + url.length;
    }
    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}
