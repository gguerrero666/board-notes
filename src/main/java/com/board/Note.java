package com.board;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
@Schema(description = "Nota del board con título y texto")
public class Note {

    @Id
    @Schema(description = "Identificador generado al crear la nota", accessMode = Schema.AccessMode.READ_ONLY, example = "1")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Schema(description = "Título de la nota. Obligatorio, no puede estar vacío ni ser solo espacios", example = "Comprar leche", requiredMode = Schema.RequiredMode.REQUIRED)
    @Column(length = 100)
    private String title;
    @Schema(description = "Texto de la nota. Opcional", example = "Entera, 2 litros", nullable = true)
    @Column(length = 1000)
    private String text;

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}
