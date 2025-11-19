// Local replacement for AI services to make the app deployable without API keys
// This ensures the app runs in isolation on GitHub Pages without needing a backend.

export const generateSubtasks = async (goal: string): Promise<string[]> => {
  // Simulate network delay for better UX
  await new Promise(resolve => setTimeout(resolve, 600));

  const genericTasks = [
    "Research key concepts",
    "Draft initial outline", 
    "Gather necessary resources",
    "Review lecture notes",
    "Practice problem sets",
    "Summarize main points",
    "Create flashcards",
    "Final review & polish"
  ];

  // Return a random subset of 3-5 tasks
  const shuffled = genericTasks.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * 3) + 3);
};

export const generateMotivation = async (context: string): Promise<string> => {
  const quotes = [
    "focus on the process.",
    "consistency is key.",
    "dream big, work hard.",
    "your potential is endless.",
    "make it happen today.",
    "2027 is waiting for you.",
    "stay hungry, stay foolish.",
    "discipline over motivation.",
    "create your own future.",
    "small steps every day."
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
};

export const getExamStudyTips = async (subject: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  return `• Review the ${subject} syllabus thoroughly
• Practice past exam papers under timed conditions
• Summarize your notes into one-page cheat sheets
• Explain complex ${subject} concepts to a friend`;
}