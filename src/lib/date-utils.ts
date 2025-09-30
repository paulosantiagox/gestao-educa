import { format, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

const SAO_PAULO_TZ = "America/Sao_Paulo";

/**
 * Formata uma data para o timezone de São Paulo com segundos
 */
export const formatDateTimeSP = (date: string | Date | null | undefined): string => {
  if (!date) return "-";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return formatInTimeZone(dateObj, SAO_PAULO_TZ, "dd/MM/yyyy HH:mm:ss");
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return "-";
  }
};

/**
 * Formata apenas a data (sem hora) para o timezone de São Paulo
 */
export const formatDateSP = (date: string | Date | null | undefined): string => {
  if (!date) return "-";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return formatInTimeZone(dateObj, SAO_PAULO_TZ, "dd/MM/yyyy");
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return "-";
  }
};

/**
 * Converte uma data do timezone de São Paulo para UTC (para enviar ao backend)
 */
export const toUTC = (date: Date): Date => {
  return fromZonedTime(date, SAO_PAULO_TZ);
};

/**
 * Converte uma data UTC para o timezone de São Paulo (para exibir no frontend)
 */
export const toSaoPaulo = (date: string | Date): Date => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(dateObj, SAO_PAULO_TZ);
};
