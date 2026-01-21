import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import protocolService from "../../services/protocolService";
import type { Protocol, Visit } from "../../types";
import { PatientVisitForm } from "../../components/protocols/PatientVisitForm";

const steps = [
  "Seleccionar Protocolo y Visita",
  "Completar Formulario",
  "Revisar y Descargar",
];

// Helper function to wait for fileSystem API to be available
const waitForFileSystem = async (
  maxWaitMs: number = 2000
): Promise<boolean> => {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (window.fileSystem) {
      console.log("[Renderer] fileSystem API is now available");
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  console.warn(
    "[Renderer] fileSystem API not available after waiting",
    maxWaitMs,
    "ms"
  );
  return false;
};

export const PatientVisitFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(0);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>("");
  const [selectedVisitId, setSelectedVisitId] = useState<string>("");
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(
    null
  );
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visitData, setVisitData] = useState<any>(null);
  const [generatingHistory, setGeneratingHistory] = useState(false);
  const [importedData, setImportedData] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [editedPreviewText, setEditedPreviewText] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [savedFilePath, setSavedFilePath] = useState("");

  const extractPatientName = (data: any) => {
    let nombreApellido = "";
    if (data?.activities) {
      const nombreApellidoActivity = data.activities.find(
        (activity: any) => activity.name === "Nombre y Apellido"
      );
      if (nombreApellidoActivity) {
        nombreApellido = nombreApellidoActivity.value || "";
      }
    }
    return {
      nombreApellido,
      patientName: nombreApellido || "paciente-desconocido",
    };
  };

  const getVisitDate = (data: any, visit: Visit | null) => {
    let fechaVisita = "";
    if (data?.activities && visit) {
      const visitDateActivityId = visit.activities.find(
        (activity: any) => activity.isVisitDate === true
      )?.id;

      if (visitDateActivityId) {
        const visitDateActivity = data.activities.find(
          (activity: any) => activity.id === visitDateActivityId
        );
        if (visitDateActivity) {
          fechaVisita = visitDateActivity.date || visitDateActivity.value || "";
        }
      } else {
        const fechaVisitaActivity = data.activities.find(
          (activity: any) => activity.name === "Fecha de la Visita"
        );
        if (fechaVisitaActivity) {
          fechaVisita = fechaVisitaActivity.date || fechaVisitaActivity.value || "";
        }
      }
    }
    return fechaVisita;
  };

  const buildFallbackFilename = (
    visitName: string,
    nombreApellido: string,
    fechaVisita: string
  ) => {
    const filenameParts = [visitName];
    if (nombreApellido) {
      filenameParts.push(nombreApellido);
    }
    if (fechaVisita) {
      const dateOnly = fechaVisita.split("T")[0];
      filenameParts.push(dateOnly);
    }

    return filenameParts
      .join("-")
      .replace(/[<>:"/\\|?*]/g, "")
      .trim();
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  // Check for fileSystem availability on mount
  useEffect(() => {
    console.log(
      "[Renderer] Component mounted, checking fileSystem availability:",
      {
        hasFileSystem: !!window.fileSystem,
        hasIpcRenderer: !!window.ipcRenderer,
        allWindowKeys: Object.keys(window).filter(
          (key) => key.startsWith("fileSystem") || key.startsWith("ipcRenderer")
        ),
      }
    );

    // Wait a bit and check again in case preload is still loading
    const checkInterval = setTimeout(() => {
      console.log("[Renderer] Re-checking fileSystem after delay:", {
        hasFileSystem: !!window.fileSystem,
        fileSystemKeys: window.fileSystem ? Object.keys(window.fileSystem) : [],
      });
    }, 500);

    return () => clearTimeout(checkInterval);
  }, []);

  useEffect(() => {
    // Check if we have imported data from location state
    const imported = (location.state as any)?.importedData;
    if (imported) {
      setImportedData(imported);
    }
    loadProtocols(imported);
  }, [location.state]);

  useEffect(() => {
    if (selectedProtocolId) {
      loadProtocol(selectedProtocolId);
    }
  }, [selectedProtocolId]);

  useEffect(() => {
    if (selectedProtocol && selectedVisitId) {
      const visit = selectedProtocol.visits.find(
        (v) => v.id === selectedVisitId
      );
      setSelectedVisit(visit || null);
    }
  }, [selectedProtocol, selectedVisitId]);

  const loadProtocols = async (importedDataToProcess?: any) => {
    try {
      setLoading(true);
      const response = await protocolService.getProtocols(1, 100, "active");
      setProtocols(response.data);

      // If we have imported data, try to find matching protocol and visit
      const dataToProcess = importedDataToProcess || importedData;
      if (dataToProcess) {
        const protocolName = dataToProcess.protocolName;
        const visitName = dataToProcess.visitName;

        if (protocolName && visitName) {
          // Find protocol by name
          const matchingProtocol = response.data.find(
            (p: Protocol) => p.name === protocolName
          );

          if (matchingProtocol) {
            setSelectedProtocolId(matchingProtocol.id);
            // Load the protocol to get visits
            const protocolResponse = await protocolService.getProtocolById(
              matchingProtocol.id
            );
            const protocol = protocolResponse.data;
            setSelectedProtocol(protocol);

            // Find visit by name
            const matchingVisit = protocol.visits.find(
              (v: Visit) => v.name === visitName
            );

            if (matchingVisit) {
              setSelectedVisitId(matchingVisit.id);
              setSelectedVisit(matchingVisit);
              // Auto-advance to form step
              setActiveStep(1);
            } else {
              setError(
                `No se encontró la visita "${visitName}" en el protocolo "${protocolName}".`
              );
            }
          } else {
            setError(`No se encontró el protocolo "${protocolName}".`);
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar protocolos:", err);
      setError("Error al cargar los protocolos. Por favor intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const loadProtocol = async (protocolId: string) => {
    try {
      setLoading(true);
      const response = await protocolService.getProtocolById(protocolId);
      setSelectedProtocol(response.data);
    } catch (err) {
      console.error("Error al cargar protocolo:", err);
      setError("Error al cargar el protocolo. Por favor intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!selectedProtocolId || !selectedVisitId) {
        setError("Por favor selecciona un protocolo y una visita");
        return;
      }
      setError("");
    }
    setActiveStep(activeStep + 1);
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
    if (activeStep === 1) {
      setVisitData(null);
    }
  };

  const handleFormComplete = async (data: any) => {
    setVisitData(data);
    
    // Extraer información necesaria
    const visitName = data.visitName || selectedVisit?.name || "visita";
    const protocolName = selectedProtocol?.name || "protocolo";
    const { nombreApellido, patientName } = extractPatientName(data);

    // Eliminar el JSON anterior antes de guardar el nuevo
    const fileSystemAvailable =
      window.fileSystem || (await waitForFileSystem(1000));

    if (fileSystemAvailable && window.fileSystem) {
      try {
        // Eliminar JSON anterior si existe
        await window.fileSystem.deleteVisitJson({
          protocolName,
          patientName,
          visitName,
        });
        console.log("[Renderer] Previous JSON deleted (if existed)");
      } catch (err) {
        console.error("[Renderer] Error deleting previous JSON:", err);
        // No mostrar error al usuario, solo loguear
      }
    }

    // Descargar automáticamente el nuevo JSON
    const dataStr = JSON.stringify(data, null, 2);

    if (fileSystemAvailable && window.fileSystem) {
      try {
        const result = await window.fileSystem.saveVisitJson({
          protocolName,
          patientName,
          visitName,
          jsonContent: dataStr,
        });

        if (result.success) {
          setError("");
          setSavedFilePath(result.path || "");
          setSuccessMessage(result.message || "Archivo guardado exitosamente");
          setShowSuccessToast(true);
        } else {
          setError(
            `Error al guardar el archivo: ${
              result.error || "Error desconocido"
            }`
          );
        }
      } catch (err) {
        console.error("[Renderer] Error saving file:", err);
        setError(
          `Error al guardar el archivo: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    } else {
      // Fallback to browser download if not in Electron
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;

      const fechaVisita = getVisitDate(data, selectedVisit);
      const sanitizedFilename = buildFallbackFilename(
        visitName,
        nombreApellido,
        fechaVisita
      );

      link.download = `${sanitizedFilename || "visita"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMessage("Archivo descargado exitosamente");
      setShowSuccessToast(true);
    }
    
    // Avanzar al paso 2 (pero sin mostrar el JSON)
    setActiveStep(2);
  };

  const handleDownload = async () => {
    if (!visitData || !selectedProtocol) return;

    const dataStr = JSON.stringify(visitData, null, 2);

    // Extract visitName
    const visitName = visitData.visitName || selectedVisit?.name || "visita";

    // Extract protocol name
    const protocolName = selectedProtocol.name || "protocolo";

    const { nombreApellido, patientName } = extractPatientName(visitData);

    // Check if we're in Electron and fileSystem API is available
    console.log("[Renderer] Checking fileSystem availability:", {
      hasFileSystem: !!window.fileSystem,
      fileSystemKeys: window.fileSystem ? Object.keys(window.fileSystem) : [],
    });

    // Wait for fileSystem to be available (in case preload is still loading)
    const fileSystemAvailable =
      window.fileSystem || (await waitForFileSystem(1000));

    if (fileSystemAvailable && window.fileSystem) {
      console.log("[Renderer] Calling saveVisitJson with:", {
        protocolName,
        patientName,
        visitName,
        jsonContentLength: dataStr.length,
      });

      try {
        const result = await window.fileSystem.saveVisitJson({
          protocolName,
          patientName,
          visitName,
          jsonContent: dataStr,
        });

        console.log("[Renderer] saveVisitJson result:", result);

        if (result.success) {
          setError("");
          setSavedFilePath(result.path || "");
          setSuccessMessage(result.message || "Archivo guardado exitosamente");
          setShowSuccessToast(true);
        } else {
          setError(
            `Error al guardar el archivo: ${
              result.error || "Error desconocido"
            }`
          );
        }
      } catch (err) {
        console.error("[Renderer] Error saving file:", err);
        setError(
          `Error al guardar el archivo: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    } else {
      console.log(
        "[Renderer] fileSystem not available, using browser download fallback"
      );
      // Fallback to browser download if not in Electron
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;

      const fechaVisita = getVisitDate(visitData, selectedVisit);
      const sanitizedFilename = buildFallbackFilename(
        visitName,
        nombreApellido,
        fechaVisita
      );

      link.download = `${sanitizedFilename || "visita"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePreviewClinicalHistory = async () => {
    if (!visitData || !selectedProtocolId || !selectedVisitId) return;

    try {
      setLoadingPreview(true);
      setError("");

      const text = await protocolService.previewClinicalHistory(
        selectedProtocolId,
        selectedVisitId,
        visitData
      );

      setPreviewText(text);
      setEditedPreviewText(text);
      setPreviewDialogOpen(true);
    } catch (err: any) {
      console.error("Error al previsualizar historia clínica:", err);
      setError(
        err.response?.data?.error ||
          "Error al previsualizar la historia clínica. Por favor intenta nuevamente."
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerateClinicalHistory = async () => {
    if (!visitData || !selectedProtocolId || !selectedVisitId) return;

    try {
      setGeneratingHistory(true);
      setError("");

      // Usar el texto editado si existe, si no usar el original
      const textToUse = editedPreviewText.trim() || previewText;

      const blob = await protocolService.generateClinicalHistory(
        selectedProtocolId,
        selectedVisitId,
        visitData,
        textToUse
      );

      const visitName = visitData.visitName || selectedVisit?.name || "visita";
      const protocolName = selectedProtocol?.name || "protocolo";
      const { nombreApellido, patientName } = extractPatientName(visitData);

      const fileSystemAvailable =
        window.fileSystem || (await waitForFileSystem(1000));

      if (fileSystemAvailable && window.fileSystem) {
        try {
          const pdfBase64 = arrayBufferToBase64(await blob.arrayBuffer());
          const result = await window.fileSystem.saveVisitPdf({
            protocolName,
            patientName,
            visitName,
            pdfBase64,
          });

          if (result.success) {
            setError("");
            setSavedFilePath(result.path || "");
            setSuccessMessage(result.message || "Archivo guardado exitosamente");
            setShowSuccessToast(true);
            setPreviewDialogOpen(false);
            return;
          }

          setError(
            `Error al guardar el archivo: ${result.error || "Error desconocido"}`
          );
          return;
        } catch (err) {
          console.error("[Renderer] Error saving PDF:", err);
          setError(
            `Error al guardar el archivo: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          return;
        }
      }

      // Descargar el PDF en el navegador si no está disponible fileSystem
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fechaVisita = getVisitDate(visitData, selectedVisit);
      const sanitizedFilename = buildFallbackFilename(
        visitName,
        nombreApellido,
        fechaVisita
      );
      link.download = `${sanitizedFilename || "visita"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Cerrar el diálogo después de generar el PDF
      setPreviewDialogOpen(false);
    } catch (err: any) {
      console.error("Error al generar historia clínica:", err);
      setError(
        err.response?.data?.error ||
          "Error al generar la historia clínica. Por favor intenta nuevamente."
      );
    } finally {
      setGeneratingHistory(false);
    }
  };

  const handleClosePreviewDialog = () => {
    setPreviewDialogOpen(false);
    setPreviewText("");
    setEditedPreviewText("");
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case "presencial":
        return "Presencial";
      case "telefonica":
        return "Telefónica";
      case "no_programada":
        return "No Programada";
      default:
        return type;
    }
  };

  if (loading && protocols.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button
          onClick={() => navigate("/doctor/dashboard")}
          startIcon={<BackIcon />}
        >
          Volver
        </Button>
        <Typography variant="h4" fontWeight="bold">
          Cargar Visita de Paciente
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {activeStep === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Selecciona el Protocolo y la Visita
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth required>
              <InputLabel>Protocolo</InputLabel>
              <Select
                value={selectedProtocolId}
                onChange={(e) => {
                  setSelectedProtocolId(e.target.value);
                  setSelectedVisitId("");
                  setSelectedVisit(null);
                }}
                label="Protocolo"
              >
                {protocols.map((protocol) => (
                  <MenuItem key={protocol.id} value={protocol.id}>
                    {protocol.name} ({protocol.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedProtocol && selectedProtocol.visits.length > 0 && (
              <FormControl fullWidth required>
                <InputLabel>Visita</InputLabel>
                <Select
                  value={selectedVisitId}
                  onChange={(e) => setSelectedVisitId(e.target.value)}
                  label="Visita"
                >
                  {selectedProtocol.visits
                    .sort((a, b) => a.order - b.order)
                    .map((visit) => (
                      <MenuItem key={visit.id} value={visit.id}>
                        {visit.order}. {visit.name} (
                        {getVisitTypeLabel(visit.type)}) -{" "}
                        {visit.activities.length} campos
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}

            {selectedProtocol && selectedProtocol.visits.length === 0 && (
              <Alert severity="warning">
                Este protocolo no tiene visitas configuradas.
              </Alert>
            )}

            {selectedVisit && (
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  Visita seleccionada: {selectedVisit.name}
                </Typography>
                <Typography variant="body2">
                  Tipo: {getVisitTypeLabel(selectedVisit.type)}
                </Typography>
                <Typography variant="body2">
                  Campos a completar: {selectedVisit.activities.length}
                </Typography>
              </Alert>
            )}
          </Box>

          <Box display="flex" justifyContent="flex-end" gap={2} sx={{ mt: 4 }}>
            <Button
              onClick={handleNext}
              variant="contained"
              disabled={!selectedProtocolId || !selectedVisitId}
            >
              Siguiente
            </Button>
          </Box>
        </Paper>
      )}

      {activeStep === 1 && selectedVisit && selectedProtocol && (
        <PatientVisitForm
          visit={selectedVisit}
          protocolName={selectedProtocol.name}
          patientId=""
          onComplete={handleFormComplete}
          onCancel={handleBack}
          initialData={importedData}
        />
      )}

      {activeStep === 2 && visitData && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Visita Completada
          </Typography>

          <Alert severity="success" sx={{ mb: 3 }}>
            El formulario se completó correctamente. El archivo JSON se ha descargado automáticamente.
            <strong> No se guardó nada en la base de datos.</strong>
          </Alert>

          <Box display="flex" justifyContent="space-between" gap={2}>
            <Button
              onClick={handleBack}
              variant="outlined"
              startIcon={<BackIcon />}
            >
              Volver
            </Button>
            <Box display="flex" gap={2}>
              <Button
                onClick={handleDownload}
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                Descargar JSON Nuevamente
              </Button>
              <Button
                onClick={handlePreviewClinicalHistory}
                variant="contained"
                startIcon={
                  loadingPreview ? (
                    <CircularProgress size={20} />
                  ) : (
                    <DescriptionIcon />
                  )
                }
                color="primary"
                disabled={loadingPreview}
              >
                {loadingPreview
                  ? "Generando Vista Previa..."
                  : "Generar Historia Clínica"}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Diálogo de previsualización y edición */}
      <Dialog
        open={previewDialogOpen}
        onClose={handleClosePreviewDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: "70vh",
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <EditIcon />
            <Typography variant="h6">
              Vista Previa de Historia Clínica
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Revisa y edita el texto generado por el sistema antes de generar el PDF.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={editedPreviewText}
            onChange={(e) => setEditedPreviewText(e.target.value)}
            variant="outlined"
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: "monospace",
                fontSize: "0.875rem",
              },
            }}
            placeholder="El texto de la historia clínica aparecerá aquí..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClosePreviewDialog} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={handleGenerateClinicalHistory}
            variant="contained"
            startIcon={
              generatingHistory ? (
                <CircularProgress size={20} />
              ) : (
                <DescriptionIcon />
              )
            }
            disabled={generatingHistory || !editedPreviewText.trim()}
          >
            {generatingHistory ? "Generando PDF..." : "Generar PDF"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast de éxito al guardar */}
      <Snackbar
        open={showSuccessToast}
        autoHideDuration={6000}
        onClose={() => setShowSuccessToast(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setShowSuccessToast(false)}
          severity="success"
          sx={{ width: "100%", minWidth: 350 }}
          icon={<CheckCircleIcon />}
        >
          <Typography variant="body2" fontWeight={600} gutterBottom>
            {successMessage}
          </Typography>
          {savedFilePath && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.5,
                color: "text.secondary",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                wordBreak: "break-all",
              }}
            >
              {savedFilePath}
            </Typography>
          )}
        </Alert>
      </Snackbar>
    </Box>
  );
};
