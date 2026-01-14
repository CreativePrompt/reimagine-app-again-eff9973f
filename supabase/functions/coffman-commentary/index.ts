import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerseCommentary {
  verseRef: string;
  verseText: string;
  commentary: string;
}

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

// Parse HTML to extract verse-by-verse commentary
function parseVerseCommentary(html: string, book: string, chapter: number): VerseCommentary[] {
  const verses: VerseCommentary[] = [];
  
  // Remove scripts and styles
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  
  // Look for Coffman commentary content specifically
  // The site structure has verse sections with headings
  
  // Pattern to find verse sections - look for "Verse X" headers or verse references
  const verseHeaderRegex = /<h[23][^>]*>.*?Verse\s+(\d+(?:\s*[-–]\s*\d+)?)[^<]*<\/h[23]>/gi;
  const verseRefRegex = new RegExp(`${book}\\s+${chapter}:(\\d+(?:\\s*[-–]\\s*\\d+)?)`, 'gi');
  
  // Split by potential verse markers
  const sections = cleanHtml.split(/<h[23][^>]*>/i);
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    
    // Check if this section starts with a verse reference
    const verseMatch = section.match(/^[^<]*Verse\s+(\d+(?:\s*[-–]\s*\d+)?)/i);
    if (verseMatch) {
      const verseNum = verseMatch[1];
      
      // Get the content after the heading
      const contentStart = section.indexOf('</h');
      if (contentStart !== -1) {
        let content = section.substring(contentStart);
        
        // Find where the next major section starts
        const nextSectionMarkers = ['<h2', '<h3', 'Verse '];
        let endIndex = content.length;
        
        for (const marker of nextSectionMarkers) {
          const markerIndex = content.toLowerCase().indexOf(marker.toLowerCase(), 50);
          if (markerIndex !== -1 && markerIndex < endIndex) {
            endIndex = markerIndex;
          }
        }
        
        content = content.substring(0, endIndex);
        
        // Clean HTML tags but preserve some structure
        const cleanContent = content
          .replace(/<\/h[23]>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<strong>/gi, '**')
          .replace(/<\/strong>/gi, '**')
          .replace(/<em>/gi, '_')
          .replace(/<\/em>/gi, '_')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&quot;/gi, '"')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        // Extract the verse text if present (usually bold at the beginning)
        let verseText = '';
        let commentary = cleanContent;
        
        // Look for quoted verse text pattern
        const quoteMatch = cleanContent.match(/^\*\*([^*]+)\*\*/);
        if (quoteMatch) {
          verseText = quoteMatch[1].trim();
          commentary = cleanContent.substring(quoteMatch[0].length).trim();
        }
        
        if (cleanContent.length > 50) {
          verses.push({
            verseRef: `${chapter}:${verseNum}`,
            verseText,
            commentary: commentary.substring(0, 2000), // Limit length per verse
          });
        }
      }
    }
  }
  
  // If no structured verses found, try alternative parsing
  if (verses.length === 0) {
    // Look for any content that mentions verses
    const textContent = cleanHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Find Coffman section
    const coffmanIndex = textContent.toLowerCase().indexOf('coffman');
    if (coffmanIndex !== -1) {
      // Extract content around Coffman reference
      const startIndex = Math.max(0, coffmanIndex);
      const relevantContent = textContent.substring(startIndex, startIndex + 8000);
      
      // Try to split by verse patterns
      const versePattern = new RegExp(`(${chapter}:\\d+(?:-\\d+)?)\\s+`, 'g');
      const parts = relevantContent.split(versePattern);
      
      for (let i = 1; i < parts.length; i += 2) {
        const verseRef = parts[i];
        const content = parts[i + 1];
        
        if (content && content.length > 30) {
          // Limit to reasonable length and find natural break
          let endIndex = Math.min(content.length, 1500);
          const nextVerseMatch = content.match(new RegExp(`${chapter}:\\d+`));
          if (nextVerseMatch && nextVerseMatch.index && nextVerseMatch.index < endIndex) {
            endIndex = nextVerseMatch.index;
          }
          
          verses.push({
            verseRef,
            verseText: '',
            commentary: content.substring(0, endIndex).trim(),
          });
        }
      }
    }
    
    // If still nothing, return the whole content as chapter introduction
    if (verses.length === 0 && textContent.length > 100) {
      const coffmanStart = textContent.toLowerCase().indexOf('coffman');
      const relevantStart = coffmanStart !== -1 ? coffmanStart : 0;
      
      verses.push({
        verseRef: 'Introduction',
        verseText: '',
        commentary: textContent.substring(relevantStart, relevantStart + 3000).trim(),
      });
    }
  }
  
  return verses;
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

    // Build URL for Coffman commentary specifically
    const normalizedBook = normalizeBookName(book);
    
    // Try the direct Coffman commentary URL first
    const coffmanUrl = `https://bibleportal.com/commentary/coffman-commentaries-on-the-bible/${normalizedBook}-${chapter}`;
    
    console.log(`Fetching Coffman commentary from: ${coffmanUrl}`);

    // Fetch the HTML page
    let response = await fetch(coffmanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    // If direct URL fails, try the search endpoint
    if (!response.ok) {
      const searchQuery = verse 
        ? `${book} ${chapter}:${verse}`
        : `${book} ${chapter}`;
      
      const encodedSearch = encodeURIComponent(searchQuery);
      const searchUrl = `https://bibleportal.com/commentary/passage?search=${encodedSearch}`;
      
      console.log(`Direct URL failed, trying search: ${searchUrl}`);
      
      response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
    }

    if (!response.ok) {
      console.error('BiblePortal fetch error:', response.status);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch commentary', 
          status: response.status,
          verses: []
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    
    // Parse verse-by-verse commentary
    const verses = parseVerseCommentary(html, book, chapter);
    
    // If specific verse requested, filter to just that verse
    let filteredVerses = verses;
    if (verse) {
      const verseStr = String(verse);
      filteredVerses = verses.filter(v => 
        v.verseRef.includes(verseStr) || 
        v.verseRef === `${chapter}:${verseStr}`
      );
      
      // If no specific match, return all
      if (filteredVerses.length === 0) {
        filteredVerses = verses;
      }
    }

    return new Response(
      JSON.stringify({
        book,
        chapter,
        verse: verse || null,
        sourceUrl: coffmanUrl,
        verses: filteredVerses,
        totalVerses: verses.length,
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in coffman-commentary function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        verses: []
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
