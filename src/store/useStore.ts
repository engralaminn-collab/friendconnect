"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Activity,
  Agent,
  AgentRun,
  ApiDefinition,
  Application,
  Article,
  Campaign,
  Company,
  Contact,
  Course,
  Deal,
  Diagram,
  EventItem,
  ID,
  ImageJob,
  Lead,
  Message,
  Note,
  Notification,
  Plugin,
  Post,
  SeoAudit,
  SocialPost,
  Stage,
  Student,
  StudySession,
  Thread,
  University,
  VideoProject,
  VoiceClip,
  WikiPage,
} from "@/lib/types";
import { uid } from "@/lib/utils";
import { seedImageJobs } from "@/lib/data/images";
import {
  seedActivities,
  seedCompanies,
  seedContacts,
  seedDeals,
  seedLeads,
  seedTasks,
} from "@/lib/data/crm";
import {
  seedApplications,
  seedCourses,
  seedStudents,
  seedStudySessions,
  seedUniversities,
} from "@/lib/data/education";
import {
  seedArticles,
  seedCampaigns,
  seedNotifications,
  seedSeoAudits,
  seedSocialPosts,
} from "@/lib/data/marketing";
import {
  seedAgentRuns,
  seedAgents,
  seedDiagrams,
  seedVideos,
  seedVoiceClips,
} from "@/lib/data/studio";
import { seedApis, seedNotes, seedPlugins, seedWikiPages } from "@/lib/data/knowledge";
import { seedEvents, seedPosts, seedThreads } from "@/lib/data/community";

export interface AppState {
  /* ---------- CRM ---------- */
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
  leads: Lead[];
  activities: Activity[];
  tasks: typeof seedTasks;
  /* ---------- Education ---------- */
  universities: University[];
  courses: Course[];
  students: Student[];
  applications: Application[];
  studySessions: StudySession[];
  /* ---------- Marketing ---------- */
  articles: Article[];
  campaigns: Campaign[];
  socialPosts: SocialPost[];
  seoAudits: SeoAudit[];
  /* ---------- Studios ---------- */
  diagrams: Diagram[];
  videos: VideoProject[];
  voiceClips: VoiceClip[];
  agents: Agent[];
  agentRuns: AgentRun[];
  imageJobs: ImageJob[];
  /* ---------- Knowledge ---------- */
  notes: Note[];
  wikiPages: WikiPage[];
  plugins: Plugin[];
  apis: ApiDefinition[];
  /* ---------- Community ---------- */
  threads: Thread[];
  posts: Post[];
  events: EventItem[];
  notifications: Notification[];

  /* ---------- Actions: CRM ---------- */
  addContact: (contact: Omit<Contact, "id" | "createdAt" | "lastContact" | "avatarHue">) => Contact;
  updateContact: (id: ID, patch: Partial<Contact>) => void;
  removeContact: (id: ID) => void;
  toggleContactStar: (id: ID) => void;
  moveContactStage: (id: ID, stage: Stage) => void;
  addCompany: (company: Omit<Company, "id" | "createdAt" | "logoHue">) => Company;
  addDeal: (deal: Omit<Deal, "id" | "createdAt">) => Deal;
  updateDeal: (id: ID, patch: Partial<Deal>) => void;
  moveDeal: (id: ID, stage: Stage) => void;
  removeDeal: (id: ID) => void;
  updateLead: (id: ID, patch: Partial<Lead>) => void;
  removeLead: (id: ID) => void;
  addActivity: (activity: Omit<Activity, "id" | "createdAt">) => void;
  toggleActivity: (id: ID) => void;
  toggleTask: (id: ID) => void;
  addTask: (task: { title: string; priority: "low" | "medium" | "high"; module: string }) => void;
  removeTask: (id: ID) => void;

  /* ---------- Actions: Education ---------- */
  addStudent: (student: Omit<Student, "id" | "createdAt" | "avatarHue">) => Student;
  updateStudent: (id: ID, patch: Partial<Student>) => void;
  updateApplication: (id: ID, patch: Partial<Application>) => void;
  toggleChecklist: (appId: ID, itemId: ID) => void;
  addStudySession: (session: Omit<StudySession, "id">) => void;
  updateStudySession: (id: ID, patch: Partial<StudySession>) => void;

  /* ---------- Actions: Marketing ---------- */
  addArticle: (article: Omit<Article, "id" | "createdAt" | "readTime" | "views" | "conversions">) => Article;
  updateArticle: (id: ID, patch: Partial<Article>) => void;
  removeArticle: (id: ID) => void;
  updateCampaign: (id: ID, patch: Partial<Campaign>) => void;
  addCampaign: (campaign: Omit<Campaign, "id">) => Campaign;
  addSocialPost: (post: Omit<SocialPost, "id" | "engagement">) => SocialPost;
  updateSocialPost: (id: ID, patch: Partial<SocialPost>) => void;
  removeSocialPost: (id: ID) => void;
  addSeoAudit: (audit: Omit<SeoAudit, "id" | "scannedAt">) => void;

  /* ---------- Actions: Studios ---------- */
  saveDiagram: (diagram: Omit<Diagram, "id" | "updatedAt"> & { id?: ID }) => Diagram;
  removeDiagram: (id: ID) => void;
  updateVideo: (id: ID, patch: Partial<VideoProject>) => void;
  addVideo: (video: Omit<VideoProject, "id" | "createdAt">) => VideoProject;
  addVoiceClip: (clip: Omit<VoiceClip, "id" | "createdAt">) => VoiceClip;
  removeVoiceClip: (id: ID) => void;
  addAgent: (agent: Omit<Agent, "id" | "createdAt" | "runs" | "successRate">) => Agent;
  updateAgent: (id: ID, patch: Partial<Agent>) => void;
  addAgentRun: (run: Omit<AgentRun, "id" | "startedAt">) => void;
  addImageJob: (job: Omit<ImageJob, "id" | "createdAt">) => ImageJob;
  toggleImageFavorite: (id: ID) => void;
  removeImageJob: (id: ID) => void;

  /* ---------- Actions: Knowledge ---------- */
  saveNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt"> & { id?: ID }) => Note;
  removeNote: (id: ID) => void;
  toggleNotePin: (id: ID) => void;
  updateWikiPage: (id: ID, patch: Partial<WikiPage>) => void;
  addWikiPage: (page: Omit<WikiPage, "id" | "updatedAt">) => WikiPage;
  togglePlugin: (id: ID) => void;
  /* ---------- Community ---------- */
  addPost: (post: Omit<Post, "id" | "createdAt" | "likes" | "comments">) => Post;
  addEvent: (event: Omit<EventItem, "id">) => EventItem;
  toggleLike: (id: ID) => void;
  sendMessage: (threadId: ID, body: string) => void;
  markThreadRead: (id: ID) => void;
  createThread: (thread: Omit<Thread, "id" | "updatedAt" | "unread" | "messages">) => Thread;
  markNotificationRead: (id: ID) => void;
  markAllNotificationsRead: () => void;
  resetWorkspace: () => void;
}

const hue = () => Math.floor(Math.random() * 360);

const initialState = {
  contacts: seedContacts,
  companies: seedCompanies,
  deals: seedDeals,
  leads: seedLeads,
  activities: seedActivities,
  tasks: seedTasks,
  universities: seedUniversities,
  courses: seedCourses,
  students: seedStudents,
  applications: seedApplications,
  studySessions: seedStudySessions,
  articles: seedArticles,
  campaigns: seedCampaigns,
  socialPosts: seedSocialPosts,
  seoAudits: seedSeoAudits,
  diagrams: seedDiagrams,
  videos: seedVideos,
  voiceClips: seedVoiceClips,
  agents: seedAgents,
  agentRuns: seedAgentRuns,
  imageJobs: seedImageJobs,
  notes: seedNotes,
  wikiPages: seedWikiPages,
  plugins: seedPlugins,
  apis: seedApis,
  threads: seedThreads,
  posts: seedPosts,
  events: seedEvents,
  notifications: seedNotifications,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /* ---------------- CRM ---------------- */
      addContact: (contact) => {
        const created: Contact = {
          ...contact,
          id: uid("ct"),
          createdAt: new Date().toISOString(),
          lastContact: new Date().toISOString(),
          avatarHue: hue(),
        };
        set((s) => ({ contacts: [created, ...s.contacts] }));
        return created;
      },
      updateContact: (id, patch) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeContact: (id) =>
        set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),
      toggleContactStar: (id) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === id ? { ...c, starred: !c.starred } : c,
          ),
        })),
      moveContactStage: (id, stage) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, stage } : c)),
        })),
      addCompany: (company) => {
        const created: Company = {
          ...company,
          id: uid("co"),
          createdAt: new Date().toISOString(),
          logoHue: hue(),
        };
        set((s) => ({ companies: [created, ...s.companies] }));
        return created;
      },
      addDeal: (deal) => {
        const created: Deal = { ...deal, id: uid("dl"), createdAt: new Date().toISOString() };
        set((s) => ({ deals: [created, ...s.deals] }));
        return created;
      },
      updateDeal: (id, patch) =>
        set((s) => ({ deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      moveDeal: (id, stage) =>
        set((s) => {
          const deal = s.deals.find((d) => d.id === id);
          const activities = deal
            ? [
                {
                  id: uid("ac"),
                  type: "stage_change" as const,
                  title: `${deal.title} → ${stage}`,
                  detail: `Stage moved to ${stage}.`,
                  dealId: id,
                  contactId: deal.contactId,
                  done: true,
                  createdAt: new Date().toISOString(),
                },
                ...s.activities,
              ]
            : s.activities;
          return {
            deals: s.deals.map((d) => (d.id === id ? { ...d, stage } : d)),
            activities,
          };
        }),
      removeDeal: (id) => set((s) => ({ deals: s.deals.filter((d) => d.id !== id) })),
      updateLead: (id, patch) =>
        set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      removeLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),
      addActivity: (activity) =>
        set((s) => ({
          activities: [
            { ...activity, id: uid("ac"), createdAt: new Date().toISOString() },
            ...s.activities,
          ],
        })),
      toggleActivity: (id) =>
        set((s) => ({
          activities: s.activities.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
        })),
      toggleTask: (id) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
      addTask: (task) =>
        set((s) => ({
          tasks: [
            {
              id: uid("tk"),
              done: false,
              due: new Date(Date.now() + 3 * 86_400_000).toISOString(),
              createdAt: new Date().toISOString(),
              ...task,
            },
            ...s.tasks,
          ],
        })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      /* ---------------- Education ---------------- */
      addStudent: (student) => {
        const created: Student = {
          ...student,
          id: uid("st"),
          createdAt: new Date().toISOString(),
          avatarHue: hue(),
        };
        set((s) => ({ students: [created, ...s.students] }));
        return created;
      },
      updateStudent: (id, patch) =>
        set((s) => ({ students: s.students.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      updateApplication: (id, patch) =>
        set((s) => ({
          applications: s.applications.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      toggleChecklist: (appId, itemId) =>
        set((s) => ({
          applications: s.applications.map((a) => {
            if (a.id !== appId) return a;
            const checklist = a.checklist.map((c) =>
              c.id === itemId ? { ...c, done: !c.done } : c,
            );
            const progress = Math.round(
              (checklist.filter((c) => c.done).length / checklist.length) * 100,
            );
            return { ...a, checklist, progress };
          }),
        })),
      addStudySession: (session) =>
        set((s) => ({
          studySessions: [{ ...session, id: uid("ss") }, ...s.studySessions],
        })),
      updateStudySession: (id, patch) =>
        set((s) => ({
          studySessions: s.studySessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      /* ---------------- Marketing ---------------- */
      addArticle: (article) => {
        const created: Article = {
          ...article,
          id: uid("ar"),
          createdAt: new Date().toISOString(),
          readTime: Math.max(1, Math.round(article.body.trim().split(/\s+/).length / 220)),
          views: 0,
          conversions: 0,
        };
        set((s) => ({ articles: [created, ...s.articles] }));
        return created;
      },
      updateArticle: (id, patch) =>
        set((s) => ({
          articles: s.articles.map((a) => {
            if (a.id !== id) return a;
            const next = { ...a, ...patch };
            next.readTime = Math.max(
              1,
              Math.round(next.body.trim().split(/\s+/).length / 220),
            );
            return next;
          }),
        })),
      removeArticle: (id) => set((s) => ({ articles: s.articles.filter((a) => a.id !== id) })),
      updateCampaign: (id, patch) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      addCampaign: (campaign) => {
        const created: Campaign = { ...campaign, id: uid("cp") };
        set((s) => ({ campaigns: [created, ...s.campaigns] }));
        return created;
      },
      addSocialPost: (post) => {
        const created: SocialPost = { ...post, id: uid("sp"), engagement: 0 };
        set((s) => ({ socialPosts: [created, ...s.socialPosts] }));
        return created;
      },
      updateSocialPost: (id, patch) =>
        set((s) => ({
          socialPosts: s.socialPosts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removeSocialPost: (id) =>
        set((s) => ({ socialPosts: s.socialPosts.filter((p) => p.id !== id) })),
      addSeoAudit: (audit) =>
        set((s) => ({
          seoAudits: [{ ...audit, id: uid("seo"), scannedAt: new Date().toISOString() }, ...s.seoAudits],
        })),

      /* ---------------- Studios ---------------- */
      saveDiagram: (diagram) => {
        const id = diagram.id ?? uid("dg");
        const created: Diagram = { ...diagram, id, updatedAt: new Date().toISOString() };
        set((s) => {
          const exists = s.diagrams.some((d) => d.id === id);
          return {
            diagrams: exists
              ? s.diagrams.map((d) => (d.id === id ? created : d))
              : [created, ...s.diagrams],
          };
        });
        return created;
      },
      removeDiagram: (id) => set((s) => ({ diagrams: s.diagrams.filter((d) => d.id !== id) })),
      updateVideo: (id, patch) =>
        set((s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      addVideo: (video) => {
        const created: VideoProject = { ...video, id: uid("vd"), createdAt: new Date().toISOString() };
        set((s) => ({ videos: [created, ...s.videos] }));
        return created;
      },
      addVoiceClip: (clip) => {
        const created: VoiceClip = { ...clip, id: uid("vc"), createdAt: new Date().toISOString() };
        set((s) => ({ voiceClips: [created, ...s.voiceClips] }));
        return created;
      },
      removeVoiceClip: (id) =>
        set((s) => ({ voiceClips: s.voiceClips.filter((v) => v.id !== id) })),
      addAgent: (agent) => {
        const created: Agent = {
          ...agent,
          id: uid("ag"),
          createdAt: new Date().toISOString(),
          runs: 0,
          successRate: 100,
        };
        set((s) => ({ agents: [created, ...s.agents] }));
        return created;
      },
      updateAgent: (id, patch) =>
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      addAgentRun: (run) =>
        set((s) => ({
          agentRuns: [{ ...run, id: uid("run"), startedAt: new Date().toISOString() }, ...s.agentRuns],
        })),

      /* ---------------- Knowledge ---------------- */
      saveNote: (note) => {
        const id = note.id ?? uid("nt");
        const now = new Date().toISOString();
        const existing = get().notes.find((n) => n.id === id);
        const created: Note = {
          ...note,
          id,
          updatedAt: now,
          createdAt: existing?.createdAt ?? now,
        };
        set((s) => {
          const exists = s.notes.some((n) => n.id === id);
          return {
            notes: exists ? s.notes.map((n) => (n.id === id ? created : n)) : [created, ...s.notes],
          };
        });
        return created;
      },
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      toggleNotePin: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
        })),
      updateWikiPage: (id, patch) =>
        set((s) => ({
          wikiPages: s.wikiPages.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      togglePlugin: (id) =>
        set((s) => ({
          plugins: s.plugins.map((p) => (p.id === id ? { ...p, installed: !p.installed } : p)),
        })),

      /* ---------------- Community ---------------- */
      addPost: (post) => {
        const created: Post = {
          ...post,
          id: uid("ps"),
          createdAt: new Date().toISOString(),
          likes: 0,
          comments: 0,
        };
        set((s) => ({ posts: [created, ...s.posts] }));
        return created;
      },
      toggleLike: (id) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }
              : p,
          ),
        })),
      addImageJob: (job) => {
        const created: ImageJob = {
          ...job,
          id: uid("img"),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ imageJobs: [created, ...s.imageJobs] }));
        return created;
      },
      toggleImageFavorite: (id) =>
        set((s) => ({
          imageJobs: s.imageJobs.map((j) =>
            j.id === id ? { ...j, favorite: !j.favorite } : j,
          ),
        })),
      removeImageJob: (id) =>
        set((s) => ({ imageJobs: s.imageJobs.filter((j) => j.id !== id) })),
      addWikiPage: (page) => {
        const created: WikiPage = {
          ...page,
          id: uid("wk"),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ wikiPages: [created, ...s.wikiPages] }));
        return created;
      },
      addEvent: (event) => {
        const created: EventItem = { ...event, id: uid("ev") };
        set((s) => ({ events: [...s.events, created] }));
        return created;
      },
      sendMessage: (threadId, body) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  updatedAt: new Date().toISOString(),
                  messages: [
                    ...t.messages,
                    {
                      id: uid("msg"),
                      from: "me" as const,
                      body,
                      at: new Date().toISOString(),
                      status: "sent" as const,
                    },
                  ],
                }
              : t,
          ),
        })),
      markThreadRead: (id) =>
        set((s) => ({
          threads: s.threads.map((t) => (t.id === id ? { ...t, unread: 0 } : t)),
        })),
      createThread: (thread) => {
        const created: Thread = {
          ...thread,
          id: uid("th"),
          updatedAt: new Date().toISOString(),
          unread: 0,
          messages: [] as Message[],
        };
        set((s) => ({ threads: [created, ...s.threads] }));
        return created;
      },
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      resetWorkspace: () => set({ ...initialState }),
    }),
    {
      name: "friendconnect-workspace-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => {
        const { ...rest } = state as AppState & Record<string, unknown>;
        void rest;
        return state;
      },
    },
  ),
);
