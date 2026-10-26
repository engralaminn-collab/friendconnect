/**
 * The AI coding dictionary — jargon translated into plain English.
 */

export interface GlossaryTerm {
  term: string;
  short: string;
  plain: string;
  category: "models" | "context" | "tokens" | "cost" | "agents" | "quality" | "tooling" | "evals";
  related: string[];
  seeAlso?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "Token", short: "The unit a model reads and writes.", plain: "A chunk of text — roughly three-quarters of an English word. Models do not see letters or words; they see tokens, and everything they know is measured in them.", category: "tokens", related: ["Context window", "Tokenisation"] },
  { term: "Tokenisation", short: "How text is cut into tokens.", plain: "The rule that turns your prompt into pieces the model can process. The same sentence can be a different number of tokens in different models, which is why prices differ.", category: "tokens", related: ["Token", "Context window"] },
  { term: "Context window", short: "How much the model can hold at once.", plain: "The model's working memory for a single request: the instruction, the files, the conversation so far and the answer. When it is full, the oldest content falls out — which is why long sessions lose the beginning.", category: "context", related: ["Token", "Context degradation"] },
  { term: "Context degradation", short: "Quality drops as context fills.", plain: "The same model gives worse answers when the prompt is longer, even though the important instruction is still in there. The model is not ignoring you; it is spreading attention thinner.", category: "context", related: ["Context window", "Compaction"] },
  { term: "Compaction", short: "Summarising old context to make room.", plain: "When a session gets too long, older messages are replaced with a summary so the important facts survive and the window stays open. It is a lossy operation, and it is why the model sometimes 'forgets' a decision that was made hours ago.", category: "context", related: ["Context window", "Context degradation"] },
  { term: "Context rot", short: "Relevance fades with distance.", plain: "Information near the start or the end of a prompt is used more reliably than information buried in the middle. Put the critical instruction at the top and repeat the constraints at the bottom.", category: "context", related: ["Context degradation"] },
  { term: "System prompt", short: "The standing instruction.", plain: "The instruction that applies to the whole session — who the model is and what it must do. It sits above the conversation and is not something the user writes each time.", category: "models", related: ["Instruction hierarchy"] },
  { term: "Instruction hierarchy", short: "Which instruction wins.", plain: "System instructions outrank user instructions, which outrank anything inside retrieved text. It is the rule that stops a document you asked the model to read from re-programming it.", category: "models", related: ["System prompt", "Prompt injection"] },
  { term: "Prompt injection", short: "Instructions hidden in data.", plain: "A document, a web page or an email that contains text designed to be followed by the model. The defence is the hierarchy plus a rule that retrieved content is data, never instruction.", category: "models", related: ["Instruction hierarchy", "Guardrails"] },
  { term: "Guardrails", short: "Checks around the model.", plain: "Rules and filters applied before and after a model call — blocking a topic, capping a cost, forcing a citation — so the model is never the only thing standing between a request and a bad outcome.", category: "quality", related: ["Prompt injection", "Evaluation"] },
  { term: "Temperature", short: "How random the output is.", plain: "A dial from 0 to 2 that controls how much the model varies its wording. Zero means the most likely token every time, which is what you want for anything that has to be repeatable.", category: "models", related: ["Deterministic", "Sampling"] },
  { term: "Deterministic", short: "Same input, same output.", plain: "A property worth insisting on for anything you will diff, test or regenerate. A non-deterministic pipeline cannot be reviewed, because every run is a new file.", category: "quality", related: ["Temperature", "Seeded randomness"] },
  { term: "Seeded randomness", short: "Random, but repeatable.", plain: "A random number generator given a seed produces the same sequence every time. It is how you get variety in generated content without losing reproducibility.", category: "tooling", related: ["Deterministic"] },
  { term: "Sampling", short: "How a token is chosen.", plain: "At each step the model has a probability distribution over the next token; sampling decides how one is picked. Temperature, top-p and top-k are all ways of reshaping that distribution.", category: "models", related: ["Temperature"] },
  { term: "Top-p", short: "Narrow the candidate set.", plain: "Keep the smallest set of tokens whose probabilities add up to p, and sample from only those. It cuts the long tail of nonsense words without flattening the distribution.", category: "models", related: ["Sampling"] },
  { term: "Reasoning model", short: "A model that thinks first.", plain: "A model trained to spend more compute before answering. It is slower and more expensive, and it is the right choice when the task has steps rather than a single lookup.", category: "models", related: ["Latency", "Routing"] },
  { term: "Latency", short: "How long the answer takes.", plain: "Time from request to first token, and from request to the whole answer. Two different numbers, and the second one is usually what users complain about.", category: "cost", related: ["Tokens per second", "Routing"] },
  { term: "Tokens per second", short: "Output speed.", plain: "How quickly the model produces tokens once it starts. It sets the length of the wait for anything long.", category: "cost", related: ["Latency"] },
  { term: "Tool calling", short: "Letting the model use a function.", plain: "You describe available functions and their parameters; the model asks to call one, your code runs it, and the result goes back into the conversation. The model never touches the network itself.", category: "agents", related: ["Function calling", "MCP"] },
  { term: "Function calling", short: "The original name for tool calling.", plain: "The same mechanism under an older name. The model emits a structured request for a function, and your runtime satisfies it.", category: "agents", related: ["Tool calling"] },
  { term: "MCP", short: "A standard way to expose tools.", plain: "The Model Context Protocol: a common interface for listing tools and resources and calling them, so the same server works with any compatible agent instead of one vendor.", category: "agents", related: ["Tool calling", "MCP server"] },
  { term: "MCP server", short: "A process that serves tools.", plain: "A server that advertises its tools over the protocol. A read-only one that serves documentation is especially useful, because the agent can look things up instead of guessing.", category: "agents", related: ["MCP"] },
  { term: "Agent", short: "A model that takes actions.", plain: "A model inside a loop: decide, call a tool, read the result, decide again. The loop is what makes it an agent rather than a completion.", category: "agents", related: ["Agent loop", "Stop condition"] },
  { term: "Agent loop", short: "Decide, act, observe, repeat.", plain: "The cycle an agent runs. The engineering problem is not the model; it is bounding the loop so it stops.", category: "agents", related: ["Agent", "Stop condition"] },
  { term: "Stop condition", short: "The rule that ends the loop.", plain: "A budget, a deadline, a repetition guard, or a goal predicate the agent can satisfy. You want at least two of them, because each one fails in a different way.", category: "agents", related: ["Agent loop"] },
  { term: "Evaluation", short: "Measuring whether it works.", plain: "A fixed set of inputs with known-good outputs, run against a change. Without evals, a prompt tweak is a guess with a confidence interval of one.", category: "quality", related: ["Evals", "Regression"] },
  { term: "Evals", short: "A repeatable quality check.", plain: "A dataset of cases and a scoring function. Small and boring beats large and vague, because you will actually run them.", category: "quality", related: ["Evaluation"] },
  { term: "Regression", short: "It got worse and you did not notice.", plain: "A change that improves one case and quietly breaks three others. A prompt change is a code change and deserves the same review.", category: "quality", related: ["Evals", "Diff"] },
  { term: "Prompt caching", short: "Reuse the expensive part of a prompt.", plain: "Long, stable instructions are processed once and reused across calls, which cuts both latency and cost for a shared system prompt or a large document.", category: "cost", related: ["Cost per task"] },
  { term: "Cost per task", short: "What a job actually costs.", plain: "Total spend divided by completed jobs, including retries, failed calls and the cost of the tools the agent used. Per-token price is not the same number.", category: "cost", related: ["Cost per token", "Prompt caching"] },
  { term: "Cost per token", short: "The list price.", plain: "What the vendor charges per million tokens. Useful for comparing models; misleading as a measure of value.", category: "cost", related: ["Cost per task"] },
  { term: "Routing", short: "Pick the cheapest model that can do it.", plain: "Rules that send easy requests to a small model and hard ones to a large one. The saving is real only if the classifier is right more often than it is wrong.", category: "cost", related: ["Reasoning model", "Cost per task"] },
  { term: "Fine-tuning", short: "Teaching the model a format.", plain: "Training on your own examples so the model produces your shape of output without being told every time. It is expensive and slow to change, which makes prompting and retrieval the better first move.", category: "models", related: ["Few-shot", "Retrieval"] },
  { term: "Few-shot", short: "Examples in the prompt.", plain: "Showing the model two or three examples of the task instead of describing it. Often the cheapest and fastest way to get a consistent shape.", category: "models", related: ["Fine-tuning"] },
  { term: "Retrieval", short: "Look it up before answering.", plain: "Searching your own documents and putting the relevant parts in the prompt. It is how a model knows things it was never trained on, and it beats fine-tuning for changing information.", category: "models", related: ["RAG", "Embeddings"] },
  { term: "RAG", short: "Retrieval plus generation.", plain: "Search first, then write the answer using what you found. The retrieval quality decides the answer quality, which is why people spend all their time on the index.", category: "models", related: ["Retrieval", "Embeddings"] },
  { term: "Embeddings", short: "Text as coordinates.", plain: "A model that turns text into a vector, so that similar meanings end up near each other. It powers semantic search and clustering.", category: "tooling", related: ["RAG", "Vector database"] },
  { term: "Vector database", short: "Storage for embeddings.", plain: "A database that indexes vectors and answers 'what is near this?'. It is the retrieval half of RAG.", category: "tooling", related: ["Embeddings"] },
  { term: "Structured output", short: "Output that parses.", plain: "Asking the model for JSON or a schema, so the result can be read by code instead of a person. Always validate it anyway — a schema is a request, not a guarantee.", category: "quality", related: ["Schema", "Guardrails"] },
  { term: "Schema", short: "The shape of the data.", plain: "A description of the fields and their types. Giving one to the model produces far more consistent output than describing it in prose.", category: "quality", related: ["Structured output"] },
  { term: "Diff", short: "What changed.", plain: "The difference between two versions. For generated code it is the review surface, which is why deterministic generation matters.", category: "tooling", related: ["Deterministic", "Regression"] },
  { term: "Regression suite", short: "The tests that must keep passing.", plain: "A set of checks that run on every change. For an AI-driven pipeline it usually means evals plus the ordinary unit tests.", category: "quality", related: ["Evals", "Regression"] },
  { term: "Batch API", short: "Many requests, one bill.", plain: "Submit a file of requests and collect the results later. Usually cheaper and slower than sending them one at a time.", category: "cost", related: ["Cost per task"] },
  { term: "Rate limit", short: "How fast you may call.", plain: "Requests per minute or tokens per minute, enforced by the provider. Exceeding it is a queueing problem, not a bug.", category: "cost", related: ["Backoff"] },
  { term: "Backoff", short: "Slow down and retry.", plain: "On a rate limit or a transient error, wait longer before retrying, with jitter so every client does not return at the same moment.", category: "tooling", related: ["Rate limit"] },
  { term: "Hallucination", short: "A confident invention.", plain: "A fluent answer that is not true. It is not a bug in the model; it is what a next-token predictor does when the prompt does not contain the answer.", category: "quality", related: ["Grounding", "Citations"] },
  { term: "Grounding", short: "Anchoring the answer to sources.", plain: "Requiring the answer to cite the retrieved passages it came from, so a human can check it and a program can refuse to answer without them.", category: "quality", related: ["Hallucination", "Citations"] },
  { term: "Citations", short: "Pointing at the evidence.", plain: "References attached to claims, ideally with a span that supports them. The single highest-value feature you can add to a research tool.", category: "quality", related: ["Grounding"] },
  { term: "Distillation", short: "Make a small model behave like a big one.", plain: "Train a small model on the big model's outputs. You get most of the quality at a fraction of the cost, for a narrow domain.", category: "models", related: ["Fine-tuning", "Routing"] },
  { term: "Quantisation", short: "Shrink a model.", plain: "Reducing the precision of the weights so the model takes less memory and runs faster. Slight quality loss, often a large cost saving.", category: "tooling", related: ["Local model", "Distillation"] },
  { term: "Local model", short: "A model on your own machine.", plain: "Weights running on your hardware. No per-token bill, no data leaving the building, and a hard ceiling on context length and throughput.", category: "models", related: ["Quantisation", "Ollama"] },
  { term: "Ollama", short: "A local model runner.", plain: "A small server that hosts open models locally and exposes them over an HTTP API that looks like a hosted provider. It is the usual way to run an offline stack.", category: "tooling", related: ["Local model"] },
  { term: "Open weights", short: "Model weights you can download.", plain: "Models whose weights are published. You can run them, fine-tune them and inspect them — but the training data and the licence still apply.", category: "models", related: ["Local model"] },
  { term: "Context stuffing", short: "Cramming the window.", plain: "Piling as much text as will fit into the prompt. It raises the odds that something relevant is included, and the cost of being wrong about that.", category: "context", related: ["Context window", "Context rot"] },
  { term: "ReAct", short: "Reason, then act.", plain: "A pattern where the model alternates between thinking and calling a tool, so each step is grounded in a fresh observation.", category: "agents", related: ["Agent loop", "Tool calling"] },
  { term: "Chain of thought", short: "Think before answering.", plain: "Letting the model write its reasoning out before the answer. It improves hard problems and makes the reasoning auditable — at the cost of tokens.", category: "models", related: ["Reasoning model"] },
  { term: "Harness", short: "The scaffolding around the model.", plain: "The code that decides what the model sees, what tools it can use, and when it stops. Most of the quality lives here, not in the model.", category: "tooling", related: ["Agent loop", "Stop condition"] },
  { term: "Prompt library", short: "Reusable prompts.", plain: "Prompts kept as versioned code, with the variables, the model and the evaluation attached. A prompt in a chat window is not a prompt you can maintain.", category: "tooling", related: ["Harness", "Evals"] },
  { term: "Fewer knobs", short: "One way to do a thing.", plain: "The principle that a system with three ways to do something has zero ways to do it consistently. Every extra option is a support burden.", category: "tooling", related: ["Guardrails"] },
];

export const GLOSSARY_CATEGORIES: {
  id: GlossaryTerm["category"];
  label: string;
  icon: string;
  colour: string;
}[] = [
  { id: "models", label: "Models", icon: "🧠", colour: "#3b64f6" },
  { id: "context", label: "Context", icon: "🗂️", colour: "#14b8a6" },
  { id: "tokens", label: "Tokens", icon: "🔤", colour: "#8b5cf6" },
  { id: "cost", label: "Cost & speed", icon: "💸", colour: "#f59e0b" },
  { id: "agents", label: "Agents", icon: "🤖", colour: "#ec4899" },
  { id: "quality", label: "Quality", icon: "✅", colour: "#22c55e" },
  { id: "tooling", label: "Tooling", icon: "🛠️", colour: "#0ea5e9" },
  { id: "evals", label: "Evals", icon: "📊", colour: "#ef4444" },
];
