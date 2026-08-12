import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Confirma que uma escrita realmente afetou alguma linha.
 *
 * Quando a RLS bloqueia um INSERT/UPDATE/DELETE, o PostgREST NAO devolve erro —
 * devolve sucesso com zero linhas. Sem esta checagem a interface mostra
 * "excluido com sucesso" e nada aconteceu. Usar sempre junto com `.select()`
 * na mutation.
 */
export function garantirEscrita<T>(data: T[] | null, acao: string): T[] {
  if (!data || data.length === 0) {
    throw new Error(
      `Nada foi ${acao}: seu usuário não tem permissão para alterar este cadastro. Fale com um administrador.`
    );
  }
  return data;
}
