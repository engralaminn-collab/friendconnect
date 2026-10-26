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
  ws.addStudent = (student) => {
    const created = {
      ...student,
      id: nextId("st"),
      createdAt: new Date().toISOString(),
      avatarHue: 210,
    };
    ws.students = [created, ...ws.students];
    return created;
  };
  ws.addPost = (post) => {
    const created = {
      ...post,
      id: nextId("po"),
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: 0,
    };
    ws.posts = [created, ...ws.posts];
    return created;
  };
  ws.addEvent = (event) => {
    const created = { ...event, id: nextId("ev") };
    ws.events = [created, ...ws.events];
    return created;
  };
  ws.addCall = (call) => {
    const created = { ...call, id: nextId("cl") };
    ws.calls = [created, ...ws.calls];
    return created;
  };
  ws.toggleGateway = (id) => {
    ws.gateways = ws.gateways.map((gateway) =>
      gateway.id === id ? { ...gateway, connected: !gateway.connected } : gateway,
    );
  };
  ws.updateGateway = (id, patch) => {
    ws.gateways = ws.gateways.map((gateway) =>
      gateway.id === id ? { ...gateway, ...patch } : gateway,
    );
  };
  ws.togglePlugin = (id) => {
    ws.plugins = ws.plugins.map((plugin) =>
      plugin.id === id ? { ...plugin, installed: !plugin.installed } : plugin,
    );
  };
  ws.toggleNotePin = (id) => {
    ws.notes = ws.notes.map((note) => (note.id === id ? { ...note, pinned: !note.pinned } : note));
  };
  ws.updateWikiPage = (id, patch) => {
    ws.wikiPages = ws.wikiPages.map((page) => (page.id === id ? { ...page, ...patch } : page));
  };
  ws.saveDiagram = (diagram) => {
    const created = {
      ...diagram,
      id: diagram.id ?? nextId("dg"),
      updatedAt: new Date().toISOString(),
    };
    ws.diagrams = [created, ...ws.diagrams.filter((item) => item.id !== created.id)];
    return created;
  };
  ws.markAllNotificationsRead = () => {
    ws.notifications = ws.notifications.map((notification) => ({ ...notification, read: true }));
  };
  ws.setKidSafe = (on) => {
    ws.safety = { ...ws.safety, kidSafe: on };
  };
  ws.examAttempts = [];
  ws.saveExamAttempt = (attempt) => {
    const exists = ws.examAttempts.some((item) => item.id === attempt.id);
    ws.examAttempts = exists
      ? ws.examAttempts.map((item) => (item.id === attempt.id ? attempt : item))
      : [attempt, ...ws.examAttempts];
  };
  ws.removeExamAttempt = (id) => {
    ws.examAttempts = ws.examAttempts.filter((item) => item.id !== id);
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
