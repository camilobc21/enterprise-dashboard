import { describe, expect, it } from "vitest";
import { getAIChatErrorMessage } from "../client/src/lib/aiErrors";

describe("AI chat error messages", () => {
  it("explains the Groq-compatible 404 endpoint problem", () => {
    expect(getAIChatErrorMessage(new Error("El proveedor de IA respondió 404"))).toContain("https://api.groq.com/openai/v1");
  });

  it("does not expose the raw provider error for unknown failures", () => {
    expect(getAIChatErrorMessage(new Error("internal provider diagnostic"))).toBe("No fue posible obtener una respuesta del proveedor de IA. Comprueba la conexión desde Gestión de roles.");
  });
});
