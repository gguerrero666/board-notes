package com.board;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Datos de una nota para crearla o editarla: título obligatorio y texto opcional")
public record NewNoteRequest(
        @NotBlank
        @Size(max = 100)
        @Schema(description = "Título de la nota. Obligatorio, no puede estar vacío ni ser solo espacios. Máximo 100 caracteres tal como se envía (los espacios cuentan); se guarda recortado", example = "Comprar leche", requiredMode = Schema.RequiredMode.REQUIRED)
        String title,
        @Size(max = 1000)
        @Schema(description = "Texto de la nota. Opcional", example = "Entera, 2 litros", nullable = true)
        String text) {
}
