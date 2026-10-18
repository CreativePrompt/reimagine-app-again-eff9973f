/** Keep the API's verse markers as readable, saved text in every notes tool. */
export function formatScripturePassage(raw: string): string {
  return (raw || '')
    .replace(/^\s*[^\n]*\d+:\d+[^\n]*\n+/, '')
    .replace(/\(ESV\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}