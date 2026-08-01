import type { ReactNode } from "react";

const URL_PATTERN = /https?:\/\/\S+/g;

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
        const url = match[0];
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
