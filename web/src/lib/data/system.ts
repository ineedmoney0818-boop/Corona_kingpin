// Server/worker-only data functions (service role in Supabase mode). No Next.js imports, so the
// standalone render worker can use them.
import { isSupabase } from "@/lib/supabase/env";
import * as fake from "./fake-store";
import * as supa from "./supabase-system";

const impl = (): typeof supa => (isSupabase() ? supa : (fake as unknown as typeof supa));
export const updateRenderSystem: typeof supa.updateRenderSystem = (...a) => impl().updateRenderSystem(...a);
export const failRenderSystem: typeof supa.failRenderSystem = (...a) => impl().failRenderSystem(...a);
export const claimNextRender: typeof supa.claimNextRender = (...a) => impl().claimNextRender(...a);
export const reapStuckRenders: typeof supa.reapStuckRenders = (...a) => impl().reapStuckRenders(...a);
export const getGenerationSystem: typeof supa.getGenerationSystem = (...a) => impl().getGenerationSystem(...a);
export const getAssetsSystem: typeof supa.getAssetsSystem = (...a) => impl().getAssetsSystem(...a);
export const logJobFailure: typeof supa.logJobFailure = (...a) => impl().logJobFailure(...a);
export const grantMonthly: typeof supa.grantMonthly = (...a) => impl().grantMonthly(...a);
export const addTopup: typeof supa.addTopup = (...a) => impl().addTopup(...a);
export const refundRender: typeof supa.refundRender = (...a) => impl().refundRender(...a);
