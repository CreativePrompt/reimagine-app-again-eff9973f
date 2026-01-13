import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map book names to bibleportal-friendly format
function normalizeBookName(book: string): string {
  const bookMappings: Record<string, string> = {
    '1 Samuel': '1-samuel',
    '2 Samuel': '2-samuel',
    '1 Kings': '1-kings',
    '2 Kings': '2-kings',
    '1 Chronicles': '1-chronicles',
    '2 Chronicles': '2-chronicles',
    '1 Corinthians': '1-corinthians',
    '2 Corinthians': '2-corinthians',
    '1 Thessalonians': '1-thessalonians',
    '2 Thessalonians': '2-thessalonians',
    '1 Timothy': '1-timothy',
    '2 Timothy': '2-timothy',
    '1 Peter': '1-peter',
    '2 Peter': '2-peter',
    '1 John': '1-john',
    '2 John': '2-john',
    '3 John': '3-john',
    'Song of Solomon': 'song-of-solomon',
  };
  
  return bookMappings[book] || book.toLowerCase().replace(/\s+/g, '-');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book, chapter, verse } = await req.json();
    
    if (!book || !chapter) {
      return new Response(
        JSON.stringify({ error: 'Book and chapter are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the search query for bibleportal.com
    const searchQuery = verse 
      ? `${book} ${chapter}:${verse}`
      : `${book} ${chapter}`;
    
    // Use the passage search endpoint which aggregates commentary
    const encodedSearch = encodeURIComponent(searchQuery);
    const url = `https://bibleportal.com/commentary/passage?search=${encodedSearch}`;
    
    console.log(`Fetching commentary for: ${searchQuery}`);
    console.log(`URL: ${url}`);

    // Fetch the HTML page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error('BiblePortal fetch error:', response.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch commentary', status: response.status }), 
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    
    // Parse the HTML to extract Coffman commentary sections
    // Look for content related to Coffman Commentaries
    const commentaryData: Array<{ verse: string; text: string; author: string }> = [];
    
    // Extract commentary sections - look for Coffman specifically
    const coffmanRegex = /Coffman[^<]*Commentary/gi;
    const hasCoffman = coffmanRegex.test(html);
    
    // Parse out verse-by-verse sections
    // The HTML structure typically has verse references followed by commentary text
    const versePattern = /(\d+:\d+(?:-\d+)?)\s*[-–—]?\s*(.*?)(?=\d+:\d+|$)/gs;
    
    // Extract text content by removing HTML tags
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Find Coffman commentary section
    const coffmanSectionStart = textContent.toLowerCase().indexOf('coffman');
    let coffmanContent = '';
    
    if (coffmanSectionStart !== -1) {
      // Extract a reasonable chunk after finding Coffman reference
      const sectionEnd = Math.min(coffmanSectionStart + 5000, textContent.length);
      coffmanContent = textContent.substring(coffmanSectionStart, sectionEnd);
    }

    // Return structured data
    return new Response(
      JSON.stringify({
        query: searchQuery,
        book,
        chapter,
        verse: verse || null,
        sourceUrl: url,
        hasCoffman,
        content: coffmanContent || textContent.substring(0, 3000),
        rawLength: textContent.length,
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in coffman-commentary function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
