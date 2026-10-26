export function mensajeError(error: unknown): string {
  if (!error) return "Ha ocurrido un error inesperado.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Ha ocurrido un error inesperado.";
}
