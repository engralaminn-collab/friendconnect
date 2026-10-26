import type { WorkspacePort } from "@/lib/agent/types";

/**
 * A tiny in-memory stand-in for the zustand workspace store.
 *
 * The registry only knows the WorkspacePort interface, so this is enough to
 * exercise every write path without a browser, a localStorage shim or React.
 */
export function makeWorkspace(): WorkspacePort {
  const ws = {
    contacts: [],
    companies: [],
    deals: [],
    leads: [],
    activities: [],
    tasks: [],
    universities: [],
    students: [],
    applications: [],
    studySessions: [],
    articles: [],
    campaigns: [],
    socialPosts: [],
    seoAudits: [],
    diagrams: [],
    videos: [],
    voiceClips: [],
    agents: [],
    imageJobs: [],
    notes: [],
    wikiPages: [],
    plugins: [],
    apis: [],
    threads: [],
    calls: [],
    devices: [],
    gateways: [],
    posts: [],
    events: [],
    notifications: [],
    savedMessages: [],
    reports: [],
    safety: { kidSafe: false } as WorkspacePort["safety"],
  } as unknown as WorkspacePort;

  let seq = 0;
  const nextId = (prefix: string) => `${prefix}_${(seq += 1)}`;

  ws.addContact = (contact) => {
    const created = {
      ...contact,
      id: nextId("ct"),
      createdAt: new Date().toISOString(),
      lastContact: new Date().toISOString(),
      avatarHue: 200,
    };
    ws.contacts = [created, ...ws.contacts];
    return created;
  };
  ws.addCompany = (company) => {
    const created = { ...company, id: nextId("co"), createdAt: new Date().toISOString(), logoHue: 12 };
    ws.companies = [created, ...ws.companies];
    return created;
  };
  ws.addDeal = (deal) => {
    const created = { ...deal, id: nextId("dl"), createdAt: new Date().toISOString() };
    ws.deals = [created, ...ws.deals];
    return created;
  };
  ws.addActivity = (activity) => {
    ws.activities = [
      { ...activity, id: nextId("ac"), createdAt: new Date().toISOString() },
      ...ws.activities,
    ];
  };
  ws.addTask = (task) => {
    ws.tasks = [
      { ...task, id: nextId("tk"), done: false, createdAt: new Date().toISOString() } as never,
      ...ws.tasks,
    ];
  };
  ws.toggleTask = (id) => {
    ws.tasks = ws.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
  };
  ws.moveContactStage = (id, stage) => {
    ws.contacts = ws.contacts.map((contact) =>
      contact.id === id ? { ...contact, stage } : contact,
    );
  };
  ws.updateLead = (id, patch) => {
    ws.leads = ws.leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead));
  };
  ws.updateStudent = (id, patch) => {
    ws.students = ws.students.map((student) => (student.id === id ? { ...student, ...patch } : student));
  };
  ws.addArticle = (article) => {
    const created = {
      ...article,
      id: nextId("ar"),
      createdAt: new Date().toISOString(),
      readTime: 4,
      views: 0,
      conversions: 0,
    };
    ws.articles = [created, ...ws.articles];
    return created;
  };
  ws.addCampaign = (campaign) => {
    const created = { ...campaign, id: nextId("cp") };
    ws.campaigns = [created, ...ws.campaigns];
    return created;
  };
  ws.addSocialPost = (post) => {
    const created = { ...post, id: nextId("sp"), engagement: 0 };
    ws.socialPosts = [created, ...ws.socialPosts];
    return created;
  };
  ws.addSeoAudit = (audit) => {
    ws.seoAudits = [{ ...audit, id: nextId("seo"), scannedAt: new Date().toISOString() }, ...ws.seoAudits];
  };
  ws.saveNote = (note) => {
    const created = {
      ...note,
      id: nextId("nt"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ws.notes = [created, ...ws.notes];
    return created;
  };
  ws.addWikiPage = (page) => {
    const created = { ...page, id: nextId("wk"), updatedAt: new Date().toISOString() };
    ws.wikiPages = [created, ...ws.wikiPages];
    return created;
  };
  ws.createThread = (thread) => {
    const created = {
      ...thread,
      id: nextId("th"),
      unread: 0,
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    ws.threads = [created, ...ws.threads];
    return created;
  };
  ws.sendMessage = (threadId, body) => {
    ws.threads = ws.threads.map((thread) =>
      thread.id === threadId
        ? {
            ...thread,
            messages: [
              ...thread.messages,
              { id: nextId("m"), from: "me", body, at: new Date().toISOString() },
            ],
          }
        : thread,
    );
  };
  ws.addStudySession = (session) => {
    ws.studySessions = [{ ...session, id: nextId("ss") }, ...ws.studySessions];
  };

  return ws;
}

export function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jane Okafor",
    email: "jane@northwind.dev",
    company: "Northwind",
    stage: "lead",
    value: 0,
    source: "test",
    tags: [],
    ...overrides,
  };
}
