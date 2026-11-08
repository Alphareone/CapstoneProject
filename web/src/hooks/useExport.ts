import { api } from "@/lib/api";
import type { ExportJob, PropertyFilter } from "@/types/api";

// Inicia una exportación y consulta su estado hasta llegar a un estado terminal.
export async function runExport(body: {
  format: "csv" | "xlsx";
  property_ids?: string[];
  filters?: PropertyFilter;
  columns?: string[];
}): Promise<ExportJob> {
  const { data } = await api.post<ExportJob>("/api/v1/properties/export", body);
  let job = data;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (job.status === "completed" || job.status === "failed") return job;
    await new Promise((resolve) => window.setTimeout(resolve, 750));
    const response = await api.get<ExportJob>(`/api/v1/exports/${job.job_id}`);
    job = response.data;
  }

  throw new Error("La exportación sigue procesándose. Puedes consultar su estado más tarde.");
}

// La ruta de descarga requiere JWT; por eso se obtiene con Axios y no con window.open().
export async function downloadExport(jobId: string, format: "csv" | "xlsx"): Promise<void> {
  const response = await api.get<Blob>(`/api/v1/exports/${jobId}/download`, {
    responseType: "blob",
  });
  const objectUrl = window.URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `clearbid-export-${jobId}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}
