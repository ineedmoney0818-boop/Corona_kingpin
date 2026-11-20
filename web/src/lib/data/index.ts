// The app imports data functions from here only. Supabase when configured, the local fake store otherwise.
// Both modules export the same functions with the same signatures; screen code never changes.
import { isSupabase } from "@/lib/supabase/env";
import * as fake from "./fake-store";
import * as supa from "./supabase-store";

export * from "./types";
const impl = (): typeof supa => (isSupabase() ? supa : (fake as unknown as typeof supa));
type Fn<K extends keyof typeof supa> = (typeof supa)[K];
const pick = <K extends keyof typeof supa>(k: K) => ((...a: Parameters<Fn<K> & ((...x: never[]) => unknown)>) => (impl()[k] as (...x: unknown[]) => unknown)(...a)) as Fn<K>;

export const getProfile = pick("getProfile");
export const getAccount = pick("getAccount");
export const listLedger = pick("listLedger");
export const grantMonthly = pick("grantMonthly");
export const addTopup = pick("addTopup");
export const refundRender = pick("refundRender");
export const assertCanAfford = pick("assertCanAfford");
export const createQuote = pick("createQuote");
export const getQuote = pick("getQuote");
export const listProjects = pick("listProjects");
export const createProject = pick("createProject");
export const createAsset = pick("createAsset");
export const updateAsset = pick("updateAsset");
export const getAssets = pick("getAssets");
export const listAssets = pick("listAssets");
export const assetByKey = pick("assetByKey");
export const listChats = pick("listChats");
export const getChat = pick("getChat");
export const createChat = pick("createChat");
export const listMessages = pick("listMessages");
export const addMessage = pick("addMessage");
export const setFeedback = pick("setFeedback");
export const getGeneration = pick("getGeneration");
export const listGenerations = pick("listGenerations");
export const listRenders = pick("listRenders");
export const getRender = pick("getRender");
export const latestRenders = pick("latestRenders");
export const renderByIdempotencyKey = pick("renderByIdempotencyKey");
export const createGenerationAndRender = pick("createGenerationAndRender");
export const savePlan = pick("savePlan");
export const createReRender = pick("createReRender");
export const updateRenderSystem = pick("updateRenderSystem");
export const failRenderSystem = pick("failRenderSystem");
export const claimNextRender = pick("claimNextRender");
export const reapStuckRenders = pick("reapStuckRenders");
export const stuckRenders = pick("stuckRenders");
export const getGenerationSystem = pick("getGenerationSystem");
export const getAssetsSystem = pick("getAssetsSystem");
export const logJobFailure = pick("logJobFailure");
export const hitRateLimit = pick("hitRateLimit");
export const discardMessage = pick("discardMessage");
export const createIdeasReply = pick("createIdeasReply");

// Fake-mode-only auth helpers (Supabase Auth replaces them).
export { createUser, findCredential, createSession, deleteSession, userForSession } from "./fake-store";
