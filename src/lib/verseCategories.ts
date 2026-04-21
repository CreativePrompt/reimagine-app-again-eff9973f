export interface VerseCategory {
  id: string;
  name: string;
  references: string[];
}

export const VERSE_CATEGORIES: VerseCategory[] = [
  {
    id: "hope",
    name: "Hope",
    references: [
      "Romans 8:28", "Jeremiah 29:11", "Romans 15:13", "Psalm 39:7",
      "Hebrews 11:1", "Romans 5:5", "Lamentations 3:22-23", "Isaiah 40:31",
      "Psalm 71:14", "1 Peter 1:3", "Psalm 42:11", "Proverbs 23:18",
    ],
  },
  {
    id: "faith",
    name: "Faith",
    references: [
      "Hebrews 11:1", "2 Corinthians 5:7", "Romans 10:17", "Mark 11:22",
      "Matthew 17:20", "James 1:6", "Ephesians 2:8", "Hebrews 11:6",
      "1 Peter 1:7", "Galatians 2:20",
    ],
  },
  {
    id: "love",
    name: "Love",
    references: [
      "1 Corinthians 13:4", "1 John 4:8", "John 3:16", "Romans 5:8",
      "1 John 4:19", "1 Peter 4:8", "Colossians 3:14", "John 13:34",
      "Romans 12:9", "1 John 3:1",
    ],
  },
  {
    id: "peace",
    name: "Peace",
    references: [
      "John 14:27", "Philippians 4:7", "Isaiah 26:3", "Romans 5:1",
      "Psalm 29:11", "Colossians 3:15", "John 16:33", "Romans 15:13",
      "2 Thessalonians 3:16", "Numbers 6:26",
    ],
  },
  {
    id: "strength",
    name: "Strength",
    references: [
      "Philippians 4:13", "Isaiah 40:31", "Psalm 46:1", "2 Corinthians 12:9",
      "Joshua 1:9", "Psalm 28:7", "Ephesians 6:10", "Isaiah 41:10",
      "Habakkuk 3:19", "Psalm 18:32",
    ],
  },
  {
    id: "comfort",
    name: "Comfort",
    references: [
      "2 Corinthians 1:3-4", "Psalm 23:4", "Matthew 5:4", "Psalm 34:18",
      "John 14:1", "Psalm 147:3", "Isaiah 41:10", "Psalm 73:26",
      "Revelation 21:4", "Matthew 11:28",
    ],
  },
  {
    id: "wisdom",
    name: "Wisdom",
    references: [
      "Proverbs 3:5-6", "James 1:5", "Proverbs 9:10", "Ecclesiastes 7:12",
      "Proverbs 16:16", "Colossians 2:3", "Proverbs 1:7", "James 3:17",
      "Psalm 111:10", "Proverbs 4:7",
    ],
  },
  {
    id: "joy",
    name: "Joy",
    references: [
      "Nehemiah 8:10", "Psalm 16:11", "John 15:11", "Romans 15:13",
      "Philippians 4:4", "James 1:2", "Psalm 30:5", "1 Peter 1:8",
      "Galatians 5:22", "Psalm 118:24",
    ],
  },
  {
    id: "salvation",
    name: "Salvation",
    references: [
      "John 3:16", "Romans 10:9", "Ephesians 2:8-9", "Acts 4:12",
      "Romans 6:23", "Titus 3:5", "2 Corinthians 5:17", "John 14:6",
      "1 Peter 1:9", "Romans 1:16",
    ],
  },
  {
    id: "guidance",
    name: "Guidance",
    references: [
      "Proverbs 3:5-6", "Psalm 32:8", "Psalm 119:105", "Isaiah 30:21",
      "Psalm 23:1-3", "James 1:5", "Proverbs 16:9", "Psalm 25:9",
      "John 16:13", "Psalm 48:14",
    ],
  },
];

export const ALL_VERSES = VERSE_CATEGORIES.flatMap(c => c.references);
