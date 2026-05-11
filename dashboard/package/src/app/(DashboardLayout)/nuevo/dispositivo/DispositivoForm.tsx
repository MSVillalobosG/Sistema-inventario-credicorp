"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  Typography,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { useForm } from "react-hook-form";

const steps = [
  "Información General",
  "Información Técnica",
  "Información Usuario",
  "Información Organizacional",
];

export default function DispositivoForm() {
  const [activeStep, setActiveStep] = useState(0);
  const [open, setOpen] = useState(false);

  const { register, handleSubmit } = useForm();

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

 const onSubmit = async (data: any) => {
  try {
    const response = await fetch("http://127.0.0.1:8001/devices/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Error al guardar en backend");
    }

    const result = await response.json();
    console.log("Guardado en BD:", result);

    setOpen(true);
  } catch (error) {
    console.error("Error real:", error);
  }
};
  const renderStepContent = (step: number) => {
    switch (step) {
      // ==============================
      // 1️⃣ INFORMACIÓN GENERAL
      // ==============================
      case 0:
        return (
          <>
            <TextField label="Placa Equipo" fullWidth {...register("placa_equipo")} />
            <TextField label="Nombre Equipo" fullWidth {...register("nombre_equipo")} />
            <TextField label="Serial Number" fullWidth {...register("serial_number")} />

            <TextField select label="Tipo de Equipo" fullWidth {...register("tipo_equipo")}>
              <MenuItem value="PORTATIL">Portátil</MenuItem>
              <MenuItem value="DE_OFICINA">De Oficina</MenuItem>
            </TextField>

            <TextField label="Tipo de Contrato" fullWidth {...register("tipo_contrato")} />
          </>
        );

      // ==============================
      // 2️⃣ INFORMACIÓN TÉCNICA
      // ==============================
      case 1:
        return (
          <>
            <TextField label="Marca" fullWidth {...register("marca")} />
            <TextField label="Modelo" fullWidth {...register("modelo")} />
            <TextField label="Sistema Operativo" fullWidth {...register("sistema_operativo")} />
            <TextField label="Procesador" fullWidth {...register("tipo_procesador")} />
            <TextField label="Capacidad RAM" fullWidth {...register("capacidad_ram")} />
            <TextField label="Tipo RAM" fullWidth {...register("tipo_ram")} />
            <TextField label="Tipo Disco" fullWidth {...register("tipo_disco")} />
            <TextField label="Capacidad Disco" fullWidth {...register("capacidad_disco")} />
            <TextField label="MAC" fullWidth {...register("mac")} />
            <TextField label="IP Consola" fullWidth {...register("ip_consola")} />
          </>
        );

      // ==============================
      // 3️⃣ INFORMACIÓN USUARIO
      // ==============================
      case 2:
        return (
          <>
            <TextField label="Documento" fullWidth {...register("documento")} />
            <TextField label="Usuario Responsable" fullWidth {...register("usuario_responsable")} />
            <TextField label="Usuario Asignado" fullWidth {...register("usuario_asignado")} />
            <TextField label="Correo Usuario" fullWidth {...register("correo_usuario")} />
          </>
        );

      // ==============================
      // 4️⃣ INFORMACIÓN ORGANIZACIONAL
      // ==============================
      case 3:
        return (
          <>
            <TextField label="Ciudad" fullWidth {...register("ciudad")} />
            <TextField label="Sede" fullWidth {...register("sede")} />
            <TextField label="Ubicación" fullWidth {...register("ubicacion")} />
            <TextField label="Vicepresidencia" fullWidth {...register("vicepresidencia")} />
            <TextField label="Área" fullWidth {...register("area")} />
            <TextField label="Centro de Costo" fullWidth {...register("centro_costo")} />
            <TextField label="Nombre Centro de Costo" fullWidth {...register("nombre_centro_costo")} />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 900 }}>
      <Typography variant="h5" mb={3} fontWeight={600}>
        Registrar Nuevo Dispositivo
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Box display="flex" flexDirection="column" gap={2}>
          {renderStepContent(activeStep)}
        </Box>

        <Box mt={4} display="flex" justifyContent="space-between">
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Atrás
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button type="submit" variant="contained">
              Guardar
            </Button>
          ) : (
            <Button onClick={handleNext} variant="contained">
              Siguiente
            </Button>
          )}
        </Box>
      </form>

      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
      >
        <Alert severity="success" variant="filled">
          Dispositivo creado correctamente
        </Alert>
      </Snackbar>
    </Box>
  );
}