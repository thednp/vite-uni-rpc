import { basename } from "node:path";

function renderPreloadLink(file: string) {
    if (file.endsWith(".js")) {
        return `<link rel="preload" href="${file}" as="script" crossorigin>`;
    } else if (file.endsWith(".css")) {
        return `<link rel="preload" href="${file}" as="style" crossorigin>`;
    } else if (file.endsWith(".woff")) {
        return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`;
    } else if (file.endsWith(".woff2")) {
        return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`;
    } else if (file.endsWith(".gif")) {
        return ` <link rel="preload" href="${file}" as="image" type="image/gif">`;
    } else if (file.endsWith(".jpg") || file.endsWith(".jpeg")) {
        return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`;
    } else if (file.endsWith(".png")) {
        return ` <link rel="preload" href="${file}" as="image" type="image/png">`;
    } else if (file.endsWith(".webp")) {
        return ` <link rel="preload" href="${file}" as="image" type="image/webp">`;
    } else {
        // @ts-ignore - this is server side code
        console.warn("Render error! File format not recognized: " + file);
        return "";
    }
}

/**
 * @type {typeof import("./types.d.ts").renderPreloadLinks}
 */
export function renderPreloadLinks(modules: string[], manifest: Record<string, string[]>) {
    let links = "";
    const seen = new Set();
    const ignoredAssets = new Set();

    // Second pass: generate preload links
    modules.forEach((id) => {
        const files = manifest[id];

        // istanbul ignore else
        if (files?.length) {
            files.forEach((file) => {
                // Skip if we've seen this file or if it's an asset from an ignored path
                if (seen.has(file) || ignoredAssets.has(file)) return;

                seen.add(file);
                const filename = basename(file);

                // Handle dependencies
                // istanbul ignore next - no way to test this
                if (manifest[filename]) {
                    for (const depFile of manifest[filename]) {
                        // istanbul ignore else
                        if (!seen.has(depFile) && !ignoredAssets.has(depFile)) {
                            links += renderPreloadLink(depFile);
                            seen.add(depFile);
                        }
                    }
                }

                links += renderPreloadLink(file);
            });
        }
    });

    return links;
}
