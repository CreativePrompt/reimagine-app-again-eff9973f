import { Template } from "./blockTypes";

export const TEMPLATES: Template[] = [
  {
    key: "three-point",
    name: "Three-Point Sermon",
    description: "Classic three-point structure with introduction and conclusion",
    blocks: [
      { kind: "reader_note", title: "Sermon Overview", body: "Add your sermon purpose and main theme here" },
      { kind: "point", title: "Introduction", body: "Hook your audience and introduce the topic" },
      { kind: "point", title: "Point 1", body: "First main point" },
      { kind: "bible", reference: "", text: "" },
      { kind: "illustration", body: "Story or example for point 1" },
      { kind: "point", title: "Point 2", body: "Second main point" },
      { kind: "bible", reference: "", text: "" },
      { kind: "illustration", body: "Story or example for point 2" },
      { kind: "point", title: "Point 3", body: "Third main point" },
      { kind: "bible", reference: "", text: "" },
      { kind: "illustration", body: "Story or example for point 3" },
      { kind: "application", body: "Practical application for the audience" },
      { kind: "point", title: "Conclusion", body: "Summarize and call to action" },
    ],
  },
  {
    key: "expository",
    name: "Expository Sermon",
    description: "Verse-by-verse exposition of a biblical passage",
    blocks: [
      { kind: "reader_note", title: "Passage Overview", body: "Context and background of the passage" },
      { kind: "point", title: "Introduction", body: "Introduce the passage and its context" },
      { kind: "bible", reference: "", text: "" },
      { kind: "point", title: "Main Idea 1", body: "First key teaching from the passage" },
      { kind: "application", body: "How this applies today" },
      { kind: "point", title: "Main Idea 2", body: "Second key teaching from the passage" },
      { kind: "application", body: "Practical steps for application" },
      { kind: "point", title: "Conclusion", body: "Summary and response" },
    ],
  },
  {
    key: "topical",
    name: "Topical Sermon",
    description: "Address a specific topic or theme with multiple scriptures",
    blocks: [
      { kind: "reader_note", title: "Topic Overview", body: "Define the topic and why it matters" },
      { kind: "point", title: "Introduction", body: "Present the topic and its relevance" },
      { kind: "point", title: "Biblical Foundation", body: "What does the Bible say?" },
      { kind: "bible", reference: "", text: "" },
      { kind: "bible", reference: "", text: "" },
      { kind: "point", title: "Real-Life Connection", body: "How this affects our daily lives" },
      { kind: "illustration", body: "Contemporary example or story" },
      { kind: "application", body: "Specific actions to take" },
      { kind: "point", title: "Conclusion", body: "Closing thoughts and challenge" },
    ],
  },
  {
    key: "blank",
    name: "Blank Canvas",
    description: "Start from scratch with complete freedom",
    blocks: [
      { kind: "reader_note", title: "Sermon Notes", body: "Add your initial thoughts here" },
    ],
  },
];
