export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export function sitePath(path: string) { return path.startsWith("/") && !path.startsWith("//") && !path.startsWith(`${basePath}/`) ? `${basePath}${path}` : path; }
