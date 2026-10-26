/* ============================================================
   Exam papers
   ------------------------------------------------------------
   Original passages and scripts written for this workspace, so
   nothing here is copied from a published test. They follow the
   public task types (multiple choice, matching, gap-fill, chart
   description, discussion essay, long turn) so practice transfers.
   ============================================================ */

import type { ExamPaper } from "@/lib/exam";

const listeningScriptOne = `
Good morning, everyone, and welcome to the Riverside Community Library.
Before you settle in, three practical notes.

First, the building opens at eight thirty on weekdays, but the reading room on
the first floor does not open until ten, because the cleaning team need that
window. If you arrive early, the café in the basement serves coffee from eight.

Second, borrowing. You may take out up to twelve items at a time, and the loan
period is three weeks rather than the two weeks we ran last year. Renewals are
automatic once, unless another reader has reserved the item.

Third, and this is the part most people miss: the quiet study floor closes for
maintenance on the first Monday of every month. On that day, group rooms on the
ground floor are available without a booking.
`.trim();

const listeningScriptTwo = `
Tutor: So, your proposal is on urban beekeeping. What drew you to the topic?
Student: I read that about a third of the city's community gardens now keep
hives, and I wanted to know whether that actually helps pollination.
Tutor: Good. But your sample size worries me. Two gardens is a case study, not a
survey. I would rather you compared six sites and accepted the extra fieldwork.
Student: That means a whole extra month of visits.
Tutor: It does. Alternatively, keep two sites but add a control — a garden with
no hives — and measure the same plants in all three. That is cheaper and it
answers the same question.
Student: A control garden. That is much better.
`.trim();

const readingPassageOne = `
The quiet return of the urban tree canopy

In 1990, a survey of one European capital counted fewer than nine hundred mature
street trees in its central district. Three decades later the same streets hold
more than four thousand, and the change was not driven by municipal budgets.
It was driven by insurance claims.

After a summer of record heat, insurers noticed that streets with continuous
canopy reported measurably lower surface temperatures, and — more profitably for
the argument — fewer heat-related hospital admissions. A canopy, it turned out,
was cheaper than a clinic. Once that calculation entered the public record,
planting programmes stopped being a matter of taste and became a matter of
infrastructure.

The benefits compound in ways that are easy to overlook. A mature tree
intercepts rainwater, so a street with thirty of them sends noticeably less
runoff into a drainage system designed for a different century. It also slows
traffic: drivers measurably reduce speed on tree-lined roads, and the effect
persists after the novelty has worn off. Residents report that they know their
neighbours better on streets with canopy, although the mechanism there is less
clear — shade makes loitering pleasant, and pleasant loitering makes contact.

None of this is free. A street tree costs roughly four hundred euros to plant
and, over its lifetime, several times that to prune, insure and occasionally
replace. The maintenance bill arrives every year and the benefit arrives in
decades, which is precisely the political problem: a canopy is an investment a
council makes for its successor. Cities that have succeeded tend to have solved
that problem structurally, by binding the planting budget to the drainage and
health budgets rather than to a parks department alone.
`.trim();

const readingPassageTwo = `
Why standards outlive their authors

A standard looks like a document. In practice it is a promise that two
strangers can cooperate without meeting. The promise is valuable only while both
parties believe the other will keep it, which means a standard's real asset is
not its text but its credibility.

This explains a pattern that puzzles newcomers: the better standard rarely wins.
A technically superior format can lose to a merely adequate one if the adequate
one arrived earlier and was adopted by a large enough group. Each new adopter
lowers the risk for the next adopter, and the loop closes before quality has had
a chance to matter. Economists call this lock-in; engineers call it Tuesday.

Lock-in is not permanent, but it breaks in a particular way. Standards are
abandoned when the cost of the workaround exceeds the cost of migration, and
that comparison is usually triggered by an outside shock rather than by
persuasion. A security failure, a licensing change, or a sudden shortage of
people who understand the old system will do more in a quarter than a decade of
better documentation.

The practical lesson for anyone writing a standard today is therefore modest.
Optimise for the second implementer, not the first: publish the awkward cases,
ship a reference implementation, and make the failure modes explicit. A standard
that is pleasant to implement badly will be implemented badly, everywhere, for
twenty years.
`.trim();

const chartTask = `
The chart below shows how commuters in one city travelled to work in 2005 and in
2025.

2005 — car 54%, bus 21%, rail 11%, bicycle 6%, walking 5%, other 3%
2025 — car 31%, bus 19%, rail 27%, bicycle 14%, walking 7%, other 2%
`.trim();

export const EXAM_PAPERS: ExamPaper[] = [
  {
    id: "ielts-academic-1",
    title: "IELTS Academic — full practice test",
    level: "IELTS Academic · bands 4–9",
    scale: "ielts",
    description:
      "Four sections in exam order: listening with a spoken script, two academic passages, a chart description, a discussion essay and a three-part speaking interview. Objective sections are marked; writing and speaking are self-assessed against the public descriptors.",
    sections: [
      {
        id: "lis",
        skill: "listening",
        title: "Listening",
        minutes: 12,
        instructions:
          "Play each recording once. You may take notes. Answer while you listen — the recording is not repeated.",
        script: `${listeningScriptOne}\n\n${listeningScriptTwo}`,
        questions: [
          {
            id: "lis1",
            kind: "single",
            prompt: "On weekdays, when does the first-floor reading room open?",
            options: [
              { id: "a", label: "08:00" },
              { id: "b", label: "08:30" },
              { id: "c", label: "10:00" },
              { id: "d", label: "It does not open on weekdays" },
            ],
            answer: ["c"],
            explanation: "The script says the reading room opens at ten because cleaning needs that window.",
          },
          {
            id: "lis2",
            kind: "single",
            prompt: "How many items may a reader borrow at once?",
            options: [
              { id: "a", label: "Eight" },
              { id: "b", label: "Twelve" },
              { id: "c", label: "Three" },
              { id: "d", label: "Twenty" },
            ],
            answer: ["b"],
            explanation: "Up to twelve items at a time.",
          },
          {
            id: "lis3",
            kind: "single",
            prompt: "The loan period this year is…",
            options: [
              { id: "a", label: "two weeks" },
              { id: "b", label: "three weeks" },
              { id: "c", label: "one month" },
              { id: "d", label: "unlimited" },
            ],
            answer: ["b"],
            explanation: "Three weeks rather than the two weeks run last year.",
          },
          {
            id: "lis4",
            kind: "single",
            prompt: "Renewals happen automatically unless…",
            options: [
              { id: "a", label: "the reader is late" },
              { id: "b", label: "another reader has reserved the item" },
              { id: "c", label: "the item is a DVD" },
              { id: "d", label: "the reader asks for one" },
            ],
            answer: ["b"],
            explanation: "Automatic once, unless the item is reserved by someone else.",
          },
          {
            id: "lis5",
            kind: "text",
            prompt: "Which floor closes on the first Monday of each month? (one word)",
            answer: ["quiet study floor", "study floor", "quiet floor"],
            explanation: "The quiet study floor closes for maintenance.",
          },
          {
            id: "lis6",
            kind: "single",
            prompt: "Why does the tutor prefer a control garden?",
            options: [
              { id: "a", label: "It is quicker to visit" },
              { id: "b", label: "It answers the same question more cheaply" },
              { id: "c", label: "It avoids the need for fieldwork" },
              { id: "d", label: "It needs a larger sample" },
            ],
            answer: ["b"],
            explanation: "The tutor calls it cheaper and says it answers the same question.",
          },
          {
            id: "lis7",
            kind: "single",
            prompt: "How many sites does the tutor first suggest comparing?",
            options: [
              { id: "a", label: "Two" },
              { id: "b", label: "Three" },
              { id: "c", label: "Six" },
              { id: "d", label: "Thirty" },
            ],
            answer: ["c"],
            explanation: "The tutor would rather the student compared six sites.",
          },
          {
            id: "lis8",
            kind: "multi",
            prompt: "Which two costs of extra fieldwork does the student imply? (choose two)",
            options: [
              { id: "a", label: "More time" },
              { id: "b", label: "More equipment" },
              { id: "c", label: "A further month of visits" },
              { id: "d", label: "A new supervisor" },
            ],
            answer: ["a", "c"],
            explanation: "The student objects to the extra month of visits; the tutor calls it more fieldwork.",
          },
        ],
      },
      {
        id: "rea",
        skill: "reading",
        title: "Reading",
        minutes: 25,
        instructions:
          "Read each passage and answer the questions. For matching questions, select every option that applies.",
        passage: `${readingPassageOne}\n\n---\n\n${readingPassageTwo}`,
        questions: [
          {
            id: "rea1",
            kind: "single",
            prompt: "What triggered the tree-planting programmes described in Passage 1?",
            options: [
              { id: "a", label: "A rise in municipal budgets" },
              { id: "b", label: "A resident campaign" },
              { id: "c", label: "Insurance calculations about heat" },
              { id: "d", label: "A change in planning law" },
            ],
            answer: ["c"],
            explanation: "The passage states that insurance claims drove the change.",
          },
          {
            id: "rea2",
            kind: "multi",
            prompt: "Which TWO benefits of canopy does Passage 1 mention? (choose two)",
            options: [
              { id: "a", label: "Less rainwater runoff" },
              { id: "b", label: "Higher property prices" },
              { id: "c", label: "Slower traffic" },
              { id: "d", label: "Fewer insects" },
            ],
            answer: ["a", "c"],
            explanation: "Intercepted rainwater and reduced driving speed are both named.",
          },
          {
            id: "rea3",
            kind: "single",
            prompt: "The author describes the maintenance cost as a political problem because…",
            options: [
              { id: "a", label: "it is larger than the planting cost" },
              { id: "b", label: "it is paid now while the benefit arrives later" },
              { id: "c", label: "voters dislike trees" },
              { id: "d", label: "councils cannot borrow money" },
            ],
            answer: ["b"],
            explanation: "The bill arrives every year, the benefit in decades.",
          },
          {
            id: "rea4",
            kind: "text",
            prompt: "In Passage 1, which budget should planting be bound to besides drainage? (one word)",
            answer: ["health", "health budget", "the health budget"],
            explanation: "The passage names the drainage and health budgets.",
          },
          {
            id: "rea5",
            kind: "single",
            prompt: "In Passage 2, a standard's real asset is described as…",
            options: [
              { id: "a", label: "its length" },
              { id: "b", label: "its credibility" },
              { id: "c", label: "its author" },
              { id: "d", label: "its licence" },
            ],
            answer: ["b"],
            explanation: "The text says credibility, not the text itself, is the asset.",
          },
          {
            id: "rea6",
            kind: "single",
            prompt: "Why can an adequate standard beat a better one?",
            options: [
              { id: "a", label: "Better standards are usually harder to read" },
              { id: "b", label: "Early adoption lowers risk for each next adopter" },
              { id: "c", label: "Regulators ban better formats" },
              { id: "d", label: "Quality is irrelevant once published" },
            ],
            answer: ["b"],
            explanation: "Each new adopter lowers the risk for the next, closing the loop.",
          },
          {
            id: "rea7",
            kind: "multi",
            prompt: "Which TWO events does Passage 2 name as triggers for abandoning a standard? (choose two)",
            options: [
              { id: "a", label: "A security failure" },
              { id: "b", label: "A better document" },
              { id: "c", label: "A licensing change" },
              { id: "d", label: "A conference" },
            ],
            answer: ["a", "c"],
            explanation: "Security failures, licensing changes and skill shortages are named.",
          },
          {
            id: "rea8",
            kind: "single",
            prompt: "What does the author recommend optimising for?",
            options: [
              { id: "a", label: "The first implementer" },
              { id: "b", label: "The second implementer" },
              { id: "c", label: "The regulator" },
              { id: "d", label: "The marketing team" },
            ],
            answer: ["b"],
            explanation: "“Optimise for the second implementer, not the first.”",
          },
          {
            id: "rea9",
            kind: "text",
            prompt: "Which single word does Passage 2 use for the phenomenon where an inferior standard persists? (one word)",
            answer: ["lock-in", "lock in", "lockin"],
            explanation: "Economists call it lock-in.",
          },
          {
            id: "rea10",
            kind: "multi",
            prompt: "Which TWO things should a standard publish, according to Passage 2? (choose two)",
            options: [
              { id: "a", label: "The awkward cases" },
              { id: "b", label: "Its failure modes" },
              { id: "c", label: "Its funding sources" },
              { id: "d", label: "A marketing plan" },
            ],
            answer: ["a", "b"],
            explanation: "Publish awkward cases and make failure modes explicit.",
          },
        ],
      },
      {
        id: "wri",
        skill: "writing",
        title: "Writing",
        minutes: 40,
        instructions:
          "Two tasks. Spend about 20 minutes on Task 1 and 20 on Task 2. Write in the box; the word counter runs live.",
        passage: chartTask,
        questions: [
          {
            id: "wri1",
            kind: "task",
            prompt:
              "Task 1 — Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
            wordLimit: [150, 220],
            instructions:
              "Band 6 needs an overview and accurate figures. Band 7 needs a clear overview in the first paragraph and grouped comparisons rather than a list of every number.",
          },
          {
            id: "wri2",
            kind: "task",
            prompt:
              "Task 2 — Some people believe cities should spend on public transport rather than on roads for private cars. To what extent do you agree or disagree? Write at least 250 words.",
            wordLimit: [250, 340],
            instructions:
              "Band 7 requires a clear position throughout, one idea per paragraph, and examples that are specific rather than generic.",
          },
        ],
      },
      {
        id: "spo",
        skill: "speaking",
        title: "Speaking",
        minutes: 12,
        instructions:
          "Read each prompt aloud and record yourself if you can. Then score the recording against the descriptors beside the slider.",
        questions: [
          {
            id: "spo1",
            kind: "task",
            prompt:
              "Part 1 (4–5 minutes) — Where do you live now, and what would you change about it? Speak for about a minute.",
            instructions:
              "Band 6: willing to speak at length but with noticeable repetition. Band 7: some flexibility, uses connectives, occasional self-correction.",
          },
          {
            id: "spo2",
            kind: "task",
            prompt:
              "Part 2 (1–2 minutes) — Describe a journey that did not go as planned. Say where you were going, what went wrong, and how it ended.",
            instructions:
              "Band 7 needs a coherent narrative with tense control; band 8 needs precise vocabulary for the complication.",
          },
          {
            id: "spo3",
            kind: "task",
            prompt:
              "Part 3 (4–5 minutes) — Why do people tolerate unreliable public transport more than unreliable roads? Give reasons and examples.",
            instructions:
              "Band 7: develops abstract ideas with examples. Band 8: sustains a position and concedes a counter-argument.",
          },
        ],
      },
    ],
  },
  {
    id: "toefl-practice-1",
    title: "TOEFL iBT — practice set",
    level: "TOEFL iBT · 0–120",
    scale: "toefl",
    description:
      "A shorter integrated set: two reading passages, a listening lecture, one integrated writing task, one academic discussion task and two speaking prompts. Scaled to the 0–120 TOEFL total.",
    sections: [
      {
        id: "t-read",
        skill: "reading",
        title: "Reading",
        minutes: 18,
        instructions: "Answer the questions about the passages.",
        passage: `${readingPassageTwo}`,
        questions: [
          {
            id: "tr1",
            kind: "single",
            prompt: "The author compares a standard to a promise because…",
            options: [
              { id: "a", label: "both are legally enforced" },
              { id: "b", label: "both let strangers cooperate without meeting" },
              { id: "c", label: "both are written down" },
              { id: "d", label: "both expire" },
            ],
            answer: ["b"],
          },
          {
            id: "tr2",
            kind: "single",
            prompt: "According to the passage, which statement is true of a technically superior format?",
            options: [
              { id: "a", label: "It always wins" },
              { id: "b", label: "It can lose to an earlier, adequate one" },
              { id: "c", label: "It is never adopted" },
              { id: "d", label: "It lowers adoption risk" },
            ],
            answer: ["b"],
          },
          {
            id: "tr3",
            kind: "single",
            prompt: "The phrase “engineers call it Tuesday” suggests that lock-in is…",
            options: [
              { id: "a", label: "unusual" },
              { id: "b", label: "routine" },
              { id: "c", label: "illegal" },
              { id: "d", label: "recent" },
            ],
            answer: ["b"],
          },
          {
            id: "tr4",
            kind: "multi",
            prompt: "Which TWO shocks does the passage say can break lock-in?",
            options: [
              { id: "a", label: "A security failure" },
              { id: "b", label: "A shortage of skilled people" },
              { id: "c", label: "A new textbook" },
              { id: "d", label: "A merger" },
            ],
            answer: ["a", "b"],
          },
          {
            id: "tr5",
            kind: "text",
            prompt: "What should a standard optimise for? (one word: first or second)",
            answer: ["second", "second implementer"],
          },
          {
            id: "tr6",
            kind: "single",
            prompt: "The passage's advice to authors is best described as…",
            options: [
              { id: "a", label: "ambitious" },
              { id: "b", label: "modest and practical" },
              { id: "c", label: "pessimistic" },
              { id: "d", label: "political" },
            ],
            answer: ["b"],
          },
        ],
      },
      {
        id: "t-lis",
        skill: "listening",
        title: "Listening",
        minutes: 10,
        instructions: "Play the recording once, then answer.",
        script: listeningScriptTwo,
        questions: [
          {
            id: "tl1",
            kind: "single",
            prompt: "The student's topic is…",
            options: [
              { id: "a", label: "urban beekeeping" },
              { id: "b", label: "soil erosion" },
              { id: "c", label: "library funding" },
              { id: "d", label: "traffic calming" },
            ],
            answer: ["a"],
          },
          {
            id: "tl2",
            kind: "single",
            prompt: "What is the tutor's main objection?",
            options: [
              { id: "a", label: "The topic is unoriginal" },
              { id: "b", label: "The sample is too small" },
              { id: "c", label: "The student is late" },
              { id: "d", label: "The data is confidential" },
            ],
            answer: ["b"],
          },
          {
            id: "tl3",
            kind: "single",
            prompt: "Why does the student resist the first suggestion?",
            options: [
              { id: "a", label: "Cost of equipment" },
              { id: "b", label: "An extra month of visits" },
              { id: "c", label: "Permission from the council" },
              { id: "d", label: "A clash with exams" },
            ],
            answer: ["b"],
          },
          {
            id: "tl4",
            kind: "single",
            prompt: "The control in the tutor's alternative is…",
            options: [
              { id: "a", label: "a garden with hives" },
              { id: "b", label: "a garden with no hives" },
              { id: "c", label: "a laboratory" },
              { id: "d", label: "a second city" },
            ],
            answer: ["b"],
          },
          {
            id: "tl5",
            kind: "text",
            prompt: "How many sites does the tutor first suggest? (write the number)",
            answer: ["6", "six"],
          },
          {
            id: "tl6",
            kind: "single",
            prompt: "The student's final reaction is…",
            options: [
              { id: "a", label: "reluctant agreement" },
              { id: "b", label: "outright refusal" },
              { id: "c", label: "enthusiastic acceptance" },
              { id: "d", label: "confusion" },
            ],
            answer: ["c"],
          },
        ],
      },
      {
        id: "t-wri",
        skill: "writing",
        title: "Writing",
        minutes: 25,
        instructions: "One integrated task and one academic discussion. Write in the box.",
        passage: readingPassageTwo,
        questions: [
          {
            id: "tw1",
            kind: "task",
            prompt:
              "Integrated task (150–225 words) — Summarise the argument that standards persist through credibility rather than quality, and explain how the lecturer's examples support or complicate it.",
            wordLimit: [150, 225],
            instructions: "TOEFL integrated writing rewards accurate attribution: “the reading states… the lecture adds…”.",
          },
          {
            id: "tw2",
            kind: "task",
            prompt:
              "Academic discussion (100–150 words) — Your class is debating whether open standards are worth the slower process. State your position and respond to one classmate who disagrees.",
            wordLimit: [100, 150],
            instructions: "Contribute a position, not a summary; reference the discussion directly.",
          },
        ],
      },
      {
        id: "t-spo",
        skill: "speaking",
        title: "Speaking",
        minutes: 8,
        instructions: "Record an answer for each prompt, then self-assess.",
        questions: [
          {
            id: "ts1",
            kind: "task",
            prompt:
              "Independent task (45 seconds) — Some students prefer to study alone; others prefer groups. Which do you prefer? Give reasons.",
            instructions: "TOEFL speaking rewards a clear structure: position, two reasons, one example, a closing sentence.",
          },
          {
            id: "ts2",
            kind: "task",
            prompt:
              "Integrated task (60 seconds) — The reading says standards persist through credibility. The lecture adds that credibility collapses after a security failure. Summarise both and explain the relationship.",
            instructions: "Do not give your opinion; report the two sources accurately and connect them.",
          },
        ],
      },
    ],
  },
  {
    id: "placement-1",
    title: "Placement check — 15 minutes",
    level: "CEFR placement · A2–C1",
    scale: "ielts",
    description:
      "A short adaptive-style placement: eight objective questions across listening and reading. Useful as a first-day check before a full mock.",
    sections: [
      {
        id: "p-lis",
        skill: "listening",
        title: "Listening",
        minutes: 5,
        instructions: "Play the recording once.",
        script: listeningScriptOne,
        questions: [
          {
            id: "pl1",
            kind: "single",
            prompt: "When does the café open?",
            options: [
              { id: "a", label: "07:30" },
              { id: "b", label: "08:00" },
              { id: "c", label: "08:30" },
              { id: "d", label: "10:00" },
            ],
            answer: ["b"],
          },
          {
            id: "pl2",
            kind: "single",
            prompt: "How long is the loan period?",
            options: [
              { id: "a", label: "Two weeks" },
              { id: "b", label: "Three weeks" },
              { id: "c", label: "One month" },
              { id: "d", label: "Three months" },
            ],
            answer: ["b"],
          },
          {
            id: "pl3",
            kind: "text",
            prompt: "How many items can be borrowed at once? (write the number)",
            answer: ["12", "twelve"],
          },
        ],
      },
      {
        id: "p-rea",
        skill: "reading",
        title: "Reading",
        minutes: 10,
        instructions: "Read the passage and answer.",
        passage: readingPassageOne,
        questions: [
          {
            id: "pr1",
            kind: "single",
            prompt: "The number of street trees in the central district…",
            options: [
              { id: "a", label: "fell after 1990" },
              { id: "b", label: "rose from under 900 to over 4,000" },
              { id: "c", label: "stayed the same" },
              { id: "d", label: "is unknown" },
            ],
            answer: ["b"],
          },
          {
            id: "pr2",
            kind: "multi",
            prompt: "Which TWO effects of canopy are mentioned? (choose two)",
            options: [
              { id: "a", label: "Cooler surfaces" },
              { id: "b", label: "Fewer hospital admissions" },
              { id: "c", label: "Cheaper insurance for drivers" },
              { id: "d", label: "More parking" },
            ],
            answer: ["a", "b"],
          },
          {
            id: "pr3",
            kind: "single",
            prompt: "The maintenance bill arrives…",
            options: [
              { id: "a", label: "once, at planting" },
              { id: "b", label: "every year" },
              { id: "c", label: "only when a tree dies" },
              { id: "d", label: "never" },
            ],
            answer: ["b"],
          },
          {
            id: "pr4",
            kind: "text",
            prompt: "Which two budgets does the passage suggest binding planting to? Drainage and…",
            answer: ["health", "health budget"],
          },
        ],
      },
      {
        id: "p-wri",
        skill: "writing",
        title: "Writing",
        minutes: 0,
        instructions: "Optional: a short sample so the operator can place your writing.",
        questions: [
          {
            id: "pw1",
            kind: "task",
            prompt:
              "In 80–120 words, describe what you would change about your own neighbourhood and why.",
            wordLimit: [80, 120],
            instructions: "Placed at B2: connected sentences with reasons. C1: precise vocabulary and a concession.",
          },
        ],
      },
    ],
  },
];

export function getPaper(id: string): ExamPaper | undefined {
  return EXAM_PAPERS.find((paper) => paper.id === id);
}
