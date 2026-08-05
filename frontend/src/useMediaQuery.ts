import { useEffect, useRef, useState } from "react";

export function useMediaQuery(query: string): boolean {
    const mediaQueryListRef = useRef<MediaQueryList | null>(null);
    if (mediaQueryListRef.current === null || mediaQueryListRef.current.media !== query) {
        mediaQueryListRef.current = window.matchMedia(query);
    }
    const [matches, setMatches] = useState(() => mediaQueryListRef.current!.matches);

    useEffect(() => {
        const mediaQueryList = mediaQueryListRef.current!;
        setMatches(mediaQueryList.matches);

        function handleChange(event: MediaQueryListEvent) {
            setMatches(event.matches);
        }

        mediaQueryList.addEventListener("change", handleChange);
        return () => mediaQueryList.removeEventListener("change", handleChange);
    }, [query]);

    return matches;
}
