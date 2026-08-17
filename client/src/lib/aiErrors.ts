export function getAIChatErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : "";
  const normalized = detail.toLowerCase();

  if (normalized.includes("404")) {
    return "El proveedor devolvió 404: revisa la URL base. Para Groq usa https://api.groq.com/openai/v1.";
  }
  if (normalized.includes("401") || normalized.includes("403")) {
    return "El proveedor rechazó la clave API. Verifica la clave, sus permisos y la cuenta del proveedor.";
  }
  if (normalized.includes("429") || normalized.includes("rate limit")) {
    return "El proveedor alcanzó su límite de solicitudes. Espera un momento o revisa la cuota de tu cuenta.";
  }
  if (normalized.includes("no está configurada")) {
    return "La IA aún no está configurada. Un administrador debe guardar una clave API válida.";
  }
  return "No fue posible obtener una respuesta del proveedor de IA. Comprueba la conexión desde Gestión de roles.";
}
