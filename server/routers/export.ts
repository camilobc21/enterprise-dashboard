import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import { Buffer } from "buffer";

export const exportRouter = router({
  // Generar PDF de reporte WiFi
  generateWiFiReportPDF: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        data: z.object({
          escaneo: z.object({
            total_redes_observadas: z.number().nullable(),
            timestamp: z.string().nullable(),
          }),
          canales: z.array(
            z.object({
              canal: z.number(),
              redes_observadas: z.number().nullable(),
            })
          ),
          limitaciones: z.string(),
          generado_en_utc: z.string(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Crear contenido HTML para PDF
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  color: #333;
                  margin: 20px;
                }
                .header {
                  text-align: center;
                  border-bottom: 3px solid #3b82f6;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                }
                .header h1 {
                  margin: 0;
                  color: #1e40af;
                }
                .header p {
                  margin: 5px 0;
                  color: #666;
                }
                .section {
                  margin-bottom: 30px;
                }
                .section h2 {
                  color: #1e40af;
                  border-left: 4px solid #3b82f6;
                  padding-left: 10px;
                  margin-bottom: 15px;
                }
                .metrics {
                  display: grid;
                  grid-template-columns: 1fr 1fr 1fr;
                  gap: 20px;
                  margin-bottom: 20px;
                }
                .metric-card {
                  border: 1px solid #e5e7eb;
                  padding: 15px;
                  border-radius: 8px;
                  background: #f9fafb;
                }
                .metric-card .label {
                  font-size: 12px;
                  color: #666;
                  text-transform: uppercase;
                }
                .metric-card .value {
                  font-size: 28px;
                  font-weight: bold;
                  color: #1e40af;
                  margin-top: 5px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 10px;
                }
                th {
                  background: #3b82f6;
                  color: white;
                  padding: 10px;
                  text-align: left;
                }
                td {
                  border-bottom: 1px solid #e5e7eb;
                  padding: 10px;
                }
                tr:nth-child(even) {
                  background: #f9fafb;
                }
                .recommendation {
                  background: #dbeafe;
                  border-left: 4px solid #3b82f6;
                  padding: 10px;
                  margin-bottom: 10px;
                  border-radius: 4px;
                }
                .footer {
                  margin-top: 40px;
                  text-align: center;
                  color: #999;
                  font-size: 12px;
                  border-top: 1px solid #e5e7eb;
                  padding-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>📊 ${input.title}</h1>
                <p>Reporte de observaciones WiFi</p>
                <p>Generado: ${new Date(input.data.generado_en_utc).toLocaleString("es-ES")}</p>
              </div>

              <div class="section">
                <h2>Escaneo persistido</h2>
                <div class="metrics">
                  <div class="metric-card">
                    <div class="label">Redes observadas</div>
                    <div class="value">${input.data.escaneo.total_redes_observadas ?? "N/D"}</div>
                  </div>
                </div>
              </div>

              <div class="section">
                <h2>Observaciones por canal</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Canal</th>
                      <th>Redes observadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${input.data.canales
                      .map(
                        (c) => `
                      <tr>
                        <td>Canal ${c.canal}</td>
                        <td>${c.redes_observadas ?? "N/D"}</td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>

              <div class="section">
                <h2>Límites de medición</h2>
                <div class="recommendation">${input.data.limitaciones}</div>
              </div>

              <div class="footer">
                <p>Este reporte contiene únicamente datos persistidos o límites declarados.</p>
                <p>Para más información, visite el dashboard</p>
              </div>
            </body>
          </html>
        `;

        // Generar PDF usando pdf-lib
        try {
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([612, 792]); // Tamaño Letter
          const { height } = page.getSize();
          let yPosition = height - 50;

          // Colores
          const darkBlue = rgb(30 / 255, 64 / 255, 175 / 255);
          const lightBlue = rgb(59 / 255, 130 / 255, 246 / 255);
          const black = rgb(0, 0, 0);
          const gray = rgb(102 / 255, 102 / 255, 102 / 255);

          // Encabezado
          page.drawText(input.title, {
            x: 50,
            y: yPosition,
            size: 24,
            color: darkBlue,
            maxWidth: 512,
          });
          yPosition -= 30;

          page.drawText("Reporte de observaciones WiFi", {
            x: 50,
            y: yPosition,
            size: 12,
            color: gray,
          });
          yPosition -= 20;

          page.drawText(`Generado: ${new Date(input.data.generado_en_utc).toLocaleString("es-ES")}`, {
            x: 50,
            y: yPosition,
            size: 10,
            color: gray,
          });
          yPosition -= 40;

          // Línea separadora
          page.drawLine({
            start: { x: 50, y: yPosition },
            end: { x: 562, y: yPosition },
            thickness: 2,
            color: lightBlue,
          });
          yPosition -= 30;

          // Observaciones del escaneo
          page.drawText("Escaneo persistido", {
            x: 50,
            y: yPosition,
            size: 14,
            color: darkBlue,
          });
          yPosition -= 25;

          const metrics = [{ label: "Redes observadas", value: `${input.data.escaneo.total_redes_observadas ?? "N/D"}` }];

          metrics.forEach((metric, idx) => {
            const xPos = 50 + idx * 170;
            page.drawText(metric.label, {
              x: xPos,
              y: yPosition,
              size: 10,
              color: gray,
            });
            page.drawText(metric.value, {
              x: xPos,
              y: yPosition - 20,
              size: 16,
              color: darkBlue,
            });
          });
          yPosition -= 60;

          // Observaciones por canal
          page.drawText("Observaciones por canal", {
            x: 50,
            y: yPosition,
            size: 14,
            color: darkBlue,
          });
          yPosition -= 25;

          // Tabla de canales
          const tableHeaders = ["Canal", "Redes observadas"];
          const colWidths = [170, 200];
          let xPos = 50;

          tableHeaders.forEach((header, idx) => {
            page.drawText(header, {
              x: xPos,
              y: yPosition,
              size: 10,
              color: rgb(1, 1, 1),
            });
            xPos += colWidths[idx];
          });
          yPosition -= 20;

          // Filas de canales
          input.data.canales.slice(0, 5).forEach((canal) => {
            xPos = 50;
            const rowData = [
              `Canal ${canal.canal}`,
              `${canal.redes_observadas ?? "N/D"}`,
            ];
            rowData.forEach((data, idx) => {
              page.drawText(data, {
                x: xPos,
                y: yPosition,
                size: 9,
                color: black,
              });
              xPos += colWidths[idx];
            });
            yPosition -= 15;
          });
          yPosition -= 20;

          // Límites de medición
          page.drawText("Límites de medición", {
            x: 50,
            y: yPosition,
            size: 14,
            color: darkBlue,
          });
          yPosition -= 20;

          page.drawText(input.data.limitaciones, {
            x: 60,
            y: yPosition,
            size: 9,
            color: black,
            maxWidth: 500,
          });

          // Footer
          page.drawText("Este reporte contiene únicamente datos persistidos o límites declarados.", {
            x: 50,
            y: 30,
            size: 8,
            color: gray,
          });

          const pdfBytes = await pdfDoc.save();
          const base64Pdf = Buffer.from(pdfBytes).toString("base64");

          return {
            success: true,
            pdf: base64Pdf,
            filename: `wifi-report-${Date.now()}.pdf`,
            mimeType: "application/pdf",
          };
        } catch (pdfError) {
          console.error("[Export] Error generando PDF:", pdfError);
          // Fallback a HTML si falla PDF
          return {
            success: true,
            html: htmlContent,
            filename: `wifi-report-${Date.now()}.html`,
          };
        }
      } catch (error) {
        console.error("[Export] Error generando reporte:", error);
        throw new Error("Error generando reporte");
      }
    }),

  // Generar CSV de datos históricos
  generateWiFiHistoryCSV: protectedProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            timestamp: z.string(),
            saturacion: z.number(),
            ocupacion: z.number(),
            perdida: z.number(),
            redes: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Crear CSV
        const headers = ["Timestamp", "Saturación (%)", "Ocupación (%)", "Pérdida (%)", "Redes"];
        const rows = input.data.map((d) => [
          d.timestamp,
          d.saturacion.toFixed(2),
          d.ocupacion.toFixed(2),
          d.perdida.toFixed(2),
          d.redes,
        ]);

        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

        return {
          success: true,
          csv,
          filename: `wifi-history-${Date.now()}.csv`,
        };
      } catch (error) {
        console.error("[Export] Error generando CSV:", error);
        throw new Error("Error generando CSV");
      }
    }),

  // Generar reporte de alertas
  generateAlertsReport: protectedProcedure
    .input(
      z.object({
        alerts: z.array(
          z.object({
            timestamp: z.string(),
            tipo: z.string(),
            severidad: z.string(),
            descripcion: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #1e40af; }
                .alert { 
                  border-left: 4px solid #ef4444;
                  padding: 10px;
                  margin-bottom: 10px;
                  background: #fef2f2;
                }
                .alert.warning {
                  border-left-color: #f97316;
                  background: #fffbeb;
                }
                .alert.info {
                  border-left-color: #3b82f6;
                  background: #eff6ff;
                }
              </style>
            </head>
            <body>
              <h1>📋 Reporte de Alertas</h1>
              <p>Generado: ${new Date().toLocaleString("es-ES")}</p>
              ${input.alerts
                .map(
                  (a) => `
                <div class="alert ${a.severidad.toLowerCase()}">
                  <strong>${a.timestamp}</strong> - ${a.tipo}<br>
                  <small>${a.descripcion}</small>
                </div>
              `
                )
                .join("")}
            </body>
          </html>
        `;

        return {
          success: true,
          html: htmlContent,
          filename: `alerts-report-${Date.now()}.html`,
        };
      } catch (error) {
        console.error("[Export] Error generando reporte de alertas:", error);
        throw new Error("Error generando reporte de alertas");
      }
    }),
});
