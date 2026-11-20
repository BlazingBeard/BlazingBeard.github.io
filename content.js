/*
  HowardAI — AI Enablement Lab · site content.
  Everything on the page renders from this file. Edit here, not in index.html.
  Music video fields: title, line (optional), video (mp4 URL), poster, link (GitHub Pages URL; swap for YouTube later), duration (seconds).
*/
window.LAB = {
  brand: "HowardAI",
  person: "Howard Hoy",
  links: {
    linkedin: "https://www.linkedin.com/in/aienabledhuman/",
    youtube: "https://www.youtube.com/@aienabledhuman",
    instagram: "https://www.instagram.com/aienabledhuman/",
    github: "https://github.com/BlazingBeard",
    gary: "https://gary.aienabledhuman.com/",
    quests: "https://blazingbeard.github.io/quests/"
  },

  heroWords: ["HowardAI \u2013\nI Want That"],

  practice: [
    { n: "01", title: "Find the grievance", body: "Start where people are already annoyed: the report that eats Friday, the ticket nobody answers, the deck rebuilt every quarter." },
    { n: "02", title: "Build the smallest working thing", body: "Not a strategy. Not a pilot plan. Something that runs today, on a real problem, in an afternoon." },
    { n: "03", title: "Put it in front of people", body: "Real users, real feedback, real numbers. The experiment is only finished when someone else has used it." },
    { n: "04", title: "Teach it so it spreads", body: "Turn the working thing into a quest, a walkthrough or a story, so the next person can do it without me." }
  ],
  thesis: "I don't ship features. I ship colleagues.",

  experiment: {
    status: "Running",
    question: "Can one person write, perform and ship real music videos with AI collaborators?",
    built: "Six songs and six full music videos, from lyrics and vocals to visuals and the final edit.",
    learned: "Short, tight prompts generate. Overstuffed ones quietly produce nothing."
  },

  // Links point at GitHub Pages for now. Replace "link" with the YouTube URL when each video moves.
  music: [
    { title: "Hush Little Baby", sub: "AI in Your Head", line: "A dark lullaby about a blob that collects AI body parts and takes your heart.",
      video: "https://blazingbeard.github.io/_p/hush-little-baby-jzifctlwwx/hush-little-baby-v1.mp4",
      poster: "https://blazingbeard.github.io/_p/hush-little-baby-jzifctlwwx/poster.jpg",
      link: "https://blazingbeard.github.io/_p/hush-little-baby-jzifctlwwx/", duration: 242 },
    { title: "I Unlock You", sub: "", line: "",
      video: "https://blazingbeard.github.io/_p/i-unlock-you-0kge2lrjhv/i-unlock-you-v4.mp4",
      poster: "https://blazingbeard.github.io/_p/i-unlock-you-0kge2lrjhv/poster.jpg",
      link: "https://blazingbeard.github.io/_p/i-unlock-you-0kge2lrjhv/i-unlock-you-v4.mp4", duration: 203 },
    { title: "Yes We Should", sub: "", line: "",
      video: "https://blazingbeard.github.io/_p/yes-we-should-6jw2utdk18/yes-we-should-v1.mp4",
      poster: "https://blazingbeard.github.io/_p/yes-we-should-6jw2utdk18/poster.jpg",
      link: "https://blazingbeard.github.io/_p/yes-we-should-6jw2utdk18/", duration: 200 },
    { title: "Possibilities", sub: "", line: "",
      video: "https://blazingbeard.github.io/_p/possibilities-8j5ne9amgq/possibilities-v1.mp4",
      poster: "https://blazingbeard.github.io/_p/possibilities-8j5ne9amgq/poster.jpg",
      link: "https://blazingbeard.github.io/_p/possibilities-8j5ne9amgq/", duration: 291 },
    { title: "Party Cats", sub: "", line: "",
      video: "https://blazingbeard.github.io/_p/party-cats-6l4pfcsryn/party-cats-v1.mp4",
      poster: "https://blazingbeard.github.io/_p/party-cats-6l4pfcsryn/poster.jpg",
      link: "https://blazingbeard.github.io/_p/party-cats-6l4pfcsryn/", duration: 153 },
    { title: "Three Lilys", sub: "For kids", line: "A gentle, bright musical made for kids.",
      video: "https://blazingbeard.github.io/_p/three-lilys-jrkti1453q/three-lilys-v1.mp4",
      poster: "https://blazingbeard.github.io/_p/three-lilys-jrkti1453q/poster.jpg",
      link: "https://blazingbeard.github.io/_p/three-lilys-jrkti1453q/", duration: 131 }
  ]
};