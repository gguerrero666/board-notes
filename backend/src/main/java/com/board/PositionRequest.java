package com.board;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

@Schema(description = "Nueva posición de la nota en el board")
public record PositionRequest(
        @NotNull @PositiveOrZero @Max(100000)
        @Schema(description = "Posición horizontal en píxeles, desde el borde izquierdo. Entre 0 y 100000", example = "120", requiredMode = Schema.RequiredMode.REQUIRED)
        Integer x,
        @NotNull @PositiveOrZero @Max(100000)
        @Schema(description = "Posición vertical en píxeles, desde el borde superior. Entre 0 y 100000", example = "80", requiredMode = Schema.RequiredMode.REQUIRED)
        Integer y) {
}
