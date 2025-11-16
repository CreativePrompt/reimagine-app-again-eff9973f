import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { passage, includeVerseNumbers = true, includeHeadings = false } = await req.json();
    
    if (!passage) {
      return new Response(
        JSON.stringify({ error: 'Passage reference is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ESV_API_KEY = Deno.env.get('ESV_API_KEY');
    if (!ESV_API_KEY) {
      console.error('ESV_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'ESV API key is not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query parameters
    const params = new URLSearchParams({
      q: passage,
      'include-passage-references': 'true',
      'include-verse-numbers': includeVerseNumbers.toString(),
      'include-first-verse-numbers': 'true',
      'include-footnotes': 'false',
      'include-headings': includeHeadings.toString(),
      'include-short-copyright': 'false',
    });

    console.log(`Fetching ESV passage: ${passage}`);

    const response = await fetch(`https://api.esv.org/v3/passage/text/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${ESV_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ESV API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch passage from ESV API', details: errorText }), 
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    console.log('ESV API response received successfully');

    return new Response(
      JSON.stringify({
        query: data.query,
        canonical: data.canonical,
        passages: data.passages,
        passage_meta: data.passage_meta,
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in esv-bible function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
