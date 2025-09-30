import { parseISO } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

const SAO_PAULO_TZ = "America/Sao_Paulo";

// Detecta se a string possui informação explícita de timezone (offset somente)
const hasOffsetTZ = (s: string) => /[+-]\d{2}:\d{2}$/.test(s);

// Converte qualquer entrada para um Date em UTC, tratando strings SEM timezone como horário de São Paulo
const parseToUTC = (date: string | Date): Date => {
  if (typeof date === "string") {
    // Se vier com offset explícito, confiar nele
    if (hasOffsetTZ(date)) return parseISO(date);
    // Caso comum no Postgres: "2025-09-30T16:55:53.000Z" vindo de TIMESTAMP (sem tz)
    // Interpretamos como horário local de São Paulo e então convertemos para UTC
    if (/Z$/.test(date)) {
      const naive = date.replace(/Z$/, "");
      return fromZonedTime(naive, SAO_PAULO_TZ);
    }
    // Sem info de TZ: tratar como horário de São Paulo
    return fromZonedTime(date, SAO_PAULO_TZ);
  }
  return date;
};

/**
 * Formata uma data para o timezone de São Paulo com segundos
 */
export const formatDateTimeSP = (date: string | Date | null | undefined): string => {
  if (!date) return "-";
  
  try {
    const dateUtc = parseToUTC(date as any);
    return formatInTimeZone(dateUtc, SAO_PAULO_TZ, "dd/MM/yyyy HH:mm:ss");
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
    const dateUtc = parseToUTC(date as any);
    return formatInTimeZone(dateUtc, SAO_PAULO_TZ, "dd/MM/yyyy");
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
  const d = parseToUTC(date as any);
  return toZonedTime(d, SAO_PAULO_TZ);
};
